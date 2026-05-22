// Deep validation for one direction across 4 dimensions in parallel.
// Each dimension writes its own direction_validations row independently so
// a single LLM failure doesn't sink the others — and the UI can render
// partial completion gracefully.

import { proxyActivities, workflowInfo, ApplicationFailure } from "@temporalio/workflow";
import type * as Activities from "../activities/index.js";
import type { ValidationKind } from "../../types.js";

const acts = proxyActivities<typeof Activities>({
  startToCloseTimeout: "150 seconds",
  retry: { maximumAttempts: 2, initialInterval: "3s", maximumInterval: "20s" },
});
const dbActs = proxyActivities<typeof Activities>({
  startToCloseTimeout: "15 seconds",
  retry: { maximumAttempts: 5, initialInterval: "1s" },
});

export interface ValidateDirectionInput {
  userId: string;
  directionId: string;
  kinds?: ValidationKind[];                    // default: all 4
}
export interface ValidateDirectionOutput {
  directionId: string;
  completed: ValidationKind[];
  failed: ValidationKind[];
}

const ALL_KINDS: ValidationKind[] = ["market", "competitor", "feasibility", "user"];

// Chinese labels so the live timeline reads naturally without a client-side map.
const KIND_LABEL: Record<ValidationKind, string> = {
  market:      "市场分析",
  competitor:  "竞品分析",
  feasibility: "可行性分析",
  user:        "用户合成",
};

export async function validateDirectionWorkflow(input: ValidateDirectionInput): Promise<ValidateDirectionOutput> {
  const info = workflowInfo();
  const wfId = info.workflowId;
  const kinds = input.kinds && input.kinds.length > 0 ? input.kinds : ALL_KINDS;

  await dbActs.ensureWorkflowRun({
    id: wfId,
    runId: info.runId,
    workflowType: "validateDirection",
    trigger: info.parent ? "parent:" + info.parent.workflowId : "user:validate_direction",
    userId: input.userId,
    input,
  });
  await dbActs.updateWorkflowRun({ id: wfId, status: "RUNNING", currentActivity: "loadContext" });
  await dbActs.recordWorkflowEvent({
    workflowId: wfId, kind: "workflow_started",
    message: "Helix 接管 · 启动 4 维深度论证",
  });

  const direction = await acts.loadMyDirection(input.directionId);
  const profile = await acts.loadFounderProfile(input.userId);
  const dirPayload = {
    title: direction.title,
    description: direction.description,
    tags: direction.tags,
  };
  await dbActs.recordWorkflowEvent({
    workflowId: wfId, kind: "log",
    message: "已载入方向上下文与创始人画像",
    payload: { title: direction.title, tags: direction.tags },
  });

  // Mark all 4 rows RUNNING up-front so the UI can render their states immediately.
  await Promise.all(kinds.map(k =>
    dbActs.markValidationStart({ directionId: input.directionId, kind: k, workflowId: wfId })
  ));
  await dbActs.updateWorkflowRun({ id: wfId, currentActivity: "validating" });
  await dbActs.recordWorkflowEvent({
    workflowId: wfId, kind: "log",
    message: `${kinds.length} 个维度已排期 · 并行启动`,
    payload: { kinds: kinds.map(k => KIND_LABEL[k]) },
  });

  // Run each kind independently. The .catch ensures one failure doesn't abort the others.
  const runOne = async (kind: ValidationKind): Promise<{ kind: ValidationKind; ok: boolean; err?: string }> => {
    const label = KIND_LABEL[kind];
    await dbActs.recordWorkflowEvent({
      workflowId: wfId, kind: "activity_started", activity: `validate:${kind}`,
      message: `${label} · 调用 Helix 推理`,
    });
    try {
      let result;
      switch (kind) {
        case "market":      result = await acts.llmValidateMarket({ direction: dirPayload, profile, workflowId: wfId, userId: input.userId }); break;
        case "competitor":  result = await acts.llmValidateCompetitor({ direction: dirPayload, profile, workflowId: wfId, userId: input.userId }); break;
        case "feasibility": result = await acts.llmValidateFeasibility({ direction: dirPayload, profile, workflowId: wfId, userId: input.userId }); break;
        case "user":        result = await acts.llmValidateUser({ direction: dirPayload, profile, workflowId: wfId, userId: input.userId }); break;
      }
      await dbActs.recordWorkflowEvent({
        workflowId: wfId, kind: "log", activity: `validate:${kind}`,
        message: `${label} · 结论解析完成 · 正在写入`,
      });
      await acts.markValidationDone({ directionId: input.directionId, kind, result });
      await dbActs.recordWorkflowEvent({
        workflowId: wfId, kind: "activity_completed", activity: `validate:${kind}`,
        message: `${label}完成 · 结论已落库`,
      });
      return { kind, ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await acts.markValidationFail({ directionId: input.directionId, kind, error: msg });
      await dbActs.recordWorkflowEvent({
        workflowId: wfId, kind: "log", activity: `validate:${kind}`,
        message: `${label}失败`,
        payload: { error: msg },
      });
      return { kind, ok: false, err: msg };
    }
  };

  const results = await Promise.all(kinds.map(runOne));
  const completed = results.filter(r => r.ok).map(r => r.kind);
  const failed = results.filter(r => !r.ok).map(r => r.kind);

  const output: ValidateDirectionOutput = {
    directionId: input.directionId,
    completed, failed,
  };

  // If everything failed, surface as workflow FAILED so the UI gets a clear signal.
  const allFailed = completed.length === 0;
  await dbActs.updateWorkflowRun({
    id: wfId,
    status: allFailed ? "FAILED" : "COMPLETED",
    error: allFailed ? "all 4 validations failed" : null,
    currentActivity: null,
    output,
    finishedAtIso: new Date().toISOString(),
  });
  await dbActs.recordWorkflowEvent({
    workflowId: wfId,
    kind: allFailed ? "workflow_failed" : "workflow_completed",
    message: allFailed
      ? "论证失败 · 4 个维度均未完成"
      : `论证完成 · ${completed.length} 个维度成功${failed.length > 0 ? ` · ${failed.length} 个失败` : ""}`,
    payload: output,
  });

  if (allFailed) throw ApplicationFailure.create({ message: "all 4 validations failed", nonRetryable: true });
  return output;
}
