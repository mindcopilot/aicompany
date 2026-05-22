// DB-side activities. Workflows must never touch pg directly (workflows are
// deterministic + sandboxed); all I/O goes through activities.

import {
  getFounderProfile,
  upsertDirections as dbUpsertDirections,
  updateWorkflowRun as dbUpdateWorkflowRun,
  appendWorkflowEvent as dbAppendWorkflowEvent,
  appendCopilotMessage as dbAppendCopilotMessage,
  ensureWorkflowRun as dbEnsureWorkflowRun,
  getCopilotInit,
  getMyDirection as dbGetMyDirection,
  updateMyDirection as dbUpdateMyDirection,
  replaceTrendingDirections as dbReplaceTrending,
  upsertValidationStart as dbUpsertValidationStart,
  upsertValidationDone as dbUpsertValidationDone,
  upsertValidationFail as dbUpsertValidationFail,
} from "../../db/queries.js";
import type {
  Direction, FounderProfile, WorkflowStatus, CopilotMessage,
  MyDirection, DirectionEvaluation,
  ValidationKind, ValidationResult,
} from "../../types.js";

export async function ensureWorkflowRun(input: {
  id: string; runId: string; workflowType: string;
  trigger?: string | null; userId?: string | null; input: unknown;
}): Promise<void> {
  await dbEnsureWorkflowRun({
    id: input.id,
    runId: input.runId,
    workflowType: input.workflowType,
    trigger: input.trigger ?? null,
    userId: input.userId ?? null,
    input: input.input,
  });
}

export async function loadFounderProfile(userId: string): Promise<FounderProfile> {
  const p = await getFounderProfile(userId);
  if (!p) throw new Error(`founder profile not found for user ${userId}`);
  return p;
}

export async function upsertDirections(directions: Direction[]): Promise<void> {
  await dbUpsertDirections(directions);
}

export async function updateWorkflowRun(input: {
  id: string;
  status?: WorkflowStatus;
  currentActivity?: string | null;
  output?: unknown;
  error?: string | null;
  finishedAtIso?: string;
}): Promise<void> {
  await dbUpdateWorkflowRun(input.id, {
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.currentActivity !== undefined ? { currentActivity: input.currentActivity } : {}),
    ...(input.output !== undefined ? { output: input.output } : {}),
    ...(input.error !== undefined ? { error: input.error } : {}),
    ...(input.finishedAtIso ? { finishedAt: new Date(input.finishedAtIso) } : {}),
  });
}

export async function recordWorkflowEvent(input: {
  workflowId: string;
  kind: string;
  activity?: string | null;
  message?: string | null;
  payload?: unknown;
}): Promise<void> {
  await dbAppendWorkflowEvent({
    workflowId: input.workflowId,
    kind: input.kind,
    activity: input.activity ?? null,
    message: input.message ?? null,
    payload: input.payload,
  });
}

export async function loadCopilotHistory(sessionId: string, limit = 20): Promise<CopilotMessage[]> {
  const all = await getCopilotInit(sessionId);
  // Most recent N, oldest-first ordering preserved for prompt context.
  return all.slice(-limit);
}

export async function appendCopilotMessage(input: { sessionId: string; message: CopilotMessage }): Promise<void> {
  await dbAppendCopilotMessage(input.message, input.sessionId);
}

// ----------------------- Direction module helpers -----------------------

export async function loadMyDirection(id: string): Promise<MyDirection> {
  const d = await dbGetMyDirection(id);
  if (!d) throw new Error(`my_direction ${id} not found`);
  return d;
}

export async function saveDirectionEvaluation(input: {
  id: string; evaluation: DirectionEvaluation;
}): Promise<void> {
  await dbUpdateMyDirection(input.id, { evaluation: input.evaluation });
}

export async function replaceTrendingDirections(items: Array<{
  id: string; title: string; description?: string | null;
  source: string; sourceUrl?: string | null;
  scoreProxy?: number | null; meta?: Record<string, unknown> | null;
}>): Promise<void> {
  await dbReplaceTrending(items);
}

// ----------------------- Validation row helpers -----------------------

export async function markValidationStart(input: {
  directionId: string; kind: ValidationKind; workflowId: string;
}): Promise<void> {
  await dbUpsertValidationStart(input);
}

export async function markValidationDone(input: {
  directionId: string; kind: ValidationKind; result: ValidationResult;
}): Promise<void> {
  await dbUpsertValidationDone(input);
}

export async function markValidationFail(input: {
  directionId: string; kind: ValidationKind; error: string;
}): Promise<void> {
  await dbUpsertValidationFail(input);
}
