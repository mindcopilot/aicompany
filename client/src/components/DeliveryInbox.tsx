// 待实施工单收件箱 — shown at the top of 内容工厂 / 流量分发.
//
// These tickets are produced by the 业务线上化 design workflow and handed to the
// execution module that matches their `target`. The founder advances each
// through pending → in_progress → done as it gets implemented.

import { useCallback } from "react";
import { Icon } from "./Icon";
import { useAsync } from "../hooks/useApi";
import { useUI } from "../lib/ui";
import { api } from "../lib/api";
import type { DeliveryTicket, DeliveryTarget, DeliveryStatus } from "../types/api";

const NEXT: Record<DeliveryStatus, DeliveryStatus | null> = {
  pending: "in_progress",
  in_progress: "done",
  done: null,
};
const STATUS_LABEL: Record<DeliveryStatus, string> = {
  pending: "待实施", in_progress: "实施中", done: "已完成",
};
const STATUS_TONE: Record<DeliveryStatus, string> = {
  pending: "", in_progress: "ai", done: "success",
};
const ACTION_LABEL: Record<DeliveryStatus, string> = {
  pending: "开始实施", in_progress: "标记完成", done: "",
};
const SOURCE_LABEL = {
  operations: "运营体系设计",
  traffic: "流量获取设计",
} as const;

export function DeliveryInbox({ target }: { target: DeliveryTarget }) {
  const { toast } = useUI();
  const { data, refresh } = useAsync(() => api.deliveryTickets.list(target), [target]);
  const tickets = data ?? [];

  const advance = useCallback(async (t: DeliveryTicket): Promise<void> => {
    const next = NEXT[t.status];
    if (!next) return;
    try {
      await api.deliveryTickets.update(t.id, next);
      toast(`「${t.title}」· ${STATUS_LABEL[next]}`);
      await refresh();
    } catch (e) {
      toast(`更新失败：${e instanceof Error ? e.message : String(e)}`);
    }
  }, [refresh, toast]);

  // Stay invisible until 业务线上化 has actually delivered something here.
  if (tickets.length === 0) return null;

  const open = tickets.filter(t => t.status !== "done").length;

  return (
    <div className="module-section">
      <div className="section-head">
        <div className="section-title">
          <Icon name="send" size={14} /> 待实施 · 来自业务线上化 · {tickets.length} 张
        </div>
        <span className="muted text-xs">{open} 张待跟进 · 由 Helix 的线上化设计交付</span>
      </div>
      <div className="card" style={{ display: "grid", gap: 6 }}>
        {tickets.map(t => {
          const next = NEXT[t.status];
          const done = t.status === "done";
          return (
            <div key={t.id} style={{
              display: "flex", gap: 10, alignItems: "flex-start",
              padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 8,
              background: done ? "var(--bg-soft)" : "var(--bg)",
            }}>
              <span className={`tag ${STATUS_TONE[t.status]}`} style={{ whiteSpace: "nowrap" }}>
                {t.status === "in_progress" && <span className="dot" />}
                {STATUS_LABEL[t.status]}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13, fontWeight: 500,
                  color: done ? "var(--text-3)" : "var(--text)",
                  textDecoration: done ? "line-through" : "none",
                }}>
                  {t.title}
                </div>
                {t.detail && (
                  <div className="muted text-xs" style={{ marginTop: 2, lineHeight: 1.5 }}>{t.detail}</div>
                )}
                <div className="mono" style={{ fontSize: 10, color: "var(--text-4)", marginTop: 4 }}>
                  来自 · {SOURCE_LABEL[t.sourceKind]}
                </div>
              </div>
              {next && (
                <button className={`btn sm ${t.status === "pending" ? "primary" : ""}`} onClick={() => advance(t)}>
                  {ACTION_LABEL[t.status]}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
