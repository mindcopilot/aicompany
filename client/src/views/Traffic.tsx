import { useMemo } from "react";
import { Icon } from "../components/Icon";
import { SignalCell, KPI } from "../components/primitives";
import { HeatGrid, LineChart } from "../components/Charts";
import { CreateForm } from "../components/CreateForm";
import { useAsync } from "../hooks/useApi";
import { useUI } from "../lib/ui";
import { api } from "../lib/api";
import type { Channel } from "../types/api";

export function TrafficView() {
  const { openDrawer, toast } = useUI();
  const { data: channels } = useAsync(() => api.channels(), []);

  const intensity = useMemo(() => {
    const r: number[][] = [];
    for (let i = 0; i < 7; i++) {
      const row: number[] = [];
      for (let j = 0; j < 24; j++) {
        const peak1 = Math.exp(-Math.pow(j - 12, 2) / 8);
        const peak2 = Math.exp(-Math.pow(j - 20, 2) / 6);
        const v = Math.min(1, (peak1 + peak2) * (0.6 + Math.random() * 0.4));
        row.push(v);
      }
      r.push(row);
    }
    return r;
  }, []);

  return (
    <>
      <div className="module-header">
        <div className="title-wrap">
          <div className="module-eyebrow">04 · TRAFFIC DISTRIBUTION</div>
          <h1 className="module-title">流量分发</h1>
          <div className="module-sub">8 个渠道矩阵 · Atlas 自动改写 / 排期 / 发布 / 复盘。</div>
        </div>
        <div className="module-actions">
          <button className="btn" onClick={() => openDrawer({
            eyebrow: "NEW CHANNEL", title: "接入渠道", sub: "把一个新平台加入分发矩阵",
            body: <CreateForm
              fields={[
                { name: "name", label: "渠道名称", placeholder: "例如：B 站 / Bilibili" },
                { name: "handle", label: "账号 / 主页", placeholder: "例如：@lumenedu" },
                { name: "mode", label: "发布方式", type: "select", options: ["Atlas 自动改写发布", "仅排期 · 手动确认", "仅同步草稿"] },
              ]}
              submitLabel="接入渠道"
              successMsg={v => `已接入渠道「${v.name}」· Atlas 开始适配内容格式`}
            />,
          })}><Icon name="plus" size={14} /> 接入渠道</button>
          <button className="btn primary" onClick={() => toast("Atlas 已生成本周排期 · 18 篇内容已分配时段")}><Icon name="sparkle" size={14} /> 生成本周排期</button>
        </div>
      </div>

      <div className="module-body">
        <div className="module-section grid-4">
          <KPI label="周触达"   value="36.4K" delta="+22%"     data={[18, 21, 24, 25, 28, 32, 36]} accent />
          <KPI label="新增关注" value="412"   delta="+18%"     data={[120, 180, 220, 290, 330, 380, 412]} />
          <KPI label="点击 CTR" value="4.6%"  delta="+0.8%"    data={[3.4, 3.6, 3.9, 4.0, 4.2, 4.4, 4.6]} />
          <KPI label="单次成本" value="¥0"    delta="纯自然"   data={[0, 0, 0, 0, 0, 0, 0]} />
        </div>

        <div className="module-section">
          <div className="section-head">
            <div className="section-title">渠道矩阵 · 6 / 8 已激活</div>
            <div className="seg"><button className="active">本周</button><button>本月</button><button>全部</button></div>
          </div>
          <div className="channel-grid">
            {(channels ?? []).map(c => (
              <ChannelCard key={c.id} c={c} onClick={() => openDrawer({
                eyebrow: "CHANNEL",
                title: c.name,
                sub: c.handle,
                body: <ChannelDetail c={c} />,
              })} />
            ))}
          </div>
        </div>

        <div className="module-section" style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 12 }}>
          <div className="card">
            <div className="card-head">
              <div className="card-title"><Icon name="activity" size={14} /> 本周发布热力图</div>
              <span className="muted text-xs">Atlas 学习用户活跃时段后排期</span>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-around", paddingTop: 2, paddingBottom: 2 }}>
                {["一", "二", "三", "四", "五", "六", "日"].map(d => <span key={d} className="muted text-xs mono" style={{ height: 14 }}>{d}</span>)}
              </div>
              <div>
                <HeatGrid rows={7} cols={24} intensity={intensity} />
                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-3)", fontSize: 10, fontFamily: "var(--font-mono)", marginTop: 4 }}>
                  <span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>24h</span>
                </div>
              </div>
            </div>
            <div style={{ marginTop: 12, padding: 12, background: "var(--ai-soft)", borderRadius: 8, fontSize: 12.5, color: "var(--text-2)" }}>
              <strong style={{ color: "var(--ai)" }}>Atlas:</strong> 本周 18 篇内容已自动排期，其中 6 篇在你的最佳互动时段 20:00-22:00 发布。
            </div>
          </div>

          <div className="card">
            <div className="card-title"><Icon name="sparkle" size={14} /> 一稿多发 · 内容拆解</div>
            <div className="muted text-xs mb-8">从 1 篇博客 → 6 个平台内容</div>
            <div className="mt-12" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                { p: "小红书", f: "图文 · 9 宫格",     s: "ready" },
                { p: "公众号", f: "长文 · 引用注释",   s: "ready" },
                { p: "视频号", f: "口播脚本 · 60s",    s: "ready" },
                { p: "知乎",   f: "回答体 · 1200 字",  s: "ready" },
                { p: "即刻",   f: "短动态 · 3 条线程", s: "draft" },
                { p: "X",      f: "英文 thread · 8 推", s: "draft" },
              ].map((r, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", border: "1px solid var(--border)", borderRadius: 7 }}>
                  <Icon name={r.s === "ready" ? "check" : "spinner"} size={12} />
                  <span style={{ fontSize: 13, width: 56 }}>{r.p}</span>
                  <span className="muted text-xs">{r.f}</span>
                  <span className={`tag ${r.s === "ready" ? "success" : "ai"}`} style={{ marginLeft: "auto" }}>{r.s === "ready" ? "已生成" : "草稿"}</span>
                </div>
              ))}
            </div>
            <button className="btn accent" style={{ width: "100%", justifyContent: "center", marginTop: 10 }}
              onClick={() => toast("已批准 6 个平台内容 · Atlas 按最佳时段排期")}>
              <Icon name="check" size={13} /> 批准并排期
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function ChannelCard({ c, onClick }: { c: Channel; onClick: () => void }) {
  return (
    <div className={`channel-card ${c.on ? "" : "off"}`} onClick={onClick}>
      <div className="top">
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span className="channel-icon" style={{ background: c.color }}>{c.letter}</span>
          <div>
            <div className="name">{c.name}</div>
            <div className="handle">{c.handle}</div>
          </div>
        </div>
        {c.on ? <span className="tag success"><span className="dot" /> on</span> : <span className="tag">off</span>}
      </div>
      <div className="channel-stats">
        <div className="channel-stat"><div className="label">Posts</div><div className="value">{c.posts}</div></div>
        <div className="channel-stat"><div className="label">Reach</div><div className="value">{c.reach}</div></div>
        <div className="channel-stat"><div className="label">CTR</div><div className="value">{c.ctr}</div></div>
      </div>
    </div>
  );
}

function ChannelDetail({ c }: { c: Channel }) {
  return (
    <div>
      <div className="grid-3" style={{ gap: 8 }}>
        <SignalCell n={c.posts} l="发布数" />
        <SignalCell n={c.reach} l="触达" />
        <SignalCell n={c.ctr} l="CTR" />
      </div>
      <div className="card-title mt-16" style={{ marginBottom: 8 }}><Icon name="activity" size={14} /> 最近表现</div>
      <div className="chart sm">
        <LineChart series={[{ name: "触达", color: c.color, data: [12, 18, 22, 19, 28, 34, 42, 38, 48, 52, 46, 62] }]} labels={[]} showAxis={false} />
      </div>
      <div className="card-title mt-16" style={{ marginBottom: 8 }}><Icon name="star" size={14} /> 爆款笔记</div>
      <ul style={{ paddingLeft: 0, listStyle: "none", margin: 0 }}>
        {["《一个人做 SaaS 的 6 个月》", "《我为什么放弃工作做独立开发》", "《Stripe 这条曲线值得一看》"].map(t => (
          <li key={t} style={{ padding: "8px 0", borderBottom: "1px dashed var(--border)", fontSize: 13 }}>
            <strong>{t}</strong>
            <div className="muted text-xs">收藏 1.2K · 评论 88 · 互动率 9.2%</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
