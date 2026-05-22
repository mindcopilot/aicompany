import { Icon } from "../components/Icon";
import { CreateForm } from "../components/CreateForm";
import { useAsync } from "../hooks/useApi";
import { useUI } from "../lib/ui";
import { api } from "../lib/api";
import type { DrawerSpec } from "../components/Drawer";

const newSequenceDrawer: DrawerSpec = {
  eyebrow: "NEW SEQUENCE", title: "新建自动化触达", sub: "搭建一条按用户行为触发的 sequence",
  body: <CreateForm
    fields={[
      { name: "name", label: "Sequence 名称", placeholder: "例如：试听 48h 未付费 · 二次转化" },
      { name: "trigger", label: "触发事件", placeholder: "例如：试听完成 / 付费 7 天未登录" },
      { name: "channel", label: "触达渠道", type: "select", options: ["企微", "邮件", "私信", "企微 + 邮件"] },
      { name: "note", label: "内容要点", type: "textarea", placeholder: "希望 Aria 在触达里强调什么……" },
    ]}
    submitLabel="创建并交给 Aria"
    successMsg={v => `已创建触达「${v.name}」· Aria 开始起草文案`}
  />,
};

export function ReachView() {
  const { openDrawer, toast } = useUI();
  const { data: funnel } = useAsync(() => api.funnel(), []);
  const f = funnel ?? [];
  const max = f[0]?.count ?? 1;

  return (
    <>
      <div className="module-header">
        <div className="title-wrap">
          <div className="module-eyebrow">05 · USER REACH & CRM</div>
          <h1 className="module-title">用户触达</h1>
          <div className="module-sub">私域承接 · 自动化 sequences · 分群运营。</div>
        </div>
        <div className="module-actions">
          <button className="btn" onClick={() => toast("用户列表 · 99 位付费用户 · 已按 AI 分群")}><Icon name="users" size={14} /> 用户列表</button>
          <button className="btn primary" onClick={() => openDrawer(newSequenceDrawer)}><Icon name="zap" size={14} /> 新建自动化</button>
        </div>
      </div>

      <div className="module-body">
        <div className="module-section" style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 12 }}>
          <div className="card">
            <div className="card-head">
              <div className="card-title"><Icon name="git" size={14} /> 用户转化漏斗 · LAST 30D</div>
              <span className="muted text-xs">每段转化率由 AI 监控</span>
            </div>
            <div className="mt-12">
              {f.map(step => {
                const w = (step.count / max) * 100;
                return (
                  <div key={step.label} className="funnel-row">
                    <span className="label">{step.label}</span>
                    <div className="bar-wrap">
                      <div className="bar" style={{ width: `${w}%` }}>{w > 12 && step.count.toLocaleString()}</div>
                    </div>
                    <div className="meta">
                      {w <= 12 && <div>{step.count.toLocaleString()}</div>}
                      {step.conv && <div className="conv">↓ {step.conv}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 14, padding: 12, background: "var(--ai-soft)", borderRadius: 8, fontSize: 12.5, color: "var(--text-2)" }}>
              <strong style={{ color: "var(--ai)" }}>Atlas:</strong> 「试听 → 付费」转化率从 22% 掉到 19%，原因可能是新版定价。建议本周 A/B 测试。
            </div>
          </div>

          <div className="card">
            <div className="card-title"><Icon name="users" size={14} /> 用户分群 · AI 自动聚类</div>
            <div className="mt-12">
              {[
                { c: "var(--accent)",  n: "深度学习者", count: 28, pct: 30, traits: "完课 ≥80% · 评论活跃" },
                { c: "var(--ai)",      n: "尝鲜型",     count: 41, pct: 45, traits: "刚付费 · 完课 30-60%" },
                { c: "var(--warn)",    n: "沉默用户",   count: 18, pct: 20, traits: "付费后 7 天未登录" },
                { c: "var(--text-3)",  n: "试听流失",   count: 12, pct: 5,  traits: "试听 50% 后离开" },
              ].map((g, i) => (
                <div key={i} style={{ padding: "10px 0", borderBottom: i === 3 ? "none" : "1px dashed var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: g.c }} />
                    <strong style={{ fontSize: 13 }}>{g.n}</strong>
                    <span className="mono text-xs muted" style={{ marginLeft: "auto" }}>{g.count} 人 · {g.pct}%</span>
                  </div>
                  <div className="muted text-xs" style={{ marginLeft: 16, marginTop: 2 }}>{g.traits}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="module-section">
          <div className="section-head">
            <div className="section-title">自动化 SEQUENCES · 5 已上线</div>
            <button className="btn sm" onClick={() => openDrawer(newSequenceDrawer)}><Icon name="plus" size={12} /> 新建</button>
          </div>
          <div className="grid-3">
            <AutoCard title="试听后 30 分钟 · 转化推送"
              steps={["试听完成", "+30 min", "私信优惠", "未付费? → 邮件"]}
              metric="转化率 18.4%" channel="企微 + 邮件" status="running" />
            <AutoCard title="付费 7 天未登录 · 唤醒"
              steps={["付费 +7d", "未登录", "AI 写专属唤回", "推送"]}
              metric="唤回率 31.2%" channel="企微" status="running" />
            <AutoCard title="完课 80% · 续费引导"
              steps={["完课率 ≥80%", "私信感谢", "+24h 续费券", "1v1 跟进"]}
              metric="续费率 44.6%" channel="企微 + 1v1" status="running" />
            <AutoCard title="周一晨间 · 学习计划"
              steps={["每周一 09:00", "AI 个性化计划", "推送"]}
              metric="打开率 62.8%" channel="邮件" status="running" />
            <AutoCard title="退款用户 · 离场访谈"
              steps={["退款触发", "+1h 邮件", "免费 1v1 邀约"]}
              metric="回收率 8.6%" channel="邮件" status="running" />
            <AutoCard title="生日 / 周年 · 关怀"
              steps={["注册周年", "AI 写问候", "送 1 节课"]}
              metric="—" channel="邮件" status="draft" />
          </div>
        </div>

        <div className="module-section">
          <div className="section-head">
            <div className="section-title">AI 起草的最新触达 · 待你审核</div>
            <span className="muted text-xs">5 条待审 · Aria 起草</span>
          </div>
          <div className="card flush">
            {[
              { ch: "企微", to: "Z. Chen",      subj: "你昨晚停在 #03 第 4:12，要不要继续？",        t: "刚刚" },
              { ch: "邮件", to: "L. Wu",         subj: "为你准备的本周学习计划 · 共 3 节 · 约 14 分钟", t: "5 min" },
              { ch: "私信", to: "J. Park",       subj: "你说想要 1v1 review，本周三 21:00 可以吗？",    t: "12 min" },
              { ch: "邮件", to: "退款用户 (3)",  subj: "我们想听你的真心话，30 分钟咖啡 ☕",             t: "1h" },
            ].map((m, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "60px 100px 1fr 80px 100px", alignItems: "center", gap: 12, padding: "12px 14px", borderTop: i === 0 ? "none" : "1px solid var(--border)" }}>
                <span className="tag">{m.ch}</span>
                <span className="mono text-sm">{m.to}</span>
                <span style={{ fontSize: 13 }}>{m.subj}</span>
                <span className="muted text-xs mono">{m.t}</span>
                <div style={{ display: "flex", gap: 4 }}>
                  <button className="btn sm primary" onClick={() => toast(`已批准发送给 ${m.to}`)}><Icon name="check" size={11} stroke={2} /></button>
                  <button className="btn sm" onClick={() => toast(`编辑给 ${m.to} 的触达文案`)}>编辑</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function AutoCard({ title, steps, metric, channel, status }: { title: string; steps: string[]; metric: string; channel: string; status: "running" | "draft" }) {
  return (
    <div className="card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <strong style={{ fontSize: 13.5 }}>{title}</strong>
        {status === "running" ? <span className="tag success"><span className="dot" />running</span> : <span className="tag">draft</span>}
      </div>
      <div className="muted text-xs">{channel}</div>
      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 4 }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-2)" }}>
            <span style={{ width: 16, height: 16, borderRadius: 99, background: "var(--bg-mute)", color: "var(--text-3)", display: "grid", placeItems: "center", fontSize: 9, fontFamily: "var(--font-mono)", fontWeight: 600 }}>{i + 1}</span>
            <span>{s}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="muted text-xs">表现</span>
        <strong className="mono text-sm">{metric}</strong>
      </div>
    </div>
  );
}
