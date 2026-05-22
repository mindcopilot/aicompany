import { Icon } from "../components/Icon";
import { AgentTag, KPI, th, td } from "../components/primitives";
import { CreateForm } from "../components/CreateForm";
import { useAsync } from "../hooks/useApi";
import { useUI } from "../lib/ui";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { ViewId } from "../components/Shell";

interface Props {
  setActive: (id: ViewId) => void;
}

export function Dashboard({ setActive }: Props) {
  const { openDrawer, toast } = useUI();
  const { data, loading } = useAsync(() => api.dashboard(), []);
  const { user } = useAuth();

  if (loading || !data) return <div style={{ padding: 32, color: "var(--text-3)" }}>加载中…</div>;

  const { activity, kpis, modules, runs24h } = data;

  return (
    <>
      <div className="module-header">
        <div className="title-wrap">
          <div className="module-eyebrow">11.20 · WED · WEEK 47</div>
          <h1 className="module-title">早上好，{user?.name ?? "founder"} 👋</h1>
          <div className="module-sub">LumenEdu · 第 23 天 · 距首次发布还有 14 天</div>
        </div>
        <div className="module-actions">
          <button className="btn" onClick={() => toast("已同步所有 Agent 与渠道数据")}><Icon name="refresh" size={14} /> 同步</button>
          <button className="btn" onClick={() => toast("本周周报已生成 · 已发送到你的邮箱")}><Icon name="download" size={14} /> 周报</button>
          <button className="btn primary" onClick={() => openDrawer({
            eyebrow: "NEW TASK", title: "新建任务", sub: "把任务派给某个 AI 同事",
            body: <CreateForm
              fields={[
                { name: "title", label: "任务", placeholder: "例如：把课程 #6 返工一版" },
                { name: "agent", label: "指派给", type: "select", options: ["Atlas", "Nova", "Helix", "Aria"] },
                { name: "note", label: "补充说明", type: "textarea", placeholder: "目标、约束、参考资料……" },
              ]}
              submitLabel="创建任务"
              successMsg={v => `已把「${v.title}」派给 ${v.agent}`}
            />,
          })}><Icon name="plus" size={14} /> 新建任务</button>
        </div>
      </div>

      <div className="module-body">
        <div className="ai-digest module-section">
          <div className="ai-digest-head">
            <div className="ai-avatar">A</div>
            <div className="ai-name">Atlas <span className="meta">today · 06:02 · 用 38s 生成</span></div>
            <div style={{ marginLeft: "auto" }}><span className="tag ai"><span className="dot" /> AI 简报</span></div>
          </div>
          <h3>
            过去 7 天：MRR 增长 <mark>+12.4%</mark>，
            小红书是本周最强渠道（贡献 <mark>58%</mark> 新增），
            但课程 #6 的完课率掉到 <mark>34%</mark>，建议本周优先返工。
          </h3>
          <div className="digest-row">
            <div className="digest-item">
              <div className="label">值得庆祝</div>
              <div className="value">小红书爆款 1 篇</div>
              <div className="meta">《一个人做 SaaS 的 6 个月》· 收藏 1.2K</div>
            </div>
            <div className="digest-item">
              <div className="label">需要决定</div>
              <div className="value">课程 #6 是否返工</div>
              <div className="meta">完课率 34% · 同期均值 71%</div>
            </div>
            <div className="digest-item">
              <div className="label">下一步建议</div>
              <div className="value">启动 B 站渠道</div>
              <div className="meta">相邻赛道 KOL 平均月增粉 +18%</div>
            </div>
          </div>
          <div className="ai-digest-actions">
            <button className="btn accent" onClick={() => setActive("data")}><Icon name="bar" size={14} />查看完整指标</button>
            <button className="btn" onClick={() => toast("Atlas 正在展开本条简报的推理过程……")}>告诉我更多</button>
            <button className="btn ghost" onClick={() => toast("已忽略本条简报")}><Icon name="x" size={14} />忽略本条</button>
          </div>
        </div>

        <div className="module-section">
          <div className="section-head">
            <div className="section-title">核心指标 · LAST 30 DAYS</div>
            <div className="seg"><button className="active">30d</button><button>90d</button><button>YTD</button></div>
          </div>
          <div className="kpi-grid">
            <KPI {...kpis.mrr} />
            <KPI {...kpis.paying} />
            <KPI {...kpis.visitors} />
            <KPI {...kpis.completion} />
          </div>
        </div>

        <div className="module-section" style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 16 }}>
          <div>
            <div className="section-head">
              <div className="section-title">业务体系 · 六大模块</div>
              <button className="btn sm ghost" onClick={() => toast("已切换模块展示方式")}><Icon name="grid" size={12} /> 切换视图</button>
            </div>
            <div className="modules-grid">
              {modules.map(m => (
                <div key={m.id} className="module-card" onClick={() => setActive(m.id as ViewId)}>
                  <div className="top">
                    <span className="num">{m.num}</span>
                    <span className={`tag ${m.statusTag}`}><span className="dot" />{m.status}</span>
                  </div>
                  <h4>{m.title}</h4>
                  <div className="desc">{m.desc}</div>
                  <div className="footer">
                    <div className="progress"><i style={{ width: `${m.pct}%` }} /></div>
                    <span className="pct">{m.pct}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="section-head">
              <div className="section-title">活动流</div>
              <button className="btn sm ghost" onClick={() => setActive("agents")}>全部</button>
            </div>
            <div className="card" style={{ padding: "4px 14px" }}>
              <div className="activity">
                {activity.map((a, i) => (
                  <div key={i} className={`activity-item ${a.ai ? "ai" : ""}`}>
                    <span className="marker" />
                    <div className="body">
                      <span className={`who ${a.ai ? "ai" : ""}`}>{a.who}</span>
                      <span className="what"> {a.what} </span>
                      <span className="obj" onClick={() => openDrawer({
                        eyebrow: "ACTIVITY",
                        title: a.obj,
                        sub: `${a.who} · ${a.t}`,
                        body: <div className="muted">{a.extra || "无更多详情"}</div>,
                      })}>{a.obj}</span>
                      {a.extra && <div className="muted text-xs mt-8">{a.extra}</div>}
                    </div>
                    <span className="time">{a.t}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="module-section">
          <div className="section-head">
            <div className="section-title">AGENT 任务编排 · NEXT 24H</div>
            <span className="muted text-xs">3 active · 12 queued</span>
          </div>
          <div className="card flush">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--bg-soft)", color: "var(--text-3)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  <th style={th}>时间</th><th style={th}>Agent</th><th style={th}>任务</th><th style={th}>触发</th><th style={th}>状态</th><th style={th}>操作</th>
                </tr>
              </thead>
              <tbody>
                {runs24h.map((r, i) => (
                  <tr key={i} style={{ borderTop: i === 0 ? "none" : "1px solid var(--border)" }}>
                    <td style={td}><span className="mono text-sm">{r.t}</span></td>
                    <td style={td}><AgentTag name={r.a} /></td>
                    <td style={td}>{r.task}</td>
                    <td style={td}><span className="tag">{r.trig}</span></td>
                    <td style={td}>{r.s === "running" ? <span className="tag ai"><span className="dot" /> running</span> : <span className="tag">queued</span>}</td>
                    <td style={td}><button className="btn sm ghost" onClick={() => openDrawer({
                      eyebrow: `RUN · ${r.t}`,
                      title: r.task,
                      sub: `${r.a} · ${r.trig}`,
                      body: (
                        <div>
                          <div className="grid-3" style={{ gap: 8 }}>
                            <div style={{ padding: "10px 12px", background: "var(--bg-soft)", borderRadius: 8 }}>
                              <div className="muted text-xs mono">计划时间</div>
                              <div className="mt-8" style={{ fontSize: 13, fontWeight: 500 }}>{r.t}</div>
                            </div>
                            <div style={{ padding: "10px 12px", background: "var(--bg-soft)", borderRadius: 8 }}>
                              <div className="muted text-xs mono">负责 Agent</div>
                              <div className="mt-8"><AgentTag name={r.a} /></div>
                            </div>
                            <div style={{ padding: "10px 12px", background: "var(--bg-soft)", borderRadius: 8 }}>
                              <div className="muted text-xs mono">状态</div>
                              <div className="mt-8" style={{ fontSize: 13, fontWeight: 500 }}>{r.s === "running" ? "运行中" : "排队中"}</div>
                            </div>
                          </div>
                          <div className="mt-16 muted text-sm">触发方式：{r.trig}。该任务由 {r.a} 在 {r.t} 自动执行，完成后会进入活动流。</div>
                        </div>
                      ),
                    })}>查看</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
