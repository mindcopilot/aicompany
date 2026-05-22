// 业务线上化 design workflow.
//
// After a direction passes 4-维 validation, this workflow designs how the
// business actually runs online. Two design kinds run in parallel — 产品运营体系
// (operations) and 流量获取 (traffic) — each writes its own business_designs row
// and, on success, emits delivery_tickets handed to 内容工厂 / 流量分发.
//
// Mirrors validate-direction.ts: independent .catch per kind so one LLM failure
// doesn't sink the other, and the UI can render partial completion.

import { proxyActivities, workflowInfo, ApplicationFailure } from "@temporalio/workflow";
import type * as Activities from "../activities/index.js";
import type { DesignKind } from "../../types.js";

const acts = proxyActivities<typeof Activities>({
  startToCloseTimeout: "180 seconds",
  retry: { maximumAttempts: 2, initialInterval: "3s", maximumInterval: "20s" },
});
const dbActs = proxyActivities<typeof Activities>({
  startToCloseTimeout: "15 seconds",
  retry: { maximumAttempts: 5, initialInterval: "1s" },
});

export interface DesignBusinessInput {
  userId: string;
  directionId: string;
  kinds?: DesignKind[];                       // default: both
}
export interface DesignBusinessOutput {
  directionId: string;
  completed: DesignKind[];
  failed: DesignKind[];
  ticketsCreated: number;
}

const ALL_KINDS: DesignKind[] = ["operations", "traffic"];
const KIND_LABEL: Record<DesignKind, string> = {
  operations: "产品运营体系",
  traffic:    "流量获取",
};

export async function designBusinessWorkflow(input: DesignBusinessInput): Promise<DesignBusinessOutput> {
  const info = workflowInfo();
  const wfId = info.workflowId;
  const kinds = input.kinds && input.kinds.length > 0 ? input.kinds : ALL_KINDS;

  await dbActs.ensureWorkflowRun({
    id: wfId,
    runId: info.runId,
    workflowType: "designBusiness",
    trigger: info.parent ? "parent:" + info.parent.workflowId : "user:design_business",
    userId: input.userId,
    input,
  });
  await dbActs.updateWorkflowRun({ id: wfId, status: "RUNNING", currentActivity: "loadContext" });
  await dbActs.recordWorkflowEvent({
    workflowId: wfId, kind: "workflow_started",
    message: "Helix 接管 · 启动业务线上化设计",
  });

  const direction = await acts.loadMyDirection(input.directionId);
  const profile = await acts.loadFounderProfile(input.userId);
  const validations = await acts.loadDirectionValidations(input.directionId);
  const dirPayload = {
    title: direction.title,
    description: direction.description,
    tags: direction.tags,
  };
  await dbActs.recordWorkflowEvent({
    workflowId: wfId, kind: "log",
    message: "已载入方向、创始人画像与论证结论",
    payload: {
      title: direction.title,
      validatedDimensions: validations.filter(v => v.status === "COMPLETED").length,
    },
  });

  // Seed both rows RUNNING up-front so the UI can render their states at once.
  await Promise.all(kinds.map(k =>
    dbActs.markDesignStart({ directionId: input.directionId, kind: k, workflowId: wfId })
  ));
  await dbActs.updateWorkflowRun({ id: wfId, currentActivity: "designing" });
  await dbActs.recordWorkflowEvent({
    workflowId: wfId, kind: "log",
    message: `${kinds.length} 项设计已排期 · 并行启动`,
    payload: { kinds: kinds.map(k => KIND_LABEL[k]) },
  });

  const runOne = async (
    kind: DesignKind,
  ): Promise<{ kind: DesignKind; ok: boolean; tickets: number; err?: string }> => {
    const label = KIND_LABEL[kind];
    await dbActs.recordWorkflowEvent({
      workflowId: wfId, kind: "activity_started", activity: `design:${kind}`,
      message: `${label}设计 · 调用 Helix 推理`,
    });
    try {
      const result = kind === "operations"
        ? await acts.llmDesignOperations({ direction: dirPayload, profile, validations, workflowId: wfId, userId: input.userId })
        : await acts.llmDesignTraffic({ direction: dirPayload, profile, validations, workflowId: wfId, userId: input.userId });

      await dbActs.recordWorkflowEvent({
        workflowId: wfId, kind: "log", activity: `design:${kind}`,
        message: `${label}设计 · 方案解析完成 · 正在写入`,
      });
      await dbActs.markDesignDone({ directionId: input.directionId, kind, result });

      const tickets = await dbActs.writeDeliveryTickets({
        directionId: input.directionId,
        sourceKind: kind,
        deliverables: result.deliverables,
      });
      await dbActs.recordWorkflowEvent({
        workflowId: wfId, kind: "activity_completed", activity: `design:${kind}`,
        message: `${label}设计完成 · 生成 ${tickets} 张交付工单`,
      });
      return { kind, ok: true, tickets };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await dbActs.markDesignFail({ directionId: input.directionId, kind, error: msg });
      await dbActs.recordWorkflowEvent({
        workflowId: wfId, kind: "log", activity: `design:${kind}`,
        message: `${label}设计失败`,
        payload: { error: msg },
      });
      return { kind, ok: false, tickets: 0, err: msg };
    }
  };

  const results = await Promise.all(kinds.map(runOne));
  const completed = results.filter(r => r.ok).map(r => r.kind);
  const failed = results.filter(r => !r.ok).map(r => r.kind);
  const ticketsCreated = results.reduce((sum, r) => sum + r.tickets, 0);

  const output: DesignBusinessOutput = {
    directionId: input.directionId,
    completed, failed, ticketsCreated,
  };

  const allFailed = completed.length === 0;
  await dbActs.updateWorkflowRun({
    id: wfId,
    status: allFailed ? "FAILED" : "COMPLETED",
    error: allFailed ? "all designs failed" : null,
    currentActivity: null,
    output,
    finishedAtIso: new Date().toISOString(),
  });
  await dbActs.recordWorkflowEvent({
    workflowId: wfId,
    kind: allFailed ? "workflow_failed" : "workflow_completed",
    message: allFailed
      ? "业务线上化设计失败 · 全部维度未完成"
      : `业务线上化设计完成 · ${completed.length} 项成功 · 交付 ${ticketsCreated} 张工单`,
    payload: output,
  });

  if (allFailed) throw ApplicationFailure.create({ message: "all designs failed", nonRetryable: true });
  return output;
}
