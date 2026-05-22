import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import { useAuth } from "../lib/auth";
import type { ViewId } from "./Shell";

export function UserMenu({ onNav }: { onNav?: (id: ViewId) => void }) {
  const { user, session, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  if (!user) return null;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        className="avatar"
        title={user.name}
        onClick={() => setOpen(o => !o)}
        style={{ cursor: "pointer", marginLeft: 6 }}
      >
        {user.initials}
      </button>
      {open && (
        <div className="user-menu">
          <div className="user-menu-head">
            <div className="avatar" style={{ width: 36, height: 36, borderRadius: 10, fontSize: 13, margin: 0 }}>
              {user.initials}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 500, fontSize: 13 }}>{user.name}</div>
              <div className="muted text-xs mono">
                {session?.channel === "wechat" ? "微信登录" : "手机号登录"}
                {user.phone && ` · ${user.phone}`}
              </div>
            </div>
          </div>
          <div className="user-menu-divider" />
          <button className="user-menu-item" onClick={() => { setOpen(false); onNav?.("settings"); }}>
            <Icon name="settings" size={13} /> <span>账户设置</span>
          </button>
          <button className="user-menu-item" onClick={() => { setOpen(false); onNav?.("runs"); }}>
            <Icon name="activity" size={13} /> <span>运行记录</span>
          </button>
          <div className="user-menu-divider" />
          <button className="user-menu-item danger" onClick={() => void signOut()}>
            <Icon name="logout" size={13} /> <span>退出登录</span>
          </button>
        </div>
      )}
    </div>
  );
}
