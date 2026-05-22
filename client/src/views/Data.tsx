import { useState } from "react";
import { Icon } from "../components/Icon";
import { th, td } from "../components/primitives";
import { LineChart, RetentionCurve, Sparkline } from "../components/Charts";
import { useUI } from "../lib/ui";

const RANGES = ["7d", "30d", "90d", "全部"] as const;

export function DataView() {
  const { toast } = useUI();
  const [range, setRange] = useState<(typeof RANGES)[number]>("7d");
  return (
    <>
      <div className="module-header">
        <div className="title-wrap">
          <div className="module-eyebrow">06 · DATA VALIDATION</div>
          <h1 className="module-title">数据验证</h1>
          <div className="module-sub">北极星指标 · 留存 · 异常告警 · AI 自动归因。</div>
        </div>
        <div className="module-actions">
          <div className="seg">
            {RANGES.map(r => (
              <button key={r} className={range === r ? "active" : ""} onClick={() => setRange(r)}>{r}</button>
            ))}
          </div>
          <button className="btn primary" onClick={() => toast(`已生成 ${range} 数据周报 · 已发送到你的邮箱`)}><Icon name="download" size={14} /> 周报</button>
        </div>
      </div>

      <div className="module-body">
        <div className="module-section">
          <div className="card" style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 24, alignItems: "center" }}>
            <div>
              <div className="muted text-xs mono" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>北极星指标 · NORTH STAR</div>
              <h2 style={{ margin: "8px 0 4px", fontSize: 18, fontWeight: 500 }}>周活跃付费学习时长</h2>
              <div className="mono" style={{ fontSize: 40, fontWeight: 600, letterSpacing: "-0.03em" }}>
                42.6<span style={{ fontSize: 18, color: "var(--text-3)" }}> 分钟 / 用户 / 周</span>
              </div>
              <div className="row mt-8">
                <span className="tag success"><Icon name="arrowUp" size={10} stroke={2} /> +8.4% wow</span>
                <span className="tag">目标 60 min</span>
              </div>
              <div className="muted text-sm mt-12">「学习时长」比「完课率」更能预测续费 — Helix 7d ago</div>
            </div>
            <div className="chart" style={{ height: 180 }}>
              <LineChart
                series={[{ name: "本期", color: "var(--accent)", data: [22, 24, 26, 28, 30, 32, 34, 35, 37, 39, 41, 42.6], dots: true }]}
                labels={["W1", "", "W3", "", "W5", "", "W7", "", "W9", "", "W11", "Now"]}
              />
            </div>
          </div>
        </div>

        <div className="module-section grid-4">
          <MetricCard label="DAU"      value="74"     delta="+11%"   data={[40, 45, 48, 52, 55, 58, 62, 65, 68, 71, 73, 74]} />
          <MetricCard label="WAU"      value="186"    delta="+8%"    data={[110, 118, 125, 134, 142, 150, 160, 168, 172, 180, 184, 186]} />
          <MetricCard label="付费转化" value="18.4%"  delta="+1.2%" data={[14, 15, 15.5, 16, 16.5, 17, 17.4, 17.8, 18, 18.2, 18.3, 18.4]} />
          <MetricCard label="月留存"   value="68%"    delta="-2.1%" down data={[78, 76, 75, 73, 71, 70, 69, 68, 68, 67, 68, 68]} />
          <MetricCard label="NPS"      value="62"     delta="+4"     data={[48, 50, 52, 54, 55, 57, 58, 60, 60, 61, 62, 62]} />
          <MetricCard label="ARPU"     value="¥491"   delta="+3.4%" data={[420, 430, 440, 450, 455, 460, 470, 475, 478, 485, 488, 491]} />
          <MetricCard label="LTV"      value="¥1,840" delta="+8%"    data={[1200, 1300, 1380, 1460, 1520, 1580, 1640, 1700, 1730, 1780, 1810, 1840]} />
          <MetricCard label="CAC"      value="¥0"     delta="0" flat data={[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]} />
        </div>

        <div className="module-section" style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 12 }}>
          <div className="card">
            <div className="card-head">
              <div className="card-title"><Icon name="activity" size={14} /> 留存曲线 · WEEK 0-8</div>
              <span className="muted text-xs mono">N = 92 付费用户</span>
            </div>
            <div className="chart" style={{ height: 200 }}>
              <RetentionCurve heights={[100, 82, 71, 68, 64, 62, 60, 59, 58]} height={200} />
            </div>
            <div style={{ marginTop: 12, padding: 12, background: "var(--ai-soft)", borderRadius: 8, fontSize: 12.5, color: "var(--text-2)" }}>
              <strong style={{ color: "var(--ai)" }}>Helix 归因：</strong> 第 1 周到第 2 周流失 18% 集中在「未完成首课」用户。建议触发 24 小时未学习的提醒邮件。
            </div>
          </div>

          <div className="card">
            <div className="card-title"><Icon name="flag" size={14} /> 异常告警 · LAST 7D</div>
            <ul style={{ paddingLeft: 0, listStyle: "none", margin: "12px 0 0" }}>
              {[
                { l: "课程 #6 完课率 -37%", t: "11.18", s: "danger",  reason: "节奏过快" },
                { l: "小红书 CTR -1.2%",    t: "11.16", s: "warn",    reason: "标题同质化" },
                { l: "MRR 单日 +¥2.8K",     t: "11.15", s: "success", reason: "X 爆款外溢" },
                { l: "退款率瞬时 6%",       t: "11.13", s: "warn",    reason: "1 个客户连退" },
              ].map((a, i) => (
                <li key={i} style={{ padding: "10px 0", borderBottom: i === 3 ? "none" : "1px dashed var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className={`tag ${a.s}`}><span className="dot" />{a.s === "danger" ? "异常" : a.s === "warn" ? "关注" : "正向"}</span>
                    <strong style={{ fontSize: 13 }}>{a.l}</strong>
                    <span className="mono text-xs muted" style={{ marginLeft: "auto" }}>{a.t}</span>
                  </div>
                  <div className="muted text-xs" style={{ marginLeft: 4, marginTop: 4 }}>归因：{a.reason}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="module-section">
          <div className="section-head"><div className="section-title">同期群分析 · COHORT</div></div>
          <CohortHeat />
        </div>
      </div>
    </>
  );
}

function MetricCard({ label, value, delta, data, down, flat }: {
  label: string; value: string; delta: string; data: number[]; down?: boolean; flat?: boolean;
}) {
  return (
    <div className="card">
      <div className="muted text-xs" style={{ textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "var(--font-mono)" }}>{label}</div>
      <div className="mono" style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", marginTop: 4 }}>{value}</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
        <span className="mono text-xs" style={{ color: flat ? "var(--text-3)" : down ? "var(--danger)" : "var(--success)" }}>
          {!flat && (down ? "↓ " : "↑ ")}{delta}
        </span>
        <Sparkline data={data} w={80} h={20} color={flat ? "var(--text-3)" : down ? "var(--danger)" : "var(--accent)"} />
      </div>
    </div>
  );
}

function CohortHeat() {
  const rows: Array<{ w: string; users: number; vals: Array<number | null> }> = [
    { w: "11.04", users: 14, vals: [100, 86, 71, 64, 57, null, null, null] },
    { w: "11.11", users: 18, vals: [100, 78, 67, 61, 58, null, null, null] },
    { w: "11.18", users: 22, vals: [100, 82, 73, null, null, null, null, null] },
    { w: "11.25", users: 28, vals: [100, 86, null, null, null, null, null, null] },
    { w: "12.02", users: 10, vals: [100, null, null, null, null, null, null, null] },
  ];
  return (
    <div className="card flush">
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "var(--bg-soft)", color: "var(--text-3)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            <th style={th}>Cohort</th>
            <th style={th}>Users</th>
            {Array.from({ length: 8 }, (_, i) => <th key={i} style={th}>W{i}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.w} style={{ borderTop: i === 0 ? "none" : "1px solid var(--border)" }}>
              <td style={{ ...td, fontFamily: "var(--font-mono)" }}>{r.w}</td>
              <td style={{ ...td, fontFamily: "var(--font-mono)", color: "var(--text-3)" }}>{r.users}</td>
              {r.vals.map((v, j) => (
                <td key={j} style={td}>
                  {v !== null ? (
                    <div style={{ background: `rgba(79,70,229,${0.06 + (v / 100) * 0.85})`, padding: "6px 8px", borderRadius: 4, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 11.5, color: v > 50 ? "#fff" : "var(--text)" }}>
                      {v}%
                    </div>
                  ) : <span className="muted">—</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
