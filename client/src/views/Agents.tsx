import { Icon } from "../components/Icon";
import { AgentTag, SignalCell } from "../components/primitives";
import { CreateForm } from "../components/CreateForm";
import { useAsync } from "../hooks/useApi";
import { useUI } from "../lib/ui";
import { api } from "../lib/api";
import type { AgentProfile, AgentRun } from "../types/api";

const AGENT_COLOR: Record<string, string> = {
  Atlas: "#4f46e5", Nova: "#0891b2", Helix: "#9333ea", Aria: "#16a34a",
};

const successRate = (t: { tasks: number; success: number }): number =>
  t.tasks > 0 ? Math.round(t.success / t.tasks * 100) : 0;

export function AgentsView() {
  const { openDrawer, toast } = useUI();
  const { data: agents, refresh: refreshAgents } = useAsync(() => api.agents(), []);
  const { data: runs }   = useAsync(() => api.runsToday(), []);

  return (
    <>
      <div className="module-header">
        <div className="title-wrap">
          <div className="module-eyebrow">08 · AGENT ORCHESTRATION</div>
          <h1 className="module-title">Agent 编排</h1>
          <div className="module-sub">4 个 AI 同事 · 各司其职 · 你只需审核关键节点。</div>
        </div>
        <div className="module-actions">
          <span className="agent-pill">
            <span className="pulse" /><span><strong>3 / 4</strong> 工作中</span><span className="count">today</span>
          </span>
          <button className="btn" onClick={() => toast("已暂停全部 Agent · 进行中的任务会先完成", "warn")}><Icon name="pause" size={14} /> 全部暂停</button>
          <button className="btn primary" onClick={() => openDrawer({
            eyebrow: "NEW AGENT", title: "新增 Agent", sub: "组建一个新的 AI 同事",
            body: <CreateForm
              intro="新 Agent 创建后可装配 Skills、Prompts 与知识来源。"
              fields={[
                { name: "name", label: "名称", placeholder: "例如：Orion" },
                { name: "role", label: "角色定位", placeholder: "例如：增长实验 / 数据分析" },
                { name: "schedule", label: "调度方式", type: "select", options: ["常驻待命", "定时触发", "事件触发"] },
              ]}
              submitLabel="创建 Agent"
              onSubmit={async v => {
                await api.agentCreate({
                  name: v.name!, role: v.role ?? "", schedule: v.schedule ?? "常驻待命",
                });
                await refreshAgents();
              }}
              successMsg={v => `已创建 Agent「${v.name}」· 角色：${v.role}`}
            />,
          })}><Icon name="plus" size={14} /> 新增 Agent</button>
        </div>
      </div>

      <div className="module-body">
        <div className="agent-grid">
          {(agents ?? []).map(a => (
            <AgentCard key={a.id} a={a} onOpen={() => openDrawer({
              eyebrow: `AGENT · ${a.role}`, title: a.name, sub: a.taskNow, body: <AgentDrawer a={a} onChange={refreshAgents} />,
            })} />
          ))}
        </div>

        <div className="module-section mt-24">
          <div className="section-head">
            <div className="section-title">今日运行时间线 · 08:00 — 18:00</div>
            <span className="muted text-xs mono">UTC+8 · 共 {(runs ?? []).length} 次运行</span>
          </div>
          <RunTimeline runs={runs ?? []} />
        </div>

        <div className="grid-2 module-section">
          <div className="card">
            <div className="card-title"><Icon name="git" size={14} /> 协作图</div>
            <div className="muted text-xs mt-8">Agent 之间的产物流动 · 自动建立</div>
            <CollabGraph />
          </div>
          <div className="card">
            <div className="card-title"><Icon name="flag" size={14} /> 需要你审核 · 2 项</div>
            <div className="kb-list" style={{ marginTop: 8 }}>
              <div className="kb-item review">
                <div className="kb-kind"><AgentTag name="Nova" /></div>
                <div>
                  <div className="kb-title">课程 #11《SQLite 边缘部署》逐字稿初稿</div>
                  <div className="kb-snippet">22 分钟阅读 · 引用了你 2024.06 的博客 · 等待你过一眼语气</div>
                </div>
                <button className="btn sm primary" onClick={() => toast("已通过审核：课程 #11 逐字稿")}>审核</button>
              </div>
              <div className="kb-item review">
                <div className="kb-kind"><AgentTag name="Atlas" /></div>
                <div>
                  <div className="kb-title">小红书本周 5 篇排期 · 14:30 自动开发</div>
                  <div className="kb-snippet">含 2 篇激进选题 · 上周类似选题 CTR 4.8%</div>
                </div>
                <button className="btn sm primary" onClick={() => toast("已通过审核：小红书本周排期")}>审核</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function AgentCard({ a, onOpen }: { a: AgentProfile; onOpen: () => void }) {
  const { toast } = useUI();
  return (
    <div className="agent-card" onClick={onOpen}>
      <div className="agent-card-head">
        <div className="agent-av" style={{ background: `linear-gradient(135deg, ${a.color} 0%, ${a.color}99 100%)` }}>
          {a.name[0]}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="agent-name">{a.name}<span className="role mono">{a.role}</span></div>
          <div className="agent-now">
            <span className={`status-dot ${a.busy ? "busy" : "idle"}`} />
            <span className="muted-2">{a.busy ? "正在" : "待命 · "}{a.taskNow}</span>
          </div>
        </div>
        <button className="icon-btn" onClick={e => { e.stopPropagation(); toast(`打开 ${a.name} 的配置`); }}><Icon name="settings" size={14} /></button>
      </div>

      <div className="agent-mini-grid">
        <div className="agent-mini">
          <div className="muted text-xs mono">SKILLS · {a.skills.length}</div>
          <div className="agent-mini-tags">
            {a.skills.slice(0, 3).map(s => <span key={s} className="tool-chip mono">{s}</span>)}
          </div>
        </div>
        <div className="agent-mini">
          <div className="muted text-xs mono">PROMPTS · {a.prompts.length}</div>
          <div className="agent-mini-tags">
            {a.prompts.map(p => <span key={p} className="tag">{p.length > 10 ? p.slice(0, 10) + "…" : p}</span>)}
          </div>
        </div>
        <div className="agent-mini">
          <div className="muted text-xs mono">KNOWLEDGE</div>
          <div className="agent-mini-tags">
            {a.sources.map(s => <span key={s} className="tag">{s}</span>)}
          </div>
        </div>
        <div className="agent-mini">
          <div className="muted text-xs mono">SCHEDULE</div>
          <div style={{ fontSize: 12, marginTop: 4, color: "var(--text-2)" }}>{a.schedule}</div>
        </div>
      </div>

      <div className="agent-foot">
        <div className="agent-foot-stat"><b className="mono">{a.today.tasks}</b><span className="muted text-xs">今日任务</span></div>
        <div className="agent-foot-stat"><b className="mono">{successRate(a.today)}%</b><span className="muted text-xs">成功率</span></div>
        <div className="agent-foot-stat"><b className="mono">{a.today.hours}h</b><span className="muted text-xs">总耗时</span></div>
        <button className="btn sm ghost" onClick={e => { e.stopPropagation(); toast(`已单步触发 ${a.name}`); }}><Icon name="play" size={11} /> 单步触发</button>
      </div>
    </div>
  );
}

function AgentDrawer({ a, onChange }: { a: AgentProfile; onChange: () => Promise<void> }) {
  const { toast, closeDrawer } = useUI();
  return (
    <div>
      <div className="grid-3" style={{ gap: 8 }}>
        <SignalCell n={a.today.tasks} l="今日任务" />
        <SignalCell n={`${successRate(a.today)}%`} l="成功率" />
        <SignalCell n={`${a.today.hours}h`} l="工作时长" />
      </div>
      <div className="mt-16">
        <div className="muted text-xs mono" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>装配的 Skills</div>
        <div className="tag-cloud mt-8">{a.skills.map(s => <span key={s} className="tool-chip mono">{s}</span>)}</div>
      </div>
      <div className="mt-16">
        <div className="muted text-xs mono" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>使用的 Prompts</div>
        <div className="tag-cloud mt-8">{a.prompts.map(p => <span key={p} className="tag">{p}</span>)}</div>
      </div>
      <div className="mt-16">
        <div className="muted text-xs mono" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>知识来源</div>
        <div className="tag-cloud mt-8">{a.sources.map(s => <span key={s} className="tag">{s}</span>)}</div>
      </div>
      <div className="mt-16">
        <div className="muted text-xs mono" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>调度</div>
        <div style={{ fontSize: 13, marginTop: 6, color: "var(--text-2)" }}>{a.schedule}</div>
      </div>
      <div className="mt-16" style={{ display: "flex", justifyContent: "flex-end" }}>
        <button className="btn ghost" onClick={async () => {
          try {
            await api.agentRemove(a.id);
            await onChange();
            toast(`已解散 Agent「${a.name}」`, "warn");
            closeDrawer();
          } catch (e) { toast(`删除失败：${e instanceof Error ? e.message : String(e)}`, "warn"); }
        }}><Icon name="x" size={12} /> 解散 Agent</button>
      </div>
    </div>
  );
}

function RunTimeline({ runs }: { runs: AgentRun[] }) {
  const min = 8, max = 18;
  const lanes: Array<"Atlas" | "Nova" | "Helix" | "Aria"> = ["Atlas", "Nova", "Helix", "Aria"];
  return (
    <div className="timeline">
      <div className="timeline-hours">
        {[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map(h => (
          <div key={h} className="timeline-hour"><span className="mono">{h}:00</span></div>
        ))}
      </div>
      {lanes.map(lane => (
        <div key={lane} className="timeline-lane">
          <div className="timeline-label">
            <span className="dot" style={{ background: AGENT_COLOR[lane] }} /> <span>{lane}</span>
          </div>
          <div className="timeline-track">
            {runs.filter(r => r.agent === lane).map((r, i) => {
              const left = (r.start - min) / (max - min) * 100;
              const width = (r.end - r.start) / (max - min) * 100;
              const c = AGENT_COLOR[lane];
              return (
                <div key={i} className="timeline-bar"
                  style={{ left: `${left}%`, width: `${width}%`, background: `${c}22`, borderColor: c, color: c }}>
                  <span>{r.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function CollabGraph() {
  const nodes = [
    { id: "Atlas", x: 18, y: 25, color: "#4f46e5" },
    { id: "Nova",  x: 78, y: 25, color: "#0891b2" },
    { id: "Helix", x: 18, y: 78, color: "#9333ea" },
    { id: "Aria",  x: 78, y: 78, color: "#16a34a" },
  ];
  const edges: Array<[string, string, string]> = [
    ["Helix", "Nova",  "素材"],
    ["Nova",  "Atlas", "课程上线"],
    ["Atlas", "Aria",  "新付费用户"],
    ["Aria",  "Helix", "用户反馈"],
    ["Helix", "Atlas", "选题信号"],
  ];
  const find = (id: string) => nodes.find(n => n.id === id);
  return (
    <div className="collab-graph">
      <svg className="collab-edges" viewBox="0 0 100 100" preserveAspectRatio="none">
        {edges.map(([a, b], i) => {
          const A = find(a), B = find(b);
          if (!A || !B) return null;
          return <line key={i} x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke="var(--border-strong)" strokeWidth="0.4" strokeDasharray="0.8 1.2" />;
        })}
      </svg>
      {edges.map(([a, b, l], i) => {
        const A = find(a), B = find(b);
        if (!A || !B) return null;
        const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
        return <span key={i} className="collab-edge-label mono" style={{ left: `${mx}%`, top: `${my}%` }}>{l}</span>;
      })}
      {nodes.map(n => (
        <div key={n.id} className="collab-node" style={{ left: `${n.x}%`, top: `${n.y}%` }}>
          <div className="collab-node-dot" style={{ background: `linear-gradient(135deg, ${n.color}, ${n.color}99)` }}>{n.id[0]}</div>
          <span className="collab-node-label">{n.id}</span>
        </div>
      ))}
    </div>
  );
}
