import { useState } from "react";
import { Icon } from "../components/Icon";
import { AgentTag, SignalCell } from "../components/primitives";
import { Sparkline } from "../components/Charts";
import { useAsync } from "../hooks/useApi";
import { useUI } from "../lib/ui";
import { api } from "../lib/api";
import { DeliveryInbox } from "../components/DeliveryInbox";
import type { ContentTrack, ContentJob, LibraryItem, ModelMatrix } from "../types/api";

const FULL_SET_FIELDS = [
  { name: "brief", label: "主题 / brief", type: "textarea" as const, placeholder: "例如：SQLite 边缘部署的 6 个反直觉做法，受众是 indie dev。" },
];

const LIB_FILTERS = ["全部", "文章", "短视频", "长视频", "音频", "图像", "海报"] as const;
const FILTER_TRACK: Record<string, string> = {
  "文章": "article", "短视频": "short", "长视频": "longvid",
  "音频": "audio", "图像": "image", "海报": "post",
};
const JOB_FILTERS = ["全部", "运行中", "待审", "队列"] as const;
const JOB_STATUS: Record<string, ContentJob["status"]> = {
  "运行中": "running", "待审": "review", "队列": "queued",
};

export function ContentView() {
  const { openDrawer, toast } = useUI();
  const { data: tracks }  = useAsync(() => api.tracks(), []);
  const { data: jobs, refresh: reloadJobs }    = useAsync(() => api.jobs(), []);
  const { data: models }  = useAsync(() => api.models(), []);
  const { data: library } = useAsync(() => api.library(), []);

  const [view, setView] = useState<"grid" | "list">("grid");
  const [filter, setFilter] = useState<(typeof LIB_FILTERS)[number]>("全部");
  const [jobFilter, setJobFilter] = useState<(typeof JOB_FILTERS)[number]>("全部");

  const trackById = (id: ContentTrack["id"]) => (tracks ?? []).find(t => t.id === id);
  const jobsShown = (jobs ?? []).filter(j => jobFilter === "全部" || j.status === JOB_STATUS[jobFilter]);
  const libraryShown = (library ?? []).filter(l => filter === "全部" || l.track === FILTER_TRACK[filter]);

  return (
    <>
      <div className="module-header">
        <div className="title-wrap">
          <div className="module-eyebrow">04 · CONTENT STUDIO</div>
          <h1 className="module-title">内容工厂</h1>
          <div className="module-sub">把方向变成可分发的内容资产 · 多模型协作 · 一稿到生产。</div>
        </div>
        <div className="module-actions">
          <span className="tag ai"><span className="dot" /> 3 个任务运行中</span>
          <button className="btn" onClick={() => toast("模型偏好 · 当前按任务自动路由到最优模型")}><Icon name="sliders" size={14} /> 模型偏好</button>
          <button className="btn primary" onClick={() => openDrawer({
            eyebrow: "FULL SET", title: "一次生成全套", sub: "一个 brief → 6 种形态 · 全部入队",
            body: <FullSetForm onSubmit={async brief => {
              const { created } = await api.contentJobFullSet(brief);
              await reloadJobs();
              return created.length;
            }} />,
          })}><Icon name="sparkle" size={14} /> 一次生成全套</button>
        </div>
      </div>

      <div className="module-body">
        <DeliveryInbox target="content" />
        <div className="kpi-grid" style={{ marginBottom: 16 }}>
          <ContentKPI label="本周产出" value="48"   delta="+22%" sub="件 · 含 6 类形态" />
          <ContentKPI label="进行中"   value="3"   sub="预计 11 分钟后清空" />
          <ContentKPI label="待你审核" value="2"   sub="EP06 播客 · 知乎回答" />
          <ContentKPI label="本月成本" value="¥412" sub="预算 ¥2000 · 已用 20.6%" />
        </div>

        <div className="module-section">
          <div className="section-head">
            <div className="section-title">新建内容 · 6 种形态</div>
            <span className="muted text-xs">基于「方向 → 文章 → 拆解 → 多形态分发」一次生成</span>
          </div>
          <div className="track-grid">
            {(tracks ?? []).map(t => (
              <div key={t.id} className="track-card" onClick={() => openDrawer({
                eyebrow: `NEW · ${t.name}`, title: `新建：${t.name}`, sub: t.desc,
                body: <NewContentForm t={t} onCreated={reloadJobs} />,
              })}>
                <div className="track-icon" style={{ background: `${t.color}1a`, color: t.color }}>
                  <Icon name={t.icon} size={18} />
                </div>
                <div className="track-name">{t.name}</div>
                <div className="track-desc">{t.desc}</div>
                <div className="track-meta">
                  <div><span className="muted text-xs mono">推荐模型</span><br /><span className="mono" style={{ fontSize: 11, color: "var(--text)" }}>{t.bestFor}</span></div>
                  <div><span className="muted text-xs mono">耗时</span><br /><span className="mono" style={{ fontSize: 11 }}>{t.duration}</span></div>
                  <div><span className="muted text-xs mono">单次成本</span><br /><span className="mono" style={{ fontSize: 11 }}>{t.typicalCost}</span></div>
                </div>
                <div className="track-cta">
                  <Icon name="plus" size={12} /> 开始生成
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="module-section">
          <div className="section-head">
            <div className="section-title">生产流水线 · {(jobs ?? []).length} 个任务</div>
            <div className="seg">
              {JOB_FILTERS.map(f => {
                const n = f === "全部" ? (jobs ?? []).length : (jobs ?? []).filter(j => j.status === JOB_STATUS[f]).length;
                return (
                  <button key={f} className={jobFilter === f ? "active" : ""} onClick={() => setJobFilter(f)}>
                    {f === "全部" ? f : `${f} · ${n}`}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="job-list">
            {jobsShown.length === 0 && <div className="muted text-sm" style={{ padding: "16px 4px" }}>该状态下暂无任务。</div>}
            {jobsShown.map(j => {
              const t = trackById(j.track);
              if (!t) return null;
              return (
                <div key={j.id} className={`job-row status-${j.status}`}
                  onClick={() => openDrawer({
                    eyebrow: `${t.name.toUpperCase()} · ${j.model}`, title: j.title, sub: j.phase, body: <JobDrawer j={j} t={t} />,
                  })}>
                  <div className="job-icon" style={{ background: `${t.color}1a`, color: t.color }}>
                    <Icon name={t.icon} size={15} />
                  </div>
                  <div>
                    <div className="job-title">{j.title}</div>
                    <div className="job-phase muted text-sm">{j.phase}</div>
                  </div>
                  <div className="job-model">
                    <span className="muted text-xs mono">MODEL</span>
                    <div className="mono" style={{ fontSize: 12, marginTop: 2 }}>{j.model}</div>
                  </div>
                  <div className="job-progress">
                    <div className="job-bar">
                      <div className={`job-bar-fill ${j.status === "running" ? "animated" : ""}`}
                        style={{ width: `${j.progress}%`, background: j.status === "review" ? "var(--accent)" : "var(--text)" }} />
                    </div>
                    <div className="job-bar-meta">
                      <span className="mono" style={{ fontSize: 11 }}>{j.progress}%</span>
                      <span className="muted mono" style={{ fontSize: 11 }}>· ETA {j.eta}</span>
                    </div>
                  </div>
                  <div className="job-side">
                    <AgentTag name={j.agent} />
                    <span className="mono muted" style={{ fontSize: 11, marginTop: 4 }}>{j.cost}</span>
                  </div>
                  <div className="job-action">
                    {j.status === "running" && <button className="icon-btn" onClick={e => { e.stopPropagation(); toast(`已暂停：${j.title}`); }}><Icon name="pause" size={14} /></button>}
                    {j.status === "review"  && <button className="btn sm primary" onClick={e => { e.stopPropagation(); toast(`已通过审核：${j.title}`); }}>审核</button>}
                    {j.status === "queued"  && <button className="icon-btn" onClick={e => { e.stopPropagation(); toast(`已插队启动：${j.title}`); }}><Icon name="play" size={14} /></button>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="module-section">
          <div className="card">
            <div className="card-head">
              <div className="card-title"><Icon name="cpu" size={14} /> 模型矩阵 · 10 个最强模型</div>
              <span className="muted text-xs mono">按任务自动路由 · 你可覆盖</span>
            </div>
            <div className="model-table">
              <div className="model-row head">
                <div>模型 · 用途</div><div>能力</div><div>单价</div><div>本月调用</div>
              </div>
              {(models ?? []).map(m => <ModelRow key={m.name} m={m} />)}
            </div>
          </div>
        </div>

        <div className="grid-2 module-section">
          <div className="card">
            <div className="card-title"><Icon name="bar" size={14} /> 本月成本结构</div>
            <div className="cost-row">
              <CostDonut />
              <div className="cost-legend">
                <div><span className="dot" style={{ background: "#0891b2" }} /> 长视频 · ¥186</div>
                <div><span className="dot" style={{ background: "#16a34a" }} /> 音频 · ¥84</div>
                <div><span className="dot" style={{ background: "#4f46e5" }} /> 长文 · ¥62</div>
                <div><span className="dot" style={{ background: "#ec4899" }} /> 短视频 · ¥38</div>
                <div><span className="dot" style={{ background: "#b45309" }} /> 图像 · ¥28</div>
                <div><span className="dot" style={{ background: "#9333ea" }} /> 海报 · ¥14</div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-title"><Icon name="activity" size={14} /> 7 天产出趋势</div>
            <div className="mt-12">
              <Sparkline data={[3, 5, 4, 8, 6, 9, 11]} w={420} h={72} color="var(--accent)" />
            </div>
            <div className="muted text-xs mt-12 mono" style={{ display: "flex", justifyContent: "space-between" }}>
              <span>周一</span><span>周二</span><span>周三</span><span>周四</span><span>周五</span><span>周六</span><span>今天</span>
            </div>
            <div className="grid-3" style={{ marginTop: 16, gap: 8 }}>
              <SignalCell n="48"   l="本周产出" />
              <SignalCell n="¥412" l="本月成本" />
              <SignalCell n="¥8.6" l="单件均价" />
            </div>
          </div>
        </div>

        <div className="module-section">
          <div className="section-head">
            <div className="section-title">内容库 · 最近产出</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div className="seg">
                {LIB_FILTERS.map(f => (
                  <button key={f} className={filter === f ? "active" : ""} onClick={() => setFilter(f)}>{f}</button>
                ))}
              </div>
              <div className="seg">
                <button className={view === "grid" ? "active" : ""} onClick={() => setView("grid")}><Icon name="grid" size={12} /></button>
                <button className={view === "list" ? "active" : ""} onClick={() => setView("list")}><Icon name="list" size={12} /></button>
              </div>
            </div>
          </div>

          {libraryShown.length === 0 && (
            <div className="muted text-sm" style={{ padding: "20px 4px" }}>「{filter}」形态下暂无内容产出。</div>
          )}

          {view === "grid" && libraryShown.length > 0 && (
            <div className="library-grid">
              {libraryShown.map(l => {
                const t = trackById(l.track);
                if (!t) return null;
                return (
                  <div key={l.id} className="library-card" onClick={() => openDrawer({
                    eyebrow: t.name.toUpperCase(), title: l.title, sub: l.meta, body: <LibraryDrawer l={l} t={t} />,
                  })}>
                    <div className="library-thumb" style={{ background: `linear-gradient(135deg, ${t.color}33 0%, ${t.color}11 100%)`, color: t.color }}>
                      <Icon name={t.icon} size={28} />
                      {(l.track === "longvid" || l.track === "short") && (
                        <div className="play-overlay"><Icon name="play" size={14} /></div>
                      )}
                    </div>
                    <div className="library-meta">
                      <div className="library-track mono">{t.name}</div>
                      <div className="library-title">{l.title}</div>
                      <div className="muted text-xs mt-8">{l.meta}</div>
                      <div className="library-foot">
                        <span className="tag mono">{l.model}</span>
                        <span className="muted mono" style={{ fontSize: 11, marginLeft: "auto" }}>{l.cost} · {l.time}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {view === "list" && libraryShown.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {libraryShown.map(l => {
                const t = trackById(l.track);
                if (!t) return null;
                return (
                  <div key={l.id} onClick={() => openDrawer({
                    eyebrow: t.name.toUpperCase(), title: l.title, sub: l.meta, body: <LibraryDrawer l={l} t={t} />,
                  })}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer" }}>
                    <div className="job-icon" style={{ background: `${t.color}1a`, color: t.color }}>
                      <Icon name={t.icon} size={15} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{l.title}</div>
                      <div className="muted text-xs">{l.meta}</div>
                    </div>
                    <span className="tag mono">{t.name}</span>
                    <span className="tag mono">{l.model}</span>
                    <span className="muted mono text-xs" style={{ minWidth: 96, textAlign: "right" }}>{l.cost} · {l.time}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function ContentKPI({ label, value, delta, sub }: { label: string; value: string; delta?: string; sub?: string }) {
  return (
    <div className="kpi">
      <div className="kpi-label"><span className="dot" />{label}</div>
      <div className="kpi-value">{value}</div>
      {delta && <div className="kpi-delta">{delta}</div>}
      {sub && <div className="muted text-xs" style={{ marginTop: 8 }}>{sub}</div>}
    </div>
  );
}

function ModelRow({ m }: { m: ModelMatrix }) {
  return (
    <div className="model-row" title={m.strengths}>
      <div className="model-cell">
        <div className="model-dot" style={{ background: m.color }} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="model-name-row">
            <span style={{ fontSize: 13, fontWeight: 600 }}>{m.name}</span>
            <span className="muted text-xs mono">{m.vendor}</span>
          </div>
          <div className="model-uses">
            {m.uses.map(u => <span key={u} className="tag">{u}</span>)}
            <span className="model-strength">· {m.strengths}</span>
          </div>
        </div>
      </div>
      <div className="rating-pill">
        <div className="rating-bar"><div className="rating-fill" style={{ width: `${m.rating}%` }} /></div>
        <span className="mono">{m.rating}</span>
      </div>
      <div className="mono" style={{ fontSize: 12 }}>{m.cost}</div>
      <div className="mono" style={{ fontSize: 12 }}>{m.calls}</div>
    </div>
  );
}

function CostDonut() {
  const data = [
    { v: 186, c: "#0891b2" }, { v: 84, c: "#16a34a" }, { v: 62, c: "#4f46e5" },
    { v: 38,  c: "#ec4899" }, { v: 28, c: "#b45309" }, { v: 14, c: "#9333ea" },
  ];
  const total = data.reduce((s, d) => s + d.v, 0);
  let acc = 0;
  const R = 42, C = 2 * Math.PI * R;
  return (
    <div style={{ position: "relative", display: "grid", placeItems: "center", padding: "16px 0" }}>
      <svg width="140" height="140" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={R} fill="none" stroke="var(--bg-mute)" strokeWidth="10" />
        {data.map((d, i) => {
          const frac = d.v / total;
          const dash = frac * C;
          const offset = -acc * C;
          acc += frac;
          return (
            <circle key={i} cx="50" cy="50" r={R} fill="none" stroke={d.c} strokeWidth="10"
              strokeDasharray={`${dash} ${C}`} strokeDashoffset={offset}
              transform="rotate(-90 50 50)" strokeLinecap="butt" />
          );
        })}
        <text x="50" y="48" textAnchor="middle" fontSize="11" fill="var(--text-3)" fontFamily="var(--font-mono)">本月</text>
        <text x="50" y="62" textAnchor="middle" fontSize="14" fontWeight="600" fill="var(--text)" fontFamily="var(--font-mono)">¥{total}</text>
      </svg>
    </div>
  );
}

function NewContentForm({ t, onCreated }: { t: ContentTrack; onCreated: () => void | Promise<void> }) {
  const { toast, closeDrawer } = useUI();
  const [brief, setBrief] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const canSubmit = brief.trim().length > 0 && !submitting;

  async function submit(): Promise<void> {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await api.contentJobCreate({ track: t.id, title: brief.trim(), note: `${t.name} · 直接 · 实战 voice` });
      await onCreated();
      toast(`已开始生成「${t.name}」· 预计 ${t.duration}`);
      closeDrawer();
    } catch (e) {
      toast(`失败：${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="card soft" style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div style={{ width: 36, height: 36, borderRadius: 9, background: `${t.color}1a`, color: t.color, display: "grid", placeItems: "center" }}>
          <Icon name={t.icon} size={18} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 500 }}>{t.name}</div>
          <div className="muted text-xs mt-8">{t.desc}</div>
        </div>
      </div>

      <div className="mt-16">
        <div className="muted text-xs mono" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>主题 / brief</div>
        <textarea className="textarea-input" placeholder="例如：用 SQLite 跑生产环境的 5 个反直觉做法，受众是 1-3 年 indie dev。"
          value={brief} onChange={e => setBrief(e.target.value)} />
      </div>

      <div className="mt-16 grid-2" style={{ gap: 8 }}>
        <FormField label="从知识库引用">
          <div className="tag-cloud" style={{ marginTop: 4 }}>
            <span className="tag">SQLite 博客 v2024.06</span>
            <span className="tag">用户访谈 #014</span>
            <button className="btn sm ghost"><Icon name="plus" size={11} /></button>
          </div>
        </FormField>
        <FormField label="品牌 voice">
          <div className="seg">
            <button className="active">直接 · 实战</button>
            <button>温和 · 教学</button>
            <button>带梗</button>
          </div>
        </FormField>
      </div>

      <div className="mt-16">
        <div className="muted text-xs mono" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>模型选择</div>
        <div className="model-pick">
          <label className="model-pick-row checked">
            <input type="radio" name="m" defaultChecked />
            <div><b>{t.bestFor}</b> <span className="tag accent">推荐</span></div>
            <span className="muted text-xs mono" style={{ marginLeft: "auto" }}>预估 ¥{t.typicalCost.split("–")[0]?.replace("¥", "").trim()}</span>
          </label>
          <label className="model-pick-row">
            <input type="radio" name="m" />
            <div>切换到 Gemini 2.5 Pro</div>
            <span className="muted text-xs mono" style={{ marginLeft: "auto" }}>更便宜 · 略短</span>
          </label>
          <label className="model-pick-row">
            <input type="radio" name="m" />
            <div>多模型并跑（4 候选）</div>
            <span className="muted text-xs mono" style={{ marginLeft: "auto" }}>+ ¥1.20 · A/B</span>
          </label>
        </div>
      </div>

      <div className="mt-16" style={{ display: "flex", gap: 8 }}>
        <button className="btn" onClick={() => toast(`已保存为模板：${t.name}`)}><Icon name="file" size={12} /> 保存为模板</button>
        <button className="btn primary" style={{ marginLeft: "auto" }}
          disabled={!canSubmit}
          onClick={() => void submit()}>
          <Icon name="sparkle" size={12} /> {submitting ? "提交中…" : `开始生成 · 预计 ${t.duration}`}
        </button>
      </div>
    </div>
  );
}

function FullSetForm({ onSubmit }: { onSubmit: (brief: string) => Promise<number> }) {
  const { toast, closeDrawer } = useUI();
  const [brief, setBrief] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(): Promise<void> {
    if (!brief.trim() || submitting) return;
    setSubmitting(true);
    try {
      const n = await onSubmit(brief.trim());
      toast(`已发起「一次生成全套」· ${n} 种形态已入队`);
      closeDrawer();
    } catch (e) {
      toast(`失败：${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="card soft" style={{ fontSize: 13, color: "var(--text-2)" }}>
        一个 brief 同时入队 6 个形态（长文 / 短视频 / 长视频 / 音频 / 图像 / 图文笔记），各 Agent 并行执行。
      </div>
      {FULL_SET_FIELDS.map(f => (
        <div key={f.name} className="mt-16">
          <div className="muted text-xs mono" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>{f.label}</div>
          <textarea className="textarea-input mt-8" placeholder={f.placeholder}
            value={brief} onChange={e => setBrief(e.target.value)} />
        </div>
      ))}
      <div className="mt-16" style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button className="btn primary" disabled={!brief.trim() || submitting} onClick={() => void submit()}>
          <Icon name="sparkle" size={12} /> {submitting ? "提交中…" : "并行入队 · 6 种形态"}
        </button>
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="muted text-xs mono" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
      <div className="mt-8">{children}</div>
    </div>
  );
}

function JobDrawer({ j, t }: { j: ContentJob; t: ContentTrack }) {
  void t;
  const { toast, closeDrawer } = useUI();
  return (
    <div>
      <div className="card soft" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div className="muted text-xs mono">当前阶段</div>
          <div style={{ fontWeight: 500, marginTop: 4 }}>{j.phase}</div>
        </div>
        <div className="job-progress" style={{ width: 140 }}>
          <div className="job-bar">
            <div className={`job-bar-fill ${j.status === "running" ? "animated" : ""}`} style={{ width: `${j.progress}%`, background: "var(--text)" }} />
          </div>
          <div className="job-bar-meta">
            <span className="mono" style={{ fontSize: 11 }}>{j.progress}%</span>
            <span className="muted mono" style={{ fontSize: 11 }}>ETA {j.eta}</span>
          </div>
        </div>
      </div>

      <div className="mt-16 grid-3" style={{ gap: 8 }}>
        <div style={{ padding: "10px 12px", background: "var(--bg-soft)", borderRadius: 8 }}>
          <div className="muted text-xs mono">模型</div>
          <div className="mt-8" style={{ fontSize: 13, fontWeight: 500 }}>{j.model}</div>
        </div>
        <div style={{ padding: "10px 12px", background: "var(--bg-soft)", borderRadius: 8 }}>
          <div className="muted text-xs mono">负责 Agent</div>
          <div className="mt-8"><AgentTag name={j.agent} /></div>
        </div>
        <div style={{ padding: "10px 12px", background: "var(--bg-soft)", borderRadius: 8 }}>
          <div className="muted text-xs mono">累计成本</div>
          <div className="mt-8 mono" style={{ fontSize: 13, fontWeight: 500 }}>{j.cost}</div>
        </div>
      </div>

      <div className="mt-16">
        <div className="muted text-xs mono" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>执行步骤</div>
        <div className="version-feed mt-8">
          <div className="version-row"><span className="tag success"><span className="dot" />OK</span><span>读取知识库引用</span><span className="muted mono" style={{ marginLeft: "auto", fontSize: 11 }}>14:02</span></div>
          <div className="version-row"><span className="tag success"><span className="dot" />OK</span><span>分镜稿 · Claude</span><span className="muted mono" style={{ marginLeft: "auto", fontSize: 11 }}>14:03</span></div>
          <div className="version-row"><span className="tag accent"><span className="dot" />RUN</span><span>{j.phase}</span><span className="muted mono" style={{ marginLeft: "auto", fontSize: 11 }}>现在</span></div>
          <div className="version-row" style={{ opacity: 0.5 }}><span className="tag"><span className="dot" />WAIT</span><span>字幕烧录</span><span className="muted mono" style={{ marginLeft: "auto", fontSize: 11 }}>—</span></div>
          <div className="version-row" style={{ opacity: 0.5 }}><span className="tag"><span className="dot" />WAIT</span><span>导出 · 上传 OSS</span><span className="muted mono" style={{ marginLeft: "auto", fontSize: 11 }}>—</span></div>
        </div>
      </div>

      <div className="mt-16" style={{ display: "flex", gap: 8 }}>
        <button className="btn" onClick={() => toast(`已暂停：${j.title}`)}><Icon name="pause" size={12} /> 暂停</button>
        <button className="btn" onClick={() => toast(`已换模型重跑：${j.title}`)}><Icon name="refresh" size={12} /> 换模型重跑</button>
        <button className="btn ghost" style={{ marginLeft: "auto" }}
          onClick={() => { toast(`已终止任务：${j.title}`, "warn"); closeDrawer(); }}>
          <Icon name="x" size={12} /> 终止
        </button>
      </div>
    </div>
  );
}

function LibraryDrawer({ l, t }: { l: LibraryItem; t: ContentTrack }) {
  const { toast, closeDrawer } = useUI();
  return (
    <div>
      <div className="library-thumb large" style={{ background: `linear-gradient(135deg, ${t.color}33 0%, ${t.color}11 100%)`, color: t.color }}>
        <Icon name={t.icon} size={48} />
      </div>
      <div className="mt-16 grid-3" style={{ gap: 8 }}>
        <SignalCell n={l.cost} l="成本" />
        <SignalCell n={l.time} l="完成时间" />
        <SignalCell n={l.model.split(" ")[0] ?? l.model} l="主要模型" />
      </div>
      <div className="mt-16">
        <div className="muted text-xs mono" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>说明</div>
        <div className="mt-8" style={{ fontSize: 13, color: "var(--text-2)" }}>{l.meta}</div>
      </div>
      <div className="mt-16" style={{ display: "flex", gap: 8 }}>
        <button className="btn" onClick={() => toast(`正在预览：${l.title}`)}><Icon name="eye" size={12} /> 预览</button>
        <button className="btn" onClick={() => toast(`已开始下载：${l.title}`)}><Icon name="download" size={12} /> 下载原文件</button>
        <button className="btn primary" style={{ marginLeft: "auto" }}
          onClick={() => { toast(`已分发到渠道：${l.title}`); closeDrawer(); }}>
          <Icon name="send" size={12} /> 分发到渠道
        </button>
      </div>
    </div>
  );
}
