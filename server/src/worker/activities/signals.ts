// Market signals — Phase 1 is mock. Later this becomes a fanout to real
// sources (Baidu Index, GitHub trending, podcast RSS, X search). The mock
// reflects what the UI claims ("8.4 万条市场信号扫描") so the LLM has
// realistic-looking grist.

import type { FounderProfile } from "../../types.js";

export interface MarketSignal {
  source: string;
  topic: string;
  metric: string;
  observation: string;
}

export async function gatherMarketSignals(input: {
  profile: FounderProfile;
  thesis?: string;
}): Promise<MarketSignal[]> {
  // Deterministic for now — return signals shaped by the founder's interests
  // so the LLM has track-relevant context to reason over.
  const interests = input.profile.interests.join(" / ");
  const base: MarketSignal[] = [
    { source: "百度指数",     topic: interests,         metric: "搜索量 YoY",  observation: "+34% 同比增长，集中在 25-34 岁人群" },
    { source: "GitHub Topics",topic: "AI agents / SaaS", metric: "Star 增速",  observation: "近 30 天新增 12k stars，独立开发者占比 41%" },
    { source: "即刻 / X",     topic: "独立开发付费教育", metric: "周提及量",   observation: "中文社区周均 187 条提及，付费意愿信号明显" },
    { source: "小红书",       topic: "副业 / Side Project", metric: "笔记量",  observation: "近 90 天发布 32k 篇，平均互动 240" },
    { source: "PMF Survey",   topic: "中文 indie 工具",  metric: "客单价",     observation: "主流定价 ¥99-499 / 月，3.8 星平均评分" },
    { source: "VC 通讯",      topic: "AI Native 教育",   metric: "种子轮数",   observation: "Q1 2026 已 12 笔，2025 同期 5 笔" },
  ];
  if (input.thesis) {
    base.unshift({
      source: "创始人输入",
      topic: input.thesis,
      metric: "意向方向",
      observation: input.thesis,
    });
  }
  return base;
}
