import { useState } from "react";
import { Icon } from "../components/Icon";
import { AgentTag, SignalCell } from "../components/primitives";
import { CreateForm } from "../components/CreateForm";
import { useAsync } from "../hooks/useApi";
import { useUI } from "../lib/ui";
import { api } from "../lib/api";
import type { PromptItem } from "../types/api";

const CATS = ["全部", "内容创作", "用户研究", "数据洞察", "用户触达"] as const;

export function PromptsView() {
  const { openDrawer, toast } = useUI();
  const { data, refresh } = useAsync(() => api.prompts(), []);
  const all = data ?? [];
  const [cat, setCat] = useState<(typeof CATS)[number]>("全部");
  const items = all.filter(p => cat === "全部" || p.cat === cat);

  return (
    <>
      <div className="module-header">
        <div className="title-wrap">
          <div className="module-eyebrow">06 · PROMPT LIBRARY</div>
          <h1 className="module-title">Prompts</h1>
          <div className="module-sub">所有 Agent 共享的可版本化 prompt 库 · 含变量、A/B 实验与命中率。</div>
        </div>
        <div className="module-actions">
          <span className="tag"><Icon name="git" size={11} /> 6 个变体在 A/B</span>
          <button className="btn" onClick={() => toast("导入 · 从文件或其他项目批量导入 prompt")}><Icon name="download" size={14} /> 导入</button>
          <button className="btn primary" onClick={() => openDrawer({
            eyebrow: "NEW PROMPT", title: "新建 Prompt", sub: "创建一个可版本化、可 A/B 的 prompt",
            body: <CreateForm
              fields={[
                { name: "name", label: "名称", placeholder: "例如：小红书爆款钩子 v1" },
                { name: "cat", label: "分类", type: "select", options: ["内容创作", "用户研究", "数据洞察", "用户触达"] },
                { name: "body", label: "Prompt 正文", type: "textarea", placeholder: "用 {{变量}} 标注占位符……" },
              ]}
              submitLabel="保存为 v1.0"
              onSubmit={async v => {
                await api.promptCreate({ name: v.name!, cat: v.cat ?? "内容创作", body: v.body ?? "" });
                await refresh();
              }}
              successMsg={v => `已创建 Prompt「${v.name}」· 版本 v1.0`}
            />,
          })}><Icon name="plus" size={14} /> 新建 Prompt</button>
        </div>
      </div>

      <div className="module-body" style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24 }}>
        <div>
          <div className="tabs">
            {CATS.map(c => (
              <button key={c} className={`tab ${cat === c ? "active" : ""}`} onClick={() => setCat(c)}>
                {c}<span className="count">{c === "全部" ? all.length : all.filter(p => p.cat === c).length}</span>
              </button>
            ))}
          </div>

          <div className="prompt-grid">
            {items.map(p => (
              <div key={p.id} className="prompt-card" onClick={() => openDrawer({
                eyebrow: `${p.cat} · ${p.version}`, title: p.name, sub: p.desc, body: <PromptDrawer p={p} onChange={refresh} />,
              })}>
                <div className="prompt-card-top">
                  <div>
                    <div className="prompt-name">{p.name}</div>
                    <div className="muted text-xs mt-8">{p.desc}</div>
                  </div>
                  <span className="tag mono">{p.version}</span>
                </div>
                <pre className="prompt-preview">{p.body}</pre>
                <div className="prompt-vars">
                  {p.vars.map(v => <span key={v} className="var-chip mono">{`{{${v}}}`}</span>)}
                </div>
                <div className="prompt-foot">
                  <div className="prompt-stats">
                    <span className="mono"><b>{p.calls}</b> 次</span>
                    <span className="sep">·</span>
                    <span className="mono" style={{ color: p.success >= 85 ? "var(--success)" : (p.success >= 75 ? "var(--warn)" : "var(--danger)") }}>{p.success}% 命中</span>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {p.usedBy.map(a => <AgentTag key={a} name={a} />)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="col" style={{ gap: 14 }}>
          <div className="card">
            <div className="card-title"><Icon name="bar" size={14} /> Prompt 性能榜</div>
            <div className="mt-12">
              {[...all].sort((a, b) => b.success - a.success).slice(0, 5).map((p, i) => (
                <div key={p.id} className="rank-row">
                  <span className="rank mono">{String(i + 1).padStart(2, "0")}</span>
                  <span style={{ flex: 1, fontSize: 13 }}>{p.name}</span>
                  <span className="mono" style={{ fontSize: 12, color: p.success >= 85 ? "var(--success)" : "var(--warn)" }}>{p.success}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-title"><Icon name="refresh" size={14} /> 待优化</div>
            <div className="ai-suggest mt-12">
              <div className="ai-suggest-row"><span>「答疑兜底」最近 7 天降到 68%</span><button className="btn sm" onClick={() => toast("正在打开「答疑兜底」的低分会话")}>查看会话</button></div>
              <div className="ai-suggest-row"><span>v3.1 比 v3.0 + 6% · 建议设为默认</span><button className="btn sm" onClick={() => toast("已将 v3.1 设为默认版本")}>切换默认</button></div>
              <div className="ai-suggest-row"><span>「竞品周更」未指定 voice，输出风格漂移</span><button className="btn sm" onClick={() => toast("已为「竞品周更」补上品牌 voice 变量")}>补 voice</button></div>
            </div>
          </div>

          <div className="card">
            <div className="card-title"><Icon name="link" size={14} /> 变量字典</div>
            <div className="muted text-xs mb-8 mt-8">所有 prompt 中出现的占位符：</div>
            <div className="tag-cloud" style={{ marginTop: 6 }}>
              {["主题", "受众", "上周CTR", "时长", "大纲", "原始文本", "竞品列表", "时间窗", "问题摘要", "上下文", "起止日期", "品牌 voice"].map(v => (
                <span key={v} className="tag mono">{`{{${v}}}`}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function PromptDrawer({ p, onChange }: { p: PromptItem; onChange: () => Promise<void> }) {
  const { toast, closeDrawer } = useUI();
  return (
    <div>
      <div className="grid-2" style={{ gap: 8 }}>
        <SignalCell n={p.calls} l="累计调用" />
        <SignalCell n={`${p.success}%`} l="命中率（近 30 天）" />
      </div>
      <div className="mt-16">
        <div className="muted text-xs mono" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>当前 prompt · {p.version}</div>
        <pre className="prompt-preview" style={{ marginTop: 8, maxHeight: 280 }}>{p.body}</pre>
      </div>
      <div className="mt-16">
        <div className="muted text-xs mono" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>变量</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
          {p.vars.map(v => <span key={v} className="var-chip mono">{`{{${v}}}`}</span>)}
        </div>
      </div>
      <div className="mt-16">
        <div className="muted text-xs mono" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>版本历史</div>
        <div className="version-feed mt-8">
          <div className="version-row"><span className="mono tag">v4.2</span><span>+ 加入「上周CTR」变量做反馈学习</span><span className="muted mono" style={{ marginLeft: "auto", fontSize: 11 }}>3 天前 · Atlas</span></div>
          <div className="version-row"><span className="mono tag">v4.1</span><span>调整钩子语气 · 更口语</span><span className="muted mono" style={{ marginLeft: "auto", fontSize: 11 }}>1 周前 · 你</span></div>
          <div className="version-row"><span className="mono tag">v4.0</span><span>初版迁移自 v3 → 4，含 8 条候选</span><span className="muted mono" style={{ marginLeft: "auto", fontSize: 11 }}>3 周前 · Atlas</span></div>
        </div>
      </div>
      <div className="mt-16" style={{ display: "flex", justifyContent: "flex-end" }}>
        <button className="btn ghost" onClick={async () => {
          try {
            await api.promptRemove(p.id);
            await onChange();
            toast(`已删除 Prompt「${p.name}」`, "warn");
            closeDrawer();
          } catch (e) { toast(`删除失败：${e instanceof Error ? e.message : String(e)}`, "warn"); }
        }}><Icon name="x" size={12} /> 删除 Prompt</button>
      </div>
    </div>
  );
}
