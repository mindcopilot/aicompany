import type { ReactNode } from "react";
import { Icon } from "./Icon";

export interface DrawerSpec {
  eyebrow: string;
  title: string;
  sub?: string;
  body: ReactNode;
}

export function DetailDrawer({ drawer, onClose }: { drawer: DrawerSpec; onClose: () => void }) {
  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-head">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div className="muted text-xs mono" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>{drawer.eyebrow}</div>
              <h2 style={{ margin: "4px 0 4px", fontSize: 18, fontWeight: 500, letterSpacing: "-0.01em" }}>{drawer.title}</h2>
              <div className="muted text-sm">{drawer.sub}</div>
            </div>
            <button className="icon-btn" onClick={onClose}><Icon name="x" size={16} /></button>
          </div>
        </div>
        <div className="drawer-body">{drawer.body}</div>
      </div>
    </>
  );
}
