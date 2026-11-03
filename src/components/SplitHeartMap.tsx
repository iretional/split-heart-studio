import type { KeyboardEvent } from "react";
import { Icon, type IconName } from "./Icon";
import { CANVAS, HALF_BADGES, HALF_LABELS, KEY_SIZE, OUTLINE_DOTS, OUTLINES, SPLIT_HEART_KEY_COUNT, isLeftKey, keyTransform } from "../studio/splitHeartGeometry";

export type KeyState = "default" | "selected" | "transparent";
type Half = "left" | "right";

/** Crop of the Figma canvas shown when only one half fits on a phone. */
const HALF_VIEW: Record<Half, string> = { left: "50 78 425 440", right: "505 78 425 440" };

const KEY_CENTER = KEY_SIZE / 2;
/** Widest text that fits a key, inside its border. */
const KEY_TEXT_WIDTH = 44;
const MAX_CODE = 9;
const KEY_ICON = 20;

/** Splits a name at its middle space when it is too long for one line: "Left Ctrl" over two lines. */
function nameLines(name: string, oneLine: number) {
  if (name.length <= oneLine || !name.includes(" ")) return [name];
  const words = name.split(" ");
  let best = 1, smallest = Infinity;
  for (let n = 1; n < words.length; n++) {
    const longest = Math.max(words.slice(0, n).join(" ").length, words.slice(n).join(" ").length);
    if (longest < smallest) { smallest = longest; best = n; }
  }
  return [words.slice(0, best).join(" "), words.slice(best).join(" ")];
}

/** Text for one key. Lines too wide for the key are squeezed instead of spilling over its border. */
function KeyLabel({ name, code, compact }: { name: string; code: string; compact?: boolean }) {
  const charsPerLine = compact ? 5 : 9;
  const lineHeight = compact ? 20 : 12;
  const lines = nameLines(name, compact ? 5 : code ? 9 : 8);
  const shortCode = code.length > MAX_CODE ? code.slice(0, MAX_CODE - 1) + "…" : code;
  const rows = [...lines.map(text => ({ text, cls: undefined as string | undefined })), ...(shortCode && !compact ? [{ text: shortCode, cls: "key-code" }] : [])];
  const top = KEY_CENTER - (rows.length - 1) * lineHeight / 2;
  return <>{rows.map((r, n) => <text key={n} className={r.cls} x={KEY_CENTER} y={top + n * lineHeight} textAnchor="middle" dominantBaseline="central"
    {...(r.text.length > charsPerLine ? { textLength: KEY_TEXT_WIDTH, lengthAdjust: "spacingAndGlyphs" as const } : {})}>{r.text}</text>)}</>;
}

/** Split Heart drawn like the Figma canvas: case outline, half labels and L/R badges plus 60 keys. */
export function SplitHeartMap({ label, icon, code, hint, state, onSelect, compact, half, width, disabled }: {
  label: (i: number) => string; icon?: (i: number) => IconName | undefined; code?: (i: number) => string; hint?: (i: number) => string; state: (i: number) => KeyState; onSelect?: (i: number) => void;
  compact?: boolean; half?: Half; width?: number; disabled?: boolean;
}) {
  const { x, y, width: w, height: h } = CANVAS;
  const view = half ? HALF_VIEW[half] : compact ? "50 78 880 440" : `${x} ${y} ${w} ${h}`;
  const onKey = (i: number) => (e: KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect?.(i); } };
  return <svg viewBox={view} width={half ? "100%" : width ?? w} className={"key-svg split-heart" + (compact ? " compact" : "") + (disabled ? " disabled" : "")} aria-label="Split Heart layout">
    {OUTLINES.map((d, i) => <path key={i} className="case" d={d} />)}
    {OUTLINE_DOTS.map(([cx, cy], i) => <circle key={i} className="case-dot" cx={cx} cy={cy} r={2.2} />)}
    {HALF_BADGES.map(b => <g key={b.text}>
      <circle className="case" cx={b.cx} cy={b.cy} r={14.5} />
      {!compact && <text className="badge-label" x={b.cx} y={b.cy} textAnchor="middle" dominantBaseline="central">{b.text}</text>}
    </g>)}
    {!compact && !half && HALF_LABELS.map(l => <g key={l.text}>
      <line className="half-dash" x1={l.dashX} x2={l.dashX + 10} y1={l.y} y2={l.y} />
      <text className="half-label" x={l.textX} y={l.y} textAnchor={l.anchor} dominantBaseline="central">{l.text}</text>
    </g>)}
    {Array.from({ length: SPLIT_HEART_KEY_COUNT }, (_, i) => {
      if (half && isLeftKey(i) !== (half === "left")) return null;
      const st = state(i), text = label(i);
      return <g key={i} className={"key" + (st === "selected" ? " selected" : st === "transparent" ? " transparent" : "")} transform={keyTransform(i)}
        {...(onSelect && !disabled ? { role: "button", tabIndex: 0, "aria-label": `Position ${i} ${text}`, "aria-pressed": st === "selected", onClick: () => onSelect(i), onKeyDown: onKey(i) } : {})}>
        {hint?.(i) && <title>{hint(i)}</title>}
        <rect width={KEY_SIZE} height={KEY_SIZE} rx={compact ? 5 : 4} />
        {icon?.(i) && !code?.(i)
          ? <g transform={`translate(${KEY_CENTER - KEY_ICON / 2} ${KEY_CENTER - KEY_ICON / 2})`}><Icon name={icon(i)!} size={KEY_ICON} /></g>
          : <KeyLabel name={text} code={code?.(i) ?? ""} compact={compact} />}
      </g>;
    })}
  </svg>;
}

/** Mini Keymap component: key blocks only, darker where the layer binds the key. */
export function MiniKeymap({ bound, count = SPLIT_HEART_KEY_COUNT, fluid }: { bound: (i: number) => boolean; count?: number; fluid?: boolean }) {
  return <svg className={"mini-keymap" + (fluid ? " fluid" : "")} viewBox="55 84 870 428" aria-hidden="true">
    {Array.from({ length: SPLIT_HEART_KEY_COUNT }, (_, i) => <rect key={i} transform={keyTransform(i)} width={KEY_SIZE} height={KEY_SIZE} rx={6}
      className={i >= count ? "off" : bound(i) ? "on" : ""} />)}
  </svg>;
}
