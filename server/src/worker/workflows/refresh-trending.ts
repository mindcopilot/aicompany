// Pulls signals from agent-reach sources, LLM consolidates into ~10 hot
// creative directions, replaces the trending_directions table atomically.

import { proxyActivities, workflowInfo, ApplicationFailure } from "@temporalio/workflow";
import type * as Activities from "../activities/index.js";

const acts = proxyActivities<typeof Activities>({
  startToCloseTimeout: "120 seconds",
  retry: { maximumAttempts: 2, initialInterval: "3s" },
});
const fastActs = proxyActivities<typeof Activities>({
  startToCloseTimeout: "30 seconds",
  retry: { maximumAttempts: 3, initialInterval: "2s" },
});
const dbActs = proxyActivities<typeof Activities>({
  startToCloseTimeout: "15 seconds",
  retry: { maximumAttempts: 5, initialInterval: "1s" },
});

export interface RefreshTrendingInput {
  userId: string;
  githubQueries?: string[];
}
export interface RefreshTrendingOutput {
  count: number;
  topTitles: string[];
}

export async function refreshTrendingWorkflow(input: RefreshTrendingInput): Promise<RefreshTrendingOutput> {
  const info = workflowInfo();
  const wfId = info.workflowId;

  await dbActs.ensureWorkflowRun({
    id: wfId,
    runId: info.runId,
    workflowType: "refreshTrending",
    trigger: info.parent ? "parent:" + info.parent.workflowId : "user:refresh_trending",
    userId: input.userId,
    input,
  });
  await dbActs.updateWorkflowRun({ id: wfId, status: "RUNNING", currentActivity: "gatherSignals" });
  await dbActs.recordWorkflowEvent({ workflowId: wfId, kind: "workflow_started" });
  await dbActs.recordWorkflowEvent({ workflowId: wfId, kind: "activity_started", activity: "gatherSignals" });

  let raw;
  try {
    raw = await fastActs.gatherAllTrendingSignals(
      input.githubQueries ? { githubQueries: input.githubQueries } : {}
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await dbActs.updateWorkflowRun({ id: wfId, status: "FAILED", error: msg, finishedAtIso: new Date().toISOString() });
    await dbActs.recordWorkflowEvent({ workflowId: wfId, kind: "workflow_failed", message: msg });
    throw ApplicationFailure.create({ message: msg, nonRetryable: true });
  }
  await dbActs.recordWorkflowEvent({
    workflowId: wfId, kind: "activity_completed", activity: "gatherSignals",
    message: `${raw.length} raw signals`,
  });

  if (raw.length === 0) {
    const msg = "no signals returned from any source";
    await dbActs.updateWorkflowRun({ id: wfId, status: "FAILED", error: msg, finishedAtIso: new Date().toISOString() });
    throw ApplicationFailure.create({ message: msg, nonRetryable: true });
  }

  await dbActs.updateWorkflowRun({ id: wfId, currentActivity: "llmConsolidateTrending" });
  await dbActs.recordWorkflowEvent({ workflowId: wfId, kind: "activity_started", activity: "llmConsolidateTrending" });
  let consolidated;
  try {
    consolidated = await acts.llmConsolidateTrending({ raw, workflowId: wfId, userId: input.userId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await dbActs.updateWorkflowRun({ id: wfId, status: "FAILED", error: msg, finishedAtIso: new Date().toISOString() });
    await dbActs.recordWorkflowEvent({ workflowId: wfId, kind: "workflow_failed", message: msg });
    throw ApplicationFailure.create({ message: msg, nonRetryable: true });
  }
  await dbActs.recordWorkflowEvent({
    workflowId: wfId, kind: "activity_completed", activity: "llmConsolidateTrending",
    message: `${consolidated.length} trending`,
  });

  await dbActs.updateWorkflowRun({ id: wfId, currentActivity: "replaceTrendingDirections" });
  await acts.replaceTrendingDirections(consolidated.map((c, i) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    source: c.sources.join(","),
    sourceUrl: null,
    scoreProxy: consolidated.length - i,           // ranked by LLM order
    meta: { sources: c.sources, evidence: c.evidence },
  })));
  await dbActs.recordWorkflowEvent({ workflowId: wfId, kind: "activity_completed", activity: "replaceTrendingDirections" });

  const output: RefreshTrendingOutput = {
    count: consolidated.length,
    topTitles: consolidated.slice(0, 5).map(c => c.title),
  };
  await dbActs.updateWorkflowRun({
    id: wfId, status: "COMPLETED", currentActivity: null, output,
    finishedAtIso: new Date().toISOString(),
  });
  await dbActs.recordWorkflowEvent({ workflowId: wfId, kind: "workflow_completed", payload: output });

  return output;
}
