// One copilot turn: route intent → optionally trigger a child workflow → reply.
// Returns the assistant message text to display.

import {
  proxyActivities,
  workflowInfo,
  executeChild,
} from "@temporalio/workflow";
import type * as Activities from "../activities/index.js";
import { refreshTrendingWorkflow } from "./refresh-trending.js";
import type { RefreshTrendingOutput } from "./refresh-trending.js";

const acts = proxyActivities<typeof Activities>({
  startToCloseTimeout: "60 seconds",
  retry: { maximumAttempts: 2, initialInterval: "2s" },
});

const dbActs = proxyActivities<typeof Activities>({
  startToCloseTimeout: "15 seconds",
  retry: { maximumAttempts: 4, initialInterval: "1s" },
});

export interface CopilotTurnInput {
  sessionId: string;
  userId: string;
  userText: string;
}
export interface CopilotTurnOutput {
  reply: string;
  intent: "chat" | "refreshTrending";
  childWorkflowId?: string;
  tool?: { name: string; meta: string };
}

export async function copilotTurnWorkflow(input: CopilotTurnInput): Promise<CopilotTurnOutput> {
  const info = workflowInfo();
  const wfId = info.workflowId;

  await dbActs.ensureWorkflowRun({
    id: wfId,
    runId: info.runId,
    workflowType: "copilotTurn",
    trigger: info.parent ? "parent:" + info.parent.workflowId : null,
    userId: input.userId,
    input,
  });

  await dbActs.updateWorkflowRun({ id: wfId, status: "RUNNING", currentActivity: "route" });
  await dbActs.recordWorkflowEvent({ workflowId: wfId, kind: "workflow_started" });

  const history = await acts.loadCopilotHistory(input.sessionId, 12);

  let route;
  try {
    route = await acts.llmCopilotRoute({
      userText: input.userText,
      sessionId: input.sessionId,
      userId: input.userId,
    });
  } catch (err) {
    // Routing failure shouldn't kill the turn — degrade to chat.
    route = { intent: "chat" as const, rationale: "router failed", replyHint: "" };
    await dbActs.recordWorkflowEvent({
      workflowId: wfId, kind: "log", message: "route_failed",
      payload: { error: err instanceof Error ? err.message : String(err) },
    });
  }
  await dbActs.recordWorkflowEvent({
    workflowId: wfId, kind: "activity_completed", activity: "route",
    message: route.intent, payload: route,
  });

  let extraContext: string | undefined;
  let childWorkflowId: string | undefined;
  let tool: CopilotTurnOutput["tool"] | undefined;

  if (route.intent === "refreshTrending") {
    childWorkflowId = `${wfId}::refreshTrending`;
    await dbActs.updateWorkflowRun({ id: wfId, currentActivity: "child:refreshTrending" });
    await dbActs.recordWorkflowEvent({
      workflowId: wfId, kind: "activity_started", activity: "refreshTrendingChild",
    });
    try {
      const child: RefreshTrendingOutput = await executeChild(refreshTrendingWorkflow, {
        workflowId: childWorkflowId,
        args: [{ userId: input.userId }],
      });
      extraContext =
        `Helix 刚刷新了热门方向：拉到 ${child.count} 条。` +
        `前 5 名是 ${child.topTitles.map(t => `「${t}」`).join("、")}。` +
        `请简短告诉用户已完成，并问他想不想把哪条加入自己的方向库。`;
      tool = { name: "refresh_trending", meta: `${child.count} 条 · 头部：${child.topTitles.slice(0, 3).join(" / ")}` };
      await dbActs.recordWorkflowEvent({
        workflowId: wfId, kind: "activity_completed", activity: "refreshTrendingChild",
        payload: child,
      });
    } catch (err) {
      extraContext = "热门方向刷新失败了，请告诉用户：Helix 暂时离线，稍后重试。";
      await dbActs.recordWorkflowEvent({
        workflowId: wfId, kind: "log", message: "child_failed",
        payload: { error: err instanceof Error ? err.message : String(err) },
      });
    }
  }

  await dbActs.updateWorkflowRun({ id: wfId, currentActivity: "respond" });
  const reply = await acts.llmCopilotRespond({
    userText: input.userText,
    history,
    sessionId: input.sessionId,
    userId: input.userId,
    ...(extraContext ? { extraContext } : {}),
  });

  // Persist the messages. User message first, then AI reply — same order the UI shows.
  await dbActs.appendCopilotMessage({
    sessionId: input.sessionId,
    message: { from: "user", text: input.userText, tool: null },
  });
  await dbActs.appendCopilotMessage({
    sessionId: input.sessionId,
    message: { from: "ai", text: reply, tool: tool ?? null },
  });

  const output: CopilotTurnOutput = {
    reply,
    intent: route.intent,
    ...(childWorkflowId ? { childWorkflowId } : {}),
    ...(tool ? { tool } : {}),
  };

  await dbActs.updateWorkflowRun({
    id: wfId, status: "COMPLETED", currentActivity: null, output,
    finishedAtIso: new Date().toISOString(),
  });
  await dbActs.recordWorkflowEvent({ workflowId: wfId, kind: "workflow_completed", payload: output });
  return output;
}
