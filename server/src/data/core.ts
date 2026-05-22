import type {
  Company,
  Direction,
  PipelineStage,
  Channel,
  FunnelStep,
  ActivityItem,
  CopilotMessage,
} from "../types.js";

export const COMPANY: Company = {
  name: "LumenEdu · 灯塔学院",
  shortName: "LumenEdu",
  stage: "Validation",
  founded: "2025.11",
  team: "1 founder + 3 AI agents",
  thesis: "用 AI 把独立开发者的真实经验沉淀为可交付的微课产品。",
};

export const DIRECTIONS: Direction[] = [
  {
    id: "indie-dev-edu",
    name: "Indie Developer 微课",
    score: 87,
    selected: true,
    tam: { value: "$2.1B", pct: 78 },
    growth: { value: "+34% YoY", pct: 82 },
    competition: { value: "中低", pct: 70 },
    fit: { value: "强匹配", pct: 95 },
    summary: "面向想要做 side project 的开发者，提供 4-小时可完成的实战微课。",
    why: [
      "独立开发者社区在中文世界处于早期，付费意愿强但优质内容稀缺",
      "创始人有 8 年 SaaS 经验 + 公开技术写作积累，原创内容可复用",
      "AI 可以把每篇技术博客自动扩写为完整课程 + 配套代码仓库",
    ],
  },
  {
    id: "ai-pm",
    name: "AI 时代 PM 训练营",
    score: 74,
    tam: { value: "$1.4B", pct: 65 },
    growth: { value: "+48% YoY", pct: 92 },
    competition: { value: "高", pct: 42 },
    fit: { value: "中等", pct: 60 },
    summary: "教传统 PM 如何用 AI 工具重构工作流，3 周完成实战练习。",
  },
  {
    id: "no-code-biz",
    name: "No-Code 副业训练营",
    score: 68,
    tam: { value: "$890M", pct: 52 },
    growth: { value: "+22% YoY", pct: 68 },
    competition: { value: "高", pct: 35 },
    fit: { value: "中等", pct: 58 },
    summary: "用 Bubble / Glide / Lovable 1 个月做出 MVP 并跑通付费。",
  },
  {
    id: "designer-ai",
    name: "设计师 AI 工具栈",
    score: 61,
    tam: { value: "$620M", pct: 44 },
    growth: { value: "+29% YoY", pct: 74 },
    competition: { value: "中", pct: 52 },
    fit: { value: "弱", pct: 40 },
    summary: "面向 UI / 平面设计师的 AI 工具集课程，含 Figma 插件实战。",
  },
  {
    id: "interior-designer-ai",
    name: "室内装修 · 独立设计师 AI 工具",
    score: 76,
    tam: { value: "¥38B", pct: 65 },
    growth: { value: "+52% YoY", pct: 88 },
    competition: { value: "中低", pct: 68 },
    fit: { value: "中等", pct: 62 },
    summary: "为独立室内设计师 / 小工作室提供 AI 户型出图 + 选材清单的 SaaS，¥99-299/月订阅。",
    why: [
      "「室内装修」本体与你 SaaS/DX 画像错配，但收敛到「独立设计师效率工具」后回到你熟悉的产品形态",
      "扩散模型 + 室内场景 LoRA 红利期，酷家乐/三维家偏大装企，腰部设计师工具有空白",
      "高客单订阅 SaaS（¥99-299/月），20h/周 + ¥30K 跑道可承载 MVP",
      "⚠️ 红旗：设计行业 advisor 缺失、训练数据获取难，建议先做 4 周用户访谈再锁定主线",
    ],
  },
];

export const PIPELINE: PipelineStage[] = [
  { step: "01", key: "define",  title: "产品定义", status: "done",    desc: "定价、SKU、目标用户画像由 AI 协助生成。", meta: "已通过" },
  { step: "02", key: "landing", title: "落地页",   status: "done",    desc: "AI 生成 v3 版文案 + Hero，转化率 4.8%。", meta: "已发布" },
  { step: "03", key: "course",  title: "课程内容", status: "current", desc: "12 节微课，10 已完成。AI 正在生成 #11 字幕。", meta: "83% · 进行中" },
  { step: "04", key: "pay",     title: "支付与交付", status: "pending", desc: "Stripe + 私域承接 webhook，待联调。", meta: "待启动" },
  { step: "05", key: "support", title: "服务化",   status: "pending", desc: "答疑机器人 + 社群 SOP。", meta: "待启动" },
];

export const CHANNELS: Channel[] = [
  { id: "xhs",   name: "小红书",       handle: "@灯塔学院",            color: "#ff2442", letter: "小", on: true,  posts: 23, reach: "12.4K", ctr: "3.2%" },
  { id: "wx",    name: "公众号",       handle: "灯塔学院LumenEdu",      color: "#07c160", letter: "W",  on: true,  posts: 8,  reach: "5.8K",  ctr: "8.1%" },
  { id: "sph",   name: "视频号",       handle: "@LumenEdu",             color: "#1aad19", letter: "视", on: true,  posts: 12, reach: "8.2K",  ctr: "2.4%" },
  { id: "zhihu", name: "知乎",         handle: "灯塔学院",              color: "#0084ff", letter: "知", on: true,  posts: 6,  reach: "3.1K",  ctr: "5.6%" },
  { id: "dy",    name: "抖音",         handle: "@灯塔学院",            color: "#000000", letter: "D",  on: false, posts: 0,  reach: "—",     ctr: "—" },
  { id: "jike",  name: "即刻",         handle: "@lumen",                color: "#ffe411", letter: "J",  on: true,  posts: 18, reach: "4.6K",  ctr: "6.8%" },
  { id: "bili",  name: "B 站",         handle: "灯塔学院LumenEdu",      color: "#fb7299", letter: "B",  on: false, posts: 0,  reach: "—",     ctr: "—" },
  { id: "x",     name: "X / Twitter",  handle: "@lumenedu",             color: "#1d9bf0", letter: "X",  on: true,  posts: 11, reach: "2.3K",  ctr: "4.4%" },
];

export const FUNNEL: FunnelStep[] = [
  { label: "曝光",       count: 48230, conv: null },
  { label: "落地页访问", count: 6420,  conv: "13.3%" },
  { label: "留资 / 关注", count: 1180, conv: "18.4%" },
  { label: "试听 / 体验", count: 487,  conv: "41.3%" },
  { label: "付费",       count: 92,   conv: "18.9%" },
  { label: "续费",       count: 41,   conv: "44.6%" },
];

export const ACTIVITY: ActivityItem[] = [
  { t: "刚刚",      who: "Atlas", ai: true,  what: "完成了", obj: "小红书 5 篇笔记排程",     extra: "下一篇 14:30 自动发布" },
  { t: "8 分钟前",  who: "Helix", ai: true,  what: "标记",   obj: "竞品「拾光课堂」周更频率提升", extra: "已加入论证看板" },
  { t: "21 分钟前", who: "Nova",  ai: true,  what: "起草了", obj: "课程 #11《SQLite 边缘部署》字幕", extra: "等待你审核" },
  { t: "1 小时前",  who: "你",    ai: false, what: "审核通过", obj: "落地页 v3 文案" },
  { t: "今早 09:12", who: "Atlas", ai: true, what: "运行了", obj: "周度增长复盘", extra: "MRR ¥45.2K · +12.4%" },
  { t: "昨天",      who: "Helix", ai: true,  what: "完成",   obj: "20 份用户访谈结构化整理" },
];

export const COPILOT_INIT: CopilotMessage[] = [
  { from: "ai",   text: "早上好。今天我已经完成 3 件事，有 2 件需要你过一眼：" },
  { from: "ai",   text: "课程 #11 的脚本初稿 + 小红书本周 5 篇排期。", tool: { name: "review_queue", meta: "2 项待审" } },
  { from: "user", text: "先看课程 #11 的脚本。" },
  { from: "ai",   text: "好的，已经为你打开。我注意到这一节关于 SQLite 的部分和你 2024 年 6 月那篇博客高度重合，要不要直接复用？", tool: { name: "diff_check", meta: "命中 1 篇历史素材" } },
];
