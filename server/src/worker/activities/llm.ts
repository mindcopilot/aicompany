// LLM activities — wrap DeepSeek calls in Temporal activities so they get
// automatic retry, heartbeat, and timeout enforcement. Workflows call these
// instead of touching openai directly (workflows can't import openai anyway
// because they're sandboxed).

import { z } from "zod";
import { chat, parseJson } from "../../llm/client.js";
import {
  HELIX_DIRECTION_SCAN, COPILOT_SYSTEM, COPILOT_ROUTER,
  HELIX_TRENDING_CONSOLIDATE, HELIX_EVALUATE_DIRECTION,
  HELIX_VALIDATE_MARKET, HELIX_VALIDATE_COMPETITOR,
  HELIX_VALIDATE_FEASIBILITY, HELIX_VALIDATE_USER,
} from "../../llm/prompts.js";
import type {
  Direction, FounderProfile, CopilotMessage,
  DirectionEvaluation, MyDirection,
  MarketAnalysis, CompetitorAnalysis, FeasibilityAnalysis, UserAnalysis,
} from "../../types.js";
import type { MarketSignal } from "./signals.js";
import type { RawTrendingItem } from "./agent-reach.js";

// ----------------------- Direction scan -----------------------

const ScoreSchema = z.object({
  value: z.string(),
  pct: z.number().min(0).max(100),
});

// `score` is required logically but DeepSeek sometimes omits it for one of the
// 4 candidates. We accept it as optional and derive it from the four dimension
// pct's at parse-time so a single missing field doesn't blow up a 60s call.
const DirectionSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    score: z.number().min(0).max(100).optional(),
    summary: z.string().min(1),
    tam: ScoreSchema,
    growth: ScoreSchema,
    competition: ScoreSchema,
    fit: ScoreSchema,
    why: z.array(z.string()).min(2).max(6),
  })
  .transform(d => ({
    ...d,
    score: d.score ?? Math.round((d.tam.pct + d.growth.pct + d.competition.pct + d.fit.pct) / 4),
  }));
const ScanResponseSchema = z.object({ directions: z.array(DirectionSchema).min(3).max(5) });

export async function llmGenerateDirections(input: {
  profile: FounderProfile;
  signals: MarketSignal[];
  workflowId: string;
  userId?: string;
}): Promise<Direction[]> {
  const userPayload = {
    founder: input.profile,
    signals: input.signals,
  };

  const messages = [
    { role: "system" as const, content: HELIX_DIRECTION_SCAN },
    {
      role: "user" as const,
      content:
        "请基于以下创始人画像和市场信号，给出 4 条候选方向，严格 JSON 返回。\n\n" +
        "```json\n" + JSON.stringify(userPayload, null, 2) + "\n```",
    },
  ];

  const res = await chat({
    messages,
    traceName: "helix.generateDirections",
    traceId: input.workflowId,
    userId: input.userId,
    temperature: 0.5,
    json: true,
    metadata: { interests: input.profile.interests, thesis: input.profile.thesis },
  });

  const parsed = ScanResponseSchema.parse(parseJson(res.content));
  // Mark the highest-scoring as selected to mimic Helix's "lock the top" behavior.
  const sorted = [...parsed.directions].sort((a, b) => b.score - a.score);
  return sorted.map((d, i): Direction => ({
    id: d.id,
    name: d.name,
    score: d.score,
    selected: i === 0,
    tam: d.tam,
    growth: d.growth,
    competition: d.competition,
    fit: d.fit,
    summary: d.summary,
    why: d.why,
  }));
}

// ----------------------- Copilot routing -----------------------

const RouteSchema = z.object({
  intent: z.enum(["chat", "refreshTrending"]),
  rationale: z.string(),
  replyHint: z.string(),
});
export type CopilotRoute = z.infer<typeof RouteSchema>;

export async function llmCopilotRoute(input: {
  userText: string;
  sessionId: string;
  userId?: string;
}): Promise<CopilotRoute> {
  const messages = [
    { role: "system" as const, content: COPILOT_ROUTER },
    { role: "user" as const, content: input.userText },
  ];
  const res = await chat({
    messages,
    traceName: "copilot.route",
    sessionId: input.sessionId,
    userId: input.userId,
    temperature: 0.0,
    json: true,
  });
  return RouteSchema.parse(parseJson(res.content));
}

// ----------------------- Copilot chat reply -----------------------

// ----------------------- Trending consolidation -----------------------

const TrendingItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(300),
  sources: z.array(z.string()).min(1).max(6),
  evidence: z.array(z.string()).default([]),
});
const TrendingResponseSchema = z.object({ trending: z.array(TrendingItemSchema).min(3).max(20) });

export type ConsolidatedTrending = z.infer<typeof TrendingItemSchema>;

export async function llmConsolidateTrending(input: {
  raw: RawTrendingItem[];
  workflowId: string;
  userId?: string;
}): Promise<ConsolidatedTrending[]> {
  // Strip raw payloads to roughly fit DeepSeek's context.
  const compact = input.raw.map(r => ({
    source: r.source,
    title: r.title,
    description: r.description ? r.description.slice(0, 240) : null,
    scoreProxy: r.scoreProxy,
    meta: r.meta,
  }));
  const messages = [
    { role: "system" as const, content: HELIX_TRENDING_CONSOLIDATE },
    {
      role: "user" as const,
      content:
        `这是 ${compact.length} 条原始信号，提炼热门方向：\n\n` +
        "```json\n" + JSON.stringify(compact, null, 2) + "\n```",
    },
  ];
  const res = await chat({
    messages,
    traceName: "helix.consolidateTrending",
    traceId: input.workflowId,
    userId: input.userId,
    temperature: 0.4,
    json: true,
    metadata: { signalCount: compact.length },
  });
  const parsed = TrendingResponseSchema.parse(parseJson(res.content));
  return parsed.trending;
}

// ----------------------- Per-direction evaluation -----------------------

const ScoreSchema2 = z.object({ value: z.string(), pct: z.number().min(0).max(100) });
const EvaluationSchema = z
  .object({
    score: z.number().min(0).max(100).optional(),
    tam: ScoreSchema2,
    growth: ScoreSchema2,
    competition: ScoreSchema2,
    fit: ScoreSchema2,
    why: z.array(z.string()).min(2).max(6),
  })
  .transform(e => ({
    ...e,
    score: e.score ?? Math.round((e.tam.pct + e.growth.pct + e.competition.pct + e.fit.pct) / 4),
  }));

export async function llmEvaluateDirection(input: {
  direction: Pick<MyDirection, "title" | "description" | "tags">;
  profile: FounderProfile;
  workflowId: string;
  userId?: string;
}): Promise<DirectionEvaluation> {
  const payload = {
    founder: input.profile,
    direction: {
      title: input.direction.title,
      description: input.direction.description,
      tags: input.direction.tags,
    },
  };
  const messages = [
    { role: "system" as const, content: HELIX_EVALUATE_DIRECTION },
    {
      role: "user" as const,
      content:
        "请评估这条方向：\n\n```json\n" + JSON.stringify(payload, null, 2) + "\n```",
    },
  ];
  const res = await chat({
    messages,
    traceName: "helix.evaluateDirection",
    traceId: input.workflowId,
    userId: input.userId,
    temperature: 0.4,
    json: true,
    metadata: { directionTitle: input.direction.title },
  });
  const parsed = EvaluationSchema.parse(parseJson(res.content));
  return {
    score: parsed.score,
    tam: parsed.tam, growth: parsed.growth,
    competition: parsed.competition, fit: parsed.fit,
    why: parsed.why,
    evaluatedAt: new Date().toISOString(),
  };
}

// ----------------------- Deep validation activities -----------------------

const ScorePart = z.object({ value: z.string(), pct: z.number().min(0).max(100) });

const MarketSchema = z.object({
  tam: ScorePart, sam: ScorePart, som: ScorePart,
  growthYoY: z.string(),
  pricingBand: z.string(),
  trends: z.array(z.string()).min(1),
  redFlags: z.array(z.string()).min(0).default([]),
});
export async function llmValidateMarket(input: {
  direction: Pick<MyDirection, "title" | "description" | "tags">;
  profile: FounderProfile;
  workflowId: string;
  userId?: string;
}): Promise<MarketAnalysis> {
  const messages = [
    { role: "system" as const, content: HELIX_VALIDATE_MARKET },
    { role: "user" as const, content: "请分析：\n```json\n" + JSON.stringify({ direction: input.direction, profile: input.profile }, null, 2) + "\n```" },
  ];
  const res = await chat({
    messages, traceName: "helix.validateMarket", traceId: input.workflowId, userId: input.userId,
    temperature: 0.4, json: true,
    metadata: { direction: input.direction.title },
  });
  return MarketSchema.parse(parseJson(res.content));
}

const CompetitorSchema = z.object({
  competitors: z.array(z.object({
    name: z.string(),
    stage: z.string(),
    users: z.string(),
    pricing: z.string(),
    growth: z.string(),
    strength: z.string(),
    weakness: z.string(),
    threatScore: z.number().min(0).max(100),
  })).min(1).max(8),
  marketGap: z.string(),
  positioning: z.string(),
});
export async function llmValidateCompetitor(input: {
  direction: Pick<MyDirection, "title" | "description" | "tags">;
  profile: FounderProfile;
  workflowId: string;
  userId?: string;
}): Promise<CompetitorAnalysis> {
  const messages = [
    { role: "system" as const, content: HELIX_VALIDATE_COMPETITOR },
    { role: "user" as const, content: "请分析：\n```json\n" + JSON.stringify({ direction: input.direction, profile: input.profile }, null, 2) + "\n```" },
  ];
  const res = await chat({
    messages, traceName: "helix.validateCompetitor", traceId: input.workflowId, userId: input.userId,
    temperature: 0.4, json: true,
    metadata: { direction: input.direction.title },
  });
  return CompetitorSchema.parse(parseJson(res.content));
}

const FeasibilitySchema = z.object({
  resources: z.array(z.object({
    kind: z.string(),
    need: z.string(),
    founderHas: z.string(),
    gapStars: z.number().min(0).max(5),
  })).min(1),
  milestones: z.array(z.object({
    window: z.string(),
    title: z.string(),
    metric: z.string().optional(),
  })).min(1),
  rampUpRisks: z.array(z.string()).min(0).default([]),
  goNoGo: z.enum(["go", "conditional", "no-go"]),
  rationale: z.string(),
});
export async function llmValidateFeasibility(input: {
  direction: Pick<MyDirection, "title" | "description" | "tags">;
  profile: FounderProfile;
  workflowId: string;
  userId?: string;
}): Promise<FeasibilityAnalysis> {
  const messages = [
    { role: "system" as const, content: HELIX_VALIDATE_FEASIBILITY },
    { role: "user" as const, content: "请分析：\n```json\n" + JSON.stringify({ direction: input.direction, profile: input.profile }, null, 2) + "\n```" },
  ];
  const res = await chat({
    messages, traceName: "helix.validateFeasibility", traceId: input.workflowId, userId: input.userId,
    temperature: 0.4, json: true,
    metadata: { direction: input.direction.title },
  });
  // Strip undefined `metric` keys for clean storage.
  const parsed = FeasibilitySchema.parse(parseJson(res.content));
  return {
    ...parsed,
    milestones: parsed.milestones.map(m => m.metric === undefined ? { window: m.window, title: m.title } : m),
  };
}

const UserSchema = z.object({
  personas: z.array(z.object({
    name: z.string(),
    role: z.string(),
    why: z.string(),
    payIntent: z.number().min(0).max(5),
    quote: z.string(),
  })).min(3).max(8),
  topConcerns: z.array(z.string()).min(1),
  topKeywords: z.array(z.object({ word: z.string(), weight: z.number().min(1).max(20) })).min(3),
});
export async function llmValidateUser(input: {
  direction: Pick<MyDirection, "title" | "description" | "tags">;
  profile: FounderProfile;
  workflowId: string;
  userId?: string;
}): Promise<UserAnalysis> {
  const messages = [
    { role: "system" as const, content: HELIX_VALIDATE_USER },
    { role: "user" as const, content: "请分析：\n```json\n" + JSON.stringify({ direction: input.direction, profile: input.profile }, null, 2) + "\n```" },
  ];
  const res = await chat({
    messages, traceName: "helix.validateUser", traceId: input.workflowId, userId: input.userId,
    temperature: 0.5, json: true,
    metadata: { direction: input.direction.title },
  });
  return UserSchema.parse(parseJson(res.content));
}

export async function llmCopilotRespond(input: {
  userText: string;
  history: CopilotMessage[];
  sessionId: string;
  userId?: string;
  extraContext?: string;
}): Promise<string> {
  const historyMsgs = input.history.slice(-12).map(m => ({
    role: m.from === "ai" ? ("assistant" as const) : ("user" as const),
    content: m.text,
  }));
  const sys = input.extraContext
    ? `${COPILOT_SYSTEM}\n\n[系统注入上下文]\n${input.extraContext}`
    : COPILOT_SYSTEM;
  const messages = [
    { role: "system" as const, content: sys },
    ...historyMsgs,
    { role: "user" as const, content: input.userText },
  ];
  const res = await chat({
    messages,
    traceName: "copilot.respond",
    sessionId: input.sessionId,
    userId: input.userId,
    temperature: 0.6,
  });
  return res.content.trim();
}
