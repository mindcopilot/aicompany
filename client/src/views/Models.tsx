import { useMemo, useState } from "react";
import { Icon } from "../components/Icon";
import { SignalCell } from "../components/primitives";
import { CreateForm } from "../components/CreateForm";
import { useUI } from "../lib/ui";

type Category = "text" | "image" | "video" | "audio" | "embed";

interface ManagedModel {
  id: string;
  name: string;
  vendor: string;
  category: Category;
  modality: string;
  context: string;
  pricing: string;
  rating: number;
  latency: string;
  calls: number;
  spend: number;
  strengths: string;
  tags: string[];
  enabled: boolean;
  defaultFor?: string;
  color: string;
}

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

const SEED: ManagedModel[] = [
  // ── 对话 · 文本 ──────────────────────────────────────────────
  { id: "claude-opus-4.7", name: "Claude Opus 4.7", vendor: "Anthropic", category: "text",
    modality: "文本 → 文本 · 多模态", context: "200K", pricing: "¥0.11 / 1k tok", rating: 99, latency: "2.4s",
    calls: 412, spend: 286, strengths: "旗舰级推理、超长任务规划与 Agent 执行",
    tags: ["深度推理", "Agent", "代码"], enabled: true, defaultFor: "深度推理 · 复杂规划", color: "#d97706" },
  { id: "claude-sonnet-4.6", name: "Claude Sonnet 4.6", vendor: "Anthropic", category: "text",
    modality: "文本 → 文本 · 多模态", context: "200K", pricing: "¥0.018 / 1k tok", rating: 97, latency: "1.1s",
    calls: 1840, spend: 612, strengths: "日常主力、品牌 voice 稳定、长文可拆段",
    tags: ["长文", "笔记", "审校"], enabled: true, defaultFor: "日常写作 · 长文", color: "#d97706" },
  { id: "gpt-5", name: "GPT-5", vendor: "OpenAI", category: "text",
    modality: "文本 → 文本 · 多模态", context: "256K", pricing: "¥0.022 / 1k tok", rating: 95, latency: "1.3s",
    calls: 188, spend: 142, strengths: "灵感发散、爆款命中率高、结构化输出稳定",
    tags: ["选题", "创意", "结构化"], enabled: true, defaultFor: "选题 · 爆款钩子", color: "#10a37f" },
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", vendor: "Google", category: "text",
    modality: "文本 → 文本 · 多模态", context: "1M", pricing: "¥0.012 / 1k tok", rating: 92, latency: "1.6s",
    calls: 54, spend: 38, strengths: "超长上下文、表格解析、原生多模态",
    tags: ["长上下文", "数据分析", "多模态"], enabled: true, defaultFor: "数据分析 · 表格", color: "#1a73e8" },
  { id: "deepseek-v3.2", name: "DeepSeek-V3.2", vendor: "DeepSeek", category: "text",
    modality: "文本 → 文本", context: "128K", pricing: "¥0.002 / 1k tok", rating: 90, latency: "1.4s",
    calls: 96, spend: 4, strengths: "高性价比、中文表现强、推理稳定",
    tags: ["高性价比", "中文", "推理"], enabled: true, color: "#4d6bfe" },
  { id: "qwen3-max", name: "Qwen3-Max", vendor: "阿里云", category: "text",
    modality: "文本 → 文本 · 多模态", context: "256K", pricing: "¥0.004 / 1k tok", rating: 89, latency: "1.2s",
    calls: 73, spend: 3, strengths: "中文综合能力强、工具调用稳定",
    tags: ["中文", "工具调用"], enabled: true, color: "#ff6a00" },
  { id: "kimi-k2", name: "Kimi K2", vendor: "Moonshot", category: "text",
    modality: "文本 → 文本", context: "256K", pricing: "¥0.005 / 1k tok", rating: 87, latency: "1.5s",
    calls: 0, spend: 0, strengths: "超长文检索、资料整理见长",
    tags: ["长文检索", "资料整理"], enabled: false, color: "#6d5cf7" },
  { id: "grok-4", name: "Grok 4", vendor: "xAI", category: "text",
    modality: "文本 → 文本", context: "256K", pricing: "¥0.020 / 1k tok", rating: 88, latency: "1.7s",
    calls: 0, spend: 0, strengths: "实时信息接入、擅长时效性话题",
    tags: ["实时信息", "话题"], enabled: false, color: "#0a0a0a" },
  // ── 图像 ────────────────────────────────────────────────────
  { id: "recraft-v3", name: "Recraft v3", vendor: "Recraft", category: "image",
    modality: "文本 → 图像", context: "—", pricing: "¥0.40 / 张", rating: 89, latency: "8s",
    calls: 96, spend: 38, strengths: "品牌风格一致、矢量与调色板可控",
    tags: ["品牌图", "矢量", "海报"], enabled: true, defaultFor: "品牌图 · 海报", color: "#ec4899" },
  { id: "midjourney-v7", name: "Midjourney v7", vendor: "Midjourney", category: "image",
    modality: "文本 → 图像", context: "—", pricing: "¥0.50 / 张", rating: 92, latency: "20s",
    calls: 31, spend: 16, strengths: "美学顶级、插画风格多样",
    tags: ["插画", "概念图"], enabled: true, color: "#9333ea" },
  { id: "flux-1.1-pro", name: "FLUX1.1 Pro", vendor: "Black Forest Labs", category: "image",
    modality: "文本 → 图像", context: "—", pricing: "¥0.28 / 张", rating: 90, latency: "6s",
    calls: 44, spend: 12, strengths: "写实质感、构图与文字渲染可控",
    tags: ["写实", "可控"], enabled: true, color: "#e11d48" },
  { id: "gpt-image-1", name: "GPT-Image 1", vendor: "OpenAI", category: "image",
    modality: "文本 / 图像 → 图像", context: "—", pricing: "¥0.32 / 张", rating: 88, latency: "12s",
    calls: 22, spend: 7, strengths: "指令贴合度高、擅长文字排版",
    tags: ["指令贴合", "文字渲染"], enabled: true, color: "#10a37f" },
  { id: "seedream-3.0", name: "Seedream 3.0", vendor: "字节跳动", category: "image",
    modality: "文本 → 图像", context: "—", pricing: "¥0.18 / 张", rating: 86, latency: "7s",
    calls: 0, spend: 0, strengths: "中文电商海报、本土审美",
    tags: ["中文海报", "电商"], enabled: false, color: "#325ab4" },
  // ── 视频 ────────────────────────────────────────────────────
  { id: "sora-2", name: "Sora 2", vendor: "OpenAI", category: "video",
    modality: "文本 / 图像 → 视频", context: "—", pricing: "¥1.20 / 秒", rating: 88, latency: "90s",
    calls: 23, spend: 41, strengths: "短镜头动作清晰、口型同步",
    tags: ["短视频", "分镜"], enabled: true, defaultFor: "短视频生成", color: "#0a0a0a" },
  { id: "veo-3", name: "Veo 3", vendor: "Google", category: "video",
    modality: "文本 / 图像 → 视频", context: "—", pricing: "¥1.80 / 秒", rating: 91, latency: "110s",
    calls: 8, spend: 38, strengths: "长镜头连贯、含原生音轨、talking head 自然",
    tags: ["长视频", "课程录制", "原生音轨"], enabled: true, defaultFor: "长视频 · 课程录制", color: "#1a73e8" },
  { id: "kling-2.0", name: "Kling 2.0", vendor: "快手", category: "video",
    modality: "文本 / 图像 → 视频", context: "—", pricing: "¥0.60 / 秒", rating: 87, latency: "70s",
    calls: 12, spend: 9, strengths: "动作连贯、性价比高",
    tags: ["性价比", "动作连贯"], enabled: true, color: "#ff5722" },
  { id: "runway-gen4", name: "Runway Gen-4", vendor: "Runway", category: "video",
    modality: "文本 / 图像 → 视频", context: "—", pricing: "¥1.40 / 秒", rating: 85, latency: "80s",
    calls: 0, spend: 0, strengths: "风格化强、运镜可控",
    tags: ["风格化", "运镜"], enabled: false, color: "#0a0a0a" },
  { id: "hailuo-02", name: "Hailuo 02", vendor: "MiniMax", category: "video",
    modality: "文本 / 图像 → 视频", context: "—", pricing: "¥0.50 / 秒", rating: 84, latency: "65s",
    calls: 0, spend: 0, strengths: "中文创意短片、性价比高",
    tags: ["中文创意", "短片"], enabled: false, color: "#f23064" },
  // ── 音频 · 语音 ─────────────────────────────────────────────
  { id: "elevenlabs-v3", name: "ElevenLabs v3", vendor: "ElevenLabs", category: "audio",
    modality: "文本 → 语音", context: "—", pricing: "¥0.024 / 字", rating: 96, latency: "3s",
    calls: 67, spend: 31, strengths: "克隆音色已建模、中英混读自然",
    tags: ["配音", "音色克隆", "多语种"], enabled: true, defaultFor: "配音 · 音色克隆", color: "#0a0a0a" },
  { id: "suno-v4.5", name: "Suno v4.5", vendor: "Suno", category: "audio",
    modality: "文本 → 音乐", context: "—", pricing: "¥0.10 / 秒", rating: 82, latency: "30s",
    calls: 14, spend: 8, strengths: "BGM 与片头曲、风格丰富可商用",
    tags: ["BGM", "片头曲"], enabled: true, color: "#16a34a" },
  { id: "gpt-4o-audio", name: "GPT-4o Audio", vendor: "OpenAI", category: "audio",
    modality: "语音 ↔ 语音", context: "—", pricing: "¥0.06 / 分钟", rating: 90, latency: "0.6s",
    calls: 38, spend: 5, strengths: "实时语音对话、低延迟",
    tags: ["实时语音", "对话"], enabled: true, color: "#10a37f" },
  { id: "whisper-v3", name: "Whisper Large v3", vendor: "OpenAI", category: "audio",
    modality: "语音 → 文本", context: "—", pricing: "¥0.004 / 秒", rating: 94, latency: "4s",
    calls: 202, spend: 9, strengths: "中英文准确率 ≥ 96%、时间戳精准",
    tags: ["转写", "字幕"], enabled: true, defaultFor: "字幕 · 转写", color: "#525252" },
  { id: "cosyvoice-2", name: "CosyVoice 2", vendor: "阿里云", category: "audio",
    modality: "文本 → 语音", context: "—", pricing: "¥0.012 / 字", rating: 88, latency: "2s",
    calls: 0, spend: 0, strengths: "中文 TTS、方言与情感语音",
    tags: ["中文 TTS", "方言"], enabled: false, color: "#ff6a00" },
  // ── 向量 · 工具 ─────────────────────────────────────────────
  { id: "embedding-3-large", name: "text-embedding-3-large", vendor: "OpenAI", category: "embed",
    modality: "文本 → 向量", context: "8K", pricing: "¥0.0008 / 1k tok", rating: 91, latency: "0.3s",
    calls: 1240, spend: 2, strengths: "通用语义检索、维度可裁剪",
    tags: ["检索", "向量化"], enabled: true, color: "#10a37f" },
  { id: "voyage-3", name: "Voyage-3", vendor: "Voyage AI", category: "embed",
    modality: "文本 → 向量", context: "32K", pricing: "¥0.0012 / 1k tok", rating: 93, latency: "0.4s",
    calls: 980, spend: 3, strengths: "高精度检索、领域适配强",
    tags: ["高精度", "检索"], enabled: true, defaultFor: "知识库检索", color: "#5b21b6" },
  { id: "cohere-rerank-3.5", name: "Cohere Rerank 3.5", vendor: "Cohere", category: "embed",
    modality: "文档 → 排序", context: "—", pricing: "¥0.0020 / 次", rating: 90, latency: "0.5s",
    calls: 540, spend: 1, strengths: "检索结果重排序、相关性提升",
    tags: ["重排序", "相关性"], enabled: true, color: "#39594d" },
];

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
  const [models, setModels] = useState<ManagedModel[]>(SEED);
  const [cat, setCat] = useState<Category | "all">("all");
  const [status, setStatus] = useState<"全部" | "启用中" | "已停用">("全部");

  const toggle = (id: string) => {
    const m = models.find(x => x.id === id);
    if (!m) return;
    toast(m.enabled ? `已停用 ${m.name}` : `已启用 ${m.name}`, m.enabled ? "warn" : "ok");
    setModels(ms => ms.map(x => x.id === id ? { ...x, enabled: !x.enabled } : x));
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
