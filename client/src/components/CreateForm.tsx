import { useState } from "react";
import { Icon } from "./Icon";
import { useUI } from "../lib/ui";

export interface CreateField {
  name: string;
  label: string;
  placeholder?: string;
  type?: "text" | "textarea" | "select";
  options?: string[];
  required?: boolean;
}

interface Props {
  intro?: string;
  fields: CreateField[];
  submitLabel: string;
  successMsg: (values: Record<string, string>) => string;
  /** Optional handler — if returns a Promise that rejects, drawer stays open. */
  onSubmit?: (values: Record<string, string>) => Promise<void> | void;
  /** Pre-fill values (for edit mode). */
  defaults?: Record<string, string>;
}

export function CreateForm({ intro, fields, submitLabel, successMsg, onSubmit, defaults }: Props) {
  const { toast, closeDrawer } = useUI();
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = { ...defaults };
    for (const f of fields) {
      if (init[f.name] === undefined && f.type === "select" && f.options?.[0]) init[f.name] = f.options[0];
    }
    return init;
  });
  const [submitting, setSubmitting] = useState(false);

  const set = (n: string, v: string) => setValues(s => ({ ...s, [n]: v }));
  // Required fields default to "first field is required" (legacy) or the explicit `required` flag.
  const requiredNames = fields.filter(f => f.required).map(f => f.name);
  const checkNames = requiredNames.length > 0 ? requiredNames : (fields[0] ? [fields[0].name] : []);
  const valid = checkNames.every(n => (values[n]?.trim().length ?? 0) > 0);

  const submit = async (): Promise<void> => {
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      if (onSubmit) await onSubmit(values);
      toast(successMsg(values));
      closeDrawer();
    } catch (e) {
      toast(`失败：${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {intro && <div className="card soft" style={{ fontSize: 13, color: "var(--text-2)" }}>{intro}</div>}
      {fields.map(f => (
        <div key={f.name} className="mt-16">
          <div className="muted text-xs mono" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>{f.label}</div>
          <div className="mt-8">
            {f.type === "textarea" ? (
              <textarea className="textarea-input" placeholder={f.placeholder}
                value={values[f.name] ?? ""} onChange={e => set(f.name, e.target.value)} />
            ) : f.type === "select" ? (
              <div className="seg">
                {(f.options ?? []).map(o => (
                  <button key={o} className={values[f.name] === o ? "active" : ""} onClick={() => set(f.name, o)}>{o}</button>
                ))}
              </div>
            ) : (
              <input className="text-input" placeholder={f.placeholder}
                value={values[f.name] ?? ""} onChange={e => set(f.name, e.target.value)} />
            )}
          </div>
        </div>
      ))}
      <div className="mt-16" style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button className="btn ghost" onClick={closeDrawer} disabled={submitting}>取消</button>
        <button className="btn primary" disabled={!valid || submitting} onClick={() => void submit()}>
          <Icon name="check" size={12} /> {submitting ? "提交中…" : submitLabel}
        </button>
      </div>
    </div>
  );
}
