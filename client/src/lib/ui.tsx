import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { DetailDrawer, type DrawerSpec } from "../components/Drawer";
import { Icon } from "../components/Icon";

type ToastKind = "ok" | "info" | "warn";
interface ToastItem { id: number; msg: string; kind: ToastKind; }

interface UICtx {
  openDrawer: (d: DrawerSpec) => void;
  closeDrawer: () => void;
  toast: (msg: string, kind?: ToastKind) => void;
}

const Ctx = createContext<UICtx | null>(null);

export function useUI(): UICtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useUI must be used within UIProvider");
  return c;
}

let seq = 0;

export function UIProvider({ children }: { children: ReactNode }) {
  const [drawer, setDrawer] = useState<DrawerSpec | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const openDrawer = useCallback((d: DrawerSpec) => setDrawer(d), []);
  const closeDrawer = useCallback(() => setDrawer(null), []);
  const dismiss = useCallback((id: number) => setToasts(t => t.filter(x => x.id !== id)), []);
  const toast = useCallback((msg: string, kind: ToastKind = "ok") => {
    const id = ++seq;
    setToasts(t => [...t, { id, msg, kind }]);
    window.setTimeout(() => dismiss(id), 3400);
  }, [dismiss]);

  return (
    <Ctx.Provider value={{ openDrawer, closeDrawer, toast }}>
      {children}
      {drawer && <DetailDrawer drawer={drawer} onClose={closeDrawer} />}
      <div className="toast-stack">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.kind}`}>
            <Icon name={t.kind === "warn" ? "flag" : "check"} size={14} stroke={2} />
            <span className="toast-msg">{t.msg}</span>
            <button className="toast-x" onClick={() => dismiss(t.id)} aria-label="关闭">
              <Icon name="x" size={12} />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
