import { randomBytes } from "node:crypto";
import { pool, query } from "./db/pool.js";
import type { AuthChannel, AuthSession, User, WechatSceneStatus } from "./types.js";

const SESSION_TTL_DAYS = 30;
const PHONE_CODE_TTL_MS = 5 * 60 * 1000;        // 5 minutes
const WECHAT_SCENE_TTL_MS = 2 * 60 * 1000;      // 2 minutes
const WECHAT_SCAN_AFTER_MS = 3500;              // mock: scanned after ~3.5s
const WECHAT_CONFIRM_AFTER_MS = 7000;           // mock: confirmed after ~7s

// Mock mode: phone code is always "123456" so the UI can hint at it.
// Set MOCK_PHONE_CODE=0 to require a random code (logged to server stdout).
const PHONE_CODE_STATIC = process.env.MOCK_PHONE_CODE !== "0";

interface PhoneCode { code: string; expiresAt: number; }
interface WechatScene { createdAt: number; expiresAt: number; }

const phoneCodes  = new Map<string, PhoneCode>();
const wechatScenes = new Map<string, WechatScene>();

function token(bytes = 24): string {
  return randomBytes(bytes).toString("hex");
}

function rowToUser(r: UserRow): User {
  return {
    id: r.id,
    name: r.name,
    initials: r.initials,
    phone: r.phone,
    wechatOpenid: r.wechat_openid,
    role: r.role,
    createdAt: r.created_at.toISOString(),
    lastLoginAt: r.last_login_at ? r.last_login_at.toISOString() : null,
  };
}

interface UserRow {
  id: string; phone: string | null; wechat_openid: string | null;
  name: string; initials: string; role: string;
  created_at: Date; last_login_at: Date | null;
}

async function findUserByPhone(phone: string): Promise<User | null> {
  const { rows } = await query<UserRow>(
    `SELECT id, phone, wechat_openid, name, initials, role, created_at, last_login_at
     FROM users WHERE phone = $1`,
    [phone]
  );
  return rows[0] ? rowToUser(rows[0]) : null;
}

async function findUserById(id: string): Promise<User | null> {
  const { rows } = await query<UserRow>(
    `SELECT id, phone, wechat_openid, name, initials, role, created_at, last_login_at
     FROM users WHERE id = $1`,
    [id]
  );
  return rows[0] ? rowToUser(rows[0]) : null;
}

async function findUserByWechat(openid: string): Promise<User | null> {
  const { rows } = await query<UserRow>(
    `SELECT id, phone, wechat_openid, name, initials, role, created_at, last_login_at
     FROM users WHERE wechat_openid = $1`,
    [openid]
  );
  return rows[0] ? rowToUser(rows[0]) : null;
}

async function createPhoneUser(phone: string): Promise<User> {
  const last4 = phone.slice(-4);
  const id = `user-phone-${last4}-${token(4)}`;
  const { rows } = await query<UserRow>(
    `INSERT INTO users (id, phone, name, initials, role)
     VALUES ($1, $2, $3, $4, 'founder')
     RETURNING id, phone, wechat_openid, name, initials, role, created_at, last_login_at`,
    [id, phone, `Founder ${last4}`, last4.slice(-2).toUpperCase()]
  );
  return rowToUser(rows[0]!);
}

async function touchUserLogin(userId: string): Promise<void> {
  await query("UPDATE users SET last_login_at = NOW() WHERE id = $1", [userId]);
}

async function createSession(userId: string, channel: AuthChannel): Promise<AuthSession> {
  const t = token();
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  await query(
    `INSERT INTO auth_sessions (token, user_id, channel, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [t, userId, channel, expiresAt]
  );
  await touchUserLogin(userId);
  const user = await findUserById(userId);
  if (!user) throw new Error("user vanished after creating session");
  return { token: t, user, channel, expiresAt: expiresAt.toISOString() };
}

export async function getSessionByToken(token: string): Promise<AuthSession | null> {
  const { rows } = await query<{
    token: string; user_id: string; channel: AuthChannel; expires_at: Date;
  }>(
    `UPDATE auth_sessions
       SET last_seen_at = NOW()
     WHERE token = $1 AND expires_at > NOW()
     RETURNING token, user_id, channel, expires_at`,
    [token]
  );
  const s = rows[0];
  if (!s) return null;
  const user = await findUserById(s.user_id);
  if (!user) return null;
  return { token: s.token, user, channel: s.channel, expiresAt: s.expires_at.toISOString() };
}

export async function deleteSession(token: string): Promise<void> {
  await query("DELETE FROM auth_sessions WHERE token = $1", [token]);
}

// ---- Phone flow ----

function normalizePhone(input: unknown): string | null {
  const s = String(input ?? "").replace(/\s+|-/g, "");
  if (!/^\+?\d{8,15}$/.test(s)) return null;
  return s;
}

export interface SendCodeResult { phone: string; expiresIn: number; hint?: string; }
export async function sendPhoneCode(input: unknown): Promise<SendCodeResult | null> {
  const phone = normalizePhone(input);
  if (!phone) return null;
  const code = PHONE_CODE_STATIC ? "123456" : Math.floor(Math.random() * 1_000_000).toString().padStart(6, "0");
  phoneCodes.set(phone, { code, expiresAt: Date.now() + PHONE_CODE_TTL_MS });
  if (!PHONE_CODE_STATIC) console.log(`[mock-sms] code for ${phone}: ${code}`);
  return {
    phone,
    expiresIn: PHONE_CODE_TTL_MS / 1000,
    hint: PHONE_CODE_STATIC ? "测试模式：验证码固定为 123456" : undefined,
  };
}

export async function verifyPhoneCode(phoneInput: unknown, codeInput: unknown): Promise<AuthSession | null> {
  const phone = normalizePhone(phoneInput);
  const code = String(codeInput ?? "").trim();
  if (!phone || !/^\d{6}$/.test(code)) return null;
  const entry = phoneCodes.get(phone);
  if (!entry) return null;
  if (entry.expiresAt < Date.now() || entry.code !== code) return null;
  phoneCodes.delete(phone);
  const existing = await findUserByPhone(phone);
  const user = existing ?? await createPhoneUser(phone);
  return createSession(user.id, "phone");
}

// ---- Dev quick-login ----

export async function devLogin(): Promise<AuthSession | null> {
  const user = await findUserByWechat("wx_lumenedu_lh");
  if (!user) return null;
  return createSession(user.id, "wechat");
}

// ---- WeChat flow ----

export interface QrSceneResult { sceneId: string; expiresAt: string; ticket: string; }
export async function createWechatScene(): Promise<QrSceneResult> {
  const sceneId = token(12);
  const now = Date.now();
  wechatScenes.set(sceneId, { createdAt: now, expiresAt: now + WECHAT_SCENE_TTL_MS });
  return {
    sceneId,
    expiresAt: new Date(now + WECHAT_SCENE_TTL_MS).toISOString(),
    // Fake "ticket" the QR image would normally encode; client builds a deterministic
    // pattern from it. Not a real WeChat QR.
    ticket: `lumenedu://wechat-qr/${sceneId}`,
  };
}

export async function pollWechatScene(sceneId: string): Promise<{ status: WechatSceneStatus; session?: AuthSession }> {
  const scene = wechatScenes.get(sceneId);
  if (!scene) return { status: "expired" };
  const now = Date.now();
  if (now >= scene.expiresAt) {
    wechatScenes.delete(sceneId);
    return { status: "expired" };
  }
  const age = now - scene.createdAt;
  if (age < WECHAT_SCAN_AFTER_MS) return { status: "waiting" };
  if (age < WECHAT_CONFIRM_AFTER_MS) return { status: "scanned" };

  // Confirmed — issue session for the default WeChat user, then clear scene
  const openid = "wx_lumenedu_lh";
  const user = await findUserByWechat(openid);
  if (!user) {
    // Shouldn't happen — seed creates this user. Defensive only.
    return { status: "expired" };
  }
  wechatScenes.delete(sceneId);
  const session = await createSession(user.id, "wechat");
  return { status: "confirmed", session };
}

// ---- Auth middleware helper ----

import type { Request } from "express";
export function bearerToken(req: Request): string | null {
  const h = req.header("authorization") || req.header("Authorization");
  if (!h) return null;
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m?.[1]?.trim() || null;
}
