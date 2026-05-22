// New Direction module API: my-directions CRUD + trending listing + workflow triggers.
// The legacy /api/directions endpoint stays for back-compat with anything that
// hasn't migrated yet.

import { Router } from "express";
import { bearerToken, getSessionByToken } from "../auth.js";
import {
  listMyDirections, createMyDirection, updateMyDirection, deleteMyDirection,
  getMyDirection, listTrendingDirections, getTrendingDirection,
  listDirectionValidations, listBusinessDesigns,
  listDeliveryTickets, updateDeliveryTicketStatus,
  createWorkflowRun,
} from "../db/queries.js";
import type { DeliveryTarget, DeliveryStatus } from "../types.js";
import { getClient, taskQueue } from "../worker/connection.js";

const router = Router();

async function resolveUserId(req: import("express").Request, override?: unknown): Promise<string> {
  if (typeof override === "string" && override.length > 0) return override;
  const t = bearerToken(req);
  if (t) {
    const s = await getSessionByToken(t);
    if (s) return s.user.id;
  }
  return "user-lin-huan";
}

// ----------------------- my-directions CRUD -----------------------

router.get("/my-directions", async (req, res, next) => {
  try {
    const userId = await resolveUserId(req);
    res.json(await listMyDirections(userId));
  } catch (e) { next(e); }
});

router.post("/my-directions", async (req, res, next) => {
  try {
    const body = req.body as { title?: unknown; description?: unknown; tags?: unknown; source?: unknown } | undefined;
    const title = String(body?.title ?? "").trim();
    if (!title) { res.status(400).json({ error: "title required" }); return; }
    const userId = await resolveUserId(req);
    const tags = Array.isArray(body?.tags) ? body!.tags.filter((t): t is string => typeof t === "string") : [];
    const created = await createMyDirection({
      userId,
      title,
      description: typeof body?.description === "string" ? body.description : null,
      tags,
      source: typeof body?.source === "string" ? body.source : "user",
    });
    res.json(created);
  } catch (e) { next(e); }
});

router.patch("/my-directions/:id", async (req, res, next) => {
  try {
    const body = req.body as { title?: unknown; description?: unknown; tags?: unknown } | undefined;
    const patch: Parameters<typeof updateMyDirection>[1] = {};
    if (typeof body?.title === "string")       patch.title = body.title;
    if (typeof body?.description === "string" || body?.description === null) patch.description = body.description as string | null;
    if (Array.isArray(body?.tags))             patch.tags = body!.tags.filter((t): t is string => typeof t === "string");
    const updated = await updateMyDirection(req.params.id!, patch);
    if (!updated) { res.status(404).json({ error: "not found" }); return; }
    res.json(updated);
  } catch (e) { next(e); }
});

router.delete("/my-directions/:id", async (req, res, next) => {
  try {
    await deleteMyDirection(req.params.id!);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ----------------------- Add a trending item to my-directions -----------------------

router.post("/my-directions/from-trending/:trendingId", async (req, res, next) => {
  try {
    const userId = await resolveUserId(req);
    const t = await getTrendingDirection(req.params.trendingId!);
    if (!t) { res.status(404).json({ error: "trending direction not found" }); return; }
    const created = await createMyDirection({
      userId,
      title: t.title,
      description: t.description,
      tags: typeof t.meta === "object" && t.meta && Array.isArray((t.meta as { sources?: unknown }).sources)
        ? ((t.meta as { sources: unknown[] }).sources.filter(s => typeof s === "string") as string[])
        : [],
      source: `from_trending:${t.id}`,
    });
    res.json(created);
  } catch (e) { next(e); }
});

// ----------------------- Evaluate one direction (triggers workflow) -----------------------

router.post("/my-directions/:id/evaluate", async (req, res, next) => {
  try {
    const userId = await resolveUserId(req);
    const direction = await getMyDirection(req.params.id!);
    if (!direction) { res.status(404).json({ error: "not found" }); return; }
    if (direction.userId !== userId) { res.status(403).json({ error: "not yours" }); return; }

    const workflowId = `evaluate-direction::${direction.id}::${Date.now()}`;
    const client = await getClient();
    let handle;
    try {
      handle = await client.workflow.start("evaluateDirectionWorkflow", {
        taskQueue,
        workflowId,
        args: [{ userId, directionId: direction.id }],
      });
    } catch (err) {
      res.status(503).json({
        error: "workflow start failed — worker offline?",
        detail: err instanceof Error ? err.message : String(err),
      });
      return;
    }
    await createWorkflowRun({
      id: workflowId, runId: handle.firstExecutionRunId,
      workflowType: "evaluateDirection",
      trigger: "user:evaluate_direction", userId,
      input: { directionId: direction.id },
      langfuseTraceId: workflowId,
    });
    res.json({ workflowId, runId: handle.firstExecutionRunId });
  } catch (e) { next(e); }
});

// ----------------------- Deep validation (4 dimensions) -----------------------

router.post("/my-directions/:id/validate", async (req, res, next) => {
  try {
    const userId = await resolveUserId(req);
    const direction = await getMyDirection(req.params.id!);
    if (!direction) { res.status(404).json({ error: "not found" }); return; }
    if (direction.userId !== userId) { res.status(403).json({ error: "not yours" }); return; }

    const workflowId = `validate-direction::${direction.id}::${Date.now()}`;
    const client = await getClient();
    let handle;
    try {
      handle = await client.workflow.start("validateDirectionWorkflow", {
        taskQueue,
        workflowId,
        args: [{ userId, directionId: direction.id }],
      });
    } catch (err) {
      res.status(503).json({
        error: "workflow start failed — worker offline?",
        detail: err instanceof Error ? err.message : String(err),
      });
      return;
    }
    await createWorkflowRun({
      id: workflowId, runId: handle.firstExecutionRunId,
      workflowType: "validateDirection",
      trigger: "user:validate_direction", userId,
      input: { directionId: direction.id },
      langfuseTraceId: workflowId,
    });
    res.json({ workflowId, runId: handle.firstExecutionRunId });
  } catch (e) { next(e); }
});

router.get("/my-directions/:id/validations", async (req, res, next) => {
  try {
    const rows = await listDirectionValidations(req.params.id!);
    res.json(rows);
  } catch (e) { next(e); }
});

// ----------------------- 业务线上化 design (运营体系 + 流量获取) -----------------------

router.post("/my-directions/:id/design", async (req, res, next) => {
  try {
    const userId = await resolveUserId(req);
    const direction = await getMyDirection(req.params.id!);
    if (!direction) { res.status(404).json({ error: "not found" }); return; }
    if (direction.userId !== userId) { res.status(403).json({ error: "not yours" }); return; }

    const workflowId = `design-business::${direction.id}::${Date.now()}`;
    const client = await getClient();
    let handle;
    try {
      handle = await client.workflow.start("designBusinessWorkflow", {
        taskQueue,
        workflowId,
        args: [{ userId, directionId: direction.id }],
      });
    } catch (err) {
      res.status(503).json({
        error: "workflow start failed — worker offline?",
        detail: err instanceof Error ? err.message : String(err),
      });
      return;
    }
    await createWorkflowRun({
      id: workflowId, runId: handle.firstExecutionRunId,
      workflowType: "designBusiness",
      trigger: "user:design_business", userId,
      input: { directionId: direction.id },
      langfuseTraceId: workflowId,
    });
    res.json({ workflowId, runId: handle.firstExecutionRunId });
  } catch (e) { next(e); }
});

router.get("/my-directions/:id/designs", async (req, res, next) => {
  try {
    res.json(await listBusinessDesigns(req.params.id!));
  } catch (e) { next(e); }
});

// ----------------------- Delivery tickets (业务线上化 → 内容工厂 / 流量分发) -----------------------

router.get("/delivery-tickets", async (req, res, next) => {
  try {
    const t = req.query.target;
    const target = (t === "content" || t === "traffic") ? (t as DeliveryTarget) : undefined;
    res.json(await listDeliveryTickets(target));
  } catch (e) { next(e); }
});

router.patch("/delivery-tickets/:id", async (req, res, next) => {
  try {
    const body = req.body as { status?: unknown } | undefined;
    const status = body?.status;
    if (status !== "pending" && status !== "in_progress" && status !== "done") {
      res.status(400).json({ error: "status must be pending | in_progress | done" });
      return;
    }
    const updated = await updateDeliveryTicketStatus(req.params.id!, status as DeliveryStatus);
    if (!updated) { res.status(404).json({ error: "not found" }); return; }
    res.json(updated);
  } catch (e) { next(e); }
});

// ----------------------- Trending list + refresh -----------------------

router.get("/trending-directions", async (_req, res, next) => {
  try { res.json(await listTrendingDirections()); } catch (e) { next(e); }
});

router.post("/trending-directions/refresh", async (req, res, next) => {
  try {
    const userId = await resolveUserId(req);
    const workflowId = `refresh-trending::${userId}::${Date.now()}`;
    const client = await getClient();
    let handle;
    try {
      handle = await client.workflow.start("refreshTrendingWorkflow", {
        taskQueue,
        workflowId,
        args: [{ userId }],
      });
    } catch (err) {
      res.status(503).json({
        error: "workflow start failed — worker offline?",
        detail: err instanceof Error ? err.message : String(err),
      });
      return;
    }
    await createWorkflowRun({
      id: workflowId, runId: handle.firstExecutionRunId,
      workflowType: "refreshTrending",
      trigger: "user:refresh_trending", userId,
      input: { userId },
      langfuseTraceId: workflowId,
    });
    res.json({ workflowId, runId: handle.firstExecutionRunId });
  } catch (e) { next(e); }
});

export default router;
