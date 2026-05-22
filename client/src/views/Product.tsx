import { useState } from "react";
import { Icon } from "../components/Icon";
import { AgentTag, SignalCell, th, td } from "../components/primitives";
import { BarChart } from "../components/Charts";
import { CreateForm } from "../components/CreateForm";
import { useAsync } from "../hooks/useApi";
import { useUI } from "../lib/ui";
import { api } from "../lib/api";

export function ProductView() {
  const { toast } = useUI();
  const { data: pipeline } = useAsync(() => api.pipeline(), []);
  const [stage, setStage] = useState<"define" | "landing" | "course" | "pay" | "support">("course");

  return (
    <>
      <div className="module-header">
        <div className="title-wrap">
          <div className="module-eyebrow">03 · BUSINESS DIGITALIZATION</div>
          <h1 className="module-title">业务线上化</h1>
          <div className="module-sub">从产品定义到交付的完整 pipeline · AI Agent 协助产出每个环节。</div>
        </div>
        <div className="module-actions">
          <span className="tag ai"><span className="dot" /> Nova 起草中</span>
          <button className="btn" onClick={() => toast("已切换到用户视角预览")}><Icon name="eye" size={14} /> 用户视角预览</button>
          <button className="btn primary" onClick={() => toast("发布流程已启动 · Nova 正在核对 14 项发布清单")}><Icon name="rocket" size={14} /> 发布到生产</button>
        </div>
      </div>

      <div className="module-body">
        <div className="module-section">
          <div className="section-head">
            <div className="section-title">交付 PIPELINE · 5 阶段</div>
            <span className="muted text-xs">整体完成度 <strong className="mono" style={{ color: "var(--text)" }}>62%</strong> · 距首发 14 天</span>
          </div>
          <div className="pipeline">
            {(pipeline ?? []).map(p => (
              <div key={p.key} className={`pipeline-stage ${p.status}`} onClick={() => setStage(p.key)}
                style={stage === p.key ? { borderColor: "var(--text)", boxShadow: "0 0 0 3px var(--bg-mute)" } : { cursor: "pointer" }}>
                <div className="step">STAGE {p.step}</div>
                <h5>{p.title}</h5>
                <div className="desc">{p.desc}</div>
                <div className="status">
                  {p.status === "done"    && <span className="tag success"><Icon name="check" size={10} stroke={2} /> {p.meta}</span>}
                  {p.status === "current" && <span className="tag accent"><span className="dot" /> {p.meta}</span>}
                  {p.status === "pending" && <span className="tag">{p.meta}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="module-section">
          {stage === "define"  && <DefineStage />}
          {stage === "landing" && <LandingStage />}
          {stage === "course"  && <CourseStage />}
          {stage === "pay"     && <PayStage />}
          {stage === "support" && <SupportStage />}
        </div>
      </div>
    </>
  );
}

function DefineStage() {
  return (
    <div className="grid-2" style={{ gap: 12 }}>
      <div className="card">
        <div className="card-title"><Icon name="file" size={14} /> 产品定义文档 v1.2</div>
        <div className="muted text-xs mb-8">由 Nova 起草 · 你审核通过 · 7 天前</div>
        <div style={{ marginTop: 12, padding: 14, background: "var(--bg-soft)", borderRadius: 8, fontSize: 13, lineHeight: 1.7, color: "var(--text-2)" }}>
          <strong style={{ color: "var(--text)" }}>产品：</strong>LumenEdu · Indie 微课订阅<br />
          <strong style={{ color: "var(--text)" }}>用户：</strong>1-3 年内想做 side project 的开发者<br />
          <strong style={{ color: "var(--text)" }}>痛点：</strong>没人带 + 没动力 + 不知道做什么<br />
          <strong style={{ color: "var(--text)" }}>价值主张：</strong>「跟着真正做过 SaaS 的人，4 小时做出一个能跑的 demo」<br />
          <strong style={{ color: "var(--text)" }}>定价：</strong>¥99 / 单课 ·  ¥299 / 月订阅
        </div>
      </div>
      <div className="card">
        <div className="card-title"><Icon name="layers" size={14} /> SKU 矩阵</div>
        <div className="card flush mt-12">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ background: "var(--bg-soft)", color: "var(--text-3)", fontSize: 11 }}>
              {["SKU", "形态", "价格", "状态"].map(h => <th key={h} style={th}>{h}</th>)}
            </tr></thead>
            <tbody>
              {[
                ["FREE-01",   "免费试听课", "¥0",        "已上架"],
                ["MICRO-01",  "单课购买",   "¥99",       "已上架"],
                ["SUB-MONTH", "月订阅",     "¥299/月",   "已上架"],
                ["SUB-YEAR",  "年订阅 + 社群", "¥2,499/年", "待上架"],
                ["1ON1",      "1v1 review (限量)", "¥1,999", "草稿"],
              ].map((r, i) => (
                <tr key={i} style={{ borderTop: i === 0 ? "none" : "1px solid var(--border)" }}>
                  <td style={{ ...td, fontFamily: "var(--font-mono)" }}>{r[0]}</td>
                  <td style={td}>{r[1]}</td>
                  <td style={{ ...td, fontFamily: "var(--font-mono)" }}>{r[2]}</td>
                  <td style={td}><span className={`tag ${r[3]!.includes("已") ? "success" : ""}`}>{r[3]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function LandingStage() {
  const { toast } = useUI();
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  return (
    <div className="grid-2" style={{ gap: 12 }}>
      <div className="card flush">
        <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div className="card-title"><Icon name="image" size={14} /> 落地页 · lumenedu.com</div>
          <div className="seg">
            <button className={device === "desktop" ? "active" : ""} onClick={() => setDevice("desktop")}>桌面</button>
            <button className={device === "mobile" ? "active" : ""} onClick={() => setDevice("mobile")}>移动</button>
          </div>
        </div>
        <LandingPreview device={device} />
      </div>
      <div className="col">
        <div className="card">
          <div className="card-title"><Icon name="sparkle" size={14} /> Nova 已生成的版本</div>
          <div className="mt-12" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { v: "v3", t: "强结果导向 · '4 小时做完'",    ctr: "4.8%", current: true },
              { v: "v2", t: "强同理心 · '一个人开发的孤独'", ctr: "3.2%" },
              { v: "v1", t: "功能介绍 · 课程大纲展开",       ctr: "1.4%" },
            ].map(r => (
              <div key={r.v} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 8, background: r.current ? "var(--accent-soft)" : "var(--bg)" }}>
                <span className="mono" style={{ width: 24, fontSize: 13, fontWeight: 600 }}>{r.v}</span>
                <span style={{ flex: 1, fontSize: 13 }}>{r.t}</span>
                <span className="mono text-xs muted">CTR</span>
                <strong className="mono text-sm">{r.ctr}</strong>
                {r.current && <span className="tag accent"><span className="dot" />当前</span>}
              </div>
            ))}
            <button className="btn" onClick={() => toast("已派给 Nova · 新版落地页预计 6 分钟后生成")}><Icon name="plus" size={14} /> 让 Nova 再生成一版</button>
          </div>
        </div>
        <div className="card">
          <div className="card-title"><Icon name="bar" size={14} /> 实时转化</div>
          <div className="grid-3 mt-12">
            <SignalCell n="6,420" l="访问 / 30d" />
            <SignalCell n="4.8%" l="点击注册 CTR" />
            <SignalCell n="¥31" l="访问 ARPU" />
          </div>
        </div>
      </div>
    </div>
  );
}

function LandingPreview({ device }: { device: "desktop" | "mobile" }) {
  const mobile = device === "mobile";
  return (
    <div style={{ background: "var(--bg-soft)", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 10, border: "1px solid var(--border)", overflow: "hidden", height: 440, display: "flex", flexDirection: "column", maxWidth: mobile ? 300 : "none", margin: "0 auto", transition: "max-width .2s ease" }}>
        <div style={{ height: 28, background: "var(--bg-mute)", display: "flex", alignItems: "center", gap: 6, padding: "0 10px", borderBottom: "1px solid var(--border)" }}>
          <span style={{ width: 10, height: 10, borderRadius: 99, background: "#ff5f57" }} />
          <span style={{ width: 10, height: 10, borderRadius: 99, background: "#febc2e" }} />
          <span style={{ width: 10, height: 10, borderRadius: 99, background: "#28c840" }} />
          <span className="mono text-xs muted" style={{ marginLeft: 12 }}>lumenedu.com</span>
        </div>
        <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 22, height: 22, borderRadius: 6, background: "var(--text)", color: "#fff", display: "grid", placeItems: "center", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600 }}>L</span>
            <span style={{ fontWeight: 500, fontSize: 13 }}>LumenEdu</span>
          </div>
          <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--text-3)" }}>
            <span>课程</span><span>关于</span><span style={{ background: "var(--text)", color: "#fff", padding: "4px 10px", borderRadius: 6 }}>开始</span>
          </div>
        </div>
        <div style={{ flex: 1, padding: mobile ? "20px 18px" : "28px 32px", display: "flex", flexDirection: mobile ? "column" : "row", gap: mobile ? 14 : 24, overflow: "hidden" }}>
          <div style={{ flex: 1.2 }}>
            <div style={{ fontSize: 11, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "var(--font-mono)" }}>INDIE MICROCOURSE</div>
            <h2 style={{ fontSize: 26, lineHeight: 1.2, fontWeight: 600, letterSpacing: "-0.02em", margin: "8px 0 12px" }}>
              跟着真正做过 SaaS 的人，<br />
              <span style={{ background: "linear-gradient(90deg, var(--accent), var(--ai))", WebkitBackgroundClip: "text", color: "transparent" }}>4 小时做出一个能跑的 demo</span>
            </h2>
            <p style={{ fontSize: 12.5, color: "var(--text-2)", lineHeight: 1.6, margin: "0 0 16px" }}>12 节微课 · 配套代码仓库 · 周更复盘 · 每周三晚直播答疑</p>
            <div style={{ display: "flex", gap: 8 }}>
              <span style={{ background: "var(--text)", color: "#fff", padding: "8px 14px", borderRadius: 7, fontSize: 12.5 }}>免费试听 →</span>
              <span style={{ border: "1px solid var(--border)", padding: "8px 14px", borderRadius: 7, fontSize: 12.5 }}>查看大纲</span>
            </div>
            <div style={{ marginTop: 18, display: "flex", gap: 16, fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
              <span>★★★★★ 4.8</span><span>92 学员</span><span>已运行 23 天</span>
            </div>
          </div>
          <div style={{ flex: 1, background: "repeating-linear-gradient(45deg, var(--bg-soft) 0 8px, var(--bg-mute) 8px 16px)", borderRadius: 8, display: "grid", placeItems: "center", color: "var(--text-3)", fontFamily: "var(--font-mono)", fontSize: 11, border: "1px dashed var(--border-strong)" }}>
            [hero · 产品截图]
          </div>
        </div>
      </div>
    </div>
  );
}

interface Course { n: string; t: string; s: string; d: string; c: number; q: string; }

function CourseStage() {
  const { openDrawer } = useUI();
  const courses: Course[] = [
    { n: "01", t: "选题：怎么找到不会死的产品",        s: "已发布", d: "4:23", c: 92, q: "" },
    { n: "02", t: "MVP：用 Next.js + Supabase 起步",  s: "已发布", d: "5:08", c: 87, q: "" },
    { n: "03", t: "支付：Stripe 完整链路",              s: "已发布", d: "6:14", c: 78, q: "" },
    { n: "04", t: "私域：开发者社群运营",                s: "已发布", d: "5:48", c: 71, q: "" },
    { n: "05", t: "增长：低成本拉新 5 招",              s: "已发布", d: "4:55", c: 68, q: "" },
    { n: "06", t: "运营：定价心理学",                    s: "已发布", d: "5:31", c: 34, q: "⚠ 完课率低" },
    { n: "07", t: "Auth：从 0 到 100 个用户的鉴权",     s: "已发布", d: "4:42", c: 65, q: "" },
    { n: "08", t: "Postgres 性能：8 条军规",            s: "已发布", d: "6:02", c: 62, q: "" },
    { n: "09", t: "AI 集成：成本控制",                   s: "已发布", d: "5:24", c: 58, q: "" },
    { n: "10", t: "可观测性：少花钱也能看到一切",        s: "已发布", d: "5:11", c: 49, q: "" },
    { n: "11", t: "SQLite 边缘部署",                     s: "AI 起草中", d: "—", c: 0, q: "Nova 字幕 80%" },
    { n: "12", t: "从开发者到产品人",                    s: "未开始", d: "—", c: 0, q: "" },
  ];
  return (
    <div className="grid-2" style={{ gap: 12, gridTemplateColumns: "1.4fr 1fr" }}>
      <div className="card flush">
        <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div className="card-title"><Icon name="book" size={14} /> 课程内容 · 12 节</div>
          <button className="btn sm" onClick={e => { e.stopPropagation(); openDrawer({
            eyebrow: "NEW COURSE", title: "添加课程", sub: "新增一节微课到交付 pipeline",
            body: <CreateForm
              intro="填写课程信息后，Nova 会自动起草脚本与字幕草稿。"
              fields={[
                { name: "title", label: "课程标题", placeholder: "例如：用 Cloudflare Workers 做边缘 API" },
                { name: "goal", label: "学习目标", type: "textarea", placeholder: "学完这节课，学员能够……" },
                { name: "duration", label: "目标时长", type: "select", options: ["4-5 分钟", "5-7 分钟", "7-10 分钟"] },
              ]}
              submitLabel="创建并交给 Nova"
              successMsg={v => `已创建课程「${v.title}」· Nova 开始起草脚本`}
            />,
          }); }}><Icon name="plus" size={12} /> 添加</button>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr style={{ background: "var(--bg-soft)", color: "var(--text-3)", fontSize: 11 }}>
            {["#", "标题", "时长", "完课率", "状态"].map(h => <th key={h} style={th}>{h}</th>)}
          </tr></thead>
          <tbody>
            {courses.map((r, i) => (
              <tr key={r.n} style={{ borderTop: i === 0 ? "none" : "1px solid var(--border)", cursor: "pointer" }}
                onClick={() => openDrawer({
                  eyebrow: `COURSE ${r.n}`,
                  title: r.t,
                  sub: `${r.s} · ${r.d}`,
                  body: <CourseDetail c={r} />,
                })}>
                <td style={{ ...td, fontFamily: "var(--font-mono)", color: "var(--text-3)", width: 32 }}>{r.n}</td>
                <td style={td}><strong>{r.t}</strong></td>
                <td style={{ ...td, fontFamily: "var(--font-mono)", color: "var(--text-3)" }}>{r.d}</td>
                <td style={td}>
                  {r.c > 0 ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 60, height: 4, background: "var(--bg-mute)", borderRadius: 99 }}>
                        <div style={{ width: `${r.c}%`, height: "100%", background: r.c < 50 ? "var(--warn)" : "var(--text)", borderRadius: 99 }} />
                      </div>
                      <span className="mono text-xs">{r.c}%</span>
                    </div>
                  ) : <span className="muted">—</span>}
                </td>
                <td style={td}>
                  {r.s === "已发布" ? <span className="tag success">✓ live</span> : r.s === "AI 起草中" ? <span className="tag ai"><span className="dot" /> {r.q}</span> : <span className="tag">未开始</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="col">
        <div className="card">
          <div className="card-title"><Icon name="sparkle" size={14} /> AI 正在做的事</div>
          <div className="mt-12" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Worklog who="Nova"  task="字幕：课程 #11"             pct={80} eta="约 8 分钟" />
            <Worklog who="Nova"  task="封面图：课程 #11 (3 版)"     pct={45} eta="约 20 分钟" />
            <Worklog who="Atlas" task="拆解为 5 篇推广素材"          pct={12} eta="排队中" />
          </div>
        </div>
        <div className="card">
          <div className="card-title"><Icon name="flag" size={14} /> 需要你决定</div>
          <div className="mt-12" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <DecisionCard
              title="课程 #6 完课率仅 34%"
              desc="Helix 已对比同期其他课程，发现：节奏过快 + 缺案例。"
              actions={["接受重做建议", "我自己看一下", "忽略"]}
            />
            <DecisionCard
              title="是否合并 #07 + #08"
              desc="两节课主题接近（都关于性能 / 鉴权底层）"
              actions={["合并", "保持"]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Worklog({ who, task, pct, eta }: { who: string; task: string; pct: number; eta: string }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <AgentTag name={who} />
        <span style={{ fontSize: 13, flex: 1 }}>{task}</span>
        <span className="mono text-xs muted">{eta}</span>
      </div>
      <div style={{ height: 4, background: "var(--bg-mute)", borderRadius: 99 }}>
        <div style={{ width: `${pct}%`, height: "100%", background: "var(--ai)", borderRadius: 99 }} />
      </div>
    </div>
  );
}

function DecisionCard({ title, desc, actions }: { title: string; desc: string; actions: string[] }) {
  const { toast } = useUI();
  return (
    <div style={{ padding: 12, background: "var(--bg-soft)", borderRadius: 8, border: "1px solid var(--border)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <Icon name="flag" size={12} />
        <strong style={{ fontSize: 13 }}>{title}</strong>
      </div>
      <div className="muted text-xs">{desc}</div>
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        {actions.map((a, i) => (
          <button key={a} className={`btn sm ${i === 0 ? "primary" : ""}`}
            onClick={() => toast(`「${title}」· 已选择：${a}`)}>{a}</button>
        ))}
      </div>
    </div>
  );
}

function CourseDetail({ c }: { c: Course }) {
  const { toast } = useUI();
  return (
    <div>
      <div className="grid-3" style={{ gap: 8 }}>
        <SignalCell n={c.d || "—"} l="时长" />
        <SignalCell n={`${c.c}%`} l="完课率" />
        <SignalCell n="4.6" l="评分" />
      </div>
      <div className="card-title mt-16" style={{ marginBottom: 8 }}><Icon name="file" size={14} /> 资产</div>
      {["脚本 v2.md", "字幕.srt", "封面 3 版", "代码仓库 lumenedu/06", "5 个衍生素材"].map(f => (
        <div key={f} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px dashed var(--border)" }}>
          <Icon name="file" size={14} />
          <span style={{ flex: 1, fontSize: 13 }}>{f}</span>
          <button className="btn sm ghost" onClick={() => toast(`正在打开：${f}`)}>打开</button>
        </div>
      ))}
    </div>
  );
}

function PayStage() {
  return (
    <div className="grid-2" style={{ gap: 12 }}>
      <div className="card">
        <div className="card-title"><Icon name="git" size={14} /> 支付链路</div>
        <div style={{ marginTop: 16 }}>
          {[
            { f: "落地页 CTA",       to: "Stripe Checkout",       s: "ok" },
            { f: "Stripe Checkout",  to: "webhook",                s: "ok" },
            { f: "webhook",          to: "用户表 + Auth0",         s: "ok" },
            { f: "Auth0",            to: "课程访问",                s: "ok" },
            { f: "课程访问",         to: "私域承接 (企微)",         s: "todo" },
            { f: "私域承接",         to: "续费提醒",                s: "todo" },
          ].map((r, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i === 5 ? "none" : "1px dashed var(--border)" }}>
              <span style={{ width: 18, height: 18, borderRadius: 99, background: r.s === "ok" ? "var(--success)" : "var(--bg-mute)", display: "grid", placeItems: "center", color: "#fff" }}>
                {r.s === "ok" ? <Icon name="check" size={11} stroke={2.5} /> : null}
              </span>
              <span style={{ fontSize: 13 }}>{r.f}</span>
              <Icon name="arrowRight" size={12} stroke={2} />
              <span style={{ fontSize: 13 }}>{r.to}</span>
              {r.s === "todo" && <span className="tag warn" style={{ marginLeft: "auto" }}>待联调</span>}
            </div>
          ))}
        </div>
      </div>
      <div className="card">
        <div className="card-title"><Icon name="db" size={14} /> 支付 / 续费 数据</div>
        <div className="chart sm mt-12">
          <BarChart data={[2, 4, 5, 8, 11, 14, 18, 22, 28, 34, 42, 47]} labels={["W1", "", "", "", "W5", "", "", "", "W9", "", "", "W12"]} color="var(--accent)" />
        </div>
        <div className="grid-3 mt-12">
          <SignalCell n="92" l="付费用户" />
          <SignalCell n="¥45.2K" l="MRR" />
          <SignalCell n="3.2%" l="退款率" />
        </div>
      </div>
    </div>
  );
}

function SupportStage() {
  const { toast } = useUI();
  const sop: Array<[string, string, "ok" | "review"]> = [
    ["识别问题类型", "课程 / 账号 / 支付 / 其他 — 自动分流", "ok"],
    ["知识库检索", "命中 FAQ 直接回答 · 附引用来源", "ok"],
    ["Aria 生成答复", "套用品牌 voice · 含下一步引导", "ok"],
    ["低置信度升级", "置信度 < 70% 转人工并通知你", "review"],
    ["满意度回收", "答复 1 小时后发送评分卡", "review"],
  ];
  const tickets = [
    { who: "Z. Chen", q: "Stripe 支付后没收到课程权限", tag: "支付", s: "AI 已答复" },
    { who: "L. Wu",   q: "课程 #08 的代码仓库在哪下载", tag: "课程", s: "AI 已答复" },
    { who: "J. Park", q: "想退课，但还想保留社群权限",   tag: "账号", s: "待你处理" },
  ];
  return (
    <div className="grid-2" style={{ gap: 12 }}>
      <div className="col">
        <div className="card">
          <div className="card-head">
            <div className="card-title"><Icon name="msg" size={14} /> 答疑机器人 · SOP v0.3</div>
            <span className="tag ai"><span className="dot" /> Aria 起草</span>
          </div>
          <div className="muted text-xs mt-8">5 个节点 · 2 个待你审核后即可上线</div>
          <div className="version-feed mt-12">
            {sop.map(([title, desc, s], i) => (
              <div key={i} className="version-row">
                <span className={`mono tag ${s === "ok" ? "success" : "accent"}`}>STEP {i + 1}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13 }}>{title}</div>
                  <div className="muted text-xs">{desc}</div>
                </div>
                {s === "ok"
                  ? <span className="tag success">已就绪</span>
                  : <button className="btn sm" onClick={() => toast(`已通过 SOP 节点：${title}`)}>审核通过</button>}
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-title"><Icon name="git" size={14} /> 工单流转 · 今日</div>
          <div className="mt-12" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {tickets.map((t, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 8 }}>
                <span className="tag mono">{t.tag}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13 }}>{t.q}</div>
                  <div className="muted text-xs mono">{t.who}</div>
                </div>
                {t.s === "AI 已答复"
                  ? <span className="tag success"><Icon name="check" size={10} stroke={2} /> {t.s}</span>
                  : <button className="btn sm primary" onClick={() => toast(`已接管工单：${t.who}`)}>处理</button>}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="col">
        <div className="card">
          <div className="card-title"><Icon name="send" size={14} /> 服务渠道接入</div>
          <div className="mt-12" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { n: "企业微信", d: "私域承接 · 自动建群", on: true },
              { n: "邮件", d: "异步答疑 · 续费提醒", on: true },
              { n: "站内消息", d: "课程页内嵌答疑入口", on: true },
              { n: "电话回访", d: "高价值用户 1v1", on: false },
            ].map(ch => (
              <div key={ch.n} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{ch.n}</div>
                  <div className="muted text-xs">{ch.d}</div>
                </div>
                {ch.on
                  ? <span className="tag success"><span className="dot" /> 已接入</span>
                  : <button className="btn sm" onClick={() => toast(`已发起接入：${ch.n}`)}>接入</button>}
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-title"><Icon name="refresh" size={14} /> 续费 / 关怀自动化</div>
          <div className="muted text-xs mt-8">Aria 负责 · 触达内容自动起草后待你审核</div>
          <div className="version-feed mt-12">
            <div className="version-row"><span className="tag success"><span className="dot" />ON</span><span>到期前 7 天 · 续费提醒</span><span className="muted mono" style={{ marginLeft: "auto", fontSize: 11 }}>续费率 44%</span></div>
            <div className="version-row"><span className="tag success"><span className="dot" />ON</span><span>完课后 · 进阶课推荐</span><span className="muted mono" style={{ marginLeft: "auto", fontSize: 11 }}>转化 12%</span></div>
            <div className="version-row"><span className="tag"><span className="dot" />OFF</span><span>沉默 14 天 · 唤回关怀</span>
              <button className="btn sm" style={{ marginLeft: "auto" }} onClick={() => toast("已启用「沉默唤回」自动化")}>启用</button>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-title"><Icon name="bar" size={14} /> 本周服务数据</div>
          <div className="grid-3 mt-12" style={{ gap: 8 }}>
            <SignalCell n="86" l="答疑会话" />
            <SignalCell n="92%" l="AI 独立解决" />
            <SignalCell n="4.7" l="满意度" />
          </div>
        </div>
      </div>
    </div>
  );
}
