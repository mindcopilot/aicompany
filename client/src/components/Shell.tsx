import { Icon } from "./Icon";
import { UserMenu } from "./UserMenu";

export type ViewId =
  | "dashboard"
  | "direction" | "validation"
  | "product" | "content" | "traffic" | "reach"
  | "data"
  | "models" | "knowledge" | "prompts" | "skills" | "agents" | "automations";

export interface NavItem { id: ViewId; name: string; icon: string; badge?: string | null; }
export interface NavGroup { group: string; items: NavItem[]; }

export const NAV: NavGroup[] = [
  { group: "概览", items: [
    { id: "dashboard", name: "Dashboard", icon: "home", badge: null },
  ]},
  { group: "战略 · STRATEGY", items: [
    { id: "direction",  name: "方向选择", icon: "compass", badge: "AI" },
    { id: "validation", name: "方向论证", icon: "target",  badge: "AI" },
  ]},
  { group: "执行 · EXECUTION", items: [
    { id: "product", name: "业务线上化", icon: "layers",  badge: "3/5" },
    { id: "content", name: "内容工厂",   icon: "sparkle", badge: "AI" },
    { id: "traffic", name: "流量分发",   icon: "radio",   badge: "6" },
    { id: "reach",   name: "用户触达",   icon: "users",   badge: null },
  ]},
  { group: "验证 · MEASUREMENT", items: [
    { id: "data", name: "数据中心", icon: "bar", badge: null },
  ]},
  { group: "AI 资产 · INTELLIGENCE", items: [
    { id: "models",      name: "模型管理",   icon: "cpu",  badge: "26" },
    { id: "knowledge",   name: "知识库",     icon: "book", badge: "218" },
    { id: "prompts",     name: "Prompts",    icon: "msg",  badge: "6" },
    { id: "skills",      name: "Skills",     icon: "bolt", badge: "14" },
    { id: "agents",      name: "Agent 编排", icon: "git",  badge: "AI" },
    { id: "automations", name: "自动化",     icon: "zap",  badge: "4" },
  ]},
];

export function Topbar({
  active, onNav, layout, onOpenCopilot, agentBusy, shortName,
}: {
  active: ViewId; onNav: (id: ViewId) => void; layout: "sidebar" | "top";
  onOpenCopilot: () => void; agentBusy: boolean; shortName: string;
}) {
  return (
    <div className="topbar">
      <div className="brand">
        <div className="brand-mark">L</div>
        <div>
          <div className="brand-text">{shortName}</div>
          <div className="brand-sub">v0.4 · founder mode</div>
        </div>
      </div>
      {layout === "top" ? (
        <div className="topbar-tabs">
          {NAV.flatMap(g => g.items).map(it => (
            <button key={it.id} className={`topbar-tab ${active === it.id ? "active" : ""}`} onClick={() => onNav(it.id)}>
              {it.name}
            </button>
          ))}
        </div>
      ) : (
        <div className="topbar-search">
          <Icon name="search" size={14} />
          <input placeholder="搜索方向、内容、用户、指标…" />
          <kbd>⌘K</kbd>
        </div>
      )}
      <div className="topbar-spacer" />
      <button className={`agent-pill ${agentBusy ? "" : "idle"}`} onClick={onOpenCopilot}>
        <span className="pulse" />
        <span><strong>Agent</strong> {agentBusy ? "工作中" : "待命中"}</span>
        <span className="count">3 active</span>
      </button>
      <div className="topbar-right">
        <button className="icon-btn"><Icon name="bell" size={16} /><span className="dot" /></button>
        <button className="icon-btn"><Icon name="settings" size={16} /></button>
        <UserMenu />
      </div>
    </div>
  );
}

export function Sidebar({ active, onNav }: { active: ViewId; onNav: (id: ViewId) => void; }) {
  return (
    <aside className="sidebar">
      {NAV.map(group => (
        <div key={group.group} className="nav-group">
          <div className="nav-label">
            <span>{group.group}</span>
            <span className="count">{group.items.length}</span>
          </div>
          {group.items.map(it => (
            <button key={it.id} className={`nav-item ${active === it.id ? "active" : ""}`} onClick={() => onNav(it.id)}>
              <span className="nav-icon"><Icon name={it.icon} size={15} /></span>
              <span>{it.name}</span>
              {it.badge && <span className={`nav-badge ${it.badge === "AI" ? "live" : ""}`}>{it.badge}</span>}
            </button>
          ))}
        </div>
      ))}
      <div className="sidebar-footer">
        <div className="workspace-card">
          <div className="title"><span>北极星指标</span><Icon name="star" size={12} /></div>
          <div className="mono" style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em" }}>
            92 <span style={{ color: "var(--text-3)", fontSize: 12, fontWeight: 400 }}>付费用户</span>
          </div>
          <div className="bar"><i style={{ width: "61%" }} /></div>
          <div className="meta"><span>目标 150</span><span>61%</span></div>
        </div>
      </div>
    </aside>
  );
}
