// Live, detailed view of a 4-dimension direction-validation run.
//
// It polls the workflow run + its event timeline, and combines that with the
// (parent-supplied) direction_validations rows to render three things:
//   1. an overall progress header (X/4 done, elapsed, status)
//   2. four per-dimension lanes that run in parallel, each with its own live
//      status, elapsed timer, current step, and a one-line result preview
//   3. a full, scrolling event timeline — the "论证过程" itself
//
// The 4 dimensions run concurrently in the workflow, so a single
// `currentActivity` field can't describe progress — we drive everything off
// the per-dimension rows + the event stream instead.

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "./Icon";
import { AgentTag } from "./primitives";
import { api } from "../lib/api";
import type {
  WorkflowRun, WorkflowEvent, WorkflowStatus,
  DirectionValidation, ValidationKind, ValidationStatus,
  MarketAnalysis, CompetitorAnalysis, FeasibilityAnalysis, UserAnalysis,
} from "../types/api";

interface Props {
  workflowId: string;
  /** Latest validation rows — authoritative per-dimension status + result. */
  validations: DirectionValidation[];
  /** Called after every successful poll so the parent can refresh in lockstep. */
  onPoll?: () => void;
  /** Called once when the run reaches a terminal status. */
  onTerminal?: (run: WorkflowRun) => void;
}

const TERMINAL: WorkflowStatus[] = ["COMPLETED", "FAILED", "CANCELLED"];
const KINDS: ValidationKind[] = ["market", "competitor", "feasibility", "user"];

const DIM: Record<ValidationKind, { name: string; icon: string; color: string }> = {
  market:      { name: "市场分析", icon: "activity", color: "#3b82f6" },
  competitor:  { name: "竞品分析", icon: "users",    color: "#8b5cf6" },
  feasibility: { name: "可行性",   icon: "settings", color: "#d97706" },
  user:        { name: "用户合成", icon: "msg",      color: "#0d9488" },
};

function fmtElapsed(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m${String(s % 60).padStart(2, "0")}s`;
}
function fmtClock(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

interface TokenPayload { promptTokens?: number; completionTokens?: number; totalTokens?: number }

function resultLine(kind: ValidationKind, result: NonNullable<DirectionValidation["result"]>): string {
  switch (kind) {
    case "market": {
      const r = result as MarketAnalysis;
      return `TAM ${r.tam.value} · 增长 ${r.growthYoY}`;
    }
    case "competitor": {
      const r = result as CompetitorAnalysis;
      return `${r.competitors.length} 个竞品 · 已锁定市场空缺`;
    }
    case "feasibility": {
      const r = result as FeasibilityAnalysis;
      return `判断 ${r.goNoGo.toUpperCase()} · ${r.resources.length} 项资源缺口`;
    }
    case "user": {
      const r = result as UserAnalysis;
      return `${r.personas.length} 个合成用户 · ${r.topConcerns.length} 条共同顾虑`;
    }
  }
}

// ----------------------------------------------------------------------------

interface DimState {
  kind: ValidationKind;
  status: ValidationStatus;
  step: string;
  elapsedMs: number | null;
  result: DirectionValidation["result"];
  error: string | null;
}

export function ValidationProcess({ workflowId, validations, onPoll, onTerminal }: Props) {
  const [run, setRun] = useState<WorkflowRun | null>(null);
  const [events, setEvents] = useState<WorkflowEvent[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Keep callbacks in refs so the poll effect only re-subscribes on workflowId.
  const onPollRef = useRef(onPoll);
  const onTerminalRef = useRef(onTerminal);
  onPollRef.current = onPoll;
  onTerminalRef.current = onTerminal;
  const calledTerminal = useRef(false);
  const timelineRef = useRef<HTMLDivElement | null>(null);

  // ---- poll the workflow run + events ----
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    calledTerminal.current = false;
    setRun(null);
    setEvents([]);
    setErr(null);

    const tick = async (): Promise<void> => {
      if (stopped) return;
      try {
        const r = await api.workflows.get(workflowId);
        if (stopped) return;
        setRun(r.run);
        setEvents(r.events);
        setErr(null);
        onPollRef.current?.();
        if (TERMINAL.includes(r.run.status) && !calledTerminal.current) {
          calledTerminal.current = true;
          onTerminalRef.current?.(r.run);
          return; // stop polling
        }
      } catch (e) {
        if (!stopped) setErr(e instanceof Error ? e.message : String(e));
      }
      timer = setTimeout(tick, 1100);
    };
    void tick();

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [workflowId]);

  const running = run ? !TERMINAL.includes(run.status) : true;

  // ---- 1s ticker so elapsed timers advance smoothly between polls ----
  useEffect(() => {
    if (!running) return;
    const i = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(i);
  }, [running]);

  // ---- keep the timeline scrolled to the newest event ----
  useEffect(() => {
    const el = timelineRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [events.length]);

  const byKind = useMemo(() => {
    const m: Partial<Record<ValidationKind, DirectionValidation>> = {};
    for (const v of validations) m[v.kind] = v;
    return m;
  }, [validations]);

  const dims: DimState[] = useMemo(() => KINDS.map(kind => {
    const evs = events.filter(e => e.activity === `validate:${kind}`);
    const startedEv = evs.find(e => e.kind === "activity_started");
    const llmEv = evs.find(e => e.kind === "log" && (e.message ?? "").includes("DeepSeek"));
    const parseEv = evs.find(e => e.kind === "log" && (e.message ?? "").includes("写入"));
    const doneEv = evs.find(e => e.kind === "activity_completed");
    const failEv = evs.find(e => e.kind === "log" && (e.message ?? "").includes("失败"));
    const row = byKind[kind];

    const status: ValidationStatus =
      row?.status ??
      (doneEv ? "COMPLETED" : failEv ? "FAILED" : startedEv ? "RUNNING" : "PENDING");

    const startTs = startedEv ? new Date(startedEv.ts).getTime() : null;
    const endTs =
      doneEv ? new Date(doneEv.ts).getTime() :
      failEv ? new Date(failEv.ts).getTime() :
      row?.finishedAt ? new Date(row.finishedAt).getTime() : null;
    const elapsedMs = startTs != null ? (endTs ?? now) - startTs : null;

    let step: string;
    if (status === "COMPLETED")      step = "结论已生成";
    else if (status === "FAILED")    step = row?.error ?? "分析失败";
    else if (parseEv)                step = "解析结论 · 写入数据库";
    else if (llmEv)                  step = "解析 Helix 返回的结论";
    else if (startedEv)              step = "Helix 调用 DeepSeek 推理中";
    else                             step = "排队等待中";

    return { kind, status, step, elapsedMs, result: row?.result ?? null, error: row?.error ?? null };
  }), [events, byKind, now]);

  const doneCount = dims.filter(d => d.status === "COMPLETED").length;
  const failCount = dims.filter(d => d.status === "FAILED").length;
  const total = KINDS.length;

  // ---- connecting / error states ----
  if (err && !run) {
    return (
      <div className="card" style={{ borderColor: "var(--warn)", fontSize: 13, display: "flex", gap: 8, alignItems: "center" }}>
        <Icon name="flag" size={14} /> 无法连接论证工作流：{err}
      </div>
    );
  }
  if (!run) {
    return (
      <div className="card soft" style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
        <Spin /> <span className="muted-2">连接论证工作流…</span>
      </div>
    );
  }

  const overallElapsed =
    (run.finishedAt ? new Date(run.finishedAt).getTime() : now) - new Date(run.startedAt).getTime();
  const headTone: "ai" | "success" | "warn" =
    run.status === "COMPLETED" ? "success" :
    run.status === "FAILED" || run.status === "CANCELLED" ? "warn" : "ai";

  return (
    <div className="card soft" style={{ display: "grid", gap: 14 }}>
      {/* ---- header ---- */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        {running ? <Spin /> : headTone === "success"
          ? <span style={{ color: "var(--success)" }}><Icon name="check" size={15} stroke={2.2} /></span>
          : <span style={{ color: "var(--warn)" }}><Icon name="flag" size={15} /></span>}
        <AgentTag name="Helix" />
        <span style={{ fontWeight: 600, fontSize: 13.5 }}>
          {running ? "正在论证 · 4 维并行分析" : run.status === "COMPLETED" ? "论证完成" : "论证结束"}
        </span>
        <span className="mono text-xs" style={{ color: "var(--text-3)" }}>{fmtElapsed(overallElapsed)}</span>
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <span className="mono text-xs" style={{ color: "var(--text-3)" }}>
            {doneCount}/{total} 完成{failCount > 0 ? ` · ${failCount} 失败` : ""}
          </span>
          <span className={`tag ${headTone}`}>{run.status}</span>
        </span>
      </div>

      {/* ---- segmented progress bar ---- */}
      <div style={{ display: "flex", gap: 3 }}>
        {dims.map(d => {
          const c = DIM[d.kind].color;
          const bg =
            d.status === "COMPLETED" ? c :
            d.status === "FAILED"    ? "var(--warn)" :
            d.status === "RUNNING"   ? `${c}33` :
            "var(--bg-mute)";
          return (
            <div key={d.kind} title={DIM[d.kind].name}
              style={{ flex: 1, height: 5, borderRadius: 99, background: bg, overflow: "hidden", position: "relative" }}>
              {d.status === "RUNNING" && (
                <div style={{
                  position: "absolute", inset: 0, width: "40%", borderRadius: 99,
                  background: c, animation: "barshine 1.5s linear infinite",
                }} />
              )}
            </div>
          );
        })}
      </div>

      {/* ---- 4 dimension lanes ---- */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(168px, 1fr))", gap: 8 }}>
        {dims.map(d => <Lane key={d.kind} d={d} />)}
      </div>

      {/* ---- detailed event timeline ---- */}
      <div>
        <div className="muted text-xs" style={{ textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6, display: "flex", gap: 6, alignItems: "center" }}>
          <Icon name="list" size={12} /> 论证过程 · 时间线
          <span style={{ marginLeft: "auto", textTransform: "none", letterSpacing: 0 }}>{events.length} 条事件</span>
        </div>
        <div ref={timelineRef}
          style={{
            maxHeight: 230, overflowY: "auto",
            border: "1px solid var(--border)", borderRadius: 8,
            background: "var(--bg)", padding: "8px 10px",
          }}>
          {events.length === 0 ? (
            <div className="muted text-xs" style={{ padding: "6px 0" }}>等待第一条事件…</div>
          ) : (
            events.map(ev => <EventRow key={ev.id} ev={ev} />)
          )}
          {running && events.length > 0 && (
            <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "3px 0", fontSize: 12, color: "var(--text-3)" }}>
              <span className="mono" style={{ width: 58, flexShrink: 0 }} />
              <Spin size={9} /> <span>Helix 持续推理中…</span>
            </div>
          )}
        </div>
      </div>

      {run.error && (
        <div className="muted text-xs" style={{ color: "var(--warn)" }}>
          工作流错误：{run.error}
        </div>
      )}
      <div className="mono text-xs" style={{ color: "var(--text-4)" }}>
        workflow · {workflowId}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------

function Lane({ d }: { d: DimState }) {
  const meta = DIM[d.kind];
  const tone: "ai" | "success" | "warn" | "" =
    d.status === "COMPLETED" ? "success" :
    d.status === "FAILED"    ? "warn" :
    d.status === "RUNNING"   ? "ai" : "";

  return (
    <div style={{
      border: "1px solid var(--border)",
      borderTop: `2px solid ${meta.color}`,
      borderRadius: 8, padding: "9px 10px 10px", background: "var(--bg)",
      display: "grid", gap: 7,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ color: meta.color, display: "flex" }}><Icon name={meta.icon} size={13} /></span>
        <span style={{ fontSize: 12.5, fontWeight: 600, flex: 1 }}>{meta.name}</span>
        <span className={`tag ${tone}`} style={{ fontSize: 10 }}>{d.status}</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, minHeight: 16 }}>
        {d.status === "RUNNING"   && <Spin size={10} />}
        {d.status === "COMPLETED" && <span style={{ color: "var(--success)", display: "flex" }}><Icon name="check" size={11} stroke={2.4} /></span>}
        {d.status === "FAILED"    && <span style={{ color: "var(--warn)", display: "flex" }}><Icon name="x" size={11} stroke={2.4} /></span>}
        {d.status === "PENDING"   && <span style={{ width: 6, height: 6, borderRadius: 99, background: "var(--text-4)" }} />}
        <span style={{ fontSize: 11.5, color: d.status === "FAILED" ? "var(--warn)" : "var(--text-2)", flex: 1, lineHeight: 1.35 }}>
          {d.step}
        </span>
        {d.elapsedMs != null && (
          <span className="mono" style={{ fontSize: 10.5, color: "var(--text-3)", flexShrink: 0 }}>
            {fmtElapsed(d.elapsedMs)}
          </span>
        )}
      </div>

      {d.status === "COMPLETED" && d.result && (
        <div style={{
          fontSize: 11, color: "var(--text-3)", paddingTop: 5,
          borderTop: "1px dashed var(--border)", lineHeight: 1.4,
        }}>
          {resultLine(d.kind, d.result)}
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------

function EventRow({ ev }: { ev: WorkflowEvent }) {
  const isFail = (ev.message ?? "").includes("失败");
  const dim = ev.activity?.startsWith("validate:")
    ? DIM[ev.activity.slice("validate:".length) as ValidationKind]
    : undefined;

  let mark = "·";
  let color = "var(--text-3)";
  if (ev.kind === "workflow_started")        { mark = "◆"; color = "var(--ai)"; }
  else if (ev.kind === "activity_started")   { mark = "▶"; color = dim?.color ?? "var(--ai)"; }
  else if (ev.kind === "activity_completed") { mark = "✓"; color = "var(--success)"; }
  else if (ev.kind === "workflow_completed") { mark = "◆"; color = "var(--success)"; }
  else if (ev.kind === "workflow_failed")    { mark = "✕"; color = "var(--warn)"; }
  if (isFail) { mark = "✕"; color = "var(--warn)"; }

  const tok = ev.payload && typeof ev.payload === "object" ? (ev.payload as TokenPayload) : null;
  const hasTok = tok != null && typeof tok.totalTokens === "number";

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "baseline", padding: "2.5px 0", fontSize: 12 }}>
      <span className="mono" style={{ width: 58, flexShrink: 0, color: "var(--text-4)" }}>{fmtClock(ev.ts)}</span>
      <span style={{ width: 11, flexShrink: 0, textAlign: "center", color }}>{mark}</span>
      {dim && (
        <span title={dim.name} style={{
          width: 6, height: 6, borderRadius: 99, background: dim.color,
          flexShrink: 0, alignSelf: "center",
        }} />
      )}
      <span style={{ color: isFail ? "var(--warn)" : "var(--text-2)", lineHeight: 1.4 }}>
        {ev.message ?? ev.kind}
      </span>
      {hasTok && (
        <span className="mono" style={{ marginLeft: "auto", flexShrink: 0, fontSize: 10.5, color: "var(--text-3)" }}>
          ↑{tok!.promptTokens ?? "—"} ↓{tok!.completionTokens ?? "—"} · {tok!.totalTokens} tok
        </span>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------

function Spin({ size = 12 }: { size?: number }) {
  return (
    <span style={{
      display: "inline-block", flexShrink: 0,
      width: size, height: size,
      border: "2px solid var(--border-strong)",
      borderTopColor: "var(--accent)",
      borderRadius: "50%",
      animation: "spin 0.8s linear infinite",
    }} />
  );
}
