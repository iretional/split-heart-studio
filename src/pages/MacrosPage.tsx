import { useState } from "react";
import { Icon } from "../components/Icon";
import { TopBar } from "../components/Shell";
import { CopyButton, DragHandle, Field, Notice, Select } from "../components/ui";
import { ALL_KEYCODES } from "../keyLabels";
import { isDemo } from "../studio/demo";
import { defaultStepValue, demoMacros, macroCode, macroId, newId, type Macro, type MacroStep, type StepKind } from "../studio/macros";
import { useIsMobile, useStored } from "../studio/prefs";
import type { Studio } from "../studio/useStudio";

const KINDS: StepKind[] = ["Tap", "Press", "Release", "Wait", "Text"];
const MS = ["10", "20", "30", "40", "50", "100"].map(v => ({ value: v, label: v + " ms" }));
const KEY_OPTIONS = ALL_KEYCODES.map(k => ({ value: k.label, label: k.label }));
const CONFIG_URL = "https://github.com/iretional/zmk-config";
const NEXT_STEPS = ["Paste into the macros block of split_heart.keymap", "Commit and push — GitHub Actions builds the firmware", "Flash both halves, then the macro appears in Firmware"];

const steps = (n: number) => `${n} step${n === 1 ? "" : "s"}`;

function StepRow({ step, index, onChange, onRemove, onDrop }: {
  step: MacroStep; index: number; onChange: (v: string) => void; onRemove: () => void; onDrop: (from: number) => void;
}) {
  const isKey = step.kind !== "Wait" && step.kind !== "Text";
  return <div className="macro-step" draggable onDragStart={e => e.dataTransfer.setData("text/plain", String(index))}
    onDragOver={e => e.preventDefault()} onDrop={e => onDrop(Number(e.dataTransfer.getData("text/plain")))}>
    <DragHandle />
    <span className="t-caption muted step-index">{String(index + 1).padStart(2, "0")}</span>
    <span className="t-label variant step-action">{step.kind}</span>
    {isKey && <span className="chip-select t-label"><select value={step.value} aria-label="Key" onChange={e => onChange(e.target.value)}>
      {KEY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></span>}
    {step.kind === "Wait" && <input className="t-body step-wait" aria-label="Wait" value={step.value} onChange={e => onChange(e.target.value)} />}
    {step.kind === "Text" && <input className="t-code step-text" aria-label="Text" value={step.value} placeholder="Type text" onChange={e => onChange(e.target.value)} />}
    <span className="topbar-spacer" />
    <button className="icon-mini" aria-label="Remove step" onClick={onRemove}><Icon name="close" size={14} /></button>
  </div>;
}

export function MacrosPage({ studio, onMenu }: { studio: Studio; onMenu: () => void }) {
  const [macros, setMacros] = useStored<Macro[]>(isDemo() ? "split-studio.demo.macros" : "split-studio.macros", () => isDemo() ? demoMacros() : []);
  const [selectedId, setSelectedId] = useState<number | null>(macros[0]?.id ?? null);
  const [firmwareName, setFirmwareName] = useState<string | null>(null);
  const [openOnPhone, setOpenOnPhone] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const mobile = useIsMobile();
  const macro = macros.find(m => m.id === selectedId) ?? null;
  const fw = studio.firmwareMacros;

  const update = (patch: Partial<Macro>) => setMacros(list => list.map(m => m.id === selectedId ? { ...m, ...patch } : m));
  const setSteps = (next: MacroStep[]) => update({ steps: next });
  const create = () => {
    const m: Macro = { id: newId(), name: "New macro", steps: [], waitMs: 30, tapMs: 30 };
    setMacros(list => [...list, m]); setSelectedId(m.id); setFirmwareName(null); setOpenOnPhone(true);
  };
  const remove = () => { setMacros(list => list.filter(m => m.id !== selectedId)); setSelectedId(null); setOpenOnPhone(false); };
  const open = (id: number) => { setSelectedId(id); setFirmwareName(null); setOpenOnPhone(true); };
  const code = macro ? macroCode(macro) : "";
  const editing = mobile && openOnPhone && macro;

  const list = <aside className="macro-list">
    <button className="btn btn-block desktop-only" onClick={create}><Icon name="plus" size={14} />New macro</button>
    <div className="macro-group">
      <div className="group-header"><span className="t-caption muted">IN FIRMWARE</span><span className="t-caption muted">Read from the keyboard. Assign them on the Keymap page.</span></div>
      {fw.length === 0 && <p className="t-caption muted group-empty">None found on this keyboard.</p>}
      {fw.map(name => <button key={name} className={"macro-row" + (firmwareName === name ? " selected" : "")} onClick={() => { setFirmwareName(name); setSelectedId(null); }}>
        <span className="row-text"><span className="t-body-strong row-title">{name}</span><span className="t-caption muted">In firmware</span></span>
        <span className="badge t-caption">FW</span>
      </button>)}
    </div>
    <div className="macro-group">
      <div className="group-header"><span className="t-caption muted">DRAFTS</span><span className="t-caption muted">Only in this app until you add them to zmk-config.</span></div>
      {macros.map(m => <button key={m.id} className={"macro-row" + (m.id === selectedId ? " selected" : "")} onClick={() => open(m.id)}>
        <span className="row-text"><span className="t-body-strong row-title">{m.name}</span><span className="t-caption muted">{steps(m.steps.length)} · Not built</span></span>
        <span className="badge t-caption">DRAFT</span>
      </button>)}
    </div>
    <div className="mobile-only"><Notice>Drafts need a firmware rebuild. Open a draft to copy its code.</Notice></div>
  </aside>;

  return <>
    <TopBar title={editing ? macro.name : "Macros"} subtitle={editing ? "Draft" : mobile ? `${fw.length + macros.length} macros` : `${fw.length} in firmware · ${macros.length} drafts`}
      studio={studio} onMenu={onMenu} showSave={false} onBack={editing ? () => setOpenOnPhone(false) : undefined}
      mobileAction={editing ? undefined : <button className="btn" onClick={create}><Icon name="plus" size={14} />New</button>} />
    <div className={"macros-body" + (editing ? " editing" : "")}>
      {list}
      <section className="macro-editor">
        {macro ? <>
          <div className="detail-header">
            <Field label="MACRO NAME" className="name-field grow">
              <label className="input"><input className="t-body-strong" value={macro.name} onChange={e => update({ name: e.target.value })} />
                <span className="t-caption muted">&amp;{macroId(macro.name)}</span></label>
            </Field>
            <button className="btn btn-danger desktop-only" onClick={remove}>Delete draft</button>
          </div>
          <div className="panel-head"><span className="t-caption muted">STEPS · {macro.steps.length}</span><span className="t-caption muted">Runs top to bottom</span></div>
          <div className="steps-card">
            {macro.steps.length === 0 && <p className="t-caption muted group-empty">Add a step below.</p>}
            {macro.steps.map((s, i) => <StepRow key={s.id} step={s} index={i}
              onChange={value => setSteps(macro.steps.map(x => x.id === s.id ? { ...x, value } : x))}
              onRemove={() => setSteps(macro.steps.filter(x => x.id !== s.id))}
              onDrop={from => { const next = [...macro.steps]; next.splice(i, 0, next.splice(from, 1)[0]); setSteps(next); }} />)}
          </div>
          <div className="add-step">{KINDS.map(k => <button key={k} className="btn" onClick={() => setSteps([...macro.steps, { id: newId(), kind: k, value: defaultStepValue(k) }])}>
            <span className="desktop-only"><Icon name="plus" size={14} /></span>{k}</button>)}</div>
          <div className="timing">
            <Field label={mobile ? "WAIT BETWEEN" : "WAIT BETWEEN STEPS"}><Select label="Wait between steps" value={String(macro.waitMs)} options={MS} onChange={v => update({ waitMs: Number(v) })} /></Field>
            <Field label="TAP DURATION"><Select label="Tap duration" value={String(macro.tapMs)} options={MS} onChange={v => update({ tapMs: Number(v) })} /></Field>
          </div>
          {mobile && showCode && <pre className="code-block t-code">{code}</pre>}
        </> : firmwareName ? <div className="editor-empty"><p className="t-body-strong">{firmwareName}</p>
          <p className="t-caption muted">ZMK Studio reports this macro's name only, so its steps can't be shown. Assign it on the Keymap page.</p></div>
        : <div className="editor-empty"><p className="t-body-strong">No draft selected</p><p className="t-caption muted">Pick a draft or create a new macro.</p></div>}
      </section>
      <aside className="code-export desktop-only">
        <Notice title="Firmware rebuild needed">ZMK Studio can’t create macros on the keyboard. Add this code to your keymap and rebuild.</Notice>
        <div className="panel-head"><span className="t-caption muted">DEVICETREE</span><span className="t-caption muted">split_heart.keymap</span></div>
        <pre className="code-block t-code">{code || "// Select a draft to see its code"}</pre>
        <div className="button-row"><CopyButton primary label="Copy code" text={code} /><a className="btn" href={CONFIG_URL} target="_blank" rel="noreferrer">Open zmk-config</a></div>
        <div className="how-to">
          <span className="t-caption muted">NEXT STEPS</span>
          {NEXT_STEPS.map((t, i) => <div key={t} className="how-step"><span className="num t-caption variant">{i + 1}</span><span className="t-caption variant">{t}</span></div>)}
        </div>
      </aside>
      {editing && <div className="action-bar">
        <span className="t-caption muted action-note"><Icon name="info" size={14} />Firmware rebuild needed to use this macro</span>
        <div className="button-row even"><button className="btn btn-lg" onClick={() => setShowCode(v => !v)}>{showCode ? "Hide code" : "View code"}</button><CopyButton primary label="Copy code" text={code} /></div>
      </div>}
    </div>
  </>;
}
