import type { CSSProperties, ReactNode } from "react";
import { Icon } from "./Icon";
import { Sparkline } from "./Charts";
import type { AgentName } from "../types/api";

const AGENT_COLOR: Record<string, string> = {
  Atlas: "#4f46e5",
  Nova:  "#0891b2",
  Helix: "#9333ea",
  Aria:  "#16a34a",
};

export function AgentTag({ name, action }: { name: string; action?: string }) {
  const color = AGENT_COLOR[name] ?? "#6d5cf7";
  return (
    <span className="tag ai" style={{ background: `${color}1a`, color }}>
      <span className="dot" /> {name}{action && ` · ${action}`}
    </span>
  );
}

export function SignalCell({ n, l }: { n: ReactNode; l: ReactNode }) {
  return (
    <div style={{ padding: "10px 12px", background: "var(--bg-soft)", borderRadius: 8 }}>
      <div className="mono" style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em" }}>{n}</div>
      <div className="muted text-xs" style={{ marginTop: 2 }}>{l}</div>
    </div>
  );
}

export interface KpiProps {
  label: string;
  value: string;
  delta: string;
  down?: boolean;
  data: number[];
  accent?: boolean;
}
export function KPI({ label, value, delta, down, data, accent }: KpiProps) {
  return (
    <div className="kpi">
      <div className="kpi-label">
        {accent && <span className="dot" />}
        {label}
      </div>
      <div className="kpi-value">{value}</div>
      <div className={`kpi-delta ${down ? "down" : ""}`}>
        <Icon name={down ? "arrowDown" : "arrowUp"} size={11} stroke={2} /> {delta}
      </div>
      <div className="kpi-spark">
        <Sparkline data={data} w={160} h={28} color={accent ? "var(--accent)" : (down ? "var(--danger)" : "var(--text)")} />
      </div>
    </div>
  );
}

export function Profile({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="muted text-xs mono" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
      <div style={{ marginTop: 4, fontSize: 14, fontWeight: 500 }}>{value}</div>
    </div>
  );
}

export const th: CSSProperties = { textAlign: "left", padding: "10px 14px", fontWeight: 500 };
export const td: CSSProperties = { padding: "12px 14px", fontSize: 13, verticalAlign: "middle" };

export type AgentNameOrString = AgentName | string;
