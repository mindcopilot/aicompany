import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "../components/Icon";
import { AgentTag, Profile, SignalCell } from "../components/primitives";
import { CreateForm } from "../components/CreateForm";
import { WorkflowProgress } from "../components/WorkflowProgress";
import { DirectionValidationPanel, ValidationDots } from "../components/DirectionValidationPanel";
import { useAsync } from "../hooks/useApi";
import { useUI } from "../lib/ui";
import { api } from "../lib/api";
import type { MyDirection, TrendingDirection, DirectionValidation, WorkflowRun } from "../types/api";

interface Props {
  /** Hand a validation-passed direction off into 业务线上化. */
  onGotoProduct?: (directionId: string) => void;
}

export function DirectionView({ onGotoProduct }: Props = {}) {
  const { openDrawer, toast } = useUI();
  const { data: mineData, refresh: refreshMine } = useAsync(() => api.myDirections.list(), []);
  const { data: trendingData, refresh: refreshTrendingList } = useAsync(() => api.trendingDirections.list(), []);
  const mine = mineData ?? [];
  const trending = trendingData ?? [];

  const [evalRuns, setEvalRuns] = useState<Record<string, string>>({}); // directionId -> workflowId
  const [refreshWfId, setRefreshWfId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // ---- mutations ----

  const openCreate = useCallback(() => {
    openDrawer({
      eyebrow: "NEW DIRECTION",
      title: "录入一个新方向",
      sub: "随手记一条最近喜欢的创意",
      body: <CreateForm
        fields={[
          { name: "title", label: "方向名", placeholder: "比如：室内设计师 AI 出图工具", required: true },
          { name: "description", label: "一句话描述", type: "textarea", placeholder: "做什么 + 给谁用 + 怎么变现" },
          { name: "tags", label: "标签（逗号分隔）", placeholder: "AI, 设计, SaaS" },
        ]}
        submitLabel="保存"
        onSubmit={async (values) => {
          const tagsRaw = String(values.tags ?? "").trim();
          await api.myDirections.create({
            title: String(values.title ?? "").trim(),
            description: String(values.description ?? "").trim() || undefined,
            tags: tagsRaw ? tagsRaw.split(/[,，]/).map(s => s.trim()).filter(Boolean) : [],
          });
          await refreshMine();
        }}
        successMsg={(v) => `已记下「${v.title}」`}
      />,
    });
  }, [openDrawer, refreshMine]);

  const openEdit = useCallback((d: MyDirection) => {
    openDrawer({
      eyebrow: "EDIT DIRECTION",
      title: "编辑方向",
      sub: d.title,
      body: <CreateForm
        fields={[
          { name: "title", label: "方向名", placeholder: d.title, required: true },
          { name: "description", label: "一句话描述", type: "textarea", placeholder: d.description ?? "" },
          { name: "tags", label: "标签（逗号分隔）", placeholder: d.tags.join(", ") },
        ]}
        submitLabel="保存"
        defaults={{ title: d.title, description: d.description ?? "", tags: d.tags.join(", ") }}
        onSubmit={async (values) => {
          const tagsRaw = String(values.tags ?? "").trim();
          await api.myDirections.update(d.id, {
            title: String(values.title ?? "").trim(),
            description: String(values.description ?? "").trim() || null,
            tags: tagsRaw ? tagsRaw.split(/[,，]/).map(s => s.trim()).filter(Boolean) : [],
          });
          await refreshMine();
        }}
        successMsg={() => "已更新"}
      />,
    });
  }, [openDrawer, refreshMine]);

  const onDelete = useCallback(async (d: MyDirection) => {
    if (!confirm(`删除「${d.title}」？`)) return;
    await api.myDirections.remove(d.id);
    toast(`已删除「${d.title}」`);
    void refreshMine();
  }, [refreshMine, toast]);

  const onEvaluate = useCallback(async (d: MyDirection) => {
    try {
      const { workflowId } = await api.myDirections.evaluate(d.id);
      setEvalRuns(prev => ({ ...prev, [d.id]: workflowId }));
      toast(`Helix 开始评估「${d.title}」`);
    } catch (e) {
      toast(`评分启动失败：${e instanceof Error ? e.message : String(e)}`);
    }
  }, [toast]);

  const onEvalTerminal = useCallback((directionId: string) => (run: WorkflowRun) => {
    setEvalRuns(prev => {
      const { [directionId]: _, ...rest } = prev;
      return rest;
    });
    if (run.status === "COMPLETED") {
      const out = run.output as { score?: number } | null;
      toast(`Helix 评分完成 · ${out?.score ?? "?"} 分`);
      void refreshMine();
    } else {
      toast(`评分 ${run.status}${run.error ? "：" + run.error : ""}`);
    }
  }, [refreshMine, toast]);

  const onRefreshTrending = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const { workflowId } = await api.trendingDirections.refresh();
      setRefreshWfId(workflowId);
      toast("Helix 开始拉热门 · 预计 30-60 秒");
    } catch (e) {
      setRefreshing(false);
      toast(`刷新启动失败：${e instanceof Error ? e.message : String(e)}`);
    }
  }, [refreshing, toast]);

  const onRefreshTerminal = useCallback((run: WorkflowRun) => {
    setRefreshing(false);
    if (run.status === "COMPLETED") {
      const out = run.output as { count?: number } | null;
      toast(`热门已更新 · ${out?.count ?? "?"} 条`);
      void refreshTrendingList();
    } else {
      toast(`刷新 ${run.status}${run.error ? "：" + run.error : ""}`);
    }
  }, [refreshTrendingList, toast]);

  const onAddFromTrending = useCallback(async (t: TrendingDirection) => {
    try {
      await api.myDirections.fromTrending(t.id);
      toast(`已加入「${t.title}」到我的方向库`);
      void refreshMine();
    } catch (e) {
      toast(`加入失败：${e instanceof Error ? e.message : String(e)}`);
    }
  }, [refreshMine, toast]);

  const evaluatedMine = useMemo(() => mine.filter(d => d.evaluation), [mine]);

  return (
    <>
      <div className="module-header">
        <div className="title-wrap">
          <div className="module-eyebrow">01 · DIRECTION</div>
          <h1 className="module-title">方向</h1>
          <div className="module-sub">我的创意库 · 热门探索 · Helix 单条评分与 4 维深度论证 —— 选择与论证都在这一页。</div>
        </div>
        <div className="module-actions">
          <button className="btn primary" onClick={openCreate}>
            <Icon name="plus" size={14} /> 录入新方向
          </button>
        </div>
      </div>

      <div className="module-body">
        {/* ---- Founder profile ---- */}
        <div className="module-section">
          <div className="card soft" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto", gap: 14, alignItems: "center" }}>
            <Profile label="你的标签" value="SaaS · Indie · DX" />
            <Profile label="可投入" value="20 小时 / 周" />
            <Profile label="启动资金" value="¥30,000" />
            <Profile label="风险偏好" value="中等" />
            <button className="btn sm" onClick={() => toast("画像编辑暂未接入持久化")}>
              <Icon name="pen" size={12} /> 编辑画像
            </button>
          </div>
        </div>

        {/* ---- 我的方向 ---- */}
        <div className="module-section">
          <div className="section-head">
            <div className="section-title"><Icon name="target" size={14} /> 我的方向 · {mine.length} 条</div>
            <span className="muted text-xs">{evaluatedMine.length} 条已由 Helix 评分 · 点「深度论证」就地展开 4 维论证</span>
          </div>

          {mine.length === 0 ? (
            <div className="card soft" style={{ padding: 24, textAlign: "center", color: "var(--text-3)" }}>
              还没有方向，点右上「录入新方向」开始记一条。
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {mine.map(d => (
                <MyDirectionCard
                  key={d.id}
                  d={d}
                  evalWorkflowId={evalRuns[d.id]}
                  onEvaluate={() => onEvaluate(d)}
                  onEvalTerminal={onEvalTerminal(d.id)}
                  onEdit={() => openEdit(d)}
                  onDelete={() => onDelete(d)}
                  onGotoProduct={onGotoProduct}
                />
              ))}
            </div>
          )}
        </div>

        {/* ---- 当前热门 ---- */}
        <div className="module-section">
          <div className="section-head">
            <div className="section-title"><Icon name="fire" size={14} /> 当前热门方向 · {trending.length} 条</div>
            <div className="row" style={{ alignItems: "center", gap: 8 }}>
              <span className="muted text-xs">
                {trending[0]?.fetchedAt ? `更新于 ${new Date(trending[0].fetchedAt).toLocaleString()}` : "未拉取"}
              </span>
              <button className="btn sm" onClick={onRefreshTrending} disabled={refreshing}>
                <Icon name="refresh" size={12} /> {refreshing ? "刷新中…" : "刷新热门"}
              </button>
            </div>
          </div>

          {refreshWfId && (
            <div style={{ marginBottom: 12 }}>
              <WorkflowProgress workflowId={refreshWfId} onTerminal={onRefreshTerminal} />
            </div>
          )}

          {trending.length === 0 ? (
            <div className="card soft" style={{ padding: 24, textAlign: "center", color: "var(--text-3)" }}>
              还没拉过热门，点右上「刷新热门」让 Helix 从 GitHub / V2EX / Product Hunt 拉一份。
            </div>
          ) : (
            <div className="grid-3" style={{ gap: 12 }}>
              {trending.map(t => (
                <TrendingCard key={t.id} t={t} onAdd={() => onAddFromTrending(t)} />
              ))}
            </div>
          )}
        </div>

        {/* ---- Quick signals (kept for atmosphere) ---- */}
        <div className="module-section">
          <div className="card">
            <div className="card-title"><AgentTag name="Helix" /> 信号速览</div>
            <div className="grid-2" style={{ gap: 8, marginTop: 12 }}>
              <SignalCell n={`${mine.length}`} l="我的方向（库）" />
              <SignalCell n={`${evaluatedMine.length}`} l="已评分" />
              <SignalCell n={`${trending.length}`} l="热门方向（外部）" />
              <SignalCell n={evaluatedMine[0]?.evaluation?.score ?? "—"} l="最近评分最高" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ============================================================================
// My-direction card — collapsed summary + inline-expandable validation panel.
// Owns its own validation state so the progress dots and the expanded panel
// always agree.
// ============================================================================

function MyDirectionCard({ d, evalWorkflowId, onEvaluate, onEvalTerminal, onEdit, onDelete, onGotoProduct }: {
  d: MyDirection;
  evalWorkflowId: string | undefined;
  onEvaluate: () => void;
  onEvalTerminal: (run: WorkflowRun) => void;
  onEdit: () => void;
  onDelete: () => void;
  onGotoProduct?: (directionId: string) => void;
}) {
  const { toast } = useUI();
  const ev = d.evaluation;

  const [expanded, setExpanded] = useState(false);
  const [validations, setValidations] = useState<DirectionValidation[]>([]);
  const [latestWorkflowId, setLatestWorkflowId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const loadValidations = useCallback(async (): Promise<void> => {
    try {
      setValidations(await api.myDirections.validations(d.id));
    } catch { /* leave dots stale on a transient error */ }
  }, [d.id]);

  useEffect(() => { void loadValidations(); }, [loadValidations]);

  const vStats = useMemo(() => {
    const done = validations.filter(v => v.status === "COMPLETED").length;
    const running = validations.some(v => v.status === "RUNNING" || v.status === "PENDING");
    return { done, running };
  }, [validations]);

  const busy = starting || vStats.running;

  const onStart = useCallback(async (): Promise<void> => {
    setStarting(true);
    setExpanded(true);
    try {
      const { workflowId } = await api.myDirections.validate(d.id);
      setLatestWorkflowId(workflowId);
      toast(`Helix 已启动「${d.title}」4 维深度论证`);
      void loadValidations();
    } catch (e) {
      setStarting(false);
      toast(`论证启动失败：${e instanceof Error ? e.message : String(e)}`);
    }
  }, [d.id, d.title, loadValidations, toast]);

  const onWorkflowTerminal = useCallback((run: WorkflowRun) => {
    setStarting(false);
    if (run.status === "COMPLETED") {
      const out = run.output as { completed?: string[]; failed?: string[] } | null;
      toast(`「${d.title}」论证完成 · ${out?.completed?.length ?? 0} 成功 / ${out?.failed?.length ?? 0} 失败`);
    } else {
      toast(`论证 ${run.status}${run.error ? "：" + run.error : ""}`);
    }
    void loadValidations();
  }, [d.title, loadValidations, toast]);

  return (
    <div className="card" style={{ display: "grid", gap: 10 }}>
      {/* ---- header ---- */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <span className="mono text-xs" style={{ color: "var(--text-3)" }}>
              {d.source.startsWith("from_trending:") ? "来自热门" : "我录入"}
            </span>
            <ValidationDots validations={validations} />
          </div>
          <h4 style={{ fontSize: 14.5, fontWeight: 500, margin: 0 }}>{d.title}</h4>
        </div>
        {ev
          ? <span className="tag accent"><span className="dot" /> {ev.score} 分</span>
          : <span className="tag">未评分</span>}
      </div>

      {d.description && (
        <div style={{ fontSize: 12.5, color: "var(--text-3)" }}>{d.description}</div>
      )}
      {d.tags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {d.tags.map(t => <span key={t} className="tag" style={{ fontSize: 10 }}>{t}</span>)}
        </div>
      )}
      {ev && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
          <Mini l="TAM" v={ev.tam.value} />
          <Mini l="Growth" v={ev.growth.value} />
          <Mini l="竞争" v={ev.competition.value} />
          <Mini l="Fit" v={ev.fit.value} />
        </div>
      )}
      {ev?.why && ev.why.length > 0 && (
        <details style={{ fontSize: 12, color: "var(--text-2)" }}>
          <summary style={{ cursor: "pointer", color: "var(--text-3)" }}>Helix 推理 · {ev.why.length} 条</summary>
          <ol style={{ paddingLeft: 18, marginTop: 6 }}>
            {ev.why.map((w, i) => <li key={i} style={{ marginBottom: 4 }}>{w}</li>)}
          </ol>
        </details>
      )}
      {evalWorkflowId && (
        <WorkflowProgress workflowId={evalWorkflowId} onTerminal={onEvalTerminal} />
      )}

      {/* ---- actions ---- */}
      <div style={{ display: "flex", gap: 6, paddingTop: 8, borderTop: "1px dashed var(--border)", flexWrap: "wrap", alignItems: "center" }}>
        <button className="btn sm" onClick={onEvaluate} disabled={!!evalWorkflowId}>
          <Icon name="sparkle" size={12} /> {ev ? "重新评分" : "让 AI 评分"}
        </button>
        <button
          className={`btn sm ${expanded ? "" : "accent"}`}
          onClick={() => setExpanded(x => !x)}
          title="市场 / 竞品 / 可行性 / 用户 4 维深度论证"
        >
          <Icon name={expanded ? "chevD" : "chevR"} size={12} />
          {expanded ? "收起论证" : validations.length > 0 ? `查看论证 · ${vStats.done}/4` : "深度论证"}
        </button>
        {busy && !expanded && (
          <span className="tag ai" style={{ fontSize: 10 }}><span className="dot" /> 论证中</span>
        )}
        <div style={{ flex: 1 }} />
        <button className="btn sm ghost" onClick={onEdit}><Icon name="pen" size={12} /></button>
        <button className="btn sm ghost" onClick={onDelete} style={{ color: "var(--warn)" }}>
          <Icon name="x" size={12} />
        </button>
      </div>

      {/* ---- inline validation workspace ---- */}
      {expanded && (
        <DirectionValidationPanel
          direction={d}
          validations={validations}
          workflowId={latestWorkflowId}
          busy={busy}
          onStart={onStart}
          onReloadValidations={loadValidations}
          onWorkflowTerminal={onWorkflowTerminal}
          onGotoProduct={onGotoProduct}
        />
      )}
    </div>
  );
}

function TrendingCard({ t, onAdd }: { t: TrendingDirection; onAdd: () => void }) {
  const evidence = useMemo(() => {
    const m = t.meta as { evidence?: string[]; sources?: string[] } | null;
    return m?.evidence ?? [];
  }, [t.meta]);
  const sources = useMemo(() => {
    const m = t.meta as { sources?: string[] } | null;
    return m?.sources ?? t.source.split(",").map(s => s.trim()).filter(Boolean);
  }, [t.meta, t.source]);
  return (
    <div className="module-card" style={{ display: "grid", gap: 10 }}>
      <div className="top">
        <span className="mono text-xs" style={{ color: "var(--text-3)" }}>{t.id}</span>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {sources.slice(0, 3).map(s => (
            <span key={s} className="tag" style={{ fontSize: 10 }}>{s}</span>
          ))}
        </div>
      </div>
      <h4 style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>{t.title}</h4>
      {t.description && (
        <div className="desc" style={{ fontSize: 12.5, color: "var(--text-3)", minHeight: 32 }}>{t.description}</div>
      )}
      {evidence.length > 0 && (
        <details style={{ fontSize: 12, color: "var(--text-2)" }}>
          <summary style={{ cursor: "pointer", color: "var(--text-3)" }}>证据 · {evidence.length} 条</summary>
          <ul style={{ paddingLeft: 18, marginTop: 6, listStyle: "disc" }}>
            {evidence.map((e, i) => <li key={i} style={{ marginBottom: 4 }}>{e}</li>)}
          </ul>
        </details>
      )}
      <div style={{ display: "flex", gap: 6, paddingTop: 6, borderTop: "1px dashed var(--border)" }}>
        <button className="btn sm primary" onClick={onAdd} style={{ flex: 1 }}>
          <Icon name="plus" size={12} /> 加入我的方向
        </button>
      </div>
    </div>
  );
}

function Mini({ l, v }: { l: string; v: string }) {
  return (
    <div>
      <div className="muted text-xs mono" style={{ fontSize: 10 }}>{l.toUpperCase()}</div>
      <div className="mono text-sm" style={{ marginTop: 2 }}>{v}</div>
    </div>
  );
}
