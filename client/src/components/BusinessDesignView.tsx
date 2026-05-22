// Renderers for the AI-generated 业务线上化 designs (运营体系 / 流量获取).
// Pure presentation — given a BusinessDesign row, draw its result or an
// appropriate empty / running / failed placeholder.

import { Icon } from "./Icon";
import { AgentTag } from "./primitives";
import type {
  BusinessDesign, OperationsDesign, TrafficDesign, DesignDeliverable,
} from "../types/api";

const TARGET_META: Record<DesignDeliverable["target"], { name: string; icon: string }> = {
  content: { name: "内容工厂", icon: "sparkle" },
  traffic: { name: "流量分发", icon: "radio" },
};

function DesignPlaceholder({ design, label }: { design: BusinessDesign | undefined; label: string }) {
  if (!design) return (
    <div className="card soft" style={{ padding: 24, textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>
      还没有{label}。点上方「开始 AI 设计」让 Helix 基于方向论证结论生成。
    </div>
  );
  if (design.status === "PENDING" || design.status === "RUNNING") return (
    <div className="card soft" style={{ padding: 24, textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>
      Helix 正在设计{label}…
    </div>
  );
  if (design.status === "FAILED") return (
    <div className="card" style={{ padding: 22, borderColor: "var(--warn)" }}>
      <div style={{ color: "var(--warn)", fontWeight: 500, marginBottom: 6 }}>
        <Icon name="flag" size={14} /> {label}生成失败
      </div>
      <div className="muted text-xs">{design.error ?? ""}</div>
    </div>
  );
  return null;
}

function Summary({ text }: { text: string }) {
  return (
    <div className="card soft" style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
      <AgentTag name="Helix" />
      <div style={{ flex: 1, fontSize: 13, lineHeight: 1.6, color: "var(--text-2)" }}>{text}</div>
    </div>
  );
}

function DeliverablesBlock({ deliverables }: { deliverables: DesignDeliverable[] }) {
  if (deliverables.length === 0) return null;
  return (
    <div className="card">
      <div className="card-title"><Icon name="send" size={14} /> 交付工单 · {deliverables.length} 张</div>
      <div className="muted text-xs" style={{ margin: "6px 0 10px" }}>
        这些工单已推送到对应执行模块，可在「内容工厂 / 流量分发」里跟进实施。
      </div>
      <div style={{ display: "grid", gap: 6 }}>
        {deliverables.map((d, i) => {
          const t = TARGET_META[d.target];
          return (
            <div key={i} style={{ display: "flex", gap: 10, padding: "9px 11px", border: "1px solid var(--border)", borderRadius: 8 }}>
              <span className="tag" style={{ alignSelf: "flex-start", whiteSpace: "nowrap", fontSize: 10 }}>
                <Icon name={t.icon} size={10} /> {t.name}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{d.title}</div>
                <div className="muted text-xs" style={{ marginTop: 2, lineHeight: 1.5 }}>{d.detail}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// 产品运营体系
// ============================================================================

export function OperationsDesignView({ design }: { design: BusinessDesign | undefined }) {
  const ph = <DesignPlaceholder design={design} label="运营体系" />;
  if (!design || design.status !== "COMPLETED" || !design.result) return ph;
  const r = design.result as OperationsDesign;
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <Summary text={r.summary} />

      <div className="card">
        <div className="card-title"><Icon name="users" size={14} /> 用户生命周期运营 · {r.lifecycle.length} 阶段</div>
        <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
          {r.lifecycle.map((s, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "76px 1fr", gap: 12, padding: "10px 0", borderBottom: i === r.lifecycle.length - 1 ? "none" : "1px dashed var(--border)" }}>
              <span className="tag accent" style={{ alignSelf: "flex-start" }}>{s.stage}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>{s.goal}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {s.tactics.map((t, j) => (
                    <span key={j} className="tag" style={{ fontSize: 11 }}>{t}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid-2" style={{ gap: 12 }}>
        <div className="card">
          <div className="card-title"><Icon name="refresh" size={14} /> 运营节奏</div>
          <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
            {r.cadence.map((c, i) => (
              <div key={i} style={{ padding: "8px 0", borderBottom: i === r.cadence.length - 1 ? "none" : "1px dashed var(--border)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{c.name}</span>
                  <span className="mono text-xs muted">{c.frequency}</span>
                  <span className="tag" style={{ fontSize: 10 }}>{c.owner}</span>
                </div>
                <div className="muted text-xs" style={{ marginTop: 3 }}>{c.detail}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="col">
          <div className="card">
            <div className="card-title"><Icon name="target" size={14} /> 北极星指标</div>
            <div style={{ marginTop: 10 }}>
              <div className="mono" style={{ fontSize: 18, fontWeight: 600 }}>{r.northStar.metric}</div>
              <div className="tag accent" style={{ marginTop: 6 }}><span className="dot" /> 目标 {r.northStar.target}</div>
              <div className="muted text-xs" style={{ marginTop: 8, lineHeight: 1.6 }}>{r.northStar.rationale}</div>
            </div>
          </div>
          <div className="card">
            <div className="card-title"><Icon name="bolt" size={14} /> 留存抓手</div>
            <ul style={{ paddingLeft: 0, listStyle: "none", margin: "10px 0 0", fontSize: 12.5 }}>
              {r.retentionLevers.map((l, i) => (
                <li key={i} style={{ padding: "7px 0", borderBottom: i === r.retentionLevers.length - 1 ? "none" : "1px dashed var(--border)" }}>
                  <strong>{l.lever}</strong>
                  <span className="muted"> · {l.mechanism}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <DeliverablesBlock deliverables={r.deliverables} />
    </div>
  );
}

// ============================================================================
// 流量获取
// ============================================================================

const PRIORITY_TONE: Record<TrafficDesign["channels"][number]["priority"], string> = {
  high: "accent", medium: "ai", low: "",
};
const PRIORITY_LABEL: Record<TrafficDesign["channels"][number]["priority"], string> = {
  high: "高", medium: "中", low: "低",
};

export function TrafficDesignView({ design }: { design: BusinessDesign | undefined }) {
  const ph = <DesignPlaceholder design={design} label="流量获取" />;
  if (!design || design.status !== "COMPLETED" || !design.result) return ph;
  const r = design.result as TrafficDesign;
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <Summary text={r.summary} />

      <div className="card">
        <div className="card-title"><Icon name="radio" size={14} /> 推荐获客渠道 · {r.channels.length} 个</div>
        <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
          {r.channels.map((c, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "9px 0", borderBottom: i === r.channels.length - 1 ? "none" : "1px dashed var(--border)" }}>
              <span className={`tag ${PRIORITY_TONE[c.priority]}`} style={{ whiteSpace: "nowrap" }}>
                <span className="dot" /> {PRIORITY_LABEL[c.priority]}优先
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{c.channel}</div>
                <div className="muted text-xs" style={{ marginTop: 2, lineHeight: 1.5 }}>{c.fit}</div>
              </div>
              <span className="mono text-xs" style={{ color: "var(--text-2)", whiteSpace: "nowrap" }}>CAC {c.cacEstimate}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid-2" style={{ gap: 12 }}>
        <div className="card">
          <div className="card-title"><Icon name="zap" size={14} /> 获客打法</div>
          <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
            {r.tactics.map((t, i) => (
              <div key={i} style={{ padding: "8px 0", borderBottom: i === r.tactics.length - 1 ? "none" : "1px dashed var(--border)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="tag" style={{ fontSize: 10 }}>{t.channel}</span>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{t.tactic}</span>
                </div>
                <div className="muted text-xs" style={{ marginTop: 3 }}>预期 · {t.expectedResult}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="col">
          <div className="card">
            <div className="card-title"><Icon name="git" size={14} /> 获客漏斗</div>
            <div style={{ marginTop: 10 }}>
              {r.funnel.map((f, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "64px 1fr auto", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: i === r.funnel.length - 1 ? "none" : "1px dashed var(--border)" }}>
                  <span className="tag" style={{ fontSize: 10 }}>{f.stage}</span>
                  <span style={{ fontSize: 12.5 }}>{f.action}</span>
                  <span className="mono text-xs muted">{f.metric}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="card-title"><Icon name="bar" size={14} /> 预算分配</div>
            <div style={{ marginTop: 10 }}>
              {r.budgetSplit.map((b, i) => (
                <div key={i} className="score-row" style={{ padding: "6px 0" }}>
                  <span className="label" style={{ width: 96, fontSize: 12 }}>{b.item}</span>
                  <span className="bar"><i style={{ width: `${Math.min(100, b.pct)}%` }} /></span>
                  <span className="val mono">{b.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <DeliverablesBlock deliverables={r.deliverables} />
    </div>
  );
}

// Small status strip — shown above each design tab to summarize its state.
export function DesignStatusLine({ design, label }: { design: BusinessDesign | undefined; label: string }) {
  const status = design?.status;
  const tone =
    status === "COMPLETED" ? "success" :
    status === "RUNNING" || status === "PENDING" ? "ai" :
    status === "FAILED" ? "warn" : "";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
      <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
      <span className={`tag ${tone}`}>{status ?? "未生成"}</span>
      {design?.result && (
        <span className="muted text-xs">
          {(design.result as OperationsDesign | TrafficDesign).deliverables.length} 张交付工单
        </span>
      )}
    </div>
  );
}
