// Per-direction 4-dimension validation workspace.
//
// Rendered inline (expanded) under a direction card on the Direction page —
// 选择 and 论证 live on one screen. It owns no data: the parent direction card
// owns `validations` + the workflow handle and passes them down, so the card's
// collapsed progress dots and this panel never drift apart.

import { useMemo, useState } from "react";
import { Icon } from "./Icon";
import { AgentTag, SignalCell, th, td } from "./primitives";
import { DonutChart } from "./Charts";
import { ValidationProcess } from "./ValidationProcess";
import type {
  MyDirection, DirectionValidation, ValidationKind, ValidationStatus,
  MarketAnalysis, CompetitorAnalysis, FeasibilityAnalysis, UserAnalysis,
  WorkflowRun,
} from "../types/api";

const TAB_DEFS: Array<{ id: ValidationKind; name: string; icon: string }> = [
  { id: "market",      name: "市场分析", icon: "activity" },
  { id: "competitor",  name: "竞品分析", icon: "users" },
  { id: "feasibility", name: "可行性",   icon: "settings" },
  { id: "user",        name: "用户合成", icon: "msg" },
];

const KIND_ORDER: ValidationKind[] = ["market", "competitor", "feasibility", "user"];

// ============================================================================
// Compact 4-dot progress indicator — shown on the collapsed direction card.
// ============================================================================

function dotTone(s: ValidationStatus | undefined): string {
  if (s === "COMPLETED") return "var(--success)";
  if (s === "RUNNING" || s === "PENDING") return "var(--ai)";
  if (s === "FAILED") return "var(--warn)";
  return "transparent";
}

export function ValidationDots({ validations }: { validations: DirectionValidation[] }) {
  const byKind: Partial<Record<ValidationKind, ValidationStatus>> = {};
  for (const v of validations) byKind[v.kind] = v.status;
  const done = validations.filter(v => v.status === "COMPLETED").length;
  const running = validations.some(v => v.status === "RUNNING" || v.status === "PENDING");

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      {KIND_ORDER.map(k => {
        const s = byKind[k];
        return (
          <span key={k} title={k} style={{
            width: 7, height: 7, borderRadius: 99,
            background: dotTone(s),
            border: s ? "none" : "1px solid var(--border-strong)",
          }} />
        );
      })}
      <span className="mono" style={{ fontSize: 11, color: "var(--text-3)", marginLeft: 3 }}>
        {validations.length === 0 ? "未论证" : running ? `${done}/4 论证中` : `${done}/4`}
      </span>
    </span>
  );
}

// ============================================================================
// The validation workspace itself.
// ============================================================================

interface PanelProps {
  direction: MyDirection;
  validations: DirectionValidation[];
  /** Active workflow run, if one was started this session. */
  workflowId: string | null;
  /** True while a run is starting or any dimension is still RUNNING/PENDING. */
  busy: boolean;
  /** Start (or re-run) the 4-dimension validation. */
  onStart: () => void;
  /** Re-fetch validation rows — wired to ValidationProcess's per-poll callback. */
  onReloadValidations: () => void;
  /** Fired once when the workflow reaches a terminal status. */
  onWorkflowTerminal: (run: WorkflowRun) => void;
}

export function DirectionValidationPanel({
  direction, validations, workflowId, busy,
  onStart, onReloadValidations, onWorkflowTerminal,
}: PanelProps) {
  const [tab, setTab] = useState<ValidationKind>("market");

  const byKind = useMemo(() => {
    const m: Partial<Record<ValidationKind, DirectionValidation>> = {};
    for (const v of validations) m[v.kind] = v;
    return m;
  }, [validations]);

  const stats = useMemo(() => {
    const done = validations.filter(v => v.status === "COMPLETED").length;
    const running = validations.filter(v => v.status === "RUNNING" || v.status === "PENDING").length;
    const failed = validations.filter(v => v.status === "FAILED").length;
    return { done, running, failed, total: 4 };
  }, [validations]);

  const hasAny = validations.length > 0;

  return (
    <div style={{
      display: "grid", gap: 12,
      marginTop: 12, paddingTop: 14, borderTop: "1px solid var(--border)",
    }}>
      {/* ---- panel header + run control ---- */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <AgentTag name="Helix" />
        <span style={{ fontSize: 13, fontWeight: 600 }}>4 维深度论证</span>
        <span className="muted text-xs">市场 · 竞品 · 可行性 · 用户</span>
        <button className="btn sm accent" style={{ marginLeft: "auto" }} onClick={onStart} disabled={busy}>
          <Icon name={busy ? "refresh" : "target"} size={12} />
          {busy ? "论证中…" : hasAny ? "重新论证" : "开始 4 维论证"}
        </button>
      </div>

      {/* ---- live process panel ---- */}
      {workflowId && (
        <ValidationProcess
          workflowId={workflowId}
          validations={validations}
          onPoll={onReloadValidations}
          onTerminal={onWorkflowTerminal}
        />
      )}

      {/* ---- empty state (never validated, nothing running) ---- */}
      {!workflowId && !hasAny && (
        <div className="card soft" style={{ textAlign: "center", padding: 22, color: "var(--text-3)", fontSize: 13 }}>
          还没有论证记录。点「开始 4 维论证」让 Helix 跑一轮市场 / 竞品 / 可行性 / 用户分析。
        </div>
      )}

      {/* ---- summary cards ---- */}
      {hasAny && (
        <div className="grid-3" style={{ gap: 12 }}>
          <div className="card">
            <div className="card-title"><Icon name="target" size={14} /> 综合可信度</div>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 8 }}>
              <DonutChart data={[
                { name: "已验证", value: stats.done, color: "var(--accent)" },
                { name: "进行中", value: stats.running, color: "var(--ai)" },
                { name: "失败",   value: stats.failed, color: "var(--warn)" },
                { name: "未开始", value: Math.max(0, stats.total - stats.done - stats.running - stats.failed), color: "var(--bg-mute)" },
              ]} />
              <div>
                <div className="mono" style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.02em" }}>
                  {Math.round(stats.done / stats.total * 100)}<span style={{ fontSize: 16, color: "var(--text-3)" }}>%</span>
                </div>
                <div className="muted text-xs">
                  {stats.done === 4 ? "已完整论证" : stats.done === 0 ? "尚未论证" : `已完成 ${stats.done} / 4 维`}
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-title"><AgentTag name="Helix" /> 状态概览</div>
            <ul style={{ paddingLeft: 0, listStyle: "none", margin: "12px 0 0", fontSize: 13 }}>
              {TAB_DEFS.map(t => {
                const v = byKind[t.id];
                const status = v?.status ?? "—";
                const tone =
                  status === "COMPLETED" ? "success" :
                  status === "RUNNING" || status === "PENDING" ? "ai" :
                  status === "FAILED" ? "warn" : "";
                return (
                  <li key={t.id} style={{ padding: "8px 0", borderBottom: "1px dashed var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
                    <Icon name={t.icon} size={12} />
                    <span style={{ flex: 1 }}>{t.name}</span>
                    <span className={`tag ${tone}`}>{status}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="card">
            <div className="card-title"><Icon name="bar" size={14} /> 方向元信息</div>
            <div className="grid-2" style={{ gap: 8, marginTop: 12 }}>
              <SignalCell n={direction.evaluation?.score ?? "—"} l="快速评分 · 总分" />
              <SignalCell n={direction.tags.length} l="标签数" />
              <SignalCell n={new Date(direction.createdAt).toLocaleDateString()} l="创建时间" />
              <SignalCell n={direction.source.startsWith("from_trending") ? "热门导入" : "手动录入"} l="来源" />
            </div>
          </div>
        </div>
      )}

      {/* ---- 4-dimension tabs ---- */}
      {hasAny && (
        <div>
          <div className="tabs">
            {TAB_DEFS.map(t => {
              const v = byKind[t.id];
              const count =
                v?.status === "COMPLETED" ? "✓" :
                v?.status === "RUNNING" || v?.status === "PENDING" ? "…" :
                v?.status === "FAILED" ? "!" :
                "—";
              return (
                <button key={t.id} className={`tab ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
                  {t.name}<span className="count">{count}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-12">
            {tab === "market"      && <MarketTab v={byKind.market} />}
            {tab === "competitor"  && <CompetitorTab v={byKind.competitor} />}
            {tab === "feasibility" && <FeasibilityTab v={byKind.feasibility} />}
            {tab === "user"        && <UserTab v={byKind.user} />}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Tab content components
// ============================================================================

function PlaceholderCard({ v }: { v: DirectionValidation | undefined }) {
  if (!v) return (
    <div className="card soft" style={{ padding: 24, textAlign: "center", color: "var(--text-3)" }}>
      尚未论证。点上方「重新论证」让 Helix 跑一轮。
    </div>
  );
  if (v.status === "PENDING" || v.status === "RUNNING") return (
    <div className="card soft" style={{ padding: 24, textAlign: "center", color: "var(--text-3)" }}>
      Helix 正在分析中…
    </div>
  );
  if (v.status === "FAILED") return (
    <div className="card" style={{ padding: 24, borderColor: "var(--warn)" }}>
      <div style={{ color: "var(--warn)", fontWeight: 500, marginBottom: 6 }}>
        <Icon name="flag" size={14} /> 这一维分析失败
      </div>
      <div className="muted text-xs">{v.error ?? ""}</div>
    </div>
  );
  return null;
}

function MarketTab({ v }: { v: DirectionValidation | undefined }) {
  const ph = <PlaceholderCard v={v} />;
  if (!v || v.status !== "COMPLETED" || !v.result) return ph;
  const r = v.result as MarketAnalysis;
  return (
    <div className="grid-2" style={{ gap: 12 }}>
      <div className="card">
        <div className="card-title"><Icon name="activity" size={14} /> 市场规模</div>
        <div className="mt-12">
          {[
            { label: "TAM (Total)",      v: r.tam },
            { label: "SAM (可服务)",      v: r.sam },
            { label: "SOM (可获取)",      v: r.som },
          ].map(s => (
            <div key={s.label} className="score-row" style={{ padding: "8px 0" }}>
              <span className="label" style={{ width: 110, fontSize: 12 }}>{s.label}</span>
              <span className="bar"><i style={{ width: `${s.v.pct}%` }} /></span>
              <span className="val">{s.v.value}</span>
            </div>
          ))}
        </div>
        <div className="mt-12 grid-2" style={{ gap: 8 }}>
          <SignalCell n={r.growthYoY} l="增长 (YoY)" />
          <SignalCell n={r.pricingBand} l="主流定价" />
        </div>
      </div>
      <div className="card">
        <div className="card-title"><Icon name="sparkle" size={14} /> 趋势 / 红旗</div>
        <div className="mt-12" style={{ fontSize: 13 }}>
          <div className="muted text-xs mb-8" style={{ textTransform: "uppercase" }}>趋势</div>
          <ul style={{ paddingLeft: 18, margin: 0 }}>
            {r.trends.map((t, i) => <li key={i} style={{ marginBottom: 6 }}>{t}</li>)}
          </ul>
          {r.redFlags.length > 0 && (
            <>
              <div className="muted text-xs mb-8 mt-16" style={{ textTransform: "uppercase", color: "var(--warn)" }}>红旗</div>
              <ul style={{ paddingLeft: 18, margin: 0 }}>
                {r.redFlags.map((t, i) => <li key={i} style={{ marginBottom: 6, color: "var(--warn)" }}>{t}</li>)}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CompetitorTab({ v }: { v: DirectionValidation | undefined }) {
  const ph = <PlaceholderCard v={v} />;
  if (!v || v.status !== "COMPLETED" || !v.result) return ph;
  const r = v.result as CompetitorAnalysis;
  return (
    <>
      <div className="card flush mb-12">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--bg-soft)", color: "var(--text-3)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {["竞品", "阶段", "用户", "定价", "增长", "优势", "弱点", "威胁度"].map(h => <th key={h} style={th}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {r.competitors.map((c, i) => (
              <tr key={c.name} style={{ borderTop: i === 0 ? "none" : "1px solid var(--border)" }}>
                <td style={td}><strong>{c.name}</strong></td>
                <td style={td}><span className="tag">{c.stage}</span></td>
                <td style={{ ...td, fontFamily: "var(--font-mono)" }}>{c.users}</td>
                <td style={{ ...td, fontFamily: "var(--font-mono)" }}>{c.pricing}</td>
                <td style={{ ...td, fontFamily: "var(--font-mono)" }}>{c.growth}</td>
                <td style={td}>{c.strength}</td>
                <td style={{ ...td, color: "var(--text-3)" }}>{c.weakness}</td>
                <td style={td}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 60, height: 4, background: "var(--bg-mute)", borderRadius: 99 }}>
                      <div style={{ width: `${c.threatScore}%`, height: "100%", background: c.threatScore > 60 ? "var(--warn)" : "var(--text)", borderRadius: 99 }} />
                    </div>
                    <span className="mono text-xs">{c.threatScore}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card soft">
        <div className="card-title"><AgentTag name="Helix" /> 市场空缺 & 定位</div>
        <div className="mt-12" style={{ fontSize: 13, lineHeight: 1.7 }}>
          <strong>空缺：</strong>{r.marketGap}<br />
          <strong>定位：</strong>{r.positioning}
        </div>
      </div>
    </>
  );
}

function FeasibilityTab({ v }: { v: DirectionValidation | undefined }) {
  const ph = <PlaceholderCard v={v} />;
  if (!v || v.status !== "COMPLETED" || !v.result) return ph;
  const r = v.result as FeasibilityAnalysis;
  const goTone = r.goNoGo === "go" ? "success" : r.goNoGo === "conditional" ? "ai" : "warn";
  return (
    <div className="grid-2" style={{ gap: 12 }}>
      <div className="card">
        <div className="card-title"><Icon name="settings" size={14} /> 资源 / 能力差距</div>
        <ul style={{ paddingLeft: 0, listStyle: "none", margin: "12px 0 0" }}>
          {r.resources.map((res, i) => (
            <li key={i} style={{ padding: "10px 0", borderBottom: i === r.resources.length - 1 ? "none" : "1px dashed var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <strong style={{ width: 80 }}>{res.kind}</strong>
                <span style={{ flex: 1, fontSize: 12.5, color: "var(--text-2)" }}>{res.need}</span>
                <span className="mono text-xs">{"★".repeat(res.gapStars)}{"☆".repeat(5 - res.gapStars)}</span>
              </div>
              <div className="muted text-xs" style={{ marginLeft: 88, marginTop: 4 }}>当前：{res.founderHas}</div>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <div className="card mb-12">
          <div className="card-title"><Icon name="rocket" size={14} /> 6 个月里程碑</div>
          <div className="mt-12">
            {r.milestones.map((m, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "70px 1fr auto", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: i === r.milestones.length - 1 ? "none" : "1px dashed var(--border)" }}>
                <span className="mono text-xs" style={{ color: "var(--text-3)" }}>{m.window}</span>
                <span style={{ fontSize: 13 }}>{m.title}</span>
                {m.metric && <span className="mono text-xs" style={{ color: "var(--accent)" }}>{m.metric}</span>}
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-title"><Icon name="flag" size={14} /> 执行风险 / 判断</div>
          <ul style={{ paddingLeft: 18, margin: "12px 0", fontSize: 13 }}>
            {r.rampUpRisks.map((x, i) => <li key={i} style={{ marginBottom: 4 }}>{x}</li>)}
          </ul>
          <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 8, borderTop: "1px dashed var(--border)" }}>
            <span className={`tag ${goTone}`} style={{ fontSize: 12 }}>
              <span className="dot" /> {r.goNoGo.toUpperCase()}
            </span>
            <span style={{ fontSize: 12.5, color: "var(--text-2)" }}>{r.rationale}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function UserTab({ v }: { v: DirectionValidation | undefined }) {
  const ph = <PlaceholderCard v={v} />;
  if (!v || v.status !== "COMPLETED" || !v.result) return ph;
  const r = v.result as UserAnalysis;
  return (
    <>
      <div className="card flush mb-12">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--bg-soft)", color: "var(--text-3)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {["合成人物", "角色", "为什么用", "付费意愿", "金句"].map(h => <th key={h} style={th}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {r.personas.map((p, i) => (
              <tr key={i} style={{ borderTop: i === 0 ? "none" : "1px solid var(--border)" }}>
                <td style={td}><strong>{p.name}</strong></td>
                <td style={{ ...td, color: "var(--text-3)" }}>{p.role}</td>
                <td style={{ ...td, fontSize: 12.5 }}>{p.why}</td>
                <td style={td}>{"★".repeat(p.payIntent)}{"☆".repeat(5 - p.payIntent)}</td>
                <td style={{ ...td, fontSize: 12.5, color: "var(--text-2)", maxWidth: 320 }}>「{p.quote}」</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid-2" style={{ gap: 12 }}>
        <div className="card">
          <div className="card-title"><Icon name="flag" size={14} /> 共同顾虑</div>
          <ul style={{ paddingLeft: 18, margin: "12px 0", fontSize: 13 }}>
            {r.topConcerns.map((c, i) => <li key={i} style={{ marginBottom: 4 }}>{c}</li>)}
          </ul>
        </div>
        <div className="card">
          <div className="card-title"><AgentTag name="Helix" /> 提炼关键词</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
            {r.topKeywords.map((k, i) => (
              <span key={i} className="tag" style={{ fontSize: `${11 + k.weight * 0.3}px`, padding: "4px 9px" }}>
                {k.word} <span className="mono muted" style={{ marginLeft: 4 }}>{k.weight}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
