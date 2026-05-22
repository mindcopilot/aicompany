import { useEffect, useState } from "react";

export type Accent = "indigo" | "sage" | "amber" | "slate";
export type Density = "comfortable" | "compact";
export type Layout = "sidebar" | "top";

export interface Tweaks {
  accent: Accent;
  density: Density;
  layout: Layout;
}

const DEFAULT_TWEAKS: Tweaks = { accent: "indigo", density: "comfortable", layout: "sidebar" };
const STORAGE_KEY = "lumenedu.tweaks.v1";

export function useTweaks(): [Tweaks, <K extends keyof Tweaks>(k: K, v: Tweaks[K]) => void] {
  const [t, setT] = useState<Tweaks>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...DEFAULT_TWEAKS, ...(JSON.parse(raw) as Partial<Tweaks>) };
    } catch {}
    return DEFAULT_TWEAKS;
  });

  useEffect(() => {
    document.body.dataset.accent = t.accent;
    document.body.className = t.density === "compact" ? "density-compact" : "density-normal";
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(t)); } catch {}
  }, [t]);

  function set<K extends keyof Tweaks>(k: K, v: Tweaks[K]) {
    setT(prev => ({ ...prev, [k]: v }));
  }

  return [t, set];
}

const ACCENT_SWATCH: Record<Accent, string> = {
  indigo: "#4f46e5",
  sage:   "#2f7d5b",
  amber:  "#b45309",
  slate:  "#334155",
};

export function TweaksPanel({ t, setTweak }: { t: Tweaks; setTweak: <K extends keyof Tweaks>(k: K, v: Tweaks[K]) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: "fixed", right: 90, bottom: 24, zIndex: 70 }}>
      {open && (
        <div style={{
          width: 240, padding: 14, borderRadius: 12,
          background: "rgba(250,249,247,0.92)", backdropFilter: "blur(20px) saturate(160%)",
          border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
          marginBottom: 8, fontSize: 12,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <strong style={{ fontSize: 12.5 }}>Tweaks</strong>
            <button className="icon-btn" style={{ width: 22, height: 22 }} onClick={() => setOpen(false)}>×</button>
          </div>

          <Section label="Accent">
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              {(Object.keys(ACCENT_SWATCH) as Accent[]).map(a => (
                <button key={a} onClick={() => setTweak("accent", a)}
                  title={a}
                  style={{
                    width: 22, height: 22, borderRadius: 6, border: t.accent === a ? "2px solid #111" : "1px solid rgba(0,0,0,0.1)",
                    background: ACCENT_SWATCH[a], cursor: "pointer", padding: 0,
                  }} />
              ))}
            </div>
          </Section>

          <Section label="信息密度">
            <Seg
              value={t.density}
              options={[{ v: "comfortable", l: "舒适" }, { v: "compact", l: "紧凑" }]}
              onChange={v => setTweak("density", v as Density)}
            />
          </Section>

          <Section label="导航布局">
            <Seg
              value={t.layout}
              options={[{ v: "sidebar", l: "左侧栏" }, { v: "top", l: "顶导航" }]}
              onChange={v => setTweak("layout", v as Layout)}
            />
          </Section>
        </div>
      )}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: 44, height: 44, borderRadius: 12, border: "1px solid rgba(0,0,0,0.08)",
          background: "rgba(255,255,255,0.92)", backdropFilter: "blur(20px)",
          boxShadow: "0 6px 20px rgba(0,0,0,0.10)", cursor: "pointer", fontSize: 18,
        }}
        title="Tweaks"
      >⚙</button>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(0,0,0,0.45)" }}>{label}</div>
      {children}
    </div>
  );
}

function Seg({ value, options, onChange }: { value: string; options: { v: string; l: string }[]; onChange: (v: string) => void }) {
  return (
    <div style={{ display: "flex", padding: 2, background: "rgba(0,0,0,0.06)", borderRadius: 7, marginTop: 6 }}>
      {options.map(o => (
        <button key={o.v} onClick={() => onChange(o.v)}
          style={{
            flex: 1, padding: "4px 8px", fontSize: 11.5, border: "none", borderRadius: 5,
            background: value === o.v ? "#fff" : "transparent",
            boxShadow: value === o.v ? "0 1px 2px rgba(0,0,0,0.12)" : "none",
            color: "inherit", cursor: "pointer",
          }}>{o.l}</button>
      ))}
    </div>
  );
}
