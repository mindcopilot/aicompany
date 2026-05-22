import { Router } from "express";
import {
  getCompany, getDirections, getPipeline, getChannels, getFunnel, getActivity,
  getCopilotInit,
  getKnowledge, getPrompts, getSkills, getAgents, getRunsToday, getAutomations,
  getTracks, getJobs, getModels, getLibrary,
} from "../db/queries.js";
import { runCopilotTurn } from "../copilot.js";
import { bearerToken, getSessionByToken } from "../auth.js";

const router = Router();

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
        { id: "direction",  num: "01", title: "方向选择",   desc: "AI 推荐 4 条赛道，已确认主线。",      pct: 100, status: "已确认",     statusTag: "success" },
        { id: "validation", num: "02", title: "方向论证",   desc: "市场 / 竞品 / 可行性 多维校验。",     pct: 80,  status: "Helix 进行中", statusTag: "ai" },
        { id: "product",    num: "03", title: "业务线上化", desc: "落地页 + 课程 + 支付 + 服务。",       pct: 62,  status: "进行中",     statusTag: "accent" },
        { id: "traffic",    num: "04", title: "流量分发",   desc: "6 / 8 渠道激活，AI 自动分发。",       pct: 75,  status: "Atlas 运行",  statusTag: "ai" },
        { id: "reach",      num: "05", title: "用户触达",   desc: "私域承接 + 自动化 sequences。",       pct: 45,  status: "需要配置",   statusTag: "warn" },
        { id: "data",       num: "06", title: "数据验证",   desc: "北极星指标 + 留存 + 异常告警。",      pct: 88,  status: "健康",       statusTag: "success" },
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
