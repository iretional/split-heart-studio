import { useState, type ReactNode } from "react";
import { Icon } from "./Icon";

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return <div className={"field" + (className ? " " + className : "")}><span className="t-caption muted">{label}</span>{children}</div>;
}

/** Select component: a native select so keyboard and phone pickers keep working. */
export function Select<T extends string>({ value, options, onChange, disabled, label }: {
  value: T; options: readonly { value: T; label: string }[]; onChange: (v: T) => void; disabled?: boolean; label?: string;
}) {
  return <span className={"select" + (disabled ? " disabled" : "")}>
    <select className="t-body" value={value} disabled={disabled} aria-label={label} onChange={e => onChange(e.target.value as T)}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
    <Icon name="chevronDown" size={14} />
  </span>;
}

export function Checkbox({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return <button type="button" role="checkbox" aria-checked={checked} disabled={disabled} className={"check" + (checked ? " on" : "")} onClick={() => onChange(!checked)}>
    <i>{checked && <Icon name="check" size={10} />}</i><span className="t-body variant">{label}</span>
  </button>;
}

export function Segmented<T extends string>({ value, options, onChange, label }: {
  value: T; options: readonly T[]; onChange: (v: T) => void; label: string;
}) {
  return <div className="segmented" role="radiogroup" aria-label={label}>
    {options.map(o => <button key={o} type="button" role="radio" aria-checked={o === value}
      className={"segment t-label" + (o === value ? " active" : "")} onClick={() => onChange(o)}>{o}</button>)}
  </div>;
}

export const DragHandle = () => <svg className="drag" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
  {[3, 8, 13].flatMap(y => [6, 10].map(x => <rect key={x + "-" + y} x={x - 1} y={y - 1} width="2" height="2" rx="1" />))}
</svg>;

export function CopyButton({ text, label, primary }: { text: string; label: string; primary?: boolean }) {
  const [done, setDone] = useState(false);
  return <button className={"btn" + (primary ? " btn-primary" : "")} onClick={() => {
    void navigator.clipboard?.writeText(text);
    setDone(true); setTimeout(() => setDone(false), 1500);
  }}>{done ? "Copied" : label}</button>;
}

export function Notice({ title, children, danger }: { title?: string; children: ReactNode; danger?: boolean }) {
  return <div className={"notice" + (danger ? " danger" : "")}>
    <Icon name={danger ? "warning" : "info"} />
    <div className="notice-text">
      {title && <span className={"t-body-strong" + (danger ? " danger-text" : "")}>{title}</span>}
      <span className="t-caption variant">{children}</span>
    </div>
  </div>;
}
