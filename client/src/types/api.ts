// Mirror of server/src/types.ts so frontend has a single source of API shape truth.

export type AgentName = "Atlas" | "Nova" | "Helix" | "Aria";

export interface Company {
  name: string;
  shortName: string;
  stage: string;
  founded: string;
  team: string;
  thesis: string;
}

export interface DirectionScore { value: string; pct: number; }
export interface Direction {
  id: string;
  name: string;
  score: number;
  selected?: boolean;
  tam: DirectionScore;
  growth: DirectionScore;
  competition: DirectionScore;
  fit: DirectionScore;
  summary: string;
  why?: string[];
}

export interface PipelineStage {
  step: string;
  key: "define" | "landing" | "course" | "pay" | "support";
  title: string;
  status: "done" | "current" | "pending";
  desc: string;
  meta: string;
}

export interface Channel {
  id: string; name: string; handle: string; color: string; letter: string;
  on: boolean; posts: number; reach: string; ctr: string;
}

export interface FunnelStep { label: string; count: number; conv: string | null; }
export interface ActivityItem { t: string; who: string; ai: boolean; what: string; obj: string; extra?: string; }
export interface CopilotTool { name: string; meta: string; }
export interface CopilotMessage { from: "ai" | "user"; text: string; tool?: CopilotTool | null; }

export interface KnowledgeItem {
  id: string;
  kind: "想法" | "访谈" | "竞品" | "博客" | "文件";
  title: string; snippet: string; tags: string[]; refs: number; agent: string; time: string; source: string;
}
export interface PromptItem {
  id: string; name: string; cat: string; version: string; calls: number; success: number;
  desc: string; vars: string[]; usedBy: AgentName[]; body: string;
}
export interface SkillItem {
  id: string; name: string; emoji: string; cat: string; desc: string;
  tools: string[]; input: string; output: string; calls: number; success: number; agents: AgentName[];
}
export interface AgentProfile {
  id: string; name: AgentName; role: string; color: string; mood: string; busy: boolean; taskNow: string;
  skills: string[]; prompts: string[]; sources: string[]; schedule: string;
  today: { tasks: number; success: number; hours: number };
}
export interface AgentRun { agent: AgentName; start: number; end: number; label: string; }
export interface AutomationStep { agent: AgentName; skill: string; note: string; }
export interface Automation {
  id: string; name: string; on: boolean; runs: number; lastRun: string;
  trigger: { kind: string; text: string }; steps: AutomationStep[]; saved: string;
}

export interface ContentTrack {
  id: "article" | "short" | "longvid" | "audio" | "image" | "post";
  name: string; icon: string; color: string; desc: string;
  bestFor: string; duration: string; typicalCost: string;
}
export interface ContentJob {
  id: string; track: ContentTrack["id"]; title: string;
  status: "running" | "queued" | "review" | "done"; progress: number; eta: string;
  model: string; phase: string; agent: AgentName; cost: string;
}
export interface ModelMatrix {
  name: string; vendor: string; uses: string[]; rating: number; strengths: string;
  cost: string; calls: number; color: string;
}
export interface LibraryItem {
  id: string; track: ContentTrack["id"]; title: string; meta: string;
  time: string; cost: string; model: string;
}

export interface KpiPayload {
  label: string; value: string; delta: string; data: number[]; accent?: boolean; down?: boolean;
}
export interface ModuleStatus {
  id: string; num: string; title: string; desc: string; pct: number;
  status: string; statusTag: "success" | "ai" | "accent" | "warn" | "";
}
export interface Run24h {
  t: string; a: AgentName; task: string; trig: string; s: "running" | "queued";
}
export interface DashboardPayload {
  company: Company;
  activity: ActivityItem[];
  kpis: { mrr: KpiPayload; paying: KpiPayload; visitors: KpiPayload; completion: KpiPayload };
  modules: ModuleStatus[];
  runs24h: Run24h[];
}

// ============================================================================
// My Directions & Trending Directions
// ============================================================================

export interface DirectionEvaluation {
  score: number;
  tam: DirectionScore;
  growth: DirectionScore;
  competition: DirectionScore;
  fit: DirectionScore;
  why: string[];
  evaluatedAt: string;
}

export interface MyDirection {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  tags: string[];
  source: string;
  evaluation: DirectionEvaluation | null;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface TrendingDirection {
  id: string;
  title: string;
  description: string | null;
  source: string;
  sourceUrl: string | null;
  scoreProxy: number | null;
  meta: Record<string, unknown> | null;
  fetchedAt: string;
}

// ============================================================================
// Direction validations
// ============================================================================

export type ValidationKind = "market" | "competitor" | "feasibility" | "user";
export type ValidationStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";

export interface MarketAnalysis {
  tam: { value: string; pct: number };
  sam: { value: string; pct: number };
  som: { value: string; pct: number };
  growthYoY: string;
  pricingBand: string;
  trends: string[];
  redFlags: string[];
}

export interface Competitor {
  name: string;
  stage: string;
  users: string;
  pricing: string;
  growth: string;
  strength: string;
  weakness: string;
  threatScore: number;
}
export interface CompetitorAnalysis {
  competitors: Competitor[];
  marketGap: string;
  positioning: string;
}

export interface FeasibilityAnalysis {
  resources: Array<{ kind: string; need: string; founderHas: string; gapStars: number }>;
  milestones: Array<{ window: string; title: string; metric?: string }>;
  rampUpRisks: string[];
  goNoGo: "go" | "conditional" | "no-go";
  rationale: string;
}

export interface UserPersona {
  name: string;
  role: string;
  why: string;
  payIntent: number;
  quote: string;
}
export interface UserAnalysis {
  personas: UserPersona[];
  topConcerns: string[];
  topKeywords: Array<{ word: string; weight: number }>;
}

export type ValidationResult = MarketAnalysis | CompetitorAnalysis | FeasibilityAnalysis | UserAnalysis;

export interface DirectionValidation {
  directionId: string;
  kind: ValidationKind;
  status: ValidationStatus;
  workflowId: string | null;
  result: ValidationResult | null;
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
}

// ============================================================================
// 业务线上化 · AI design + downstream delivery
// ============================================================================

export type DesignKind = "operations" | "traffic";
export type DesignStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
export type DeliveryTarget = "content" | "traffic";

export interface DesignDeliverable {
  target: DeliveryTarget;
  title: string;
  detail: string;
}

export interface OperationsDesign {
  summary: string;
  lifecycle: { stage: string; goal: string; tactics: string[] }[];
  cadence: { name: string; frequency: string; owner: string; detail: string }[];
  retentionLevers: { lever: string; mechanism: string }[];
  northStar: { metric: string; target: string; rationale: string };
  deliverables: DesignDeliverable[];
}

export interface TrafficDesign {
  summary: string;
  channels: { channel: string; fit: string; priority: "high" | "medium" | "low"; cacEstimate: string }[];
  tactics: { channel: string; tactic: string; expectedResult: string }[];
  funnel: { stage: string; action: string; metric: string }[];
  budgetSplit: { item: string; pct: number }[];
  deliverables: DesignDeliverable[];
}

export type DesignResult = OperationsDesign | TrafficDesign;

export interface BusinessDesign {
  directionId: string;
  kind: DesignKind;
  status: DesignStatus;
  workflowId: string | null;
  result: DesignResult | null;
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
}

export type DeliveryStatus = "pending" | "in_progress" | "done";

export interface DeliveryTicket {
  id: string;
  directionId: string;
  target: DeliveryTarget;
  sourceKind: DesignKind;
  title: string;
  detail: string | null;
  status: DeliveryStatus;
  createdAt: string;
}

// ============================================================================
// Workflow runs
// ============================================================================

export interface FounderProfile {
  tags: string;
  hours: string;
  capital: string;
  risk: string;
  interests: string[];
  thesis?: string;
}

export type WorkflowStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";

export interface WorkflowRun {
  id: string;
  runId: string;
  workflowType: string;
  status: WorkflowStatus;
  trigger: string | null;
  userId: string | null;
  input: unknown;
  output: unknown;
  error: string | null;
  currentActivity: string | null;
  langfuseTraceId: string | null;
  startedAt: string;
  finishedAt: string | null;
}

export interface WorkflowEvent {
  id: string;
  ts: string;
  kind: string;
  activity: string | null;
  message: string | null;
  payload: unknown;
}

export interface WorkflowStartResp { workflowId: string; runId: string; }
export interface WorkflowGetResp { run: WorkflowRun; events: WorkflowEvent[]; }

export type AuthChannel = "phone" | "wechat";
export interface User {
  id: string;
  name: string;
  initials: string;
  phone: string | null;
  wechatOpenid: string | null;
  role: string;
  createdAt: string;
  lastLoginAt: string | null;
}
export interface AuthSession {
  token: string;
  user: User;
  channel: AuthChannel;
  expiresAt: string;
}
export interface SendCodeResp { ok: true; phone: string; expiresIn: number; hint?: string; }
export interface QrSceneResp { sceneId: string; expiresAt: string; ticket: string; }
export type WechatPoll =
  | { status: "waiting" | "scanned" | "expired" }
  | { status: "confirmed"; session: AuthSession };
