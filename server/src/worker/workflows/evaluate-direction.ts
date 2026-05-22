// Score one user-recorded direction against the founder's profile.
// Manually triggered from the per-card "让 AI 评分" button.

import { proxyActivities, workflowInfo, ApplicationFailure } from "@temporalio/workflow";
import type * as Activities from "../activities/index.js";

const acts = proxyActivities<typeof Activities>({
  startToCloseTimeout: "120 seconds",
  retry: { maximumAttempts: 3, initialInterval: "2s", maximumInterval: "15s" },
});
const dbActs = proxyActivities<typeof Activities>({
  startToCloseTimeout: "15 seconds",
  retry: { maximumAttempts: 5, initialInterval: "1s" },
});

export interface EvaluateDirectionInput {
  userId: string;
  directionId: string;
}
export interface EvaluateDirectionOutput {
  directionId: string;
  score: number;
}

export async function evaluateDirectionWorkflow(input: EvaluateDirectionInput): Promise<EvaluateDirectionOutput> {
  const info = workflowInfo();
  const wfId = info.workflowId;

  await dbActs.ensureWorkflowRun({
    id: wfId,
    runId: info.runId,
    workflowType: "evaluateDirection",
    trigger: info.parent ? "parent:" + info.parent.workflowId : "user:evaluate_direction",
    userId: input.userId,
    input,
  });
  await dbActs.updateWorkflowRun({ id: wfId, status: "RUNNING", currentActivity: "loadDirection" });
  await dbActs.recordWorkflowEvent({ workflowId: wfId, kind: "workflow_started" });

  const direction = await acts.loadMyDirection(input.directionId);
  const profile = await acts.loadFounderProfile(input.userId);

  await dbActs.updateWorkflowRun({ id: wfId, currentActivity: "llmEvaluateDirection" });
  await dbActs.recordWorkflowEvent({ workflowId: wfId, kind: "activity_started", activity: "llmEvaluateDirection" });

  let evaluation;
  try {
    evaluation = await acts.llmEvaluateDirection({
      direction: { title: direction.title, description: direction.description, tags: direction.tags },
      profile,
      workflowId: wfId,
      userId: input.userId,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await dbActs.updateWorkflowRun({ id: wfId, status: "FAILED", error: msg, finishedAtIso: new Date().toISOString() });
    await dbActs.recordWorkflowEvent({ workflowId: wfId, kind: "workflow_failed", message: msg });
    throw ApplicationFailure.create({ message: msg, nonRetryable: true });
  }

  await dbActs.recordWorkflowEvent({
    workflowId: wfId, kind: "activity_completed", activity: "llmEvaluateDirection",
    message: `score ${evaluation.score}`,
  });

  await acts.saveDirectionEvaluation({ id: input.directionId, evaluation });

  const output: EvaluateDirectionOutput = { directionId: input.directionId, score: evaluation.score };
  await dbActs.updateWorkflowRun({
    id: wfId, status: "COMPLETED", currentActivity: null, output,
    finishedAtIso: new Date().toISOString(),
  });
  await dbActs.recordWorkflowEvent({ workflowId: wfId, kind: "workflow_completed", payload: output });

  return output;
}
