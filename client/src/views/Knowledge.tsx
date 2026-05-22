import { useMemo, useState } from "react";
import { Icon } from "../components/Icon";
import { AgentTag, SignalCell } from "../components/primitives";
import { CreateForm } from "../components/CreateForm";
import { useAsync } from "../hooks/useApi";
import { useUI } from "../lib/ui";
import { api } from "../lib/api";
import type { KnowledgeItem } from "../types/api";

const TABS: KnowledgeItem["kind"][] = ["想法", "访谈", "竞品", "博客", "文件"];

export function KnowledgeView() {
  const { openDrawer, toast } = useUI();
  const { data } = useAsync(() => api.knowledge(), []);
  const all = data ?? [];
  const [tab, setTab] = useState<"全部" | KnowledgeItem["kind"]>("全部");
  const [q, setQ] = useState("");

  const items = useMemo(() => all.filter(k =>
    (tab === "全部" || k.kind === tab) &&
    (q === "" || (k.title + k.snippet + k.tags.join(" ")).toLowerCase().includes(q.toLowerCase()))
  ), [all, tab, q]);

  return (
    <>
      <div className="module-header">
        <div className="title-wrap">
          <div className="module-eyebrow">05 · KNOWLEDGE BASE</div>
          <h1 className="module-title">知识库</h1>
          <div className="module-sub">想法、访谈、竞品、博客、文件 — 一个可被 Agent 实时检索的「第二大脑」。</div>
        </div>
        <div className="module-actions">
          <span className="tag ai"><span className="dot" /> Helix 自动整理中</span>
          <button className="btn" onClick={() => toast("导入 · 支持 Markdown / PDF / 网页链接，Helix 会自动向量化")}><Icon name="download" size={14} /> 导入</button>
          <button className="btn primary" onClick={() => openDrawer({
            eyebrow: "NEW ENTRY", title: "新建知识条目", sub: "录入一条可被 Agent 检索的知识",
            body: <CreateForm
              fields={[
                { name: "title", label: "标题", placeholder: "例如：用户访谈 #015 · 关于定价" },
                { name: "kind", label: "类型", type: "select", options: ["想法", "访谈", "竞品", "博客", "文件"] },
                { name: "content", label: "内容", type: "textarea", placeholder: "粘贴原文或要点……" },
              ]}
              submitLabel="入库并向量化"
              successMsg={v => `已入库「${v.title}」· Helix 正在向量化`}
            />,
          })}><Icon name="plus" size={14} /> 新建条目</button>
        </div>
      </div>

      <div className="module-body" style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24 }}>
        <div>
          <div className="kb-search">
            <Icon name="search" size={16} />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="语义搜索：例如 “SQLite 备份” 或 “愿意付 ¥299 的用户”" />
            <span className="muted text-xs mono">已索引 218 条 · 向量 v3</span>
          </div>

          <div className="tabs" style={{ marginTop: 18 }}>
            <button className={`tab ${tab === "全部" ? "active" : ""}`} onClick={() => setTab("全部")}>
              全部<span className="count">{all.length}</span>
            </button>
            {TABS.map(t => (
              <button key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
                {t}<span className="count">{all.filter(k => k.kind === t).length}</span>
              </button>
            ))}
          </div>

          <div className="kb-list">
            {items.map(k => (
              <div key={k.id} className="kb-item" onClick={() => openDrawer({
                eyebrow: k.kind, title: k.title, sub: k.source, body: <KBDrawerBody k={k} />,
              })}>
                <div className="kb-kind"><KBKindIcon kind={k.kind} /><span>{k.kind}</span></div>
                <div>
                  <div className="kb-title">{k.title}</div>
                  <div className="kb-snippet">{k.snippet}</div>
                  <div className="kb-meta">
                    {k.tags.map(t => <span key={t} className="tag">#{t}</span>)}
                    <span className="muted text-xs mono">· {k.refs} 次引用 · {k.agent} 在用</span>
                  </div>
                </div>
                <div className="kb-time mono">{k.time}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="col" style={{ gap: 14 }}>
          <div className="card">
            <div className="card-title"><Icon name="db" size={14} /> 知识库状态</div>
            <div className="grid-2 mt-12" style={{ gap: 8 }}>
              <SignalCell n="218" l="总条目" /><SignalCell n="218" l="已向量化" />
              <SignalCell n="1.4K" l="累计引用" /><SignalCell n="6" l="待整理" />
            </div>
          </div>

          <div className="card">
            <div className="card-title"><Icon name="sparkle" size={14} stroke={1.8} /> Helix 自动整理</div>
            <div className="muted text-xs mt-8">检测到以下条目可以合并或归档：</div>
            <div className="ai-suggest mt-12">
              <div className="ai-suggest-row"><span>5 条访谈共同提到「上线后流量获取」</span><button className="btn sm" onClick={() => toast("已归档为话题：上线后流量获取")}>归档为话题</button></div>
              <div className="ai-suggest-row"><span>《SQLite 边缘部署》博客已被课程 #11 引用</span><button className="btn sm" onClick={() => toast("已标记为可复用素材")}>标记复用</button></div>
              <div className="ai-suggest-row"><span>2 条想法相似度 92%</span><button className="btn sm" onClick={() => toast("已合并 2 条相似想法")}>合并</button></div>
            </div>
          </div>

          <div className="card">
            <div className="card-title"><Icon name="bolt" size={14} /> 热门标签</div>
            <div className="tag-cloud mt-12">
              {([
                ["#用户研究", 24], ["#定价", 18], ["#内容节奏", 14], ["#SQLite", 12],
                ["#tone of voice", 10], ["#竞品", 9], ["#可复用", 8], ["#增长机制", 7], ["#信号", 5], ["#No-code", 4],
              ] as Array<[string, number]>).map(([t, n]) => (
                <span key={t} className="tag-cloud-item" style={{ fontSize: 11 + Math.min(n, 16) * 0.4 }}>
                  {t}<i className="muted mono"> {n}</i>
                </span>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-title"><Icon name="activity" size={14} /> 最近引用</div>
            <div className="mt-8">
              <RefRow agent="Nova"  what="引用了" obj="《SQLite》博客"     t="14:02" />
              <RefRow agent="Atlas" what="引用了" obj="品牌手册 · 第 17 页" t="13:48" />
              <RefRow agent="Helix" what="新建"   obj="访谈 #014 林岩"     t="昨天" />
              <RefRow agent="Atlas" what="引用了" obj="历史爆款笔记 Top 5"  t="昨天" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function KBKindIcon({ kind }: { kind: KnowledgeItem["kind"] }) {
  const map: Record<KnowledgeItem["kind"], string> = { "想法": "bolt", "访谈": "msg", "竞品": "target", "博客": "pen", "文件": "file" };
  return <Icon name={map[kind] ?? "dot"} size={14} />;
}

function RefRow({ agent, what, obj, t }: { agent: string; what: string; obj: string; t: string }) {
  return (
    <div className="ref-row">
      <AgentTag name={agent} />
      <span className="muted">{what}</span>
      <span style={{ borderBottom: "1px dotted var(--border-strong)" }}>{obj}</span>
      <span className="muted mono" style={{ marginLeft: "auto", fontSize: 11 }}>{t}</span>
    </div>
  );
}

function KBDrawerBody({ k }: { k: KnowledgeItem }) {
  return (
    <div>
      <div className="card soft" style={{ fontSize: 13.5, lineHeight: 1.7 }}>{k.snippet}</div>
      <div className="mt-16">
        <div className="muted text-xs mono" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>标签</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
          {k.tags.map(t => <span key={t} className="tag">#{t}</span>)}
        </div>
      </div>
      <div className="mt-16 grid-2" style={{ gap: 8 }}>
        <SignalCell n={k.refs} l="累计引用" />
        <SignalCell n={k.agent} l="主要被 Agent 引用" />
      </div>
      <div className="mt-16">
        <div className="muted text-xs mono" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>来源</div>
        <div className="mt-8" style={{ fontSize: 13 }}>{k.source}</div>
      </div>
    </div>
  );
}
