import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import type { KeyPhysicalAttrs, Layer } from "@zmkfirmware/zmk-studio-ts-client/keymap";
import { Icon } from "../components/Icon";
import { LockBanner, TopBar } from "../components/Shell";
import { SplitHeartMap } from "../components/SplitHeartMap";
import { Checkbox, Segmented } from "../components/ui";
import { ALL_KEYCODES, KEYCODES, WIDE_KEYS, bindingLabel, implicitMods, keyboardUsageLabel, keycodeForUsage, toggleMod, type Keycode } from "../keyLabels";
import { behaviorId, isTransparent, keyText } from "../studio/bindings";
import { useIsMobile, type Prefs } from "../studio/prefs";
import { SPLIT_HEART_KEY_COUNT, isLeftKey, positionName } from "../studio/splitHeartGeometry";
import type { Studio } from "../studio/useStudio";

export type KeyFocus = { layer: number; key: number };

const CATEGORIES = ["BASIC", "MODIFIERS", "NAVIGATION", "MEDIA", "LAYER", "MOUSE", "MACRO", "CUSTOM"] as const;
type Category = typeof CATEGORIES[number];
const MOBILE_CATEGORIES = CATEGORIES.slice(0, 5);
const MODS = ["Ctrl", "Shift", "Alt", "GUI"];

const bindingSummary = (behavior: string, mods: string[]) => `${behavior} · ${mods.length ? mods.join(" + ") : "no modifiers"}`;

export function KeymapPage({ studio, onMenu, prefs, focus }: { studio: Studio; onMenu: () => void; prefs: Prefs; focus: KeyFocus | null }) {
  const { keymap, layout, names, locked, loading, refresh, setBinding, addLayer, error } = studio;
  const [layerIndex, setLayerIndex] = useState(focus?.layer ?? 0);
  const [selected, setSelected] = useState<number | null>(focus?.key ?? 0);
  const [half, setHalf] = useState<"Left" | "Right">("Left");
  const [category, setCategory] = useState<Category>("BASIC");
  const mobile = useIsMobile();
  useEffect(() => { if (focus) { setLayerIndex(focus.layer); setSelected(focus.key); } }, [focus]);
  useEffect(() => { if (selected !== null && mobile) setHalf(isLeftKey(selected) ? "Left" : "Right"); }, [selected, mobile]);
  const layer = keymap?.layers[Math.min(layerIndex, keymap.layers.length - 1)];
  const binding = selected === null ? null : layer?.bindings[selected] ?? null;
  const behavior = binding ? names[binding.behaviorId] ?? "Behavior #" + binding.behaviorId : "";
  const mods = binding ? implicitMods(binding.param1) : [];
  const count = layout?.keys.length ?? SPLIT_HEART_KEY_COUNT;
  const isSplitHeart = !layout || layout.keys.length === SPLIT_HEART_KEY_COUNT;
  const keyPress = behaviorId(names, /key ?press/i);
  const momentary = behaviorId(names, /momentary/i);
  const canEdit = !locked && !!layer && selected !== null;

  const applyKey = (usage: number) => {
    if (!canEdit || !keyPress || selected === null || !layer) return;
    const keepMods = binding && String(binding.behaviorId) === keyPress ? binding.param1 & 0xff000000 : 0;
    void setBinding(layer.id, selected, { behaviorId: Number(keyPress), param1: (keepMods | usage) >>> 0, param2: 0 });
  };
  const applyLayer = (index: number) => {
    if (!canEdit || !momentary || selected === null || !layer) return;
    void setBinding(layer.id, selected, { behaviorId: Number(momentary), param1: index, param2: 0 });
  };
  const toggleModifier = (name: string) => {
    if (!canEdit || !binding || selected === null || !layer) return;
    void setBinding(layer.id, selected, { ...binding, param1: toggleMod(binding.param1, name) });
  };

  const tabs = <div className="tabs layer-tabs" role="tablist" aria-label="Layers">
    {keymap ? keymap.layers.map((l, i) => <button key={l.id} role="tab" aria-selected={i === layerIndex}
      className={"tab t-label" + (i === layerIndex ? " active" : "")}
      onClick={() => setLayerIndex(i)}>{l.name || "Layer " + i}</button>)
      : <span className="tab t-label active">LAYER 0</span>}
    <button className="add-layer" aria-label="Add layer" disabled={!keymap || keymap.availableLayers <= 0} onClick={() => void addLayer()}><Icon name="plus" size={14} /></button>
  </div>;

  const label = (i: number) => layer ? keyText(i, layer.bindings[i], names, prefs.keyLabels) : positionName(i);
  const state = (i: number) => selected === i ? "selected" as const : layer && isTransparent(layer.bindings[i], names) ? "transparent" as const : "default" as const;
  const step = (d: number) => setSelected(s => ((s ?? 0) + d + count) % count);

  return <>
    <TopBar title="Keymap" subtitle={studio.device} tabs={tabs} studio={studio} onMenu={onMenu} />
    {locked && <LockBanner onRefresh={refresh} loading={loading} />}
    <div className={"keymap-body" + (locked ? " locked" : "")}>
      <section className="canvas">
        {mobile && <div className="half-switch"><Segmented label="Keyboard half" value={half} options={["Left", "Right"] as const} onChange={setHalf} />
          <span className="t-caption muted">{half === "Left" ? "LEFT · CENTRAL" : "RIGHT · PERIPHERAL"}</span></div>}
        {isSplitHeart
          ? <SplitHeartMap half={mobile ? (half === "Left" ? "left" : "right") : undefined} disabled={locked} label={label} state={state} onSelect={setSelected} />
          : layer && layout && <KeyboardSvg keys={layout.keys} layer={layer} names={names} selected={selected} onSelect={setSelected} />}
      </section>
      <Inspector locked={locked} layer={layer} names={names} selected={selected} count={count} behavior={behavior} mods={mods} onSelect={setSelected} onToggleMod={toggleModifier} onClear={() => applyKey(0)} />
      <KeycodePicker locked={locked} current={binding?.param1 ?? null} category={category} onCategory={setCategory} layers={keymap?.layers ?? []} onKey={applyKey} onLayer={applyLayer} />
      <section className="key-sheet mobile-only" aria-label="Selected key">
        <div className="sheet-handle" />
        <div className="sheet-header">
          <span className="key-badge t-body-strong">{selected === null ? "—" : positionName(selected)}</span>
          <span className="sheet-binding"><span className="t-body-strong">{locked ? "Locked" : binding ? keyboardUsageLabel(binding.param1) ?? bindingLabel(binding.behaviorId, binding.param1, binding.param2, names).title : "No key"}</span>
            <span className="t-caption muted">{locked ? "Unlock on the keyboard to edit" : binding ? bindingSummary(behavior, mods) : ""}</span></span>
          <span className="prev-next">
            <button className="btn square" aria-label="Previous key" onClick={() => step(-1)}><Icon name="chevronLeft" /></button>
            <button className="btn square" aria-label="Next key" onClick={() => step(1)}><Icon name="chevronRight" /></button>
          </span>
        </div>
        <div className="tabs category-tabs">{MOBILE_CATEGORIES.map(c => <button key={c} className={"tab t-label" + (c === category ? " active" : "")} onClick={() => setCategory(c)}>{c}</button>)}</div>
        <div className={"sheet-grid" + (locked ? " locked" : "")}><KeycodeGrid category={category} current={binding?.param1 ?? null} layers={keymap?.layers ?? []} onKey={applyKey} onLayer={applyLayer} /></div>
      </section>
    </div>
    {error && <p className="t-caption danger-text page-error">{error.message}</p>}
  </>;
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
      const b = layer.bindings[i];
      const title = b ? bindingLabel(b.behaviorId, b.param1, b.param2, names).title : "?";
      const rotation = key.r ? `rotate(${key.r / 100} ${key.rx} ${key.ry})` : undefined;
      return <g key={i} className={"key" + (selected === i ? " selected" : "") + (title === "▽" ? " transparent" : "")} transform={rotation}
        role="button" tabIndex={0} aria-label={`Position ${i} ${title}`} aria-pressed={selected === i} onClick={() => onSelect(i)}
        onKeyDown={(e: KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(i); } }}>
        <rect x={key.x + INSET} y={key.y + INSET} width={key.width - INSET * 2} height={key.height - INSET * 2} rx={4 / PX_PER_UNIT} />
        <text textAnchor="middle" dominantBaseline="central" x={key.x + key.width / 2} y={key.y + key.height / 2}>{title}</text>
      </g>;
    })}
  </svg>;
}

// --- Inspector -------------------------------------------------------------

function Inspector({ locked, layer, names, selected, count, behavior, mods, onSelect, onToggleMod, onClear }: {
  locked: boolean; layer?: Layer; names: Record<number, string>; selected: number | null; count: number;
  behavior: string; mods: string[]; onSelect: (i: number) => void; onToggleMod: (m: string) => void; onClear: () => void;
}) {
  if (locked) return <aside className="inspector empty">
    <span className="ring"><Icon name="lock" size={20} /></span>
    <p className="t-body-strong">Editing is locked</p>
    <p className="t-caption muted">You can look around, but changes are blocked until you unlock on the keyboard.</p>
  </aside>;
  const binding = selected === null ? null : layer?.bindings[selected];
  if (selected === null || !binding) return <aside className="inspector empty">
    <p className="t-body-strong">Select a key</p>
    <p className="t-caption muted">Click any key to see its behavior and parameters.</p>
  </aside>;

  const label = bindingLabel(binding.behaviorId, binding.param1, binding.param2, names);
  const holdTap = behavior.toLowerCase().includes("hold");
  return <aside className="inspector" aria-label="Key properties">
    <div className="key-header">
      <span className="t-caption muted">KEY</span>
      <div className="key-row">
        <span className="t-display">{positionName(selected)}</span>
        <span className="key-steppers">
          <button className="icon-mini" aria-label="Previous key" onClick={() => onSelect((selected + count - 1) % count)}><Icon name="chevronLeft" /></button>
          <button className="icon-mini" aria-label="Next key" onClick={() => onSelect((selected + 1) % count)}><Icon name="chevronRight" /></button>
        </span>
      </div>
    </div>
    <div className="field"><span className="t-caption muted">BEHAVIOR</span>
      <div className="box t-body">{behavior}<Icon name="chevronDown" size={14} /></div></div>
    <div className="field"><span className="t-caption muted">KEYCODE</span>
      <div className="box t-body-strong">{keyboardUsageLabel(binding.param1) ?? label.title}
        <button className="icon-mini" aria-label="Clear keycode" onClick={onClear}><Icon name="close" size={14} /></button></div></div>
    <div className="field"><span className="t-caption muted">MODIFIERS</span>
      <div className="mods">{MODS.map(m => <Checkbox key={m} label={m} checked={mods.includes(m)} onChange={() => onToggleMod(m)} />)}</div></div>
    <div className="hold-row">
      <span className="t-caption variant">HOLD FOR LAYER</span>
      <span className={"toggle" + (holdTap ? " on" : "")} role="switch" aria-checked={holdTap} aria-readonly="true"><i /></span>
    </div>
    <div className="accordion">
      <details>
        <summary className="t-caption">ADVANCED <Icon name="chevronRight" size={12} /></summary>
        <dl className="t-caption">
          <dt className="muted">Position</dt><dd>{selected}</dd>
          <dt className="muted">Layer</dt><dd>{layer?.name}</dd>
          <dt className="muted">Behavior ID</dt><dd>{binding.behaviorId}</dd>
          <dt className="muted">Param 1</dt><dd className="t-code">0x{binding.param1.toString(16)}</dd>
          <dt className="muted">Param 2</dt><dd className="t-code">0x{binding.param2.toString(16)}</dd>
        </dl>
      </details>
      {["TAP / HOLD", "MACRO", "VISUAL"].map(t => <div key={t} className="accordion-row t-caption">{t}<Icon name="chevronRight" size={12} /></div>)}
    </div>
  </aside>;
}

// --- Keycode picker ----------------------------------------------------------

function KeyButton({ code, current, onKey, className }: { code: Keycode; current: number | null; onKey: (u: number) => void; className?: string }) {
  const on = current !== null && keycodeForUsage(current)?.usage === code.usage;
  return <button className={"keycode t-body" + (className ? " " + className : "") + (on ? " current" : "")} aria-pressed={on} onClick={() => onKey(code.usage)}>
    {code.label === "Backspace" && <Icon name="arrowLeft" size={16} />}{code.label === "Tab" && <Icon name="tab" size={16} />}{code.label}
  </button>;
}

function KeycodeGrid({ category, current, layers, onKey, onLayer, search = "" }: {
  category: Category; current: number | null; layers: Layer[]; onKey: (u: number) => void; onLayer: (i: number) => void; search?: string;
}) {
  const q = search.trim().toLowerCase();
  if (q) {
    const found = ALL_KEYCODES.filter(k => k.label.toLowerCase().includes(q) || k.zmk.toLowerCase().includes(q));
    return found.length ? <div className="picker-flow">{found.map(k => <KeyButton key={k.usage} code={k} current={current} onKey={onKey} />)}</div>
      : <p className="t-caption muted">No keycode matches “{search}”.</p>;
  }
  if (category === "LAYER") return <div className="picker-flow">{layers.map((l, i) => <button key={l.id} className="keycode t-body" onClick={() => onLayer(i)}>MO {i} · {l.name || "Layer " + i}</button>)}</div>;
  if (category === "MOUSE" || category === "MACRO") return <p className="t-caption muted">Not editable from here yet. Assign these in your zmk-config.</p>;
  if (category === "CUSTOM") return <div className="picker-flow">{KEYCODES.SYMBOLS.map(k => <KeyButton key={k.usage} code={k} current={current} onKey={onKey} />)}</div>;
  const list = KEYCODES[category];
  return <div className={category === "BASIC" ? "picker-basic" : "picker-flow"}>{list.map(k => <KeyButton key={k.usage} code={k} current={current} onKey={onKey} className={k.label === "Enter" ? "span2" : undefined} />)}</div>;
}

function KeycodePicker({ current, locked, category, onCategory, layers, onKey, onLayer }: {
  current: number | null; locked: boolean; category: Category; onCategory: (c: Category) => void; layers: Layer[]; onKey: (u: number) => void; onLayer: (i: number) => void;
}) {
  const [search, setSearch] = useState("");
  const wide = useMemo(() => WIDE_KEYS, []);
  return <section className={"picker" + (locked ? " locked" : "")} aria-label="Keycodes">
    <div className="picker-head">
      <div className="tabs">{CATEGORIES.map(c => <button key={c} disabled={locked} className={"tab t-label" + (c === category ? " active" : "")} onClick={() => onCategory(c)}>{c}</button>)}</div>
      <label className="search box t-body muted"><Icon name="search" size={14} /><input placeholder="Search keycodes…" disabled={locked} value={search} onChange={e => setSearch(e.target.value)} /></label>
    </div>
    <div className="picker-grid">
      <KeycodeGrid category={category} current={current} layers={layers} onKey={onKey} onLayer={onLayer} search={search} />
      <div className="picker-wide">{wide.map(k => <KeyButton key={k.usage} code={k} current={current} onKey={onKey} />)}</div>
    </div>
  </section>;
}
