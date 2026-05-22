// Helix workflow: scan market → reason → score → write directions.
// Workflows are sandboxed by Temporal: only imports from @temporalio/workflow
// and other workflow files are safe. All I/O must go through proxied activities.

import { proxyActivities, workflowInfo, ApplicationFailure } from "@temporalio/workflow";
import type * as Activities from "../activities/index.js";
import type { Direction } from "../../types.js";

const acts = proxyActivities<typeof Activities>({
  // DeepSeek json_object completions for a 4-direction scan run ~30-90s; give
  // a generous ceiling so retries kick in only on hard failures, not slowness.
  startToCloseTimeout: "180 seconds",
  retry: { maximumAttempts: 3, initialInterval: "2s", maximumInterval: "20s" },
});

// Faster timeout for the cheap DB-state activities so a stuck DB doesn't burn
// 90s waiting on an event write.
const dbActs = proxyActivities<typeof Activities>({
  startToCloseTimeout: "15 seconds",
  retry: { maximumAttempts: 5, initialInterval: "1s" },
});

export interface ScanDirectionsInput {
  userId: string;
  thesis?: string;
}
export interface ScanDirectionsOutput {
  directionIds: string[];
  topId: string;
  topName: string;
  topScore: number;
}

export async function scanDirectionsWorkflow(input: ScanDirectionsInput): Promise<ScanDirectionsOutput> {
  const info = workflowInfo();
  const wfId = info.workflowId;

  // Self-register: idempotent. Necessary when started as a child (parent doesn't
  // pre-create the row the way the API route does).
  await dbActs.ensureWorkflowRun({
    id: wfId,
    runId: info.runId,
    workflowType: "scanDirections",
    trigger: info.parent ? "parent:" + info.parent.workflowId : null,
    userId: input.userId,
    input,
  });

  await dbActs.updateWorkflowRun({ id: wfId, status: "RUNNING", currentActivity: "loadFounderProfile" });
  await dbActs.recordWorkflowEvent({ workflowId: wfId, kind: "workflow_started" });

  const profile = await acts.loadFounderProfile(input.userId);
  if (input.thesis) profile.thesis = input.thesis;

  await dbActs.updateWorkflowRun({ id: wfId, currentActivity: "gatherMarketSignals" });
  await dbActs.recordWorkflowEvent({ workflowId: wfId, kind: "activity_started", activity: "gatherMarketSignals" });
  const signals = await acts.gatherMarketSignals({ profile, ...(input.thesis ? { thesis: input.thesis } : {}) });
  await dbActs.recordWorkflowEvent({
    workflowId: wfId, kind: "activity_completed", activity: "gatherMarketSignals",
    message: `${signals.length} signals`,
  });

  await dbActs.updateWorkflowRun({ id: wfId, currentActivity: "llmGenerateDirections" });
  await dbActs.recordWorkflowEvent({ workflowId: wfId, kind: "activity_started", activity: "llmGenerateDirections" });
  let directions: Direction[];
  try {
    directions = await acts.llmGenerateDirections({ profile, signals, workflowId: wfId, userId: input.userId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await dbActs.updateWorkflowRun({
      id: wfId, status: "FAILED", error: msg,
      finishedAtIso: new Date().toISOString(),
    });
    await dbActs.recordWorkflowEvent({ workflowId: wfId, kind: "workflow_failed", message: msg });
    throw ApplicationFailure.create({ message: msg, nonRetryable: true });
  }
  await dbActs.recordWorkflowEvent({
    workflowId: wfId, kind: "activity_completed", activity: "llmGenerateDirections",
    message: `${directions.length} candidates`,
  });

  await dbActs.updateWorkflowRun({ id: wfId, currentActivity: "upsertDirections" });
  await acts.upsertDirections(directions);
  await dbActs.recordWorkflowEvent({ workflowId: wfId, kind: "activity_completed", activity: "upsertDirections" });

  const top = directions[0]!;
  const output: ScanDirectionsOutput = {
    directionIds: directions.map(d => d.id),
    topId: top.id,
    topName: top.name,
    topScore: top.score,
  };

  await dbActs.updateWorkflowRun({
    id: wfId, status: "COMPLETED", currentActivity: null, output,
    finishedAtIso: new Date().toISOString(),
  });
  await dbActs.recordWorkflowEvent({ workflowId: wfId, kind: "workflow_completed", payload: output });

  return output;
}
