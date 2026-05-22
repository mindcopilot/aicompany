import { Fragment, useState } from "react";
import { Icon } from "../components/Icon";
import { AgentTag, SignalCell } from "../components/primitives";
import { CreateForm } from "../components/CreateForm";
import { useAsync } from "../hooks/useApi";
import { useUI } from "../lib/ui";
import { api } from "../lib/api";
import type { Automation } from "../types/api";

const FILTERS = ["全部", "生效中", "草稿"] as const;

export function AutomationsView() {
  const { openDrawer, toast } = useUI();
  const { data, refresh } = useAsync(() => api.automations(), []);
  const all = data ?? [];
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("全部");
  const items = all.filter(w =>
    filter === "全部" ? true : filter === "生效中" ? w.on : !w.on
  );

  return (
    <>
      <div className="module-header">
        <div className="title-wrap">
          <div className="module-eyebrow">09 · AUTOMATIONS</div>
          <h1 className="module-title">自动化</h1>
          <div className="module-sub">把重复的「触发 → 决策 → 执行」固化为 workflow，省下来的时间用来想方向。</div>
        </div>
        <div className="module-actions">
          <button className="btn" onClick={() => toast("模板库 · 共 12 个可一键开启的 workflow")}><Icon name="code" size={14} /> 浏览模板库</button>
          <button className="btn primary" onClick={() => openDrawer({
            eyebrow: "NEW WORKFLOW", title: "新建 workflow", sub: "把重复的「触发 → 决策 → 执行」固化下来",
            body: <CreateForm
              fields={[
                { name: "name", label: "Workflow 名称", placeholder: "例如：竞品降价自动告警" },
                { name: "trigger", label: "触发条件", placeholder: "例如：每天 09:00 / CR 跌 > 20%" },
                { name: "action", label: "执行动作", type: "textarea", placeholder: "触发后让哪个 Agent 做什么……" },
              ]}
              submitLabel="创建 workflow"
              onSubmit={async v => {
                await api.automationCreate({
                  name: v.name!, trigger: v.trigger ?? "", action: v.action ?? "",
                });
                await refresh();
              }}
              successMsg={v => `已创建 workflow「${v.name}」· 默认为草稿状态`}
            />,
          })}><Icon name="plus" size={14} /> 新建 workflow</button>
        </div>
      </div>

      <div className="module-body">
        <div className="grid-4" style={{ marginBottom: 16 }}>
          <SignalCell n={String(all.filter(w => w.on).length)} l="生效中" />
          <SignalCell n={String(all.reduce((s, w) => s + w.runs, 0))} l="累计运行" />
          <SignalCell n={String(all.length)} l="Workflow 总数" />
          <SignalCell n="98%"   l="平均成功率" />
        </div>

        <div className="module-section">
          <div className="section-head">
            <div className="section-title">Workflows</div>
            <div className="seg">
              {FILTERS.map(f => (
                <button key={f} className={filter === f ? "active" : ""} onClick={() => setFilter(f)}>{f}</button>
              ))}
            </div>
          </div>

          <div className="wf-list">
            {items.map(w => (
              <div key={w.id} className={`wf-row ${w.on ? "" : "off"}`} onClick={() => openDrawer({
                eyebrow: "WORKFLOW", title: w.name, sub: w.trigger.text, body: <WFDrawer w={w} onChange={refresh} />,
              })}>
                <div>
                  <button className={`wf-pill ${w.on ? "on" : "off"}`} title="点击切换启用状态"
                    style={{ cursor: "pointer", border: "none" }}
                    onClick={async e => {
                      e.stopPropagation();
                      try {
                        await api.automationSetOn(w.id, !w.on);
                        await refresh();
                        toast(w.on ? `已停用「${w.name}」` : `已启用「${w.name}」`, w.on ? "warn" : "ok");
                      } catch (err) { toast(`操作失败：${err instanceof Error ? err.message : String(err)}`, "warn"); }
                    }}>{w.on ? "ON" : "OFF"}</button>
                </div>
                <div>
                  <div className="wf-name">{w.name}</div>
                  <div className="wf-trigger">
                    <span className="tag mono">{w.trigger.kind}</span>
                    <span className="muted">{w.trigger.text}</span>
                  </div>
                </div>
                <div className="wf-flow">
                  {w.steps.map((s, i) => (
                    <Fragment key={i}>
                      <div className="wf-step">
                        <AgentTag name={s.agent} />
                        <span className="mono wf-skill">{s.skill}</span>
                        <span className="muted text-xs">{s.note}</span>
                      </div>
                      {i < w.steps.length - 1 && <span className="wf-arrow"><Icon name="arrowRight" size={11} /></span>}
                    </Fragment>
                  ))}
                </div>
                <div className="wf-stats">
                  <div><b className="mono">{w.runs}</b><span className="muted text-xs">运行次数</span></div>
                  <div className="muted text-xs mono">last {w.lastRun}</div>
                  <div className="tag success" style={w.on ? {} : { background: "var(--bg-mute)", color: "var(--text-3)" }}>{w.saved}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid-2">
          <div className="card">
            <div className="card-title"><Icon name="layers" size={14} /> 模板库 · 一键开启</div>
            <div className="tpl-grid mt-12">
              {[
                ["每日内容日历", "09:00 · 自动生成今日选题"],
                ["落地页转化告警", "CR 跌 > 20% 立即排查"],
                ["试听用户跟进", "试听 24h 未付费自动 DM"],
                ["竞品定价巡检", "每周日 · 三家竞品定价 diff"],
              ].map(([n, d]) => (
                <div key={n} className="tpl-card">
                  <div className="tpl-name">{n}</div>
                  <div className="muted text-xs mt-8">{d}</div>
                  <button className="btn sm mt-12" style={{ marginTop: 10 }} onClick={() => toast(`已应用模板「${n}」· 已加入 workflow 列表`)}><Icon name="plus" size={11} /> 应用</button>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="card-title"><Icon name="activity" size={14} /> 最近运行</div>
            <div className="version-feed mt-8">
              <div className="version-row"><span className="tag success"><span className="dot" />OK</span><span>用户访谈入库 · 5.4s</span><span className="muted mono" style={{ marginLeft: "auto", fontSize: 11 }}>刚刚</span></div>
              <div className="version-row"><span className="tag success"><span className="dot" />OK</span><span>低置信度升级 · 1.2s</span><span className="muted mono" style={{ marginLeft: "auto", fontSize: 11 }}>34 分钟前</span></div>
              <div className="version-row"><span className="tag warn"><span className="dot" />WARN</span><span>新课上线 · 渠道发布 4.8s（慢）</span><span className="muted mono" style={{ marginLeft: "auto", fontSize: 11 }}>2 小时前</span></div>
              <div className="version-row"><span className="tag success"><span className="dot" />OK</span><span>竞品周报 · 18.2s</span><span className="muted mono" style={{ marginLeft: "auto", fontSize: 11 }}>周一 09:02</span></div>
              <div className="version-row"><span className="tag"><span className="dot" />SKIP</span><span>MRR 突变告警 · workflow 未启用</span><span className="muted mono" style={{ marginLeft: "auto", fontSize: 11 }}>—</span></div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function WFDrawer({ w, onChange }: { w: Automation; onChange: () => Promise<void> }) {
  const { toast, closeDrawer } = useUI();
  return (
    <div>
      <div className="grid-2" style={{ gap: 8 }}>
        <SignalCell n={w.runs} l="总运行次数" />
        <SignalCell n={w.on ? "生效中" : "草稿"} l="当前状态" />
      </div>
      <div className="mt-16">
        <div className="muted text-xs mono" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>触发条件</div>
        <div className="card soft mt-8" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="tag mono">{w.trigger.kind}</span>
          <span style={{ fontSize: 13 }}>{w.trigger.text}</span>
        </div>
      </div>
      <div className="mt-16">
        <div className="muted text-xs mono" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>步骤</div>
        <div className="version-feed mt-8">
          {w.steps.map((s, i) => (
            <div key={i} className="version-row">
              <span className="mono tag">STEP {i + 1}</span>
              <AgentTag name={s.agent} />
              <span className="mono" style={{ fontSize: 12 }}>{s.skill}</span>
              <span className="muted text-xs" style={{ marginLeft: "auto" }}>{s.note}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-16" style={{ display: "flex", gap: 8 }}>
        <button className="btn" onClick={() => toast(`已手动运行一次：${w.name}`)}><Icon name="play" size={12} /> 手动运行一次</button>
        <button className="btn" onClick={async () => {
          try {
            await api.automationSetOn(w.id, !w.on);
            await onChange();
            toast(w.on ? `已停用 workflow：${w.name}` : `已启用 workflow：${w.name}`, w.on ? "warn" : "ok");
            closeDrawer();
          } catch (e) { toast(`操作失败：${e instanceof Error ? e.message : String(e)}`, "warn"); }
        }}><Icon name={w.on ? "pause" : "play"} size={12} /> {w.on ? "停用" : "启用"}</button>
        <button className="btn ghost" style={{ marginLeft: "auto" }}
          onClick={async () => {
            try {
              await api.automationRemove(w.id);
              await onChange();
              toast(`已删除 workflow：${w.name}`, "warn");
              closeDrawer();
            } catch (e) { toast(`删除失败：${e instanceof Error ? e.message : String(e)}`, "warn"); }
          }}>
          <Icon name="x" size={12} /> 删除
        </button>
      </div>
    </div>
  );
}
