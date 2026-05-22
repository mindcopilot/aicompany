import { Router } from "express";
import {
  sendPhoneCode, verifyPhoneCode,
  createWechatScene, pollWechatScene,
  getSessionByToken, deleteSession, bearerToken,
  devLogin,
} from "../auth.js";

const router = Router();

router.post("/phone/send-code", async (req, res, next) => {
  try {
    const result = await sendPhoneCode((req.body as { phone?: unknown } | undefined)?.phone);
    if (!result) {
      res.status(400).json({ error: "invalid phone — expected 8-15 digits, optional + prefix" });
      return;
    }
    res.json({ ok: true, ...result });
  } catch (e) { next(e); }
});

router.post("/phone/verify", async (req, res, next) => {
  try {
    const body = req.body as { phone?: unknown; code?: unknown } | undefined;
    const session = await verifyPhoneCode(body?.phone, body?.code);
    if (!session) {
      res.status(401).json({ error: "invalid or expired code" });
      return;
    }
    res.json(session);
  } catch (e) { next(e); }
});

router.post("/wechat/qr", async (_req, res, next) => {
  try { res.json(await createWechatScene()); } catch (e) { next(e); }
});

router.get("/wechat/poll", async (req, res, next) => {
  try {
    const sceneId = String(req.query.scene ?? "");
    if (!sceneId) { res.status(400).json({ error: "scene required" }); return; }
    res.json(await pollWechatScene(sceneId));
  } catch (e) { next(e); }
});

router.get("/me", async (req, res, next) => {
  try {
    const t = bearerToken(req);
    if (!t) { res.status(401).json({ error: "no token" }); return; }
    const session = await getSessionByToken(t);
    if (!session) { res.status(401).json({ error: "invalid or expired session" }); return; }
    res.json(session);
  } catch (e) { next(e); }
});

router.post("/dev-login", async (_req, res, next) => {
  try {
    const session = await devLogin();
    if (!session) { res.status(500).json({ error: "default user not seeded" }); return; }
    res.json(session);
  } catch (e) { next(e); }
});

router.post("/logout", async (req, res, next) => {
  try {
    const t = bearerToken(req);
    if (t) await deleteSession(t);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
