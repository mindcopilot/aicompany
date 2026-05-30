import { query } from "./pool.js";
import type {
  Company, Direction, PipelineStage, Channel, FunnelStep, ActivityItem, CopilotMessage,
  KnowledgeItem, PromptItem, SkillItem, AgentProfile, AgentRun, Automation,
  ContentTrack, ContentJob, ModelMatrix, LibraryItem,
  ManagedModel, ManagedModelCategory,
  FounderProfile, WorkflowRun, WorkflowEvent, WorkflowStatus,
  MyDirection, TrendingDirection, DirectionEvaluation,
  DirectionValidation, ValidationKind, ValidationStatus, ValidationResult,
  BusinessDesign, DesignKind, DesignStatus, DesignResult,
  DeliveryTicket, DeliveryTarget, DeliveryStatus,
} from "../types.js";

export async function getCompany(): Promise<Company> {
  const { rows } = await query<{
    name: string; short_name: string; stage: string; founded: string; team: string; thesis: string;
  }>("SELECT name, short_name, stage, founded, team, thesis FROM company WHERE id = 1");
  const r = rows[0];
  if (!r) throw new Error("company row missing — DB not seeded");
  return { name: r.name, shortName: r.short_name, stage: r.stage, founded: r.founded, team: r.team, thesis: r.thesis };
}

export async function getDirections(): Promise<Direction[]> {
  const { rows } = await query<{
    id: string; name: string; score: number; selected: boolean;
    tam: Direction["tam"]; growth: Direction["growth"]; competition: Direction["competition"]; fit: Direction["fit"];
    summary: string; why: string[] | null;
  }>(`SELECT id, name, score, selected, tam, growth, competition, fit, summary, why
      FROM directions ORDER BY position`);
  return rows.map(r => ({
    id: r.id, name: r.name, score: r.score, selected: r.selected,
    tam: r.tam, growth: r.growth, competition: r.competition, fit: r.fit,
    summary: r.summary, ...(r.why ? { why: r.why } : {}),
  }));
}

export async function getPipeline(): Promise<PipelineStage[]> {
  const { rows } = await query<{
    key: PipelineStage["key"]; step: string; title: string;
    status: PipelineStage["status"]; description: string; meta: string;
  }>("SELECT key, step, title, status, description, meta FROM pipeline_stages ORDER BY position");
  return rows.map(r => ({ key: r.key, step: r.step, title: r.title, status: r.status, desc: r.description, meta: r.meta }));
}

export async function getChannels(): Promise<Channel[]> {
  const { rows } = await query<{
    id: string; name: string; handle: string; color: string; letter: string;
    is_on: boolean; posts: number; reach: string; ctr: string;
  }>("SELECT id, name, handle, color, letter, is_on, posts, reach, ctr FROM channels ORDER BY position");
  return rows.map(r => ({
    id: r.id, name: r.name, handle: r.handle, color: r.color, letter: r.letter,
    on: r.is_on, posts: r.posts, reach: r.reach, ctr: r.ctr,
  }));
}

const CHANNEL_PALETTE = ["#ef4444", "#f97316", "#16a34a", "#0891b2", "#4f46e5", "#9333ea", "#db2777", "#0a0a0a"];

export async function createChannel(input: {
  name: string; handle: string; mode?: string;
}): Promise<Channel> {
  const id = `ch-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const { rows: posRows } = await query<{ max_pos: number | null }>(`SELECT MAX(position) AS max_pos FROM channels`);
  const position = (posRows[0]?.max_pos ?? -1) + 1;
  const color = CHANNEL_PALETTE[position % CHANNEL_PALETTE.length]!;
  const letter = input.name.trim().charAt(0).toUpperCase() || "?";
  const isOn = (input.mode ?? "").includes("自动");
  await query(
    `INSERT INTO channels (id, name, handle, color, letter, is_on, posts, reach, ctr, position)
     VALUES ($1,$2,$3,$4,$5,$6,0,'—','—',$7)`,
    [id, input.name, input.handle, color, letter, isOn, position]
  );
  return { id, name: input.name, handle: input.handle, color, letter, on: isOn, posts: 0, reach: "—", ctr: "—" };
}

export async function getFunnel(): Promise<FunnelStep[]> {
  const { rows } = await query<{ label: string; count: number; conv: string | null }>(
    "SELECT label, count, conv FROM funnel ORDER BY position"
  );
  return rows.map(r => ({ label: r.label, count: r.count, conv: r.conv }));
}

export async function getActivity(): Promise<ActivityItem[]> {
  const { rows } = await query<{
    t: string; who: string; ai: boolean; what: string; obj: string; extra: string | null;
  }>("SELECT t, who, ai, what, obj, extra FROM activity ORDER BY position");
  return rows.map(r => ({ t: r.t, who: r.who, ai: r.ai, what: r.what, obj: r.obj, ...(r.extra ? { extra: r.extra } : {}) }));
}

export async function getCopilotInit(sessionId = "default"): Promise<CopilotMessage[]> {
  const { rows } = await query<{
    from_role: CopilotMessage["from"]; text: string; tool: CopilotMessage["tool"] | null;
  }>(
    `SELECT from_role, text, tool FROM copilot_messages
     WHERE session_id = $1
     ORDER BY id ASC`,
    [sessionId]
  );
  return rows.map(r => ({ from: r.from_role, text: r.text, tool: r.tool ?? null }));
}

export async function appendCopilotMessage(
  m: CopilotMessage,
  sessionId = "default"
): Promise<void> {
  await query(
    `INSERT INTO copilot_messages (session_id, from_role, text, tool, is_seed)
     VALUES ($1, $2, $3, $4, FALSE)`,
    [sessionId, m.from, m.text, m.tool ? JSON.stringify(m.tool) : null]
  );
}

export async function getKnowledge(): Promise<KnowledgeItem[]> {
  const { rows } = await query<{
    id: string; kind: KnowledgeItem["kind"]; title: string; snippet: string;
    tags: string[]; refs: number; agent: string; time: string; source: string;
  }>("SELECT id, kind, title, snippet, tags, refs, agent, time, source FROM knowledge ORDER BY position");
  return rows.map(r => ({
    id: r.id, kind: r.kind, title: r.title, snippet: r.snippet,
    tags: r.tags, refs: r.refs, agent: r.agent, time: r.time, source: r.source,
  }));
}

export async function getPrompts(): Promise<PromptItem[]> {
  const { rows } = await query<{
    id: string; name: string; cat: string; version: string; calls: number; success: number;
    description: string; vars: string[]; used_by: PromptItem["usedBy"]; body: string;
  }>(`SELECT id, name, cat, version, calls, success, description, vars, used_by, body
      FROM prompts ORDER BY position`);
  return rows.map(r => ({
    id: r.id, name: r.name, cat: r.cat, version: r.version, calls: r.calls, success: r.success,
    desc: r.description, vars: r.vars, usedBy: r.used_by, body: r.body,
  }));
}

export async function getSkills(): Promise<SkillItem[]> {
  const { rows } = await query<{
    id: string; name: string; emoji: string; cat: string; description: string;
    tools: string[]; input: string; output: string; calls: number; success: number; agents: SkillItem["agents"];
  }>(`SELECT id, name, emoji, cat, description, tools, input, output, calls, success, agents
      FROM skills ORDER BY position`);
  return rows.map(r => ({
    id: r.id, name: r.name, emoji: r.emoji, cat: r.cat, desc: r.description,
    tools: r.tools, input: r.input, output: r.output, calls: r.calls, success: r.success, agents: r.agents,
  }));
}

export async function getAgents(): Promise<AgentProfile[]> {
  const { rows } = await query<{
    id: string; name: AgentProfile["name"]; role: string; color: string; mood: string;
    busy: boolean; task_now: string;
    skills: string[]; prompts: string[]; sources: string[];
    schedule: string; today: AgentProfile["today"];
  }>(`SELECT id, name, role, color, mood, busy, task_now, skills, prompts, sources, schedule, today
      FROM agents ORDER BY position`);
  return rows.map(r => ({
    id: r.id, name: r.name, role: r.role, color: r.color, mood: r.mood, busy: r.busy,
    taskNow: r.task_now, skills: r.skills, prompts: r.prompts, sources: r.sources,
    schedule: r.schedule, today: r.today,
  }));
}

export async function getRunsToday(): Promise<AgentRun[]> {
  const { rows } = await query<{ agent: AgentRun["agent"]; start_h: string; end_h: string; label: string }>(
    "SELECT agent, start_h, end_h, label FROM agent_runs_today ORDER BY position"
  );
  return rows.map(r => ({ agent: r.agent, start: Number(r.start_h), end: Number(r.end_h), label: r.label }));
}

export async function getAutomations(): Promise<Automation[]> {
  const { rows } = await query<{
    id: string; name: string; is_on: boolean; runs: number; last_run: string;
    trigger: Automation["trigger"]; steps: Automation["steps"]; saved: string;
  }>(`SELECT id, name, is_on, runs, last_run, trigger, steps, saved FROM automations ORDER BY position`);
  return rows.map(r => ({
    id: r.id, name: r.name, on: r.is_on, runs: r.runs, lastRun: r.last_run,
    trigger: r.trigger, steps: r.steps, saved: r.saved,
  }));
}

export async function getTracks(): Promise<ContentTrack[]> {
  const { rows } = await query<{
    id: ContentTrack["id"]; name: string; icon: string; color: string; description: string;
    best_for: string; duration: string; typical_cost: string;
  }>(`SELECT id, name, icon, color, description, best_for, duration, typical_cost FROM content_tracks ORDER BY position`);
  return rows.map(r => ({
    id: r.id, name: r.name, icon: r.icon, color: r.color, desc: r.description,
    bestFor: r.best_for, duration: r.duration, typicalCost: r.typical_cost,
  }));
}

export async function getJobs(): Promise<ContentJob[]> {
  const { rows } = await query<{
    id: string; track: ContentJob["track"]; title: string; status: ContentJob["status"];
    progress: number; eta: string; model: string; phase: string; agent: ContentJob["agent"]; cost: string;
  }>(`SELECT id, track, title, status, progress, eta, model, phase, agent, cost FROM content_jobs ORDER BY position`);
  return rows.map(r => ({
    id: r.id, track: r.track, title: r.title, status: r.status, progress: r.progress,
    eta: r.eta, model: r.model, phase: r.phase, agent: r.agent, cost: r.cost,
  }));
}

const TRACK_DEFAULT_AGENT: Record<ContentJob["track"], ContentJob["agent"]> = {
  article: "Nova", short: "Atlas", longvid: "Nova",
  audio: "Nova", image: "Nova", post: "Atlas",
};

export async function createJob(input: {
  track: ContentJob["track"]; title: string; agent?: ContentJob["agent"]; note?: string;
}): Promise<ContentJob> {
  const id = genId("j");
  const { rows: trackRow } = await query<{ best_for: string }>(
    `SELECT best_for FROM content_tracks WHERE id = $1`, [input.track]
  );
  const model = trackRow[0]?.best_for ?? "AI 自动路由";
  const agent = input.agent ?? TRACK_DEFAULT_AGENT[input.track];
  const phase = input.note?.trim() ? input.note.trim() : "排队等待启动";
  const position = await nextJobPosition();
  await query(
    `INSERT INTO content_jobs (id, track, title, status, progress, eta, model, phase, agent, cost, position)
     VALUES ($1,$2,$3,'queued',0,'排队中',$4,$5,$6,'—',$7)`,
    [id, input.track, input.title, model, phase, agent, position]
  );
  return {
    id, track: input.track, title: input.title, status: "queued", progress: 0,
    eta: "排队中", model, phase, agent, cost: "—",
  };
}

async function nextJobPosition(): Promise<number> {
  const { rows } = await query<{ max_pos: number | null }>(`SELECT MAX(position) AS max_pos FROM content_jobs`);
  return (rows[0]?.max_pos ?? -1) + 1;
}

export async function getModels(): Promise<ModelMatrix[]> {
  const { rows } = await query<{
    name: string; vendor: string; uses: string[]; rating: number; strengths: string;
    cost: string; calls: number; color: string;
  }>(`SELECT name, vendor, uses, rating, strengths, cost, calls, color FROM content_models ORDER BY position`);
  return rows.map(r => ({
    name: r.name, vendor: r.vendor, uses: r.uses, rating: r.rating,
    strengths: r.strengths, cost: r.cost, calls: r.calls, color: r.color,
  }));
}

// ============================================================================
// Founder profile
// ============================================================================

export async function getFounderProfile(userId: string): Promise<FounderProfile | null> {
  const { rows } = await query<{ profile: FounderProfile }>(
    "SELECT profile FROM founder_profiles WHERE user_id = $1",
    [userId]
  );
  return rows[0]?.profile ?? null;
}

export async function saveFounderProfile(userId: string, profile: FounderProfile): Promise<void> {
  await query(
    `INSERT INTO founder_profiles (user_id, profile, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (user_id) DO UPDATE SET profile = EXCLUDED.profile, updated_at = NOW()`,
    [userId, JSON.stringify(profile)]
  );
}

// ============================================================================
// Directions upsert (writes from workflows)
// ============================================================================

export async function upsertDirections(directions: Direction[]): Promise<void> {
  if (directions.length === 0) return;
  // Replace all directions atomically so the scan produces a coherent set.
  // Preserve old IDs that aren't in the new list? No — a fresh scan is authoritative.
  await query("DELETE FROM directions");
  for (let i = 0; i < directions.length; i++) {
    const d = directions[i]!;
    await query(
      `INSERT INTO directions (id, name, score, selected, tam, growth, competition, fit, summary, why, position)
       VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb,$8::jsonb,$9,$10,$11)`,
      [
        d.id, d.name, d.score, !!d.selected,
        JSON.stringify(d.tam), JSON.stringify(d.growth), JSON.stringify(d.competition), JSON.stringify(d.fit),
        d.summary, d.why ? JSON.stringify(d.why) : null, i,
      ]
    );
  }
}

// ============================================================================
// My directions (user-recorded creative ideas)
// ============================================================================

interface MyDirectionRow {
  id: string; user_id: string; title: string; description: string | null;
  tags: string[]; source: string; evaluation: DirectionEvaluation | null;
  position: number; created_at: Date; updated_at: Date;
}
const rowToMyDir = (r: MyDirectionRow): MyDirection => ({
  id: r.id, userId: r.user_id, title: r.title, description: r.description,
  tags: r.tags, source: r.source, evaluation: r.evaluation,
  position: r.position,
  createdAt: r.created_at.toISOString(), updatedAt: r.updated_at.toISOString(),
});

export async function listMyDirections(userId: string): Promise<MyDirection[]> {
  const { rows } = await query<MyDirectionRow>(
    `SELECT * FROM my_directions WHERE user_id = $1 ORDER BY position ASC, created_at ASC`,
    [userId]
  );
  return rows.map(rowToMyDir);
}

export async function getMyDirection(id: string): Promise<MyDirection | null> {
  const { rows } = await query<MyDirectionRow>(
    `SELECT * FROM my_directions WHERE id = $1`,
    [id]
  );
  return rows[0] ? rowToMyDir(rows[0]) : null;
}

export async function createMyDirection(input: {
  id?: string; userId: string; title: string; description?: string | null;
  tags?: string[]; source?: string;
}): Promise<MyDirection> {
  const id = input.id ?? `md-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const { rows: posRows } = await query<{ max_pos: number | null }>(
    `SELECT MAX(position) AS max_pos FROM my_directions WHERE user_id = $1`,
    [input.userId]
  );
  const position = (posRows[0]?.max_pos ?? -1) + 1;
  const { rows } = await query<MyDirectionRow>(
    `INSERT INTO my_directions (id, user_id, title, description, tags, source, position)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
     RETURNING *`,
    [id, input.userId, input.title, input.description ?? null,
     JSON.stringify(input.tags ?? []), input.source ?? "user", position]
  );
  return rowToMyDir(rows[0]!);
}

export async function updateMyDirection(id: string, patch: {
  title?: string; description?: string | null; tags?: string[]; evaluation?: DirectionEvaluation | null;
}): Promise<MyDirection | null> {
  const sets: string[] = ["updated_at = NOW()"];
  const values: unknown[] = [id];
  let i = 2;
  if (patch.title !== undefined)       { sets.push(`title = $${i++}`);             values.push(patch.title); }
  if (patch.description !== undefined) { sets.push(`description = $${i++}`);       values.push(patch.description); }
  if (patch.tags !== undefined)        { sets.push(`tags = $${i++}::jsonb`);       values.push(JSON.stringify(patch.tags)); }
  if (patch.evaluation !== undefined)  { sets.push(`evaluation = $${i++}::jsonb`); values.push(patch.evaluation === null ? null : JSON.stringify(patch.evaluation)); }
  const { rows } = await query<MyDirectionRow>(
    `UPDATE my_directions SET ${sets.join(", ")} WHERE id = $1 RETURNING *`,
    values
  );
  return rows[0] ? rowToMyDir(rows[0]) : null;
}

export async function deleteMyDirection(id: string): Promise<void> {
  await query(`DELETE FROM my_directions WHERE id = $1`, [id]);
}

// ============================================================================
// Trending directions (externally-sourced via agent-reach)
// ============================================================================

interface TrendingRow {
  id: string; title: string; description: string | null;
  source: string; source_url: string | null;
  score_proxy: string | null;             // pg numeric → string
  meta: Record<string, unknown> | null;
  fetched_at: Date;
}
const rowToTrending = (r: TrendingRow): TrendingDirection => ({
  id: r.id, title: r.title, description: r.description,
  source: r.source, sourceUrl: r.source_url,
  scoreProxy: r.score_proxy === null ? null : Number(r.score_proxy),
  meta: r.meta, fetchedAt: r.fetched_at.toISOString(),
});

export async function listTrendingDirections(limit = 30): Promise<TrendingDirection[]> {
  const { rows } = await query<TrendingRow>(
    `SELECT * FROM trending_directions ORDER BY fetched_at DESC, score_proxy DESC NULLS LAST LIMIT $1`,
    [limit]
  );
  return rows.map(rowToTrending);
}

export async function replaceTrendingDirections(items: Array<{
  id: string; title: string; description?: string | null;
  source: string; sourceUrl?: string | null;
  scoreProxy?: number | null; meta?: Record<string, unknown> | null;
}>): Promise<void> {
  // Atomic replace so the section never shows a half-refreshed mix of old + new.
  await query("DELETE FROM trending_directions");
  for (const it of items) {
    await query(
      `INSERT INTO trending_directions (id, title, description, source, source_url, score_proxy, meta)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title, description = EXCLUDED.description,
         source = EXCLUDED.source, source_url = EXCLUDED.source_url,
         score_proxy = EXCLUDED.score_proxy, meta = EXCLUDED.meta,
         fetched_at = NOW()`,
      [it.id, it.title, it.description ?? null, it.source, it.sourceUrl ?? null,
       it.scoreProxy ?? null, it.meta ? JSON.stringify(it.meta) : null]
    );
  }
}

export async function getTrendingDirection(id: string): Promise<TrendingDirection | null> {
  const { rows } = await query<TrendingRow>(
    `SELECT * FROM trending_directions WHERE id = $1`, [id]
  );
  return rows[0] ? rowToTrending(rows[0]) : null;
}

// ============================================================================
// Direction validations
// ============================================================================

interface ValidationRow {
  direction_id: string; kind: ValidationKind; status: ValidationStatus;
  workflow_id: string | null; result: ValidationResult | null; error: string | null;
  started_at: Date; finished_at: Date | null;
}
const rowToValidation = (r: ValidationRow): DirectionValidation => ({
  directionId: r.direction_id, kind: r.kind, status: r.status,
  workflowId: r.workflow_id, result: r.result, error: r.error,
  startedAt: r.started_at.toISOString(),
  finishedAt: r.finished_at ? r.finished_at.toISOString() : null,
});

export async function listDirectionValidations(directionId: string): Promise<DirectionValidation[]> {
  const { rows } = await query<ValidationRow>(
    `SELECT * FROM direction_validations WHERE direction_id = $1 ORDER BY kind`,
    [directionId]
  );
  return rows.map(rowToValidation);
}

export async function upsertValidationStart(input: {
  directionId: string; kind: ValidationKind; workflowId: string;
}): Promise<void> {
  await query(
    `INSERT INTO direction_validations (direction_id, kind, status, workflow_id, result, error, started_at, finished_at)
     VALUES ($1, $2, 'RUNNING', $3, NULL, NULL, NOW(), NULL)
     ON CONFLICT (direction_id, kind) DO UPDATE SET
       status = 'RUNNING', workflow_id = EXCLUDED.workflow_id,
       result = NULL, error = NULL, started_at = NOW(), finished_at = NULL`,
    [input.directionId, input.kind, input.workflowId]
  );
}

export async function upsertValidationDone(input: {
  directionId: string; kind: ValidationKind; result: ValidationResult;
}): Promise<void> {
  await query(
    `UPDATE direction_validations
     SET status = 'COMPLETED', result = $3::jsonb, error = NULL, finished_at = NOW()
     WHERE direction_id = $1 AND kind = $2`,
    [input.directionId, input.kind, JSON.stringify(input.result)]
  );
}

export async function upsertValidationFail(input: {
  directionId: string; kind: ValidationKind; error: string;
}): Promise<void> {
  await query(
    `UPDATE direction_validations
     SET status = 'FAILED', error = $3, finished_at = NOW()
     WHERE direction_id = $1 AND kind = $2`,
    [input.directionId, input.kind, input.error]
  );
}

// ============================================================================
// 业务线上化 designs + delivery tickets
// ============================================================================

interface DesignRow {
  direction_id: string; kind: DesignKind; status: DesignStatus;
  workflow_id: string | null; result: DesignResult | null; error: string | null;
  started_at: Date; finished_at: Date | null;
}
const rowToDesign = (r: DesignRow): BusinessDesign => ({
  directionId: r.direction_id, kind: r.kind, status: r.status,
  workflowId: r.workflow_id, result: r.result, error: r.error,
  startedAt: r.started_at.toISOString(),
  finishedAt: r.finished_at ? r.finished_at.toISOString() : null,
});

export async function listBusinessDesigns(directionId: string): Promise<BusinessDesign[]> {
  const { rows } = await query<DesignRow>(
    `SELECT * FROM business_designs WHERE direction_id = $1 ORDER BY kind`,
    [directionId]
  );
  return rows.map(rowToDesign);
}

export async function upsertDesignStart(input: {
  directionId: string; kind: DesignKind; workflowId: string;
}): Promise<void> {
  await query(
    `INSERT INTO business_designs (direction_id, kind, status, workflow_id, result, error, started_at, finished_at)
     VALUES ($1, $2, 'RUNNING', $3, NULL, NULL, NOW(), NULL)
     ON CONFLICT (direction_id, kind) DO UPDATE SET
       status = 'RUNNING', workflow_id = EXCLUDED.workflow_id,
       result = NULL, error = NULL, started_at = NOW(), finished_at = NULL`,
    [input.directionId, input.kind, input.workflowId]
  );
}

export async function upsertDesignDone(input: {
  directionId: string; kind: DesignKind; result: DesignResult;
}): Promise<void> {
  await query(
    `UPDATE business_designs
     SET status = 'COMPLETED', result = $3::jsonb, error = NULL, finished_at = NOW()
     WHERE direction_id = $1 AND kind = $2`,
    [input.directionId, input.kind, JSON.stringify(input.result)]
  );
}

export async function upsertDesignFail(input: {
  directionId: string; kind: DesignKind; error: string;
}): Promise<void> {
  await query(
    `UPDATE business_designs
     SET status = 'FAILED', error = $3, finished_at = NOW()
     WHERE direction_id = $1 AND kind = $2`,
    [input.directionId, input.kind, input.error]
  );
}

interface DeliveryRow {
  id: string; direction_id: string; target: DeliveryTarget; source_kind: DesignKind;
  title: string; detail: string | null; status: DeliveryStatus; created_at: Date;
}
const rowToTicket = (r: DeliveryRow): DeliveryTicket => ({
  id: r.id, directionId: r.direction_id, target: r.target, sourceKind: r.source_kind,
  title: r.title, detail: r.detail, status: r.status,
  createdAt: r.created_at.toISOString(),
});

/** Replace every ticket produced by one (direction, sourceKind) design. */
export async function replaceDeliveryTickets(input: {
  directionId: string; sourceKind: DesignKind;
  tickets: Array<{ id: string; target: DeliveryTarget; title: string; detail: string }>;
}): Promise<void> {
  await query(
    `DELETE FROM delivery_tickets WHERE direction_id = $1 AND source_kind = $2`,
    [input.directionId, input.sourceKind]
  );
  for (const t of input.tickets) {
    await query(
      `INSERT INTO delivery_tickets (id, direction_id, target, source_kind, title, detail, status)
       VALUES ($1,$2,$3,$4,$5,$6,'pending')`,
      [t.id, input.directionId, t.target, input.sourceKind, t.title, t.detail]
    );
  }
}

export async function listDeliveryTickets(target?: DeliveryTarget): Promise<DeliveryTicket[]> {
  const { rows } = target
    ? await query<DeliveryRow>(
        `SELECT * FROM delivery_tickets WHERE target = $1 ORDER BY created_at DESC`, [target])
    : await query<DeliveryRow>(
        `SELECT * FROM delivery_tickets ORDER BY created_at DESC`);
  return rows.map(rowToTicket);
}

export async function updateDeliveryTicketStatus(
  id: string, status: DeliveryStatus,
): Promise<DeliveryTicket | null> {
  const { rows } = await query<DeliveryRow>(
    `UPDATE delivery_tickets SET status = $2 WHERE id = $1 RETURNING *`,
    [id, status]
  );
  return rows[0] ? rowToTicket(rows[0]) : null;
}

// ============================================================================
// Workflow runs + events
// ============================================================================

interface WorkflowRunRow {
  id: string; run_id: string; workflow_type: string; status: WorkflowStatus;
  trigger: string | null; user_id: string | null;
  input: unknown; output: unknown; error: string | null;
  current_activity: string | null; langfuse_trace_id: string | null;
  started_at: Date; finished_at: Date | null;
}

const rowToRun = (r: WorkflowRunRow): WorkflowRun => ({
  id: r.id, runId: r.run_id, workflowType: r.workflow_type, status: r.status,
  trigger: r.trigger, userId: r.user_id,
  input: r.input, output: r.output, error: r.error,
  currentActivity: r.current_activity, langfuseTraceId: r.langfuse_trace_id,
  startedAt: r.started_at.toISOString(),
  finishedAt: r.finished_at ? r.finished_at.toISOString() : null,
});

export async function createWorkflowRun(input: {
  id: string; runId: string; workflowType: string;
  trigger?: string | null; userId?: string | null;
  input: unknown; langfuseTraceId?: string | null;
}): Promise<WorkflowRun> {
  const { rows } = await query<WorkflowRunRow>(
    `INSERT INTO workflow_runs (id, run_id, workflow_type, status, trigger, user_id, input, langfuse_trace_id)
     VALUES ($1,$2,$3,'PENDING',$4,$5,$6::jsonb,$7)
     RETURNING *`,
    [input.id, input.runId, input.workflowType, input.trigger ?? null, input.userId ?? null,
     JSON.stringify(input.input), input.langfuseTraceId ?? null]
  );
  return rowToRun(rows[0]!);
}

/** Idempotent — workflows call this to self-register when started as children. */
export async function ensureWorkflowRun(input: {
  id: string; runId: string; workflowType: string;
  trigger?: string | null; userId?: string | null;
  input: unknown;
}): Promise<void> {
  await query(
    `INSERT INTO workflow_runs (id, run_id, workflow_type, status, trigger, user_id, input)
     VALUES ($1,$2,$3,'PENDING',$4,$5,$6::jsonb)
     ON CONFLICT (id) DO NOTHING`,
    [input.id, input.runId, input.workflowType, input.trigger ?? null, input.userId ?? null,
     JSON.stringify(input.input)]
  );
}

export async function updateWorkflowRun(id: string, patch: {
  status?: WorkflowStatus; output?: unknown; error?: string | null;
  currentActivity?: string | null; finishedAt?: Date;
}): Promise<void> {
  const sets: string[] = [];
  const values: unknown[] = [id];
  let i = 2;
  if (patch.status !== undefined)         { sets.push(`status = $${i++}`);            values.push(patch.status); }
  if (patch.output !== undefined)         { sets.push(`output = $${i++}::jsonb`);     values.push(JSON.stringify(patch.output)); }
  if (patch.error !== undefined)          { sets.push(`error = $${i++}`);             values.push(patch.error); }
  if (patch.currentActivity !== undefined){ sets.push(`current_activity = $${i++}`);  values.push(patch.currentActivity); }
  if (patch.finishedAt !== undefined)     { sets.push(`finished_at = $${i++}`);       values.push(patch.finishedAt); }
  if (sets.length === 0) return;
  await query(`UPDATE workflow_runs SET ${sets.join(", ")} WHERE id = $1`, values);
}

export async function getWorkflowRun(id: string): Promise<WorkflowRun | null> {
  const { rows } = await query<WorkflowRunRow>(
    "SELECT * FROM workflow_runs WHERE id = $1",
    [id]
  );
  return rows[0] ? rowToRun(rows[0]) : null;
}

export async function listWorkflowRuns(opts?: {
  status?: WorkflowStatus; workflowType?: string; limit?: number;
}): Promise<WorkflowRun[]> {
  const limit = Math.min(opts?.limit ?? 100, 300);
  const where: string[] = [];
  const values: unknown[] = [];
  if (opts?.status)       { values.push(opts.status);       where.push(`status = $${values.length}`); }
  if (opts?.workflowType) { values.push(opts.workflowType); where.push(`workflow_type = $${values.length}`); }
  values.push(limit);
  const { rows } = await query<WorkflowRunRow>(
    `SELECT * FROM workflow_runs
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY started_at DESC
     LIMIT $${values.length}`,
    values
  );
  return rows.map(rowToRun);
}

export async function appendWorkflowEvent(input: {
  workflowId: string; kind: string; activity?: string | null;
  message?: string | null; payload?: unknown;
}): Promise<void> {
  await query(
    `INSERT INTO workflow_events (workflow_id, kind, activity, message, payload)
     VALUES ($1, $2, $3, $4, $5::jsonb)`,
    [input.workflowId, input.kind, input.activity ?? null, input.message ?? null,
     input.payload === undefined ? null : JSON.stringify(input.payload)]
  );
}

export async function listWorkflowEvents(workflowId: string, limit = 50): Promise<WorkflowEvent[]> {
  const { rows } = await query<{
    id: string; ts: Date; kind: string; activity: string | null;
    message: string | null; payload: unknown;
  }>(
    `SELECT id, ts, kind, activity, message, payload
     FROM workflow_events
     WHERE workflow_id = $1
     ORDER BY ts ASC, id ASC
     LIMIT $2`,
    [workflowId, limit]
  );
  return rows.map(r => ({
    id: String(r.id), ts: r.ts.toISOString(),
    kind: r.kind, activity: r.activity, message: r.message, payload: r.payload,
  }));
}

// ============================================================================
// AI assets CRUD — knowledge / prompts / skills / agents / automations.
// These power the "AI 资产" module so entries created in the UI persist.
// ============================================================================

function genId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

async function nextPosition(table: "knowledge" | "prompts" | "skills" | "agents" | "automations"): Promise<number> {
  const { rows } = await query<{ max_pos: number | null }>(`SELECT MAX(position) AS max_pos FROM ${table}`);
  return (rows[0]?.max_pos ?? -1) + 1;
}

export async function createKnowledge(input: {
  kind: KnowledgeItem["kind"]; title: string; snippet: string; tags?: string[]; source?: string;
}): Promise<KnowledgeItem> {
  const id = genId("k");
  const position = await nextPosition("knowledge");
  await query(
    `INSERT INTO knowledge (id, kind, title, snippet, tags, refs, agent, time, source, position)
     VALUES ($1,$2,$3,$4,$5::jsonb,0,'Helix','刚刚',$6,$7)`,
    [id, input.kind, input.title, input.snippet, JSON.stringify(input.tags ?? []), input.source ?? "手动录入", position]
  );
  return {
    id, kind: input.kind, title: input.title, snippet: input.snippet,
    tags: input.tags ?? [], refs: 0, agent: "Helix", time: "刚刚", source: input.source ?? "手动录入",
  };
}

export async function deleteKnowledge(id: string): Promise<boolean> {
  const { rowCount } = await query(`DELETE FROM knowledge WHERE id = $1`, [id]);
  return (rowCount ?? 0) > 0;
}

export async function createPrompt(input: {
  name: string; cat: string; body: string; vars?: string[]; desc?: string;
}): Promise<PromptItem> {
  const id = genId("p");
  const position = await nextPosition("prompts");
  const vars = input.vars ?? [];
  const desc = input.desc ?? "用户创建的 prompt。";
  await query(
    `INSERT INTO prompts (id, name, cat, version, calls, success, description, vars, used_by, body, position)
     VALUES ($1,$2,$3,'v1.0',0,0,$4,$5::jsonb,'[]'::jsonb,$6,$7)`,
    [id, input.name, input.cat, desc, JSON.stringify(vars), input.body, position]
  );
  return { id, name: input.name, cat: input.cat, version: "v1.0", calls: 0, success: 0,
    desc, vars, usedBy: [], body: input.body };
}

export async function deletePrompt(id: string): Promise<boolean> {
  const { rowCount } = await query(`DELETE FROM prompts WHERE id = $1`, [id]);
  return (rowCount ?? 0) > 0;
}

export async function createSkill(input: {
  name: string; cat: string; input: string; output: string; desc?: string; emoji?: string;
}): Promise<SkillItem> {
  const id = genId("s");
  const position = await nextPosition("skills");
  const desc = input.desc ?? "用户注册的 Skill。";
  const emoji = input.emoji ?? "🧩";
  await query(
    `INSERT INTO skills (id, name, emoji, cat, description, tools, input, output, calls, success, agents, position)
     VALUES ($1,$2,$3,$4,$5,'[]'::jsonb,$6,$7,0,0,'[]'::jsonb,$8)`,
    [id, input.name, emoji, input.cat, desc, input.input, input.output, position]
  );
  return { id, name: input.name, emoji, cat: input.cat, desc, tools: [],
    input: input.input, output: input.output, calls: 0, success: 0, agents: [] };
}

export async function deleteSkill(id: string): Promise<boolean> {
  const { rowCount } = await query(`DELETE FROM skills WHERE id = $1`, [id]);
  return (rowCount ?? 0) > 0;
}

export async function createAgent(input: {
  name: string; role: string; schedule: string;
}): Promise<AgentProfile> {
  const id = genId("ag");
  const position = await nextPosition("agents");
  const palette = ["#4f46e5", "#0891b2", "#9333ea", "#16a34a", "#ea580c", "#0d9488"];
  const color = palette[position % palette.length]!;
  const today = { tasks: 0, success: 0, hours: 0 };
  await query(
    `INSERT INTO agents (id, name, role, color, mood, busy, task_now, skills, prompts, sources, schedule, today, position)
     VALUES ($1,$2,$3,$4,'待命',FALSE,'待命中','[]'::jsonb,'[]'::jsonb,'[]'::jsonb,$5,$6::jsonb,$7)`,
    [id, input.name, input.role, color, input.schedule, JSON.stringify(today), position]
  );
  return { id, name: input.name as AgentProfile["name"], role: input.role, color, mood: "待命",
    busy: false, taskNow: "待命中", skills: [], prompts: [], sources: [], schedule: input.schedule, today };
}

export async function deleteAgent(id: string): Promise<boolean> {
  const { rowCount } = await query(`DELETE FROM agents WHERE id = $1`, [id]);
  return (rowCount ?? 0) > 0;
}

export async function createAutomation(input: {
  name: string; trigger: { kind: string; text: string }; steps: Automation["steps"];
}): Promise<Automation> {
  const id = genId("a");
  const position = await nextPosition("automations");
  await query(
    `INSERT INTO automations (id, name, is_on, runs, last_run, trigger, steps, saved, position)
     VALUES ($1,$2,FALSE,0,'未启用',$3::jsonb,$4::jsonb,'草稿中',$5)`,
    [id, input.name, JSON.stringify(input.trigger), JSON.stringify(input.steps), position]
  );
  return { id, name: input.name, on: false, runs: 0, lastRun: "未启用",
    trigger: input.trigger, steps: input.steps, saved: "草稿中" };
}

export async function setAutomationOn(id: string, on: boolean): Promise<Automation | null> {
  const { rows } = await query<{
    id: string; name: string; is_on: boolean; runs: number; last_run: string;
    trigger: Automation["trigger"]; steps: Automation["steps"]; saved: string;
  }>(
    `UPDATE automations SET is_on = $2 WHERE id = $1
     RETURNING id, name, is_on, runs, last_run, trigger, steps, saved`,
    [id, on]
  );
  const r = rows[0];
  if (!r) return null;
  return { id: r.id, name: r.name, on: r.is_on, runs: r.runs, lastRun: r.last_run,
    trigger: r.trigger, steps: r.steps, saved: r.saved };
}

export async function deleteAutomation(id: string): Promise<boolean> {
  const { rowCount } = await query(`DELETE FROM automations WHERE id = $1`, [id]);
  return (rowCount ?? 0) > 0;
}

export interface AssetCounts {
  knowledge: number; prompts: number; skills: number; agents: number; automations: number;
}

export async function getAssetCounts(): Promise<AssetCounts> {
  const { rows } = await query<{
    knowledge: string; prompts: string; skills: string; agents: string; automations: string;
  }>(
    `SELECT
       (SELECT count(*) FROM knowledge)   AS knowledge,
       (SELECT count(*) FROM prompts)     AS prompts,
       (SELECT count(*) FROM skills)      AS skills,
       (SELECT count(*) FROM agents)      AS agents,
       (SELECT count(*) FROM automations) AS automations`
  );
  const r = rows[0]!;
  return {
    knowledge: Number(r.knowledge), prompts: Number(r.prompts), skills: Number(r.skills),
    agents: Number(r.agents), automations: Number(r.automations),
  };
}

// ============================================================================
// Managed models — 模型管理
// ============================================================================

interface ManagedModelRow {
  id: string; name: string; vendor: string; category: ManagedModelCategory;
  modality: string; context: string; pricing: string; rating: number; latency: string;
  calls: number; spend: number; strengths: string; tags: string[];
  enabled: boolean; default_for: string | null; color: string; position: number;
}
const rowToManagedModel = (r: ManagedModelRow): ManagedModel => ({
  id: r.id, name: r.name, vendor: r.vendor, category: r.category,
  modality: r.modality, context: r.context, pricing: r.pricing, rating: r.rating,
  latency: r.latency, calls: r.calls, spend: r.spend, strengths: r.strengths,
  tags: r.tags, enabled: r.enabled, defaultFor: r.default_for, color: r.color,
});

export async function listManagedModels(): Promise<ManagedModel[]> {
  const { rows } = await query<ManagedModelRow>(
    `SELECT id, name, vendor, category, modality, context, pricing, rating, latency,
            calls, spend, strengths, tags, enabled, default_for, color, position
     FROM managed_models ORDER BY position`);
  return rows.map(rowToManagedModel);
}

const MANAGED_CATEGORIES: ManagedModelCategory[] = ["text", "image", "video", "audio", "embed"];

export async function createManagedModel(input: {
  name: string; vendor: string; category: ManagedModelCategory;
  modality?: string; context?: string; pricing?: string;
}): Promise<ManagedModel> {
  if (!MANAGED_CATEGORIES.includes(input.category)) throw new Error("invalid category");
  const id = `mm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const { rows: posRows } = await query<{ max_pos: number | null }>(
    `SELECT MAX(position) AS max_pos FROM managed_models`);
  const position = (posRows[0]?.max_pos ?? -1) + 1;
  const palette = ["#4f46e5", "#0891b2", "#9333ea", "#16a34a", "#ea580c", "#0d9488"];
  const color = palette[position % palette.length]!;
  const modality = input.modality ?? "文本 → 文本";
  const context = input.context ?? "—";
  const pricing = input.pricing ?? "—";
  await query(
    `INSERT INTO managed_models
       (id, name, vendor, category, modality, context, pricing, rating, latency,
        calls, spend, strengths, tags, enabled, default_for, color, position)
     VALUES ($1,$2,$3,$4,$5,$6,$7,80,'—',0,0,'用户接入','[]'::jsonb,FALSE,NULL,$8,$9)`,
    [id, input.name, input.vendor, input.category, modality, context, pricing, color, position]
  );
  return {
    id, name: input.name, vendor: input.vendor, category: input.category,
    modality, context, pricing, rating: 80, latency: "—",
    calls: 0, spend: 0, strengths: "用户接入", tags: [],
    enabled: false, defaultFor: null, color,
  };
}

export async function setManagedModelEnabled(id: string, enabled: boolean): Promise<ManagedModel | null> {
  const { rows } = await query<ManagedModelRow>(
    `UPDATE managed_models SET enabled = $2 WHERE id = $1
     RETURNING id, name, vendor, category, modality, context, pricing, rating, latency,
               calls, spend, strengths, tags, enabled, default_for, color, position`,
    [id, enabled]
  );
  return rows[0] ? rowToManagedModel(rows[0]) : null;
}

export async function getLibrary(): Promise<LibraryItem[]> {
  const { rows } = await query<{
    id: string; track: LibraryItem["track"]; title: string; meta: string;
    time: string; cost: string; model: string;
  }>(`SELECT id, track, title, meta, time, cost, model FROM content_library ORDER BY position`);
  return rows.map(r => ({
    id: r.id, track: r.track, title: r.title, meta: r.meta,
    time: r.time, cost: r.cost, model: r.model,
  }));
}
