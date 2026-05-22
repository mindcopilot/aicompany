import { useEffect, useState, type ReactNode } from "react";
import { Icon } from "../components/Icon";
import { AgentTag } from "../components/primitives";
import { useAsync } from "../hooks/useApi";
import { useAuth } from "../lib/auth";
import { useUI } from "../lib/ui";
import { api } from "../lib/api";
import type { FounderProfile } from "../types/api";

const EMPTY_PROFILE: FounderProfile = {
  tags: "", hours: "", capital: "", risk: "稳健", interests: [], thesis: "",
};

const RISK_OPTIONS = ["保守", "稳健", "激进"];

export function SettingsView() {
  const { user, session, signOut } = useAuth();
  const { toast } = useUI();
  const { data: agents } = useAsync(() => api.agents(), []);

  const [profile, setProfile] = useState<FounderProfile>(EMPTY_PROFILE);
  const [interestsText, setInterestsText] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void api.founderProfile.get()
      .then(p => {
        if (p) {
          setProfile({ ...EMPTY_PROFILE, ...p });
          setInterestsText((p.interests ?? []).join(", "));
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const set = <K extends keyof FounderProfile>(k: K, v: FounderProfile[K]): void =>
    setProfile(p => ({ ...p, [k]: v }));

  const save = async (): Promise<void> => {
    setSaving(true);
    try {
      const interests = interestsText.split(/[,，]/).map(s => s.trim()).filter(Boolean);
      const saved = await api.founderProfile.save({ ...profile, interests });
      setProfile({ ...EMPTY_PROFILE, ...saved });
      setInterestsText(saved.interests.join(", "));
      toast("已保存创始人画像");
    } catch (e) {
      toast(`保存失败：${e instanceof Error ? e.message : String(e)}`, "warn");
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;
  const channelLabel = session?.channel === "wechat" ? "微信登录" : "手机号登录";

  return (
    <>
      <div className="module-header">
        <div className="title-wrap">
          <div className="module-eyebrow">11 · ACCOUNT & SETTINGS</div>
          <h1 className="module-title">设置</h1>
          <div className="module-sub">账户资料、创始人画像与团队成员 — 这些信息会被 AI 用来校准每一次决策。</div>
        </div>
        <div className="module-actions">
          <button className="btn" onClick={() => void signOut()}><Icon name="logout" size={14} /> 退出登录</button>
        </div>
      </div>

      <div className="module-body" style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24 }}>
        <div className="col" style={{ gap: 14 }}>
          <div className="card">
            <div className="card-title"><Icon name="name" size={14} /> 账户资料</div>
            <div style={{ display: "flex", gap: 14, alignItems: "center", marginTop: 14 }}>
              <div className="avatar" style={{ width: 48, height: 48, borderRadius: 12, fontSize: 17, margin: 0 }}>
                {user.initials}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{user.name}</div>
                <div className="muted text-xs mono">{user.role} · {channelLabel}</div>
              </div>
            </div>
            <div className="grid-2 mt-16" style={{ gap: 10 }}>
              <Field label="手机号" value={user.phone ?? "—"} />
              <Field label="微信" value={user.wechatOpenid ? "已绑定" : "—"} />
              <Field label="加入时间" value={fmtDate(user.createdAt)} />
              <Field label="上次登录" value={user.lastLoginAt ? fmtDate(user.lastLoginAt) : "—"} />
            </div>
          </div>

          <div className="card">
            <div className="card-title"><Icon name="compass" size={14} /> 创始人画像</div>
            <div className="muted text-xs mt-8">AI 在评估方向、生成内容时会读取这份画像作为上下文。</div>
            <div className="mt-16 col" style={{ gap: 14 }}>
              <Input label="标签 / 自我定位" value={profile.tags} disabled={!loaded}
                placeholder="例如：独立开发者 · 全栈 · 教育" onChange={v => set("tags", v)} />
              <div className="grid-2" style={{ gap: 10 }}>
                <Input label="每周可投入" value={profile.hours} disabled={!loaded}
                  placeholder="例如：20 小时 / 周" onChange={v => set("hours", v)} />
                <Input label="启动资金" value={profile.capital} disabled={!loaded}
                  placeholder="例如：¥50,000" onChange={v => set("capital", v)} />
              </div>
              <div>
                <FieldLabel>风险偏好</FieldLabel>
                <div className="seg mt-8">
                  {RISK_OPTIONS.map(o => (
                    <button key={o} className={profile.risk === o ? "active" : ""}
                      disabled={!loaded} onClick={() => set("risk", o)}>{o}</button>
                  ))}
                </div>
              </div>
              <Input label="兴趣领域（逗号分隔）" value={interestsText} disabled={!loaded}
                placeholder="例如：AI 工具, 开发者教育, SaaS" onChange={setInterestsText} />
              <div>
                <FieldLabel>创业思考 / thesis</FieldLabel>
                <textarea className="textarea-input mt-8" disabled={!loaded}
                  placeholder="一句话讲清楚你想做什么、为什么是你……"
                  value={profile.thesis ?? ""} onChange={e => set("thesis", e.target.value)} />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button className="btn primary" disabled={!loaded || saving} onClick={() => void save()}>
                  <Icon name="check" size={12} /> {saving ? "保存中…" : "保存画像"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="col" style={{ gap: 14 }}>
          <div className="card">
            <div className="card-title"><Icon name="users" size={14} /> 团队成员</div>
            <div className="kb-list" style={{ marginTop: 10 }}>
              <div className="ref-row">
                <div className="avatar" style={{ width: 26, height: 26, borderRadius: 8, fontSize: 11, margin: 0 }}>
                  {user.initials}
                </div>
                <span>{user.name}</span>
                <span className="muted mono" style={{ marginLeft: "auto", fontSize: 11 }}>{user.role}</span>
              </div>
              {(agents ?? []).map(a => (
                <div key={a.id} className="ref-row">
                  <AgentTag name={a.name} />
                  <span className="muted">{a.role}</span>
                  <span className="muted mono" style={{ marginLeft: "auto", fontSize: 11 }}>
                    {a.busy ? "工作中" : "待命"}
                  </span>
                </div>
              ))}
            </div>
            <div className="muted text-xs mt-12">
              {(agents ?? []).length} 个 AI 同事 + 你 · 在「Agent 编排」中调整分工。
            </div>
          </div>

          <div className="card">
            <div className="card-title"><Icon name="settings" size={14} /> 界面偏好</div>
            <div className="muted text-xs mt-8">
              主题色、密度与布局可在右下角的 Tweaks 面板中实时调整，设置会保存在本地。
            </div>
          </div>

          <div className="card">
            <div className="card-title"><Icon name="bell" size={14} /> 数据与隐私</div>
            <div className="muted text-xs mt-8">
              当前为单人 founder 工作区，所有数据存储在你自己的数据库中。
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <div className="muted text-xs mono" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="card soft" style={{ padding: "10px 12px" }}>
      <FieldLabel>{label}</FieldLabel>
      <div style={{ fontSize: 13, marginTop: 4 }}>{value}</div>
    </div>
  );
}

function Input({ label, value, onChange, placeholder, disabled }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <input className="text-input mt-8" value={value} placeholder={placeholder}
        disabled={disabled} onChange={e => onChange(e.target.value)} />
    </div>
  );
}
