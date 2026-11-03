import { useState } from "react";
import { Icon } from "../components/Icon";
import { TopBar } from "../components/Shell";
import { SplitHeartMap } from "../components/SplitHeartMap";
import { Checkbox, CopyButton, Field, Notice, Segmented, Select } from "../components/ui";
import { ALL_KEYCODES } from "../keyLabels";
import { keyText } from "../studio/bindings";
import { isDemo } from "../studio/demo";
import { newId } from "../studio/macros";
import { useIsMobile, useStored, type Prefs } from "../studio/prefs";
import type { Studio } from "../studio/useStudio";

type Combo = { id: number; keys: number[]; result: string; layers: number[] | null; timeout: number; priorIdle: number };

const RESULTS = [...ALL_KEYCODES.map(k => ({ value: "&kp " + k.zmk, label: `${k.label}  ·  &kp ${k.zmk}` })), { value: "&caps_word", label: "Caps Word  ·  &caps_word" }];
const resultLabel = (v: string) => RESULTS.find(r => r.value === v)?.label.split("  ·  ")[0] ?? v;
const TIMEOUTS = ["30", "40", "50", "75", "100"].map(v => ({ value: v, label: v + " ms" }));
const IDLES = ["0", "100", "150", "200", "300"].map(v => ({ value: v, label: v + " ms" }));

const demoCombos = (): Combo[] => [
  { id: newId(), keys: [31, 32], result: "&kp ESC", layers: null, timeout: 50, priorIdle: 150 },
  { id: newId(), keys: [27, 28], result: "&kp TAB", layers: [0], timeout: 50, priorIdle: 150 },
  { id: newId(), keys: [31, 32, 33], result: "&kp ENTER", layers: null, timeout: 50, priorIdle: 150 },
  { id: newId(), keys: [43, 44], result: "&caps_word", layers: [0, 1], timeout: 40, priorIdle: 150 },
];

const slug = (c: Combo) => "combo_" + c.result.replace(/^&(kp )?/, "").toLowerCase();
function comboCode(c: Combo) {
  const layers = c.layers ? `\n  layers = <${c.layers.join(" ")}>;` : "";
  return `${slug(c)} {\n  timeout-ms = <${c.timeout}>;\n  require-prior-idle-ms = <${c.priorIdle}>;\n  key-positions = <${c.keys.join(" ")}>;${layers}\n  bindings = <${c.result}>;\n};`;
}

/** A combo overlaps another when all its keys are part of a longer combo, so it has to wait out the timeout. */
const overlapOf = (c: Combo, all: Combo[]) => all.find(o => o.id !== c.id && c.keys.length && o.keys.length !== c.keys.length
  && (c.keys.every(k => o.keys.includes(k)) || o.keys.every(k => c.keys.includes(k))));

export function CombosPage({ studio, onMenu, prefs }: { studio: Studio; onMenu: () => void; prefs: Prefs }) {
  const { keymap, names } = studio;
  const [combos, setCombos] = useStored<Combo[]>(isDemo() ? "split-studio.demo.combos" : "split-studio.combos", () => isDemo() ? demoCombos() : []);
  const [selectedId, setSelectedId] = useState<number | null>(combos[0]?.id ?? null);
  const [openOnPhone, setOpenOnPhone] = useState(false);
  const [half, setHalf] = useState<"Left" | "Right">("Left");
  const [showCode, setShowCode] = useState(false);
  const mobile = useIsMobile();
  const layers = keymap?.layers ?? [];
  const base = layers[0];
  const combo = combos.find(c => c.id === selectedId) ?? null;
  const index = combo ? combos.indexOf(combo) : -1;

  const label = (i: number) => base ? keyText(i, base.bindings[i], names, prefs.keyLabels) : String(i);
  const keysText = (c: Combo) => c.keys.map(label).join(" + ") || "No keys";
  const layersText = (c: Combo) => !c.layers ? "All layers" : c.layers.map(i => layers[i]?.name || "Layer " + i).join(", ");
  const update = (patch: Partial<Combo>) => setCombos(list => list.map(c => c.id === selectedId ? { ...c, ...patch } : c));
  const toggleKey = (i: number) => {
    if (!combo) return;
    if (combo.keys.includes(i)) update({ keys: combo.keys.filter(k => k !== i) });
    else if (combo.keys.length < 3) update({ keys: [...combo.keys, i].sort((a, b) => a - b) });
  };
  const toggleLayer = (i: number, on: boolean) => {
    if (!combo) return;
    const current = combo.layers ?? layers.map((_, n) => n);
    const next = on ? [...current, i].sort((a, b) => a - b) : current.filter(n => n !== i);
    update({ layers: next.length === layers.length ? null : next });
  };
  const create = () => {
    const c: Combo = { id: newId(), keys: [], result: "&kp ESC", layers: null, timeout: 50, priorIdle: 150 };
    setCombos(list => [...list, c]); setSelectedId(c.id); setOpenOnPhone(true);
  };
  const remove = () => { setCombos(list => list.filter(c => c.id !== selectedId)); setSelectedId(null); setOpenOnPhone(false); };
  const editing = mobile && openOnPhone && combo;
  const overlap = combo ? overlapOf(combo, combos) : undefined;
  const longer = overlap && combo && overlap.keys.length > combo.keys.length ? overlap : combo;
  const shorter = overlap && combo && overlap.keys.length > combo.keys.length ? combo : overlap;
  const extraKey = longer && shorter ? longer.keys.find(k => !shorter.keys.includes(k)) : undefined;
  const code = combo ? comboCode(combo) : "";
  const pickerState = (i: number) => combo?.keys.includes(i) ? "selected" as const : "default" as const;

  const form = combo && <>
    <Field label="RESULT"><Select label="Result" value={combo.result} options={RESULTS} onChange={v => update({ result: v })} /></Field>
    <Field label="ACTIVE ON LAYERS"><div className="layer-checks">{layers.map((l, i) => <Checkbox key={l.id} label={l.name || "Layer " + i}
      checked={!combo.layers || combo.layers.includes(i)} onChange={on => toggleLayer(i, on)} />)}</div></Field>
    <div className="timing compact">
      <Field label="TIMEOUT"><Select label="Timeout" value={String(combo.timeout)} options={TIMEOUTS} onChange={v => update({ timeout: Number(v) })} /></Field>
      <Field label="PRIOR IDLE"><Select label="Prior idle" value={String(combo.priorIdle)} options={IDLES} onChange={v => update({ priorIdle: Number(v) })} /></Field>
    </div>
  </>;

  return <>
    <TopBar title={editing ? `${keysText(combo)} → ${resultLabel(combo.result)}` : "Combos"} subtitle={editing ? `Combo ${index + 1}` : `${combos.length} combos${!mobile ? ` · ${combos.filter(c => { const o = overlapOf(c, combos); return o && o.keys.length < c.keys.length; }).length} overlap` : ""}`}
      studio={studio} onMenu={onMenu} showSave={false} onBack={editing ? () => setOpenOnPhone(false) : undefined}
      mobileAction={editing ? undefined : <button className="btn" onClick={create}><Icon name="plus" size={14} />New</button>} />
    {!editing && <div className="mobile-only combos-mobile">
      <div className="group-header"><span className="t-caption muted">COMBOS</span><span className="t-caption muted">Press keys together to send one action</span></div>
      {combos.map(c => { const o = overlapOf(c, combos); return <button key={c.id} className="combo-card" onClick={() => { setSelectedId(c.id); setOpenOnPhone(true); }}>
        <span className="combo-top"><span className="chip t-label">{keysText(c)}</span><Icon name="arrowRight" size={14} /><span className="chip quiet t-label">{resultLabel(c.result)}</span><span className="topbar-spacer" /><Icon name="more" size={16} /></span>
        <span className="combo-bottom"><span className="t-caption muted">{layersText(c)} · {c.timeout} ms</span>
          {o && <span className="t-caption danger-text overlap"><i className="dot-danger" />Overlaps {keysText(o)}</span>}</span>
      </button>; })}
      <div className="combos-note"><Notice>Combos can’t be read from the keyboard. Changes need a firmware rebuild.</Notice></div>
    </div>}
    {editing && <div className="combo-mobile-detail">
      <div className="half-switch"><Segmented label="Keyboard half" value={half} options={["Left", "Right"] as const} onChange={setHalf} /><span className="t-caption muted">TAP 2–3 KEYS</span></div>
      <SplitHeartMap half={half === "Left" ? "left" : "right"} label={label} state={pickerState} onSelect={toggleKey} />
      {form}
      {overlap && <div className="notice danger slim"><span className="t-caption danger-text">Overlaps {longer && keysText(longer)} · waits up to {combo.timeout} ms</span></div>}
      {showCode && <pre className="code-block t-code">{code}</pre>}
      <div className="action-bar">
        <span className="t-caption muted action-note"><Icon name="info" size={14} />Firmware rebuild needed to use this combo</span>
        <div className="button-row even"><button className="btn btn-lg" onClick={() => setShowCode(v => !v)}>{showCode ? "Hide code" : "View code"}</button><CopyButton primary label="Copy code" text={code} /></div>
      </div>
    </div>}
    <div className="combos-body desktop-only">
      <section className="combos-main">
        <div className="panel key-picker">
          <div className="panel-head"><span className="t-caption muted">PICK KEYS · {(base?.name || "BASE").toUpperCase()} LAYER</span>
            <span className="legend t-caption muted"><i />In this combo · click 2–3 keys to change</span></div>
          <div className="preview-map"><SplitHeartMap compact width={605} label={label} state={pickerState} onSelect={combo ? toggleKey : undefined} /></div>
        </div>
        <div className="combo-table">
          <div className="combo-grid table-head t-caption muted"><span>KEYS</span><span>RESULT</span><span>LAYERS</span><span>TIMEOUT</span></div>
          {combos.map(c => { const o = overlapOf(c, combos); const sel = c.id === selectedId; const warn = o && o.keys.length < c.keys.length;
            return <button key={c.id} className={"combo-grid combo-row" + (sel ? " selected" : "")} onClick={() => setSelectedId(c.id)}>
              <span className="keys-col"><span className="chip t-label">{keysText(c)}</span><Icon name="arrowRight" size={14} /></span>
              <span><span className="chip quiet t-label">{resultLabel(c.result)}</span></span>
              <span className="t-body cell">{layersText(c)}</span>
              <span className="t-body cell">{c.timeout} ms</span>
              <span className="status-cell">{warn && <span className="t-caption danger-text overlap"><i className="dot-danger" />Overlaps {keysText(o)}</span>}</span>
              <span className="cell row-end"><Icon name="more" size={16} /></span>
            </button>; })}
          <div className="table-footer"><button className="btn" onClick={create}><Icon name="plus" size={14} />New combo</button></div>
        </div>
      </section>
      <aside className="combo-detail">
        {combo ? <>
          <div className="detail-header center"><span className="t-caption muted">COMBO {index + 1} OF {combos.length}</span><button className="btn btn-danger" onClick={remove}>Delete</button></div>
          <div className="field"><span className="t-caption muted">KEYS</span>
            <div className="key-chips">{combo.keys.map(k => <span key={k} className="key-chip t-body-strong">{label(k)}</span>)}<span className="t-caption muted">positions {combo.keys.join(", ") || "—"}</span></div>
            <span className="t-caption muted">Press together within the timeout. Change them on the map.</span></div>
          {form}
          {overlap && <Notice danger title={`Overlaps ${longer && keysText(longer)}`}>After {shorter && keysText(shorter)}, the keyboard waits up to {combo.timeout} ms for {extraKey !== undefined ? label(extraKey) : "the next key"} before sending {shorter && resultLabel(shorter.result)}.</Notice>}
          <div className="panel-head"><span className="t-caption muted">DEVICETREE</span><span className="t-caption muted">Firmware rebuild needed</span></div>
          <pre className="code-block t-code tight">{code}</pre>
          <div className="button-row"><CopyButton primary label="Copy code" text={code} /><CopyButton label="Copy all combos" text={combos.map(comboCode).join("\n\n")} /></div>
        </> : <div className="editor-empty"><p className="t-body-strong">No combo selected</p><p className="t-caption muted">Pick a combo or create a new one.</p></div>}
      </aside>
    </div>
  </>;
}

