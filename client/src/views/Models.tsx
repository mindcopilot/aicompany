import { useMemo, useState } from "react";
import { Icon } from "../components/Icon";
import { SignalCell } from "../components/primitives";
import { CreateForm } from "../components/CreateForm";
import { useUI } from "../lib/ui";
import { useAsync } from "../hooks/useApi";
import { api } from "../lib/api";
import type { ManagedModel, ManagedModelCategory } from "../types/api";

type Category = ManagedModelCategory;

const CATS: { id: Category | "all"; name: string; icon: string }[] = [
  { id: "all",   name: "全部",        icon: "grid" },
  { id: "text",  name: "对话 · 文本", icon: "msg" },
  { id: "image", name: "图像",        icon: "image" },
  { id: "video", name: "视频",        icon: "film" },
  { id: "audio", name: "音频 · 语音", icon: "mic" },
  { id: "embed", name: "向量 · 工具", icon: "link" },
];

const CAT_LABEL: Record<Category, string> = {
  text: "对话", image: "图像", video: "视频", audio: "音频", embed: "向量",
};

const VENDORS: { name: string; color: string; status: "connected" | "error" | "off"; key: string; note: string }[] = [
  { name: "Anthropic",   color: "#d97706", status: "connected", key: "sk-ant-····a7F2", note: "主力对话模型供应商" },
  { name: "OpenAI",      color: "#10a37f", status: "connected", key: "sk-····9Kd1",     note: "文本 / 图像 / 视频 / 语音" },
  { name: "Google",      color: "#1a73e8", status: "connected", key: "AIza····Qm3",     note: "Gemini + Veo" },
  { name: "DeepSeek",    color: "#4d6bfe", status: "connected", key: "sk-····2bX9",     note: "高性价比中文模型" },
  { name: "阿里云百炼",  color: "#ff6a00", status: "connected", key: "sk-····Lm8K",     note: "Qwen + CosyVoice" },
  { name: "ElevenLabs",  color: "#0a0a0a", status: "connected", key: "el-····7Tqz",     note: "语音合成与克隆" },
  { name: "xAI",         color: "#475569", status: "error",     key: "xai-····(失效)",  note: "密钥已过期，需重新连接" },
  { name: "快手可灵",    color: "#ff5722", status: "off",        key: "—",               note: "尚未接入" },
];

const ROUTING: { task: string; model: string; fallback: string }[] = [
  { task: "深度推理 · 复杂规划", model: "Claude Opus 4.7",  fallback: "GPT-5" },
  { task: "日常写作 · 长文",     model: "Claude Sonnet 4.6", fallback: "Qwen3-Max" },
  { task: "选题 · 爆款钩子",     model: "GPT-5",             fallback: "Claude Sonnet 4.6" },
  { task: "数据分析 · 表格",     model: "Gemini 2.5 Pro",    fallback: "DeepSeek-V3.2" },
  { task: "短视频生成",          model: "Sora 2",            fallback: "Kling 2.0" },
  { task: "长视频 · 课程录制",   model: "Veo 3",             fallback: "Sora 2" },
  { task: "配音 · 音色克隆",     model: "ElevenLabs v3",     fallback: "CosyVoice 2" },
  { task: "字幕 · 转写",         model: "Whisper Large v3",  fallback: "—" },
  { task: "品牌图 · 海报",       model: "Recraft v3",        fallback: "FLUX1.1 Pro" },
  { task: "知识库检索",          model: "Voyage-3",          fallback: "text-embedding-3-large" },
];

export function ModelsView() {
  const { openDrawer, toast } = useUI();
  const { data, refresh } = useAsync(() => api.managedModels(), []);
  const models = useMemo(() => data ?? [], [data]);
  const [cat, setCat] = useState<Category | "all">("all");
  const [status, setStatus] = useState<"全部" | "启用中" | "已停用">("全部");

  const toggle = async (id: string): Promise<void> => {
    const m = models.find(x => x.id === id);
    if (!m) return;
    try {
      await api.managedModelToggle(id, !m.enabled);
      toast(m.enabled ? `已停用 ${m.name}` : `已启用 ${m.name}`, m.enabled ? "warn" : "ok");
      await refresh();
    } catch (e) {
      toast(`切换失败：${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const shown = useMemo(() => models.filter(m =>
    (cat === "all" || m.category === cat) &&
    (status === "全部" || (status === "启用中" ? m.enabled : !m.enabled))
  ), [models, cat, status]);

  const enabledCount = models.filter(m => m.enabled).length;
  const totalCalls = models.reduce((s, m) => s + m.calls, 0);
  const totalSpend = models.reduce((s, m) => s + m.spend, 0);

  return (
    <>
      <div className="module-header">
        <div className="title-wrap">
          <div className="module-eyebrow">10 · MODEL REGISTRY</div>
          <h1 className="module-title">模型管理</h1>
          <div className="module-sub">统一接入主流大模型与音视频模型 · 按任务智能路由 · 成本与可用性可观测。</div>
        </div>
        <div className="module-actions">
          <button className="btn" onClick={() => toast("用量报表已生成 · 含各模型调用量与成本明细")}>
            <Icon name="bar" size={14} /> 用量报表
          </button>
          <button className="btn primary" onClick={() => openDrawer({
            eyebrow: "NEW MODEL", title: "接入新模型", sub: "把一个新模型加入注册表",
            body: <CreateForm
              intro="填写模型信息并配置 API Key 后，即可在路由策略中调用。"
              fields={[
                { name: "name", label: "模型名称", placeholder: "例如：Claude Haiku 4.6" },
                { name: "vendor", label: "供应商", placeholder: "例如：Anthropic" },
                { name: "category", label: "能力类别", type: "select", options: ["对话 · 文本", "图像", "视频", "音频 · 语音", "向量 · 工具"] },
                { name: "key", label: "API Key", placeholder: "sk-····" },
              ]}
              submitLabel="接入模型"
              successMsg={v => `已接入模型「${v.name}」· 默认为停用状态`}
              onSubmit={async v => {
                await api.managedModelCreate({
                  name: v.name!,
                  vendor: v.vendor?.trim() || "未知",
                  category: v.category ?? "对话 · 文本",
                });
                await refresh();
              }}
            />,
          })}><Icon name="plus" size={14} /> 接入新模型</button>
        </div>
      </div>

      <div className="module-body">
        <div className="grid-4" style={{ marginBottom: 16 }}>
          <SignalCell n={models.length} l="已接入模型" />
          <SignalCell n={`${enabledCount} / ${models.length}`} l="启用中" />
          <SignalCell n={totalCalls.toLocaleString()} l="本月调用" />
          <SignalCell n={`¥${totalSpend.toLocaleString()}`} l="本月成本" />
        </div>

        <div className="module-section">
          <div className="tabs">
            {CATS.map(c => {
              const n = c.id === "all" ? models.length : models.filter(m => m.category === c.id).length;
              return (
                <button key={c.id} className={`tab ${cat === c.id ? "active" : ""}`} onClick={() => setCat(c.id)}>
                  <Icon name={c.icon} size={12} /> {c.name}<span className="count">{n}</span>
                </button>
              );
            })}
          </div>

          <div className="section-head" style={{ marginTop: 14 }}>
            <div className="section-title">模型注册表 · {shown.length} 个</div>
            <div className="seg">
              {(["全部", "启用中", "已停用"] as const).map(s => (
                <button key={s} className={status === s ? "active" : ""} onClick={() => setStatus(s)}>{s}</button>
              ))}
            </div>
          </div>

          {shown.length === 0
            ? <div className="muted text-sm" style={{ padding: "20px 4px" }}>没有符合条件的模型。</div>
            : (
              <div className="mm-grid">
                {shown.map(m => (
                  <ModelCard key={m.id} m={m} onToggle={() => toggle(m.id)} onOpen={() => openDrawer({
                    eyebrow: `${m.vendor.toUpperCase()} · ${CAT_LABEL[m.category]}`,
                    title: m.name,
                    sub: m.modality,
                    body: <ModelDrawer m={m} onToggle={() => toggle(m.id)} />,
                  })} />
                ))}
              </div>
            )}
        </div>

        <div className="module-section grid-2" style={{ gap: 12 }}>
          <div className="card">
            <div className="card-head">
              <div className="card-title"><Icon name="link" size={14} /> 厂商连接</div>
              <span className="muted text-xs">{VENDORS.filter(v => v.status === "connected").length} / {VENDORS.length} 已连接</span>
            </div>
            <div className="mt-12" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {VENDORS.map(v => (
                <div key={v.name} className="vendor-row">
                  <span className="mm-dot" style={{ background: v.color }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{v.name}</div>
                    <div className="muted text-xs">{v.note}</div>
                  </div>
                  <span className="mono text-xs muted" style={{ marginRight: 4 }}>{v.key}</span>
                  {v.status === "connected" && <span className="tag success"><span className="dot" /> 已连接</span>}
                  {v.status === "error" && (
                    <button className="btn sm" onClick={() => toast(`正在重新连接 ${v.name}`)}>重新连接</button>
                  )}
                  {v.status === "off" && (
                    <button className="btn sm" onClick={() => toast(`已发起接入：${v.name}`)}>接入</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <div className="card-title"><Icon name="git" size={14} /> 智能路由策略</div>
              <span className="tag ai"><span className="dot" /> 自动选优</span>
            </div>
            <div className="muted text-xs mt-8">每类任务自动路由到最优模型，失败时回退到备选。</div>
            <div className="mt-12" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {ROUTING.map(r => (
                <div key={r.task} className="route-row">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13 }}>{r.task}</div>
                    <div className="muted text-xs">备选 · {r.fallback}</div>
                  </div>
                  <span className="tag mono">{r.model}</span>
                  <button className="btn sm ghost" onClick={() => toast(`正在调整「${r.task}」的路由策略`)}>调整</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Switch({ on, onClick }: { on: boolean; onClick: (e: React.MouseEvent) => void }) {
  return (
    <button className={`switch ${on ? "on" : ""}`} onClick={onClick}
      role="switch" aria-checked={on} aria-label={on ? "停用" : "启用"}>
      <span className="knob" />
    </button>
  );
}

function ModelCard({ m, onToggle, onOpen }: { m: ManagedModel; onToggle: () => void; onOpen: () => void }) {
  return (
    <div className={`mm-card ${m.enabled ? "" : "off"}`} onClick={onOpen}>
      <div className="mm-card-top">
        <span className="mm-dot" style={{ background: m.color }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="mm-name">{m.name}</div>
          <div className="muted text-xs">{m.vendor} · {m.modality}</div>
        </div>
        <Switch on={m.enabled} onClick={e => { e.stopPropagation(); onToggle(); }} />
      </div>

      <div className="mm-strength">{m.strengths}</div>

      <div className="mm-tags">
        {m.tags.map(t => <span key={t} className="tag">{t}</span>)}
      </div>

      <div className="mm-meta">
        <div><span className="muted text-xs mono">上下文</span><div className="mono mm-meta-v">{m.context}</div></div>
        <div><span className="muted text-xs mono">定价</span><div className="mono mm-meta-v">{m.pricing}</div></div>
        <div><span className="muted text-xs mono">延迟</span><div className="mono mm-meta-v">{m.latency}</div></div>
      </div>

      <div className="mm-foot">
        <div className="rating-pill" style={{ width: 96 }}>
          <div className="rating-bar"><div className="rating-fill" style={{ width: `${m.rating}%` }} /></div>
          <span className="mono text-xs">{m.rating}</span>
        </div>
        <span className="mono muted text-xs">{m.calls.toLocaleString()} 次 / 月</span>
        {m.defaultFor && <span className="tag accent" style={{ marginLeft: "auto" }}><Icon name="star" size={9} /> 默认</span>}
      </div>
    </div>
  );
}

function ModelDrawer({ m, onToggle }: { m: ManagedModel; onToggle: () => void }) {
  const { toast } = useUI();
  return (
    <div>
      <div className="grid-2" style={{ gap: 8 }}>
        <SignalCell n={m.rating} l="能力评分" />
        <SignalCell n={m.latency} l="平均延迟" />
        <SignalCell n={m.calls.toLocaleString()} l="本月调用" />
        <SignalCell n={`¥${m.spend.toLocaleString()}`} l="本月成本" />
      </div>

      <div className="mt-16">
        <div className="muted text-xs mono" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>规格</div>
        <div className="card soft mt-8" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <SpecRow l="供应商" v={m.vendor} />
          <SpecRow l="能力类别" v={CAT_LABEL[m.category]} />
          <SpecRow l="输入 / 输出" v={m.modality} />
          <SpecRow l="上下文窗口" v={m.context} />
          <SpecRow l="定价" v={m.pricing} />
          <SpecRow l="状态" v={m.enabled ? "启用中" : "已停用"} />
        </div>
      </div>

      <div className="mt-16">
        <div className="muted text-xs mono" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>擅长</div>
        <div className="mt-8" style={{ fontSize: 13, color: "var(--text-2)" }}>{m.strengths}</div>
        <div className="tag-cloud mt-8">{m.tags.map(t => <span key={t} className="tag">{t}</span>)}</div>
      </div>

      {m.defaultFor && (
        <div className="card soft mt-16" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name="star" size={13} />
          <span style={{ fontSize: 13 }}>当前为「{m.defaultFor}」的默认模型</span>
        </div>
      )}

      <div className="mt-16" style={{ display: "flex", gap: 8 }}>
        <button className="btn" onClick={() => toast(`正在测试 ${m.name} 的连通性…`)}>
          <Icon name="activity" size={12} /> 测试连通性
        </button>
        <button className="btn" onClick={() => toast(`已将 ${m.name} 设为路由默认`)}>
          <Icon name="git" size={12} /> 设为路由默认
        </button>
        <button className={`btn ${m.enabled ? "ghost" : "primary"}`} style={{ marginLeft: "auto" }} onClick={onToggle}>
          <Icon name={m.enabled ? "pause" : "check"} size={12} /> {m.enabled ? "停用" : "启用"}
        </button>
      </div>
    </div>
  );
}

function SpecRow({ l, v }: { l: string; v: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <span className="muted text-xs">{l}</span>
      <span style={{ fontSize: 13, fontWeight: 500 }}>{v}</span>
    </div>
  );
}
