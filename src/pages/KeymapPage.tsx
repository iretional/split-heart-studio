import { useEffect, useState, type KeyboardEvent, type ReactNode } from "react";
import type { GetBehaviorDetailsResponse } from "@zmkfirmware/zmk-studio-ts-client/behaviors";
import type { BehaviorBinding, KeyPhysicalAttrs, Layer } from "@zmkfirmware/zmk-studio-ts-client/keymap";
import { GlitchDigits } from "../components/GlitchDigits";
import { Icon } from "../components/Icon";
import { KeycodeDialog } from "../components/KeycodeDialog";
import { Overlay } from "../components/Overlay";
import { LockBanner, TopBar } from "../components/Shell";
import { SplitHeartMap } from "../components/SplitHeartMap";
import { useEntrance } from "../components/useEntrance";
import { useSheetDrag } from "../components/useSheetDrag";
import { useHoverSelectFx } from "../components/useHoverSelectFx";
import { Select } from "../components/Select";
import { Checkbox, Segmented } from "../components/ui";
import { bindingLabel, implicitMods, keyboardUsageLabel, keycodeForUsage, keycodeText, toggleMod, withKeptMods } from "../keyLabels";
import { behaviorId, isTransparent, keyParts } from "../studio/bindings";
import { behaviorName, behaviorOptions, defaultBinding, paramFields, type ParamField } from "../studio/behaviors";
import { homeRowTiming } from "../studio/homeRow";
import { useIsMobile, type Prefs } from "../studio/prefs";
import { SPLIT_HEART_KEY_COUNT, isLeftKey, positionName } from "../studio/splitHeartGeometry";
import type { Studio } from "../studio/useStudio";

export type KeyFocus = { layer: number; key: number };

const MODS = ["Ctrl", "Shift", "Alt", "GUI"];

const keycodeNameOf = (v: number) => { const c = keycodeForUsage(v); return c ? keycodeText(c) : keyboardUsageLabel(v) ?? "—"; };
const bindingSummary = (behavior: string, mods: string[]) => `${behavior} · ${mods.length ? mods.join(" + ") : "no modifiers"}`;

export function KeymapPage({ studio, onMenu, prefs, focus }: { studio: Studio; onMenu: () => void; prefs: Prefs; focus: KeyFocus | null }) {
  const { keymap, layout, names, behaviors, locked, loading, refresh, setBinding, addLayer, error } = studio;
  const [layerIndex, setLayerIndex] = useState(focus?.layer ?? 0);
  const [selected, setSelected] = useState<number | null>(focus?.key ?? 0);
  const [half, setHalf] = useState<"Left" | "Right">("Left");
  const [picking, setPicking] = useState<1 | 2 | null>(null);
  const mobile = useIsMobile();
  const tabFx = useHoverSelectFx<number>();
  const keySheet = useSheetDrag<HTMLElement>();
  const tabKey = layerIndex + half;
  const body = useEntrance<HTMLDivElement>(tabKey, false);
  useEffect(() => { if (focus) { setLayerIndex(focus.layer); setSelected(focus.key); } }, [focus]);
  useEffect(() => { if (selected !== null && mobile) setHalf(isLeftKey(selected) ? "Left" : "Right"); }, [selected, mobile]);
  const layer = keymap?.layers[Math.min(layerIndex, keymap.layers.length - 1)];
  const binding = selected === null ? null : layer?.bindings[selected] ?? null;
  const behavior = binding ? behaviorName(names[binding.behaviorId] ?? "Behavior #" + binding.behaviorId) : "";
  const details = binding ? behaviors.find(b => b.id === binding.behaviorId) : undefined;
  const fields = binding && keymap ? paramFields(details, binding, keymap.layers) : [];
  // The checkboxes edit the last keycode a behavior takes, which is the tap key on a mod-tap.
  const modField = [...fields].reverse().find(f => f.kind === "hid");
  const modValue = binding && modField ? (modField.which === 1 ? binding.param1 : binding.param2) : null;
  const mods = modValue !== null ? implicitMods(modValue) : [];
  // A hold-tap's modifier is its hold key, so "no modifiers" would be wrong about it.
  const holdField = fields.length === 2 && fields.every(f => f.kind === "hid") ? fields[0] : undefined;
  const count = layout?.keys.length ?? SPLIT_HEART_KEY_COUNT;
  const isSplitHeart = !layout || layout.keys.length === SPLIT_HEART_KEY_COUNT;
  const none = behaviorId(names, /^none/i);
  const canEdit = !locked && !!layer && selected !== null;
  const write = (next: BehaviorBinding) => { if (canEdit && layer && selected !== null) void setBinding(layer.id, selected, next); };

  const setParam = (which: 1 | 2, value: number) => { if (binding) write({ ...binding, [which === 1 ? "param1" : "param2"]: value }); };
  const changeBehavior = (id: string) => {
    const next = behaviors.find(b => String(b.id) === id);
    if (binding && next && keymap) write(defaultBinding(next, binding, keymap.layers));
  };
  /** Firmware rejects keycode 0, so clearing a key means binding it to None. */
  const clearKey = () => { if (none) write({ behaviorId: Number(none), param1: 0, param2: 0 }); };
  const toggleModifier = (name: string) => { if (modField && modValue !== null) setParam(modField.which, toggleMod(modValue, name)); };

  const timing = isSplitHeart && binding ? homeRowTiming(names[binding.behaviorId]) : null;

  const tabs = <div className="tabs layer-tabs" role="tablist" aria-label="Layers">
    {keymap ? keymap.layers.map((l, i) => {
      const selecting = i === layerIndex && tabFx.selecting === i;
      return <button key={l.id} role="tab" aria-selected={i === layerIndex}
        className={"tab t-label" + (i === layerIndex ? " active" : "") + (tabFx.hovering === i ? " fx-hover" : "") + (selecting ? " fx-select" : "")}
        onMouseEnter={() => { if (i !== layerIndex) tabFx.enter(i); }} onMouseLeave={() => tabFx.leave(i)}
        onClick={() => { if (i !== layerIndex) tabFx.select(i); setLayerIndex(i); }}>
        {l.name || "Layer " + i}
        {selecting && [1, 2, 3, 4].map(n => <span key={n} aria-hidden="true" className={"tab-band fx-band-" + n} style={tabFx.bandStyle} onAnimationEnd={n === 4 ? tabFx.selectEnd : undefined}>{l.name || "Layer " + i}</span>)}
      </button>;
    })
      : <span className="tab t-label active">LAYER 0</span>}
    <button className="add-layer" aria-label="Add layer" disabled={!keymap || keymap.availableLayers <= 0} onClick={() => void addLayer()}><Icon name="plus" size={14} /></button>
  </div>;

  const parts = (i: number) => layer ? keyParts(i, layer.bindings[i], names, prefs.keyLabels, keymap?.layers) : { name: positionName(i), icon: undefined, code: "", hint: "" };
  const state = (i: number) => selected === i ? "selected" as const : layer && isTransparent(layer.bindings[i], names) ? "transparent" as const : "default" as const;
  const step = (d: number) => setSelected(s => ((s ?? 0) + d + count) % count);
  const pickingValue = binding && picking ? (picking === 1 ? binding.param1 : binding.param2) : 0;
  const keyFields = binding && <KeyFields binding={binding} names={names} behavior={behavior} behaviors={behaviors} fields={fields} showMods={!!modField} mods={mods} canClear={!!none}
    onBehavior={changeBehavior} onParam={setParam} onPick={setPicking} onToggleMod={toggleModifier} onClear={clearKey} />;

  return <>
    <TopBar title="Keymap" subtitle={studio.device} tabs={tabs} studio={studio} onMenu={onMenu} />
    {locked && <LockBanner onRefresh={refresh} loading={loading} />}
    <div ref={body} className={"keymap-body" + (locked ? " locked" : "")}>
      <section className="canvas">
        {mobile && <div className="half-switch"><Segmented label="Keyboard half" value={half} options={["Left", "Right"] as const} onChange={setHalf} />
          <span className="t-caption muted">{half === "Left" ? "LEFT · CENTRAL" : "RIGHT · PERIPHERAL"}</span></div>}
        {isSplitHeart
          ? <SplitHeartMap enterView={tabKey} half={mobile ? (half === "Left" ? "left" : "right") : undefined} disabled={locked} label={i => parts(i).name} icon={i => parts(i).icon} code={i => parts(i).code} hint={i => parts(i).hint} state={state} onSelect={setSelected} />
          : layer && layout && <KeyboardSvg keys={layout.keys} layer={layer} names={names} selected={selected} onSelect={setSelected} />}
      </section>
      <Inspector locked={locked} layer={layer} selected={selected} count={count} onSelect={setSelected} timing={timing && <HomeRowTiming rows={timing} open />}>{keyFields}</Inspector>
      <section ref={keySheet.sheet} className={"key-sheet mobile-only" + (keySheet.floating ? " floating" : keySheet.expanded ? " expanded" : "")} aria-label="Selected key">
        <div className="sheet-handle" role="button" tabIndex={0} aria-label={keySheet.expanded ? "Collapse key settings" : "Expand key settings"} aria-expanded={keySheet.expanded} {...keySheet.handle}><i /></div>
        <div className="sheet-header">
          <span className="key-badge t-body-strong"><GlitchDigits text={selected === null ? "—" : positionName(selected)} /></span>
          <span className="sheet-binding"><span className="t-body-strong">{locked ? "Locked" : binding ? modValue !== null ? keycodeNameOf(modValue) : bindingLabel(binding.behaviorId, binding.param1, binding.param2, names).title : "No key"}</span>
            <span className="t-caption muted">{locked ? "Unlock on the keyboard to edit" : binding ? holdField ? `${behavior} · hold ${keycodeNameOf(holdField.which === 1 ? binding.param1 : binding.param2)}` : bindingSummary(behavior, mods) : ""}</span></span>
          <span className="prev-next">
            <button className="btn square" aria-label="Previous key" onClick={() => step(-1)}><Icon name="chevronLeft" /></button>
            <button className="btn square" aria-label="Next key" onClick={() => step(1)}><Icon name="chevronRight" /></button>
          </span>
        </div>
        {!locked && keyFields && <div className={"sheet-fields" + (fields.length === 1 ? " paired" : "")}>{keyFields}{timing && <div className="accordion"><HomeRowTiming rows={timing} /></div>}</div>}
      </section>
    </div>
    <Overlay open={!!picking && !!binding && selected !== null && !!layer}>{picking && binding && selected !== null && layer && <KeycodeDialog target={`Key ${positionName(selected)} · ${layer.name || "Layer " + layerIndex}`} current={pickingValue}
      onClose={() => setPicking(null)} onPick={u => { setParam(picking, withKeptMods(pickingValue, u)); setPicking(null); }} />}</Overlay>
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

/** Behavior, its value fields and modifiers. The Inspector and the phone Key Sheet show the same controls. */
function KeyFields({ binding, names, behavior, behaviors, fields, showMods, mods, canClear, onBehavior, onParam, onPick, onToggleMod, onClear }: {
  binding: BehaviorBinding; names: Record<number, string>; behavior: string; behaviors: GetBehaviorDetailsResponse[]; fields: ParamField[]; showMods: boolean; mods: string[]; canClear: boolean;
  onBehavior: (id: string) => void; onParam: (which: 1 | 2, value: number) => void; onPick: (which: 1 | 2) => void;
  onToggleMod: (m: string) => void; onClear: () => void;
}) {
  const value = (which: 1 | 2) => which === 1 ? binding.param1 : binding.param2;
  const usageText = (v: number) => { const c = keycodeForUsage(v); return c ? keycodeText(c) : keyboardUsageLabel(v) ?? bindingLabel(binding.behaviorId, v, v, names).title; };
  const options = behaviors.length ? behaviorOptions(behaviors) : [{ value: String(binding.behaviorId), label: behavior }];
  return <>
    <div className="field field-behavior"><span className="t-caption muted">BEHAVIOR</span>
      <Select label="Behavior" value={String(binding.behaviorId)} options={options} disabled={!behaviors.length} onChange={onBehavior} /></div>
    {fields.map(f => <div key={f.which} className="field"><span className="t-caption muted">{f.label}</span>
      {f.kind === "hid"
        ? <div className="box box-field t-body-strong">
            <button className="box-open t-body-strong" aria-haspopup="dialog" title={keycodeForUsage(value(f.which))?.description} onClick={() => onPick(f.which)}>{usageText(value(f.which))}</button>
            <button className="icon-mini" aria-label="Clear key" disabled={!canClear} onClick={onClear}><Icon name="close" size={14} /></button></div>
        : <Select label={f.label} value={String(value(f.which))} options={f.options} onChange={v => onParam(f.which, Number(v))} />}
    </div>)}
    {showMods && <div className="field field-mods"><span className="t-caption muted">MODIFIERS</span>
      <div className="mods">{MODS.map(m => <Checkbox key={m} label={m} checked={mods.includes(m)} onChange={() => onToggleMod(m)} />)}</div></div>}
  </>;
}

/** A home row key's settings. They live in the firmware, so this only shows them. */
function HomeRowTiming({ rows, open }: { rows: [string, string][]; open?: boolean }) {
  return <details open={open}>
    <summary className="t-caption">TIMING <Icon name="chevronRight" size={12} /></summary>
    <dl className="t-caption">{rows.map(([name, value]) => <div key={name} className="timing-row"><dt className="muted">{name}</dt><dd>{value}</dd></div>)}</dl>
    <p className="t-caption muted timing-note">Set in firmware. Change them in zmk-config and rebuild.</p>
  </details>;
}

function Inspector({ locked, layer, selected, count, onSelect, timing, children }: {
  locked: boolean; layer?: Layer; selected: number | null; count: number; onSelect: (i: number) => void; timing?: ReactNode; children: ReactNode;
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

  return <aside className="inspector" aria-label="Key properties">
    <div className="key-header">
      <span className="t-caption muted">KEY</span>
      <div className="key-row">
        <GlitchDigits className="t-display-mono" text={positionName(selected)} />
        <span className="key-steppers">
          <button className="icon-mini" aria-label="Previous key" onClick={() => onSelect((selected + count - 1) % count)}><Icon name="chevronLeft" /></button>
          <button className="icon-mini" aria-label="Next key" onClick={() => onSelect((selected + 1) % count)}><Icon name="chevronRight" /></button>
        </span>
      </div>
    </div>
    {children}
    <div className="accordion">
      {timing}
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
    </div>
  </aside>;
}
