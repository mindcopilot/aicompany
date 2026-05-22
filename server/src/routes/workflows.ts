// Workflow control plane endpoints. The API server starts workflows via
// Temporal client; the worker process actually runs them and writes status
// back to workflow_runs / workflow_events.

import { Router } from "express";
import { getClient, taskQueue } from "../worker/connection.js";
import { bearerToken, getSessionByToken } from "../auth.js";
import {
  createWorkflowRun, getWorkflowRun, listWorkflowEvents,
} from "../db/queries.js";
import type {
  ScanDirectionsInput,
  ScanDirectionsOutput,
} from "../worker/workflows/index.js";

const router = Router();

async function resolveUserId(req: import("express").Request, override: unknown): Promise<string> {
  if (typeof override === "string" && override.length > 0) return override;
  const t = bearerToken(req);
  if (t) {
    const s = await getSessionByToken(t);
    if (s) return s.user.id;
  }
  return "user-lin-huan";
}

router.post("/scan-directions", async (req, res, next) => {
  try {
    const body = req.body as { userId?: unknown; thesis?: unknown } | undefined;
    const userId = await resolveUserId(req, body?.userId);
    const thesis = typeof body?.thesis === "string" ? body.thesis : undefined;

    const workflowId = `scan-directions::${userId}::${Date.now()}`;
    const args: [ScanDirectionsInput] = [{ userId, ...(thesis ? { thesis } : {}) }];

    const client = await getClient();
    let handle;
    try {
      handle = await client.workflow.start("scanDirectionsWorkflow", {
        taskQueue,
        workflowId,
        args,
      });
    } catch (err) {
      res.status(503).json({
        error: "workflow start failed — is the worker running? (`npm --workspace server run worker`)",
        detail: err instanceof Error ? err.message : String(err),
      });
      return;
    }

    await createWorkflowRun({
      id: workflowId,
      runId: handle.firstExecutionRunId,
      workflowType: "scanDirections",
      trigger: "user:click_scan",
      userId,
      input: args[0],
      langfuseTraceId: workflowId,
    });

    res.json({ workflowId, runId: handle.firstExecutionRunId });
  } catch (e) { next(e); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const run = await getWorkflowRun(req.params.id!);
    if (!run) { res.status(404).json({ error: "not found" }); return; }
    const events = await listWorkflowEvents(run.id, 50);
    res.json({ run, events });
  } catch (e) { next(e); }
});

router.get("/:id/result", async (req, res, next) => {
  // Block until a workflow completes; useful for synchronous-style callers.
  try {
    const client = await getClient();
    const handle = client.workflow.getHandle(req.params.id!);
    const out = (await handle.result()) as ScanDirectionsOutput;
    res.json(out);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
    next.length; // satisfy unused-param warning without breaking error chain
  }
});

export default router;
