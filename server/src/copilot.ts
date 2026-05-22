// Copilot — replaces the old keyword if/else with a Temporal-backed turn.
//
// The /api/copilot/message route calls runCopilotTurn(); the body of the work
// (intent routing, optional child workflow, LLM reply) happens in the worker
// process via copilotTurnWorkflow. We wait synchronously on the workflow's
// result with a hard ceiling so a slow LLM call doesn't hang the request.
//
// If the worker is offline or the LLM blows up, fall back to a static reply so
// the UI never sees a 500. The old aiReply() is kept as that fallback below
// for symmetry but is no longer the primary code path.

import type { CopilotMessage, CopilotTool } from "./types.js";
import { getClient, taskQueue } from "./worker/connection.js";
import { createWorkflowRun, appendCopilotMessage as dbAppendCopilotMessage } from "./db/queries.js";
import type {
  CopilotTurnInput,
  CopilotTurnOutput,
} from "./worker/workflows/index.js";

const TURN_TIMEOUT_MS = 30_000;

export async function runCopilotTurn(input: {
  sessionId: string;
  userId: string;
  text: string;
}): Promise<CopilotMessage> {
  const workflowId = `copilot-turn::${input.sessionId}::${Date.now()}`;
  const args: [CopilotTurnInput] = [{
    sessionId: input.sessionId,
    userId: input.userId,
    userText: input.text,
  }];

  let client;
  try {
    client = await getClient();
  } catch (err) {
    console.warn("[copilot] temporal unavailable, falling back to static reply:", err);
    return fallbackReply(input.sessionId, input.text);
  }

  let handle;
  try {
    handle = await client.workflow.start("copilotTurnWorkflow", {
      taskQueue,
      workflowId,
      args,
    });
  } catch (err) {
    console.warn("[copilot] workflow start failed, falling back:", err);
    return fallbackReply(input.sessionId, input.text);
  }

  await createWorkflowRun({
    id: workflowId,
    runId: handle.firstExecutionRunId,
    workflowType: "copilotTurn",
    trigger: "user:copilot_message",
    userId: input.userId,
    input: args[0],
    langfuseTraceId: workflowId,
  });

  try {
    const result = await withTimeout(handle.result() as Promise<CopilotTurnOutput>, TURN_TIMEOUT_MS);
    return { from: "ai", text: result.reply, tool: result.tool ?? null };
  } catch (err) {
    console.warn("[copilot] turn timed out or failed:", err);
    // Best-effort cancel so a runaway workflow doesn't keep burning tokens.
    handle.cancel().catch(() => undefined);
    return fallbackReply(input.sessionId, input.text);
  }
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`copilot turn exceeded ${ms}ms`)), ms);
    p.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
  });
}

async function fallbackReply(sessionId: string, text: string): Promise<CopilotMessage> {
  const reply: CopilotMessage = {
    from: "ai",
    text: legacyReply(text),
    tool: legacyTool(text),
  };
  // Best-effort persistence; if even the DB is down we still want to respond.
  try {
    await dbAppendCopilotMessage({ from: "user", text, tool: null }, sessionId);
    await dbAppendCopilotMessage(reply, sessionId);
  } catch {
    // swallow
  }
  return reply;
}

// ---------------- Legacy keyword reply (kept as fallback) ----------------

function legacyReply(text: string): string {
  const lc = text.toLowerCase();
  if (lc.includes("周一") || lc.includes("晨会") || lc.includes("准备"))
    return "Helix 暂时离线，我先用规则回了你：本周晨会 3 项议题已记在飞书今日文档。";
  if (lc.includes("竞品"))
    return "Helix 暂时离线，我先用规则回了你：建议优先看拾光课堂 v2.4、Indie Hackers CN 付费版、增长黑盒 AI 课。";
  return "Helix 暂时离线，我已记录这条消息，等服务恢复会重新处理。";
}

function legacyTool(text: string): CopilotTool | null {
  const lc = text.toLowerCase();
  if (lc.includes("周一") || lc.includes("晨会")) return { name: "draft_agenda", meta: "fallback" };
  if (lc.includes("竞品"))                       return { name: "scan_competitors", meta: "fallback" };
  return null;
}
