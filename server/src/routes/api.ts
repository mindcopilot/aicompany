import { Router } from "express";
import {
  getCompany, getDirections, getPipeline, getChannels, getFunnel, getActivity,
  getCopilotInit,
  getKnowledge, getPrompts, getSkills, getAgents, getRunsToday, getAutomations,
  getTracks, getJobs, getModels, getLibrary,
  createKnowledge, deleteKnowledge,
  createPrompt, deletePrompt,
  createSkill, deleteSkill,
  createAgent, deleteAgent,
  createAutomation, setAutomationOn, deleteAutomation,
  getAssetCounts,
  listWorkflowRuns, getWorkflowRun, listWorkflowEvents,
  getFounderProfile, saveFounderProfile,
} from "../db/queries.js";
import type { KnowledgeItem, WorkflowStatus, FounderProfile } from "../types.js";
import { runCopilotTurn } from "../copilot.js";
import { bearerToken, getSessionByToken } from "../auth.js";

const router = Router();

async function resolveUserId(req: import("express").Request): Promise<string> {
  const t = bearerToken(req);
  if (t) {
    const s = await getSessionByToken(t);
    if (s) return s.user.id;
  }
  return "user-lin-huan";
}

router.get("/company", async (_req, res, next) => {
  try { res.json(await getCompany()); } catch (e) { next(e); }
});

router.get("/dashboard", async (_req, res, next) => {
  try {
    const [company, activity] = await Promise.all([getCompany(), getActivity()]);
    res.json({
      company,
      activity,
      // KPIs and module summaries stay computed/derived — they're rendering-only
      // and not user-editable in the current product surface.
      kpis: {
        mrr:        { label: "MRR",        value: "¥45,200", delta: "+12.4%", data: [22, 25, 27, 29, 31, 33, 36, 38, 39, 42, 44, 45.2], accent: true },
        paying:     { label: "付费用户",   value: "92",      delta: "+18",    data: [60, 62, 65, 68, 72, 75, 79, 82, 84, 87, 90, 92] },
        visitors:   { label: "周访客",     value: "6,420",   delta: "+34.1%", data: [1.2, 1.4, 1.3, 1.8, 2.1, 2.3, 2.9, 3.2, 3.6, 4.1, 4.5, 4.8] },
        completion: { label: "完课率",     value: "68%",     delta: "-4.2%",  data: [78, 76, 74, 72, 72, 71, 70, 69, 68, 67, 68, 68], down: true },
      },
      modules: [
        { id: "direction", num: "01", title: "方向",       desc: "创意库 + 热门探索 + 4 维深度论证。", pct: 90, status: "Helix 论证中", statusTag: "ai" },
        { id: "product",   num: "02", title: "业务线上化", desc: "落地页 + 课程 + 支付 + 服务。",       pct: 62, status: "进行中",      statusTag: "accent" },
        { id: "traffic",   num: "03", title: "流量分发",   desc: "6 / 8 渠道激活，AI 自动分发。",       pct: 75, status: "Atlas 运行",   statusTag: "ai" },
        { id: "reach",     num: "04", title: "用户触达",   desc: "私域承接 + 自动化 sequences。",       pct: 45, status: "需要配置",    statusTag: "warn" },
        { id: "data",      num: "05", title: "数据验证",   desc: "北极星指标 + 留存 + 异常告警。",      pct: 88, status: "健康",        statusTag: "success" },
      ],
      runs24h: [
        { t: "14:30", a: "Atlas", task: "发布小红书 · 《独立开发者周记 #12》", trig: "schedule", s: "queued" },
        { t: "15:00", a: "Nova",  task: "审稿：课程 #11《SQLite 边缘部署》",   trig: "手动",    s: "running" },
        { t: "16:00", a: "Helix", task: "竞品周更扫描 · 8 个对手",             trig: "cron",    s: "running" },
        { t: "20:00", a: "Atlas", task: "私域 7 日未活跃用户唤回邮件",          trig: "behavior", s: "queued" },
        { t: "次日 09:00", a: "Atlas", task: "周一晨会·自动生成议题",          trig: "cron",    s: "queued" },
      ],
    });
  } catch (e) { next(e); }
});

router.get("/directions", async (_req, res, next) => { try { res.json(await getDirections()); } catch (e) { next(e); } });
router.get("/pipeline",   async (_req, res, next) => { try { res.json(await getPipeline());   } catch (e) { next(e); } });
router.get("/channels",   async (_req, res, next) => { try { res.json(await getChannels());   } catch (e) { next(e); } });
router.get("/funnel",     async (_req, res, next) => { try { res.json(await getFunnel());     } catch (e) { next(e); } });

router.get("/knowledge",   async (_req, res, next) => { try { res.json(await getKnowledge());   } catch (e) { next(e); } });
router.get("/prompts",     async (_req, res, next) => { try { res.json(await getPrompts());     } catch (e) { next(e); } });
router.get("/skills",      async (_req, res, next) => { try { res.json(await getSkills());      } catch (e) { next(e); } });
router.get("/agents",      async (_req, res, next) => { try { res.json(await getAgents());      } catch (e) { next(e); } });
router.get("/runs-today",  async (_req, res, next) => { try { res.json(await getRunsToday());   } catch (e) { next(e); } });
router.get("/automations", async (_req, res, next) => { try { res.json(await getAutomations()); } catch (e) { next(e); } });

// ---------------------------------------------------------------------------
// AI assets — write endpoints. Entries created here persist to the database.
// ---------------------------------------------------------------------------

const KNOWLEDGE_KINDS: KnowledgeItem["kind"][] = ["想法", "访谈", "竞品", "博客", "文件"];

function parseVars(body: string): string[] {
  const found = new Set<string>();
  for (const m of body.matchAll(/\{\{\s*([^{}]+?)\s*\}\}/g)) found.add(m[1]!.trim());
  return [...found];
}

function parseTags(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((t): t is string => typeof t === "string");
  if (typeof raw === "string") {
    return raw.split(/[,，\s]+/).map(t => t.replace(/^#/, "").trim()).filter(Boolean);
  }
  return [];
}

router.post("/knowledge", async (req, res, next) => {
  try {
    const b = req.body as { title?: unknown; kind?: unknown; content?: unknown; tags?: unknown; source?: unknown };
    const title = String(b?.title ?? "").trim();
    const content = String(b?.content ?? "").trim();
    if (!title) { res.status(400).json({ error: "title is required" }); return; }
    const kind = KNOWLEDGE_KINDS.includes(b?.kind as KnowledgeItem["kind"])
      ? (b.kind as KnowledgeItem["kind"]) : "想法";
    res.json(await createKnowledge({
      kind, title, snippet: content || title, tags: parseTags(b?.tags),
      source: typeof b?.source === "string" && b.source.trim() ? b.source.trim() : undefined,
    }));
  } catch (e) { next(e); }
});

router.delete("/knowledge/:id", async (req, res, next) => {
  try {
    const ok = await deleteKnowledge(req.params.id!);
    if (!ok) { res.status(404).json({ error: "not found" }); return; }
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.post("/prompts", async (req, res, next) => {
  try {
    const b = req.body as { name?: unknown; cat?: unknown; body?: unknown };
    const name = String(b?.name ?? "").trim();
    const body = String(b?.body ?? "").trim();
    if (!name) { res.status(400).json({ error: "name is required" }); return; }
    res.json(await createPrompt({
      name, cat: String(b?.cat ?? "内容创作").trim() || "内容创作",
      body, vars: parseVars(body),
    }));
  } catch (e) { next(e); }
});

router.delete("/prompts/:id", async (req, res, next) => {
  try {
    const ok = await deletePrompt(req.params.id!);
    if (!ok) { res.status(404).json({ error: "not found" }); return; }
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.post("/skills", async (req, res, next) => {
  try {
    const b = req.body as { name?: unknown; cat?: unknown; input?: unknown; output?: unknown };
    const name = String(b?.name ?? "").trim();
    if (!name) { res.status(400).json({ error: "name is required" }); return; }
    res.json(await createSkill({
      name, cat: String(b?.cat ?? "内容生产").trim() || "内容生产",
      input: String(b?.input ?? "").trim() || "—",
      output: String(b?.output ?? "").trim() || "—",
    }));
  } catch (e) { next(e); }
});

router.delete("/skills/:id", async (req, res, next) => {
  try {
    const ok = await deleteSkill(req.params.id!);
    if (!ok) { res.status(404).json({ error: "not found" }); return; }
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.post("/agents", async (req, res, next) => {
  try {
    const b = req.body as { name?: unknown; role?: unknown; schedule?: unknown };
    const name = String(b?.name ?? "").trim();
    if (!name) { res.status(400).json({ error: "name is required" }); return; }
    res.json(await createAgent({
      name, role: String(b?.role ?? "").trim() || "通用 · General",
      schedule: String(b?.schedule ?? "").trim() || "常驻待命",
    }));
  } catch (e) { next(e); }
});

router.delete("/agents/:id", async (req, res, next) => {
  try {
    const ok = await deleteAgent(req.params.id!);
    if (!ok) { res.status(404).json({ error: "not found" }); return; }
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.post("/automations", async (req, res, next) => {
  try {
    const b = req.body as { name?: unknown; trigger?: unknown; action?: unknown };
    const name = String(b?.name ?? "").trim();
    if (!name) { res.status(400).json({ error: "name is required" }); return; }
    const triggerText = String(b?.trigger ?? "").trim() || "手动触发";
    const action = String(b?.action ?? "").trim() || "执行任务";
    res.json(await createAutomation({
      name,
      trigger: { kind: "自定义", text: triggerText },
      steps: [{ agent: "Atlas", skill: "—", note: action }],
    }));
  } catch (e) { next(e); }
});

router.patch("/automations/:id", async (req, res, next) => {
  try {
    const b = req.body as { on?: unknown };
    if (typeof b?.on !== "boolean") { res.status(400).json({ error: "on (boolean) is required" }); return; }
    const updated = await setAutomationOn(req.params.id!, b.on);
    if (!updated) { res.status(404).json({ error: "not found" }); return; }
    res.json(updated);
  } catch (e) { next(e); }
});

router.delete("/automations/:id", async (req, res, next) => {
  try {
    const ok = await deleteAutomation(req.params.id!);
    if (!ok) { res.status(404).json({ error: "not found" }); return; }
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.get("/asset-counts", async (_req, res, next) => {
  try { res.json(await getAssetCounts()); } catch (e) { next(e); }
});

// ---------------------------------------------------------------------------
// Workflow runs — observability for the Temporal-backed agent workflows.
// ---------------------------------------------------------------------------

const WORKFLOW_STATUSES: WorkflowStatus[] = ["PENDING", "RUNNING", "COMPLETED", "FAILED", "CANCELLED"];

router.get("/workflow-runs", async (req, res, next) => {
  try {
    const statusParam = typeof req.query.status === "string" ? req.query.status : undefined;
    const status = statusParam && WORKFLOW_STATUSES.includes(statusParam as WorkflowStatus)
      ? (statusParam as WorkflowStatus) : undefined;
    const typeParam = typeof req.query.type === "string" && req.query.type ? req.query.type : undefined;
    res.json(await listWorkflowRuns({ status, workflowType: typeParam, limit: 150 }));
  } catch (e) { next(e); }
});

router.get("/workflow-runs/:id", async (req, res, next) => {
  try {
    const run = await getWorkflowRun(req.params.id!);
    if (!run) { res.status(404).json({ error: "not found" }); return; }
    const events = await listWorkflowEvents(run.id, 200);
    res.json({ run, events });
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------------------
// Founder profile — account / settings.
// ---------------------------------------------------------------------------

router.get("/founder-profile", async (req, res, next) => {
  try {
    const userId = await resolveUserId(req);
    res.json(await getFounderProfile(userId));
  } catch (e) { next(e); }
});

router.put("/founder-profile", async (req, res, next) => {
  try {
    const b = req.body as Partial<FounderProfile> | undefined;
    const interests = Array.isArray(b?.interests)
      ? b!.interests.filter((x): x is string => typeof x === "string") : [];
    const profile: FounderProfile = {
      tags:      String(b?.tags ?? "").trim(),
      hours:     String(b?.hours ?? "").trim(),
      capital:   String(b?.capital ?? "").trim(),
      risk:      String(b?.risk ?? "").trim(),
      interests,
      ...(typeof b?.thesis === "string" && b.thesis.trim() ? { thesis: b.thesis.trim() } : {}),
    };
    const userId = await resolveUserId(req);
    await saveFounderProfile(userId, profile);
    res.json(profile);
  } catch (e) { next(e); }
});

router.get("/content/tracks",  async (_req, res, next) => { try { res.json(await getTracks());  } catch (e) { next(e); } });
router.get("/content/jobs",    async (_req, res, next) => { try { res.json(await getJobs());    } catch (e) { next(e); } });
router.get("/content/models",  async (_req, res, next) => { try { res.json(await getModels());  } catch (e) { next(e); } });
router.get("/content/library", async (_req, res, next) => { try { res.json(await getLibrary()); } catch (e) { next(e); } });

router.get("/copilot/init", async (req, res, next) => {
  try {
    const sessionId = (req.query.session as string | undefined) ?? "default";
    res.json(await getCopilotInit(sessionId));
  } catch (e) { next(e); }
});

router.post("/copilot/message", async (req, res, next) => {
  const body = req.body as { text?: unknown; session?: unknown } | undefined;
  const text = String(body?.text ?? "").trim();
  const sessionId = typeof body?.session === "string" ? body.session : "default";
  if (!text) {
    res.status(400).json({ error: "text is required" });
    return;
  }
  try {
    const token = bearerToken(req);
    const session = token ? await getSessionByToken(token) : null;
    const userId = session?.user.id ?? "user-lin-huan";
    const reply = await runCopilotTurn({ sessionId, userId, text });
    res.json(reply);
  } catch (e) { next(e); }
});

export default router;
