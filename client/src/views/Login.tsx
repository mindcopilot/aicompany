import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../components/Icon";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { QrSceneResp, WechatPoll } from "../types/api";

type Tab = "wechat" | "phone";

export function Login() {
  const [tab, setTab] = useState<Tab>("wechat");

  return (
    <div className="login-page">
      <BackgroundDecor />

      <header className="login-topnav">
        <div className="login-topnav-brand">
          <div className="brand-mark" style={{ width: 28, height: 28, borderRadius: 8, fontSize: 14 }}>L</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13.5, letterSpacing: "-0.01em" }}>LumenEdu</div>
            <div className="muted text-xs mono">v0.4 · founder mode</div>
          </div>
        </div>
        <div className="login-topnav-right">
          <span className="muted text-xs mono">需要帮助？</span>
          <a className="login-topnav-link" href="#">联系我们 →</a>
        </div>
      </header>

      <div className="login-stage">
        <BrandPanel />
        <div className="login-form-col">
          <div className="login-form-inner">
            <div className="login-form-head">
              <div className="muted text-xs mono" style={{ textTransform: "uppercase", letterSpacing: "0.1em" }}>
                SIGN IN
              </div>
              <h2 className="login-h2">欢迎回到 LumenEdu</h2>
              <div className="muted-2 text-sm">选择登录方式，开始把想法跑起来。</div>
            </div>

            <div className="login-tabs">
              <button className={`login-tab ${tab === "wechat" ? "active" : ""}`} onClick={() => setTab("wechat")}>
                <Icon name="msg" size={14} /> 微信扫码
              </button>
              <button className={`login-tab ${tab === "phone" ? "active" : ""}`} onClick={() => setTab("phone")}>
                <Icon name="phone" size={14} /> 手机号
              </button>
            </div>

            {tab === "wechat" ? <WechatPane /> : <PhonePane />}

            <div className="login-footer">
              <div className="login-foot-row">
                <Icon name="check" size={11} stroke={2} /> 登录即同意 <a href="#">服务条款</a> · <a href="#">隐私政策</a>
              </div>
              <div className="login-foot-row muted text-xs">
                测试模式 · 微信扫码大约 7s 自动确认 · 手机验证码固定 <span className="mono">123456</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BrandPanel() {
  return (
    <div className="login-brand">
      <div className="login-brand-inner">
        <div>
          <div className="login-eyebrow mono">灯塔学院 · AI FOUNDER OS</div>
          <h1 className="login-tagline">
            想法到验证<br />
            <span className="login-tagline-accent">一周走完</span>
          </h1>
          <p className="login-thesis">
            你出想法，AI 把它做出来，市场告诉你行不行。
          </p>

          <div className="login-roles">
            <RoleChip color="#4f46e5" name="Atlas"  role="增长 · Growth"  task="为小红书 #24 排版" />
            <RoleChip color="#0891b2" name="Nova"   role="内容 · Content" task="扩写课程 #11 第 3 节" />
            <RoleChip color="#9333ea" name="Helix"  role="研究 · Research" task="扫描 3 个竞品周更" />
            <RoleChip color="#16a34a" name="Aria"   role="用户 · Care"     task="回复 3 条小红书 DM" />
          </div>
        </div>

        <div className="login-stats">
          <div className="login-stat">
            <div className="login-stat-num mono">92</div>
            <div className="login-stat-lbl">付费用户</div>
          </div>
          <div className="login-stat">
            <div className="login-stat-num mono">¥45.2K</div>
            <div className="login-stat-lbl">MRR · +12.4% wow</div>
          </div>
          <div className="login-stat">
            <div className="login-stat-num mono">4 / 0</div>
            <div className="login-stat-lbl">AI Agent · 团队成员</div>
          </div>
          <div className="login-stat">
            <div className="login-stat-num mono">218</div>
            <div className="login-stat-lbl">知识库条目</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RoleChip({ color, name, role, task }: { color: string; name: string; role: string; task: string }) {
  return (
    <div className="role-chip">
      <div className="role-chip-av" style={{ background: `linear-gradient(135deg, ${color} 0%, ${color}99 100%)` }}>{name[0]}</div>
      <div style={{ minWidth: 0 }}>
        <div className="role-chip-name">{name} <span className="role-chip-role mono">{role}</span></div>
        <div className="role-chip-task">正在 · {task}</div>
      </div>
    </div>
  );
}

// =========================================================================
// WeChat tab
// =========================================================================

function WechatPane() {
  const { signIn } = useAuth();
  const [scene, setScene] = useState<QrSceneResp | null>(null);
  const [status, setStatus] = useState<WechatPoll["status"]>("waiting");
  const [err, setErr] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  const refresh = async () => {
    setErr(null);
    setStatus("waiting");
    try {
      const s = await api.auth.wechatQr();
      setScene(s);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  };

  useEffect(() => { void refresh(); }, []);

  useEffect(() => {
    if (!scene || status === "confirmed") return;
    let cancelled = false;
    const tick = async () => {
      try {
        const r = await api.auth.wechatPoll(scene.sceneId);
        if (cancelled) return;
        setStatus(r.status);
        if (r.status === "confirmed") {
          signIn(r.session);
        }
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : String(e));
      }
    };
    pollRef.current = window.setInterval(() => void tick(), 1200);
    void tick();
    return () => {
      cancelled = true;
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [scene, status, signIn]);

  return (
    <div className="login-pane">
      <div className={`qr-wrap state-${status}`}>
        {scene ? <FakeQr seed={scene.sceneId} /> : <QrSkeleton />}
        {status === "scanned" && (
          <div className="qr-overlay">
            <Icon name="check" size={28} stroke={2.4} />
            <div className="qr-overlay-text">已扫码<br /><span className="muted text-xs">请在微信中确认登录</span></div>
          </div>
        )}
        {status === "confirmed" && (
          <div className="qr-overlay confirmed">
            <Icon name="check" size={28} stroke={2.4} />
            <div className="qr-overlay-text">登录成功</div>
          </div>
        )}
        {status === "expired" && (
          <div className="qr-overlay expired">
            <Icon name="refresh" size={22} stroke={2} />
            <div className="qr-overlay-text">二维码已过期</div>
            <button className="btn sm primary" onClick={() => void refresh()}>刷新</button>
          </div>
        )}
      </div>

      <div className="qr-help">
        <div className="qr-help-step"><Icon name="msg" size={12} /> 打开微信 → 扫一扫</div>
        <div className="qr-help-step"><Icon name="check" size={12} stroke={2} /> 在手机上确认登录</div>
      </div>

      {err && <div className="login-error">{err}</div>}
    </div>
  );
}

function QrSkeleton() {
  return (
    <div className="qr-skeleton">
      <Icon name="msg" size={28} />
      <span className="muted text-xs mt-8">正在生成二维码…</span>
    </div>
  );
}

/** Deterministic fake QR: hash seed → fill grid. Visually QR-ish; not scannable. */
function FakeQr({ seed }: { seed: string }) {
  const size = 21;
  const cells = useMemo(() => {
    const bits: boolean[] = [];
    let h = 2166136261 >>> 0;
    for (let i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    for (let i = 0; i < size * size; i++) {
      h ^= h << 13; h ^= h >>> 17; h ^= h << 5;
      bits.push(((h >>> 0) & 1) === 1);
    }
    return bits;
  }, [seed]);

  const isFinder = (r: number, c: number) => {
    const inBox = (br: number, bc: number) =>
      r >= br && r < br + 7 && c >= bc && c < bc + 7;
    if (!(inBox(0, 0) || inBox(0, size - 7) || inBox(size - 7, 0))) return null;
    const local = (br: number, bc: number) => {
      const rr = r - br, cc = c - bc;
      const ring1 = rr === 0 || rr === 6 || cc === 0 || cc === 6;
      const core  = rr >= 2 && rr <= 4 && cc >= 2 && cc <= 4;
      return ring1 || core;
    };
    if (inBox(0, 0))            return local(0, 0);
    if (inBox(0, size - 7))     return local(0, size - 7);
    return local(size - 7, 0);
  };

  return (
    <svg className="qr-svg" viewBox={`0 0 ${size} ${size}`} preserveAspectRatio="none">
      <rect width={size} height={size} fill="#fff" />
      {Array.from({ length: size }).map((_, r) =>
        Array.from({ length: size }).map((__, c) => {
          const finder = isFinder(r, c);
          const on = finder ?? cells[r * size + c]!;
          return on ? <rect key={`${r}-${c}`} x={c} y={r} width={1.02} height={1.02} fill="#0a0a0a" /> : null;
        })
      )}
      {/* WeChat green corner badge */}
      <rect x={size / 2 - 2} y={size / 2 - 2} width={4} height={4} fill="#07c160" rx={0.6} />
      <text x={size / 2} y={size / 2 + 1.2} textAnchor="middle" fontSize={2.6} fontFamily="ui-sans-serif" fill="#fff" fontWeight="700">微</text>
    </svg>
  );
}

// =========================================================================
// Phone tab
// =========================================================================

function PhonePane() {
  const { signIn } = useAuth();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"enter" | "code">("enter");
  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setInterval(() => setCooldown(c => Math.max(0, c - 1)), 1000);
    return () => window.clearInterval(id);
  }, [cooldown]);

  const validPhone = /^\+?\d{8,15}$/.test(phone.replace(/\s|-/g, ""));

  const sendCode = async () => {
    if (!validPhone || busy) return;
    setBusy(true); setErr(null); setHint(null);
    try {
      const r = await api.auth.sendCode(phone);
      setHint(r.hint ?? null);
      setStage("code");
      setCooldown(60);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (!/^\d{6}$/.test(code) || busy) return;
    setBusy(true); setErr(null);
    try {
      const session = await api.auth.verifyPhone(phone, code);
      signIn(session);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "验证失败");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-pane">
      <div className="phone-row">
        <div className="phone-cc">
          <span className="mono">+86</span>
          <Icon name="chevD" size={11} />
        </div>
        <input
          className="phone-input"
          inputMode="numeric"
          placeholder="手机号"
          value={phone}
          maxLength={15}
          autoFocus={stage === "enter"}
          onChange={e => setPhone(e.target.value.replace(/[^\d+\s-]/g, ""))}
          onKeyDown={e => { if (e.key === "Enter") void sendCode(); }}
        />
      </div>

      {stage === "code" && (
        <div className="code-row">
          <input
            className="code-input"
            inputMode="numeric"
            placeholder="6 位验证码"
            value={code}
            maxLength={6}
            autoFocus
            onChange={e => setCode(e.target.value.replace(/[^\d]/g, ""))}
            onKeyDown={e => { if (e.key === "Enter") void verify(); }}
          />
          <button className="btn sm" disabled={cooldown > 0 || busy} onClick={() => void sendCode()}>
            {cooldown > 0 ? `${cooldown}s 后重发` : "重新发送"}
          </button>
        </div>
      )}

      <button
        className="btn primary login-submit"
        disabled={busy || (stage === "enter" ? !validPhone : !/^\d{6}$/.test(code))}
        onClick={() => (stage === "enter" ? void sendCode() : void verify())}
      >
        {busy
          ? "处理中…"
          : stage === "enter"
            ? <>获取验证码 <Icon name="arrowRight" size={13} stroke={2} /></>
            : <>登录 <Icon name="arrowRight" size={13} stroke={2} /></>}
      </button>

      {hint && <div className="login-hint">{hint}</div>}
      {err && <div className="login-error">{err}</div>}
    </div>
  );
}

// =========================================================================
// background
// =========================================================================

function BackgroundDecor() {
  return (
    <div className="login-bg" aria-hidden>
      <div className="login-bg-glow login-bg-glow-1" />
      <div className="login-bg-glow login-bg-glow-2" />
      <svg className="login-bg-grid" width="100%" height="100%">
        <defs>
          <pattern id="login-grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M48 0H0V48" fill="none" stroke="rgba(15,15,15,0.04)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#login-grid)" />
      </svg>
    </div>
  );
}
