import { useEffect, useState, type KeyboardEvent } from "react";
import type { KeyPhysicalAttrs, Layer } from "@zmkfirmware/zmk-studio-ts-client/keymap";
import { Icon } from "../components/Icon";
import { LockBanner, TopBar } from "../components/Shell";
import { bindingLabel, implicitMods, keyboardUsageLabel } from "../keyLabels";
import { CANVAS, HALF_BADGES, HALF_LABELS, KEY_SIZE, OUTLINE_DOTS, OUTLINES, SPLIT_HEART_KEY_COUNT, keyTransform } from "../studio/splitHeartGeometry";
import type { Studio } from "../studio/useStudio";

const pad2 = (n: number) => String(n).padStart(2, "0");

export function KeymapPage({ studio, onMenu }: { studio: Studio; onMenu: () => void }) {
  const { keymap, layout, names, locked, loading, refresh, disconnect, connected, device } = studio;
  const [layerIndex, setLayerIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [menu, setMenu] = useState(false);
  useEffect(() => { setLayerIndex(0); setSelected(null); }, [keymap]);
  const layer = keymap?.layers[layerIndex];
  const binding = selected === null ? null : layer?.bindings[selected] ?? null;
  const current = binding ? keyboardUsageLabel(binding.param1) : null;

  const tabs = keymap && <div className="tabs" role="tablist" aria-label="Layers">
    {keymap.layers.map((l, i) => <button key={l.id} role="tab" aria-selected={i === layerIndex}
      className={"tab" + (i === layerIndex ? " active" : "")}
      onClick={() => { setLayerIndex(i); setSelected(null); }}>{l.name || "Layer " + i}</button>)}
  </div>;

  return <>
    <TopBar title="Keymap" subtitle={device} tabs={tabs || undefined} connected={connected} onMenu={onMenu} actions={<>
      <span className="read-only t-caption muted desktop-only"><Icon name="lock" size={14} />Read only</span>
      <span className="divider desktop-only" />
      <span className="keyboard-name t-label desktop-only">{device.toUpperCase()}</span>
      <span className="divider desktop-only" />
      <span className="menu-anchor">
        <button className="icon-btn" aria-label="More" aria-expanded={menu} onClick={() => setMenu(m => !m)}><Icon name="more" size={18} /></button>
        {menu && <div className="popover card" role="menu" onClick={() => setMenu(false)}>
          <button role="menuitem" className="t-body" onClick={refresh} disabled={loading}>Refresh from keyboard</button>
          <button role="menuitem" className="t-body" onClick={disconnect}>Disconnect</button>
        </div>}
      </span>
    </>} />
    {locked && <LockBanner onRefresh={refresh} loading={loading} />}
    <div className="keymap-body">
      <section className="canvas">
        {layout && layer
          ? layout.keys.length === SPLIT_HEART_KEY_COUNT
            ? <SplitHeartSvg layer={layer} names={names} selected={selected} onSelect={setSelected} />
            : <KeyboardSvg keys={layout.keys} layer={layer} names={names} selected={selected} onSelect={setSelected} />
          : <div className="canvas-empty">
              <p className="t-body-strong">{locked ? "Unlock to load the keymap" : "Loading the keymap…"}</p>
              <p className="t-caption muted">{locked
                ? "Studio only shares the layout and bindings after you unlock on the keyboard, then press Refresh."
                : "Reading the physical layout and layers from the keyboard."}</p>
            </div>}
      </section>
      <Inspector locked={locked} count={layout?.keys.length ?? 0} layer={layer} layerIndex={layerIndex}
        names={names} selected={selected} onSelect={setSelected} />
      <KeycodePicker current={current} locked={locked} />
    </div>
  </>;
}

// --- Keyboard canvas -------------------------------------------------------

type KeyProps = { layer: Layer; names: Record<number, string>; selected: number | null; onSelect: (i: number) => void };

function keyFace(i: number, { layer, names, selected, onSelect }: KeyProps) {
  const b = layer.bindings[i];
  const label = b ? bindingLabel(b.behaviorId, b.param1, b.param2, names) : { title: "?", subtitle: "" };
  return {
    label,
    className: "key" + (selected === i ? " selected" : "") + (label.title === "▽" ? " transparent" : ""),
    a11y: {
      role: "button", tabIndex: 0, "aria-label": `Position ${i} ${label.title}`, "aria-pressed": selected === i,
      onClick: () => onSelect(i),
      onKeyDown: (e: KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(i); } },
    },
  };
}

/** Split Heart drawn exactly like the Figma canvas: 50px keys, case outline, half labels and L/R badges. */
function SplitHeartSvg(props: KeyProps) {
  const { x, y, width, height } = CANVAS;
  return <svg viewBox={`${x} ${y} ${width} ${height}`} width={width} className="key-svg split-heart" aria-label="Split Heart layout">
    {OUTLINES.map((d, i) => <path key={i} className="case" d={d} />)}
    {OUTLINE_DOTS.map(([cx, cy], i) => <circle key={i} className="case-dot" cx={cx} cy={cy} r={2.2} />)}
    {HALF_BADGES.map(b => <g key={b.text}>
      <circle className="case" cx={b.cx} cy={b.cy} r={14.5} />
      <text className="badge-label" x={b.cx} y={b.cy} textAnchor="middle" dominantBaseline="central">{b.text}</text>
    </g>)}
    {HALF_LABELS.map(l => <g key={l.text}>
      <line className="half-dash" x1={l.x} x2={l.x + 10} y1={l.y} y2={l.y} />
      <text className="half-label" x={l.x + 20} y={l.y} dominantBaseline="central">{l.text}</text>
    </g>)}
    {Array.from({ length: SPLIT_HEART_KEY_COUNT }, (_, i) => {
      const { label, className, a11y } = keyFace(i, props);
      return <g key={i} className={className} transform={keyTransform(i)} {...a11y}>
        <rect width={KEY_SIZE} height={KEY_SIZE} rx={4} />
        <text x={KEY_SIZE / 2} y={KEY_SIZE / 2} textAnchor="middle" dominantBaseline="central">{label.title}</text>
      </g>;
    })}
  </svg>;
}

// Generic fallback for other keyboards: draws the layout the firmware reports.

/** Figma draws a 1u key at 50px inside a 56px pitch; ZMK layouts use 100 units per 1u. */
const PX_PER_UNIT = 0.56;
const INSET = 3 / PX_PER_UNIT;
const CASE_MARGIN = 26 / PX_PER_UNIT;

type Pt = [number, number];

function corners(k: KeyPhysicalAttrs, m: number): Pt[] {
  const pts: Pt[] = [[k.x - m, k.y - m], [k.x + k.width + m, k.y - m], [k.x + k.width + m, k.y + k.height + m], [k.x - m, k.y + k.height + m]];
  if (!k.r) return pts;
  const a = (k.r / 100) * Math.PI / 180, cos = Math.cos(a), sin = Math.sin(a);
  return pts.map(([x, y]) => [k.rx + (x - k.rx) * cos - (y - k.ry) * sin, k.ry + (x - k.rx) * sin + (y - k.ry) * cos]);
}

function hull(points: Pt[]): Pt[] {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: Pt, a: Pt, b: Pt) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (pts: Pt[]) => { const out: Pt[] = []; for (const q of pts) { while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], q) <= 0) out.pop(); out.push(q); } out.pop(); return out; };
  return [...half(p), ...half(p.reverse())];
}

function KeyboardSvg({ keys, layer, names, selected, onSelect }: {
  keys: KeyPhysicalAttrs[]; layer: Layer; names: Record<number, string>;
  selected: number | null; onSelect: (i: number) => void;
}) {
  const centerX = (k: KeyPhysicalAttrs) => corners(k, 0).reduce((s, p) => s + p[0], 0) / 4;
  const cxs = keys.map(centerX);
  const mid = (Math.min(...cxs) + Math.max(...cxs)) / 2;
  const halves = [keys.filter((_, i) => cxs[i] < mid), keys.filter((_, i) => cxs[i] >= mid)]
    .filter(h => h.length).map(h => hull(h.flatMap(k => corners(k, CASE_MARGIN))));
  const all = halves.flat();
  const minX = Math.min(...all.map(p => p[0])), maxX = Math.max(...all.map(p => p[0]));
  const minY = Math.min(...all.map(p => p[1])) - 60, maxY = Math.max(...all.map(p => p[1]));
  const w = maxX - minX + 8, h = maxY - minY + 8;
  const labels = halves.length === 2 ? ["LEFT · CENTRAL", "RIGHT · PERIPHERAL"] : ["KEYBOARD"];

  return <svg viewBox={`${minX - 4} ${minY - 4} ${w} ${h}`} width={w * PX_PER_UNIT} className="key-svg" aria-label="Physical layout">
    {halves.map((pts, i) => {
      const top = Math.min(...pts.map(p => p[1])), left = Math.min(...pts.map(p => p[0]));
      return <g key={i}>
        <path className="case" d={"M" + pts.map(p => p.join(",")).join("L") + "Z"} />
        <line className="half-dash" x1={left} x2={left + 18 / PX_PER_UNIT} y1={top - 30} y2={top - 30} />
        <text className="half-label" x={left + 28 / PX_PER_UNIT} y={top - 30} dominantBaseline="central">{labels[i]}</text>
      </g>;
    })}
    {keys.map((key, i) => {
      const { label, className, a11y } = keyFace(i, { layer, names, selected, onSelect });
      const rotation = key.r ? `rotate(${key.r / 100} ${key.rx} ${key.ry})` : undefined;
      return <g key={i} className={className} transform={rotation} {...a11y}>
        <rect x={key.x + INSET} y={key.y + INSET} width={key.width - INSET * 2} height={key.height - INSET * 2} rx={4 / PX_PER_UNIT} />
        <text textAnchor="middle" dominantBaseline="central" x={key.x + key.width / 2} y={key.y + key.height / 2}>{label.title}</text>
      </g>;
    })}
  </svg>;
}

// --- Inspector -------------------------------------------------------------

function Inspector({ locked, count, layer, layerIndex, names, selected, onSelect }: {
  locked: boolean; count: number; layer?: Layer; layerIndex: number;
  names: Record<number, string>; selected: number | null; onSelect: (i: number) => void;
}) {
  if (locked) return <aside className="inspector empty">
    <span className="ring"><Icon name="lock" size={20} /></span>
    <p className="t-body-strong">Editing is locked</p>
    <p className="t-caption muted">You can look around, but changes are blocked until you unlock on the keyboard.</p>
  </aside>;
  const binding = selected === null ? null : layer?.bindings[selected];
  if (selected === null || !binding || !count) return <aside className="inspector empty">
    <p className="t-body-strong">Select a key</p>
    <p className="t-caption muted">Click any key to see its behavior and parameters.</p>
  </aside>;

  const behavior = names[binding.behaviorId] ?? "Behavior #" + binding.behaviorId;
  const label = bindingLabel(binding.behaviorId, binding.param1, binding.param2, names);
  const mods = implicitMods(binding.param1);
  const holdTap = behavior.toLowerCase().includes("hold");
  return <aside className="inspector" aria-label="Key properties">
    <div className="key-header">
      <span className="t-caption muted">KEY</span>
      <div className="key-row">
        <span className="t-display">{pad2(selected)}</span>
        <span>
          <button className="icon-btn" aria-label="Previous key" onClick={() => onSelect((selected + count - 1) % count)}><Icon name="chevronLeft" /></button>
          <button className="icon-btn" aria-label="Next key" onClick={() => onSelect((selected + 1) % count)}><Icon name="chevronRight" /></button>
        </span>
      </div>
    </div>
    <div className="field"><span className="t-caption muted">BEHAVIOR</span>
      <div className="box t-body">{behavior}<Icon name="chevronDown" size={14} /></div></div>
    <div className="field"><span className="t-caption muted">KEYCODE</span>
      <div className="box t-body-strong">{keyboardUsageLabel(binding.param1) ?? label.title}<Icon name="close" size={14} /></div></div>
    <div className="field"><span className="t-caption muted">MODIFIERS</span>
      <div className="mods">{["Ctrl", "Shift", "Alt", "GUI"].map(m => <span key={m} className={"check" + (mods.includes(m) ? " on" : "")}>
        <i>{mods.includes(m) && <Icon name="check" size={10} />}</i>{m}</span>)}</div></div>
    <div className="hold-row">
      <span className="t-caption variant">HOLD FOR LAYER</span>
      <span className={"toggle" + (holdTap ? " on" : "")} role="switch" aria-checked={holdTap} aria-readonly="true"><i /></span>
    </div>
    <div className="accordion">
      <details>
        <summary className="t-caption">ADVANCED <Icon name="chevronRight" size={12} /></summary>
        <dl className="t-caption">
          <dt className="muted">Position</dt><dd>{selected}</dd>
          <dt className="muted">Layer</dt><dd>{layer?.name || layerIndex}</dd>
          <dt className="muted">Behavior ID</dt><dd>{binding.behaviorId}</dd>
          <dt className="muted">Param 1</dt><dd className="t-code">0x{binding.param1.toString(16)}</dd>
          <dt className="muted">Param 2</dt><dd className="t-code">0x{binding.param2.toString(16)}</dd>
        </dl>
      </details>
      {["TAP / HOLD", "MACRO", "VISUAL"].map(t => <div key={t} className="accordion-row t-caption">{t}<Icon name="chevronRight" size={12} /></div>)}
    </div>
  </aside>;
}

// --- Keycode picker (shown read-only until editing is enabled) -------------

const CATEGORIES = ["BASIC", "MODIFIERS", "NAVIGATION", "MEDIA", "LAYER", "MOUSE", "MACRO", "CUSTOM"];
const ROWS = ["ABCDEFGHIJKLM".split(""), "NOPQRSTUVWXYZ".split(""), [..."1234567890".split(""), "Enter", "Esc"]];

function KeycodePicker({ current, locked }: { current: string | null; locked: boolean }) {
  const wide: [string, "back" | "tab" | null][] = [["Backspace", "back"], ["Tab", "tab"], ["Space", null]];
  const is = (k: string) => current === k || (k === "Backspace" && current === "Bksp");
  return <section className={"picker" + (locked ? " locked" : "")} aria-label="Keycodes (read only)">
    <div className="picker-head">
      <div className="tabs">{CATEGORIES.map((c, i) => <span key={c} className={"tab" + (i === 0 ? " active" : "")}>{c}</span>)}</div>
      <label className="search box t-body muted"><Icon name="search" size={14} /><input placeholder="Search keycodes…" disabled /></label>
    </div>
    <div className="picker-grid">
      <div className="picker-keys">{ROWS.map((row, r) => <div key={r} className="picker-row">
        {row.map(k => <span key={k} className={"keycode t-body" + (k === "Enter" ? " span2" : "") + (is(k) ? " current" : "")}>{k}</span>)}
      </div>)}</div>
      <div className="picker-wide">{wide.map(([k, icon]) => <span key={k} className={"keycode t-body" + (is(k) ? " current" : "")}>
        {icon === "back" && <Icon name="arrowLeft" size={16} />}{icon === "tab" && <Icon name="tab" size={16} />}{k}</span>)}</div>
    </div>
  </section>;
}
