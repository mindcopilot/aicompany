import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import { api } from "../lib/api";
import type { WorkflowRun, WorkflowEvent, WorkflowStatus } from "../types/api";

interface Props {
  workflowId: string;
  /** Called once when the run reaches a terminal status. */
  onTerminal?: (run: WorkflowRun) => void;
  /** Poll interval in ms; clamps to >= 500. */
  intervalMs?: number;
}

const TERMINAL: WorkflowStatus[] = ["COMPLETED", "FAILED", "CANCELLED"];

const ACTIVITY_LABEL: Record<string, string> = {
  loadFounderProfile:     "读取创始人画像",
  gatherMarketSignals:    "聚合市场信号",
  llmGenerateDirections:  "Helix · 推理方向候选",
  upsertDirections:       "写入方向库",
  route:                  "Copilot · 路由意图",
  respond:                "Copilot · 生成回复",
  "child:scanDirections": "触发 Helix 子工作流",
};

function statusTone(s: WorkflowStatus): "ai" | "success" | "warn" {
  if (s === "COMPLETED") return "success";
  if (s === "FAILED" || s === "CANCELLED") return "warn";
  return "ai";
}

export function WorkflowProgress({ workflowId, onTerminal, intervalMs }: Props) {
  const [run, setRun] = useState<WorkflowRun | null>(null);
  const [events, setEvents] = useState<WorkflowEvent[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const calledTerminal = useRef(false);
  const interval = Math.max(500, intervalMs ?? 1200);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    calledTerminal.current = false;

    const tick = async (): Promise<void> => {
      if (stopped) return;
      try {
        const r = await api.workflows.get(workflowId);
        if (stopped) return;
        setRun(r.run);
        setEvents(r.events);
        setErr(null);
        if (TERMINAL.includes(r.run.status) && !calledTerminal.current) {
          calledTerminal.current = true;
          onTerminal?.(r.run);
          return; // stop polling
        }
      } catch (e) {
        if (stopped) return;
        setErr(e instanceof Error ? e.message : String(e));
      }
      timer = setTimeout(tick, interval);
    };
    void tick();

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [workflowId, interval, onTerminal]);

  if (!run && !err) {
    return (
      <div className="card soft" style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
        <Spinner />
        <span className="muted-2">连接工作流 {workflowId.split("::")[0]}…</span>
      </div>
    );
  }
  if (err) {
    return (
      <div className="card" style={{ borderColor: "var(--warn)", fontSize: 13 }}>
        <Icon name="flag" size={14} /> 拉取状态失败：{err}
      </div>
    );
  }
  if (!run) return null;

  const isRunning = !TERMINAL.includes(run.status);
  const tone = statusTone(run.status);
  const currentLabel = run.currentActivity
    ? (ACTIVITY_LABEL[run.currentActivity] ?? run.currentActivity)
    : run.status === "COMPLETED" ? "完成" : run.status;

  // Pull the last 5 events for a mini-timeline
  const tail = events.slice(-5);

  return (
    <div className="card soft" style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {isRunning ? <Spinner /> : tone === "success"
          ? <span style={{ color: "var(--success)" }}><Icon name="check" size={14} stroke={2} /></span>
          : <span style={{ color: "var(--warn)" }}><Icon name="flag" size={14} /></span>}
        <span style={{ fontWeight: 500, fontSize: 13 }}>{currentLabel}</span>
        <span className={`tag ${tone}`} style={{ marginLeft: "auto" }}>{run.status}</span>
      </div>
      {tail.length > 0 && (
        <ul style={{ paddingLeft: 0, listStyle: "none", margin: 0, fontSize: 12, color: "var(--text-3)" }}>
          {tail.map(ev => (
            <li key={ev.id} style={{ display: "flex", gap: 8, padding: "2px 0" }}>
              <span className="mono" style={{ width: 64, color: "var(--text-3)" }}>
                {new Date(ev.ts).toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
              <span>
                {ev.kind === "activity_started" && "▶ "}
                {ev.kind === "activity_completed" && "✓ "}
                {ev.kind === "workflow_started" && "● "}
                {ev.kind === "workflow_completed" && "● "}
                {ev.kind === "workflow_failed" && "× "}
                {(ev.activity && ACTIVITY_LABEL[ev.activity]) ?? ev.activity ?? ev.kind}
                {ev.message ? ` · ${ev.message}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
      {run.error && (
        <div className="muted text-xs" style={{ color: "var(--warn)" }}>
          错误：{run.error}
        </div>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <span
      style={{
        display: "inline-block",
        width: 12, height: 12,
        border: "2px solid var(--text-3)",
        borderTopColor: "var(--accent)",
        borderRadius: "50%",
        animation: "wf-spin 0.9s linear infinite",
      }}
    />
  );
}

// Inject the keyframes once at module load — styled-components/CSS-in-JS isn't
// in this project's toolchain, so a tiny <style> tag is the lightest path.
if (typeof document !== "undefined" && !document.getElementById("wf-spin-keyframes")) {
  const style = document.createElement("style");
  style.id = "wf-spin-keyframes";
  style.textContent = "@keyframes wf-spin { to { transform: rotate(360deg); } }";
  document.head.appendChild(style);
}
