import { useMemo, useState } from "react";
import { Icon } from "../components/Icon";
import { SignalCell } from "../components/primitives";
import { useAsync } from "../hooks/useApi";
import { useUI } from "../lib/ui";
import { api } from "../lib/api";
import type { WorkflowRun, WorkflowStatus, WorkflowEvent } from "../types/api";

const STATUS_META: Record<WorkflowStatus, { label: string; cls: string }> = {
  PENDING:   { label: "排队中", cls: "" },
  RUNNING:   { label: "运行中", cls: "warn" },
  COMPLETED: { label: "已完成", cls: "success" },
  FAILED:    { label: "失败",   cls: "danger" },
  CANCELLED: { label: "已取消", cls: "" },
};

const TYPE_LABEL: Record<string, string> = {
  scanDirections:    "方向扫描",
  copilotTurn:       "Copilot 对话",
  evaluateDirection: "方向评估",
  validateDirection: "方向论证",
  designBusiness:    "业务设计",
  refreshTrending:   "热点刷新",
};

const FILTERS: Array<{ id: WorkflowStatus | "all"; name: string }> = [
  { id: "all", name: "全部" },
  { id: "RUNNING", name: "运行中" },
  { id: "COMPLETED", name: "已完成" },
  { id: "FAILED", name: "失败" },
  { id: "PENDING", name: "排队中" },
];

function fmtTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 60_000) return "刚刚";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`;
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function fmtDuration(startIso: string, endIso: string | null): string {
  const start = new Date(startIso).getTime();
  const end = endIso ? new Date(endIso).getTime() : Date.now();
  const s = Math.max(0, Math.round((end - start) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}

const typeName = (t: string): string => TYPE_LABEL[t] ?? t;

export function RunsView() {
  const { openDrawer } = useUI();
  const { data, refresh, loading } = useAsync(() => api.workflowRuns.list(), []);
  const all = useMemo(() => data ?? [], [data]);
  const [filter, setFilter] = useState<WorkflowStatus | "all">("all");

  const runs = all.filter(r => filter === "all" || r.status === filter);
  const count = (s: WorkflowStatus): number => all.filter(r => r.status === s).length;

  return (
    <>
      <div className="module-header">
        <div className="title-wrap">
          <div className="module-eyebrow">10 · RUN OBSERVABILITY</div>
          <h1 className="module-title">运行记录</h1>
          <div className="module-sub">每一次 Agent 工作流的执行轨迹 — 状态、耗时、活动事件，全程可追溯。</div>
        </div>
        <div className="module-actions">
          <span className="tag"><span className="dot" /> {all.length} 条记录</span>
          <button className="btn" onClick={() => void refresh()}><Icon name="refresh" size={14} /> 刷新</button>
        </div>
      </div>

      <div className="module-body">
        <div className="grid-4" style={{ marginBottom: 16 }}>
          <SignalCell n={String(all.length)} l="总运行数" />
          <SignalCell n={String(count("RUNNING") + count("PENDING"))} l="进行中" />
          <SignalCell n={String(count("COMPLETED"))} l="已完成" />
          <SignalCell n={String(count("FAILED"))} l="失败" />
        </div>

        <div className="tabs">
          {FILTERS.map(f => (
            <button key={f.id} className={`tab ${filter === f.id ? "active" : ""}`} onClick={() => setFilter(f.id)}>
              {f.name}<span className="count">{f.id === "all" ? all.length : count(f.id)}</span>
            </button>
          ))}
        </div>

        {runs.length === 0 ? (
          <div className="card soft" style={{ textAlign: "center", padding: "48px 24px", marginTop: 16 }}>
            <Icon name="activity" size={28} stroke={1.5} />
            <div style={{ fontWeight: 500, marginTop: 12 }}>
              {loading ? "加载中…" : all.length === 0 ? "暂无运行记录" : "该筛选下没有记录"}
            </div>
            <div className="muted text-xs mt-8">
              当 Agent 工作流（方向扫描、论证、业务设计等）被触发时，运行轨迹会自动出现在这里。
            </div>
          </div>
        ) : (
          <div className="wf-list" style={{ marginTop: 16 }}>
            {runs.map(r => (
              <div key={r.id} className="wf-row" style={{ gridTemplateColumns: "92px 1fr 168px" }}
                onClick={() => openDrawer({
                eyebrow: `RUN · ${typeName(r.workflowType)}`,
                title: r.workflowType,
                sub: r.currentActivity ?? r.status,
                body: <RunDrawer run={r} />,
              })}>
                <div>
                  <span className={`tag ${STATUS_META[r.status].cls}`}>
                    <span className="dot" />{STATUS_META[r.status].label}
                  </span>
                </div>
                <div>
                  <div className="wf-name">{typeName(r.workflowType)}</div>
                  <div className="wf-trigger">
                    <span className="tag mono">{r.trigger ?? "—"}</span>
                    <span className="muted">{r.currentActivity ?? (r.error ? `错误：${r.error}` : "—")}</span>
                  </div>
                </div>
                <div className="wf-stats">
                  <div><b className="mono">{fmtDuration(r.startedAt, r.finishedAt)}</b><span className="muted text-xs">耗时</span></div>
                  <div className="muted text-xs mono">{fmtTime(r.startedAt)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function RunDrawer({ run }: { run: WorkflowRun }) {
  const { data } = useAsync(() => api.workflowRuns.get(run.id), [run.id]);
  const events: WorkflowEvent[] = data?.events ?? [];
  const detail = data?.run ?? run;

  return (
    <div>
      <div className="grid-3" style={{ gap: 8 }}>
        <SignalCell n={STATUS_META[detail.status].label} l="状态" />
        <SignalCell n={fmtDuration(detail.startedAt, detail.finishedAt)} l="耗时" />
        <SignalCell n={String(events.length)} l="事件数" />
      </div>

      <div className="mt-16">
        <div className="muted text-xs mono" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>基本信息</div>
        <pre className="prompt-preview" style={{ marginTop: 8 }}>{[
          `workflowId : ${detail.id}`,
          `type       : ${detail.workflowType}`,
          `trigger    : ${detail.trigger ?? "—"}`,
          `started    : ${new Date(detail.startedAt).toLocaleString()}`,
          `finished   : ${detail.finishedAt ? new Date(detail.finishedAt).toLocaleString() : "—"}`,
        ].join("\n")}</pre>
      </div>

      {detail.error && (
        <div className="mt-16">
          <div className="muted text-xs mono" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>错误</div>
          <pre className="prompt-preview" style={{ marginTop: 8, color: "var(--danger)" }}>{detail.error}</pre>
        </div>
      )}

      <div className="mt-16">
        <div className="muted text-xs mono" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>事件时间线</div>
        {events.length === 0 ? (
          <div className="muted text-xs mt-8">暂无事件记录。</div>
        ) : (
          <div className="version-feed mt-8">
            {events.map(ev => (
              <div key={ev.id} className="version-row">
                <span className="mono tag">{ev.kind}</span>
                <span style={{ fontSize: 12 }}>{ev.activity ?? ev.message ?? "—"}</span>
                <span className="muted mono" style={{ marginLeft: "auto", fontSize: 11 }}>{fmtTime(ev.ts)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {detail.output != null && (
        <div className="mt-16">
          <div className="muted text-xs mono" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>输出</div>
          <pre className="prompt-preview" style={{ marginTop: 8, maxHeight: 240 }}>{JSON.stringify(detail.output, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
