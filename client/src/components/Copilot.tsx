import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "./Icon";
import { api } from "../lib/api";
import type { CopilotMessage } from "../types/api";

const CTX_HINT: Record<string, string> = {
  dashboard: "全局 Dashboard",
  direction: "方向选择与论证",
  product: "业务线上化",
  content: "内容工厂",
  traffic: "流量分发",
  reach: "用户触达",
  data: "数据中心",
  knowledge: "知识库",
  prompts: "Prompts",
  skills: "Skills",
  agents: "Agent 编排",
  automations: "自动化",
};

const SUGGESTIONS: Record<string, string[]> = {
  dashboard:   ["本周最值得关注什么？", "帮我准备周一晨会议题", "我现在该做什么"],
  direction:   ["对这条方向做 4 维深度论证", "再扫 5 个竞品", "为什么不推荐 No-Code"],
  product:     ["让 Nova 重写课程 #6", "为 #11 生成 3 版封面", "起草 SUB-YEAR 的定价"],
  traffic:     ["把 B 站接进来", "生成本周排期", "为爆款笔记起 5 个相似选题"],
  reach:       ["针对沉默用户写一封唤回信", "新建生日关怀自动化", "导出付费用户列表"],
  data:        ["归因课程 #6 完课率下降", "对比本期 vs 上期", "生成 CEO 看板"],
  content:     ["一键生成本周分发素材", "比较 GPT-5 与 Claude 的脚本", "把 EP06 播客拆成 5 条短视频"],
  knowledge:   ["把今天访谈整理入库", "合并相似的想法", "搜索：付费意愿"],
  prompts:     ["把 v3.1 设为默认", "起草新的小红书 prompt", "为 voice 不一致补 prompt"],
  skills:      ["新增 publish_to_wechat", "测试 query_metrics", "查看响应慢的 skill"],
  agents:      ["让 Atlas 暂停今天的发布", "为 Nova 增加新的 skill", "看 Aria 今日工时"],
  automations: ["启用 MRR 突变告警", "新建模板：试听 24h 跟进", "看最近失败的运行"],
};

export function Copilot({ active, onClose }: { active: string; onClose: () => void }) {
  const [msgs, setMsgs] = useState<CopilotMessage[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void api.copilotInit().then(setMsgs).catch(() => setMsgs([]));
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [msgs, thinking]);

  const contextHint = useMemo(() => CTX_HINT[active] ?? "全局", [active]);
  const suggestions = useMemo(() => SUGGESTIONS[active] ?? ["告诉我现在该做什么"], [active]);

  const send = async (text: string) => {
    const t = text.trim();
    if (!t || thinking) return;
    setMsgs(m => [...m, { from: "user", text: t }]);
    setInput("");
    setThinking(true);
    try {
      const reply = await api.copilotSend(t);
      setMsgs(m => [...m, reply]);
    } catch (e) {
      setMsgs(m => [...m, { from: "ai", text: "（网络出错，稍后再试）" }]);
    } finally {
      setThinking(false);
    }
  };

  return (
    <div className="copilot">
      <div className="copilot-head">
        <div className="ai-avatar" style={{ width: 28, height: 28, borderRadius: 8, fontSize: 12 }}>A</div>
        <div>
          <div className="title">Atlas <span className="muted text-xs" style={{ fontWeight: 400, marginLeft: 6 }}>· AI 编排主控</span></div>
          <div className="sub">当前上下文 · {contextHint}</div>
        </div>
        <div className="actions">
          <button className="icon-btn" title="展开"><Icon name="expand" size={14} /></button>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={14} /></button>
        </div>
      </div>

      <div className="copilot-body" ref={scrollRef}>
        {msgs.map((m, i) => <Msg key={i} m={m} />)}
        {thinking && (
          <div className="copilot-msg">
            <div className="av">A</div>
            <div className="bubble"><span className="muted">正在思考<DotsAnim /></span></div>
          </div>
        )}
      </div>

      <div className="copilot-suggest">
        {suggestions.map(s => (
          <button key={s} className="copilot-chip" onClick={() => void send(s)}>{s}</button>
        ))}
      </div>

      <div className="copilot-input">
        <textarea
          placeholder={`让 Atlas 帮你做事...  ${contextHint} 上下文`}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(input); }
          }}
          rows={1}
        />
        <button className="btn ghost sm" title="附件"><Icon name="file" size={14} /></button>
        <button className="btn accent sm" onClick={() => void send(input)}><Icon name="send" size={13} /></button>
      </div>
    </div>
  );
}

function Msg({ m }: { m: CopilotMessage }) {
  return (
    <div className={`copilot-msg ${m.from === "user" ? "user" : ""}`}>
      <div className="av">{m.from === "user" ? "你" : "A"}</div>
      <div className="bubble">
        {m.text}
        {m.tool && (
          <div className="tool">
            <Icon name="bolt" size={11} />
            <span className="mono">tool:{m.tool.name}</span>
            <span style={{ marginLeft: "auto", opacity: 0.7 }}>{m.tool.meta}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function DotsAnim() {
  return (
    <span style={{ display: "inline-flex", gap: 3, marginLeft: 4 }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 4, height: 4, borderRadius: 99, background: "var(--text-3)",
          animation: `dotBounce 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
      <style>{`@keyframes dotBounce { 0%, 80%, 100% { opacity: 0.3; transform: translateY(0); } 40% { opacity: 1; transform: translateY(-3px); } }`}</style>
    </span>
  );
}
