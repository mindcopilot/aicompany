import { useState } from "react";
import { Icon } from "../components/Icon";
import { AgentTag, SignalCell } from "../components/primitives";
import { CreateForm } from "../components/CreateForm";
import { useAsync } from "../hooks/useApi";
import { useUI } from "../lib/ui";
import { api } from "../lib/api";
import type { SkillItem } from "../types/api";

const CATS = ["全部", "内容生产", "渠道发布", "用户研究", "用户触达", "数据 / 查询"] as const;

export function SkillsView() {
  const { openDrawer, toast } = useUI();
  const { data } = useAsync(() => api.skills(), []);
  const all = data ?? [];
  const [cat, setCat] = useState<(typeof CATS)[number]>("全部");
  const items = all.filter(s => cat === "全部" || s.cat === cat);

  return (
    <>
      <div className="module-header">
        <div className="title-wrap">
          <div className="module-eyebrow">07 · SKILL REGISTRY</div>
          <h1 className="module-title">Skills</h1>
          <div className="module-sub">可被 Agent 组合调用的能力单元 · 输入 → 工具 → 输出 · 即开即用。</div>
        </div>
        <div className="module-actions">
          <button className="btn" onClick={() => toast("用代码定义 · 在编辑器中以 TS 函数声明 Skill 的 I/O 契约")}><Icon name="code" size={14} /> 用代码定义</button>
          <button className="btn primary" onClick={() => openDrawer({
            eyebrow: "NEW SKILL", title: "新建 Skill", sub: "定义一个可被 Agent 组合调用的能力单元",
            body: <CreateForm
              fields={[
                { name: "name", label: "Skill 名称", placeholder: "例如：publish_to_xhs" },
                { name: "cat", label: "分类", type: "select", options: ["内容生产", "渠道发布", "用户研究", "用户触达", "数据 / 查询"] },
                { name: "input", label: "输入", placeholder: "例如：draft, channel" },
                { name: "output", label: "输出", placeholder: "例如：post_url" },
              ]}
              submitLabel="注册 Skill"
              successMsg={v => `已注册 Skill「${v.name}」· 即开即用`}
            />,
          })}><Icon name="plus" size={14} /> 新建 Skill</button>
        </div>
      </div>

      <div className="module-body">
        <div className="grid-4" style={{ marginBottom: 16 }}>
          <SignalCell n="14" l="可用 Skill" />
          <SignalCell n="419" l="今日调用" />
          <SignalCell n="89%" l="平均成功率" />
          <SignalCell n="7" l="接入的外部工具" />
        </div>

        <div className="tabs">
          {CATS.map(c => (
            <button key={c} className={`tab ${cat === c ? "active" : ""}`} onClick={() => setCat(c)}>
              {c}<span className="count">{c === "全部" ? all.length : all.filter(s => s.cat === c).length}</span>
            </button>
          ))}
        </div>

        <div className="skill-grid">
          {items.map(s => (
            <div key={s.id} className="skill-card" onClick={() => openDrawer({
              eyebrow: s.cat, title: s.name, sub: s.desc, body: <SkillDrawer s={s} />,
            })}>
              <div className="skill-head">
                <div className="skill-emoji">{s.emoji}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="skill-name mono">{s.name}</div>
                  <div className="muted text-xs">{s.cat}</div>
                </div>
                <span className={`tag ${s.success >= 90 ? "success" : (s.success >= 80 ? "" : "warn")}`}>
                  <span className="dot" />{s.success}%
                </span>
              </div>
              <div className="skill-desc">{s.desc}</div>
              <div className="skill-io">
                <div className="skill-io-row">
                  <span className="mono muted-2 text-xs" style={{ width: 40 }}>IN</span>
                  <span className="mono" style={{ fontSize: 11.5 }}>{s.input}</span>
                </div>
                <div className="skill-io-arrow"><Icon name="arrowDown" size={11} /></div>
                <div className="skill-io-row">
                  <span className="mono muted-2 text-xs" style={{ width: 40 }}>OUT</span>
                  <span className="mono" style={{ fontSize: 11.5, color: "var(--accent)" }}>{s.output}</span>
                </div>
              </div>
              <div className="skill-tools">
                {s.tools.map(t => <span key={t} className="tool-chip">{t}</span>)}
              </div>
              <div className="skill-foot">
                <span className="mono muted text-xs">{s.calls} 次/日</span>
                <div style={{ display: "flex", gap: 4 }}>
                  {s.agents.map(a => <AgentTag key={a} name={a} />)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function SkillDrawer({ s }: { s: SkillItem }) {
  return (
    <div>
      <div className="grid-2" style={{ gap: 8 }}>
        <SignalCell n={s.calls} l="今日调用" />
        <SignalCell n={`${s.success}%`} l="成功率（30 天）" />
      </div>
      <div className="mt-16">
        <div className="muted text-xs mono" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>I / O 契约</div>
        <pre className="prompt-preview" style={{ marginTop: 8 }}>{`input  : ${s.input}\nworker : ${s.tools.join(", ")}\noutput : ${s.output}`}</pre>
      </div>
      <div className="mt-16">
        <div className="muted text-xs mono" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>使用此 Skill 的 Agent</div>
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          {s.agents.map(a => <AgentTag key={a} name={a} action="使用中" />)}
        </div>
      </div>
      <div className="mt-16">
        <div className="muted text-xs mono" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>最近调用</div>
        <div className="version-feed mt-8">
          <div className="version-row"><span className="tag success"><span className="dot" />OK</span><span>从 draft v3 → post_url</span><span className="muted mono" style={{ marginLeft: "auto", fontSize: 11 }}>12 分钟前</span></div>
          <div className="version-row"><span className="tag success"><span className="dot" />OK</span><span>从 draft v2 → post_url</span><span className="muted mono" style={{ marginLeft: "auto", fontSize: 11 }}>1 小时前</span></div>
          <div className="version-row"><span className="tag warn"><span className="dot" />WARN</span><span>响应慢 4.8s · 待优化</span><span className="muted mono" style={{ marginLeft: "auto", fontSize: 11 }}>3 小时前</span></div>
        </div>
      </div>
    </div>
  );
}
