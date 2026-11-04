import { useEffect, useState } from "react";
import type { Layer } from "@zmkfirmware/zmk-studio-ts-client/keymap";
import { Icon } from "../components/Icon";
import { Overlay } from "../components/Overlay";
import { LockBanner, TopBar } from "../components/Shell";
import { ShuffleMark } from "../components/ShuffleMark";
import { MiniKeymap, SplitHeartMap } from "../components/SplitHeartMap";
import { useHoverSelectFx } from "../components/useHoverSelectFx";
import { DragHandle, Field, Segmented } from "../components/ui";
import { countText, isTransparent, keyParts, keyText } from "../studio/bindings";
import { useIsMobile, type Prefs } from "../studio/prefs";
import type { Studio } from "../studio/useStudio";
import type { KeyFocus } from "./KeymapPage";

const layerName = (l: Layer, i: number) => l.name || "Layer " + i;

/** Keys on other layers that switch to this one, for the Activated By list. */
function activators(layers: Layer[], target: Layer, targetIndex: number, names: Record<number, string>) {
  const out: { chip: string; layerIndex: number; layerLabel: string; key: number; hint: string }[] = [];
  layers.forEach((l, li) => l.bindings.forEach((b, key) => {
    if (l.id === target.id) return;
    const name = (names[b.behaviorId] ?? "").toLowerCase();
    if (b.param1 !== target.id && b.param1 !== targetIndex) return;
    if (name.includes("momentary")) out.push({ chip: `MO ${targetIndex}`, layerIndex: li, layerLabel: layerName(l, li), key, hint: "Active while held" });
    else if (name.includes("layer") && name.includes("tap")) out.push({ chip: `LT ${targetIndex}`, layerIndex: li, layerLabel: layerName(l, li), key, hint: `Hold for ${layerName(target, targetIndex)}` });
    else if (name.includes("toggle")) out.push({ chip: `TG ${targetIndex}`, layerIndex: li, layerLabel: layerName(l, li), key, hint: "Toggles on press" });
  }));
  return out;
}

export function LayersPage({ studio, onMenu, prefs, onShowKey }: { studio: Studio; onMenu: () => void; prefs: Prefs; onShowKey: (f: KeyFocus) => void }) {
  const { keymap, names, locked, loading, refresh, removed, addLayer, moveLayer, removeLayer, restoreLayer, renameLayer } = studio;
  const [selected, setSelected] = useState(0);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const rowFx = useHoverSelectFx<number>();
  const mobile = useIsMobile();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [half, setHalf] = useState<"Left" | "Right">("Left");
  const layers = keymap?.layers ?? [];
  const index = Math.min(selected, Math.max(0, layers.length - 1));
  const layer = layers[index];
  const total = layers.length + (keymap?.availableLayers ?? 0);
  const maxName = keymap?.maxLayerNameLength ?? 16;
  const [nameDraft, setNameDraft] = useState("");
  useEffect(() => setNameDraft(layer?.name ?? ""), [layer?.id, layer?.name]);
  const commitName = () => { if (layer && nameDraft !== layer.name) void renameLayer(layer.id, nameDraft); };
  const pick = (i: number) => { if (i !== index) rowFx.select(i); setSelected(i); if (mobile) setDialogOpen(true); };
  const closeDialog = () => { commitName(); setDialogOpen(false); };
  useEffect(() => {
    if (!dialogOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setDialogOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dialogOpen]);
  const move = (to: number) => { if (to >= 0 && to < layers.length) { void moveLayer(index, to); setSelected(to); } };
  const addDisabled = !keymap || (keymap.availableLayers ?? 0) <= 0;
  const list = activators(layers, layer ?? { id: -1, name: "", bindings: [] }, index, names);

  return <>
    <TopBar title="Layers" subtitle={keymap ? `${layers.length} of ${total} used` : ""} studio={studio} onMenu={onMenu} />
    {locked && <LockBanner onRefresh={refresh} loading={loading} />}
    <div className="layers-body">
      <section className="layer-list">
        <div className="list-header">
          <div className="heading">
            <span className="t-caption muted">LAYERS</span>
            <span className="t-body variant desktop-only">Layer order decides priority</span>
            <span className="t-body variant mobile-only">Drag to change priority</span>
          </div>
          <button className="btn" disabled={addDisabled} onClick={() => void addLayer()}><Icon name="plus" size={14} /><span className="desktop-only">Add layer</span><span className="mobile-only">Add</span></button>
        </div>
        <div className="rows">
          {layers.map((l, i) => <div key={l.id} role="button" tabIndex={0}
            className={"layer-row" + (i === index && !mobile ? " selected" : "") + (rowFx.hovering === i ? " fx-hover" : "") + (i === index && !mobile && rowFx.selecting === i ? " fx-select" : "")}
            onMouseEnter={() => { if (i !== index) rowFx.enter(i); }} onMouseLeave={() => rowFx.leave(i)}
            onAnimationEnd={e => { if (e.animationName === "fx-layer-box") rowFx.selectEnd(); }}
            onClick={() => pick(i)}
            onKeyDown={e => { if (e.key === "Enter") pick(i); }}
            onDragStart={() => setDragFrom(i)}
            onDragOver={e => e.preventDefault()}
            onDrop={() => { if (dragFrom !== null && dragFrom !== i) { void moveLayer(dragFrom, i); setSelected(i); } setDragFrom(null); }}>
            <span className="drag-grip" draggable><DragHandle /></span>
            <span className="layer-index t-label">{i}</span>
            <span className="layer-text"><span className="t-body-strong layer-name">{layerName(l, i)}</span><span className="t-caption muted">{countText(l, names)}</span></span>
            <span className="desktop-only"><MiniKeymap bound={k => !isTransparent(l.bindings[k], names)} /></span>
            <span className="row-more"><Icon name="more" size={16} /></span>
            {i === index && !mobile && rowFx.selecting === i && <span className="fx-shuffle" aria-hidden="true">
              <span className="m-layer m-shuffle-x" />
              <ShuffleMark />
              <span className="m-layer m-shuffle-hatch" />
            </span>}
          </div>)}
          {removed.map(item => <div key={item.layer.id} className="layer-row removed">
            <DragHandle />
            <span className="layer-index t-label">{item.index}</span>
            <span className="layer-text"><span className="t-body-strong muted">{layerName(item.layer, item.index)}</span>
              <span className="t-caption muted"><span className="desktop-only">Removed · restore before saving</span><span className="mobile-only">Removed · unsaved</span></span></span>
            <button className="btn" onClick={() => void restoreLayer(item)}>Restore</button>
          </div>)}
        </div>
        <span className="list-hint t-caption muted desktop-only">Drag a handle to reorder. Changes reach the keyboard only after Save.</span>
        <span className="t-caption muted mobile-only">Tap a layer to edit it. Changes reach the keyboard only after Save.</span>
      </section>

      {layer ? <section className="layer-detail desktop-only">
        <div className="detail-header">
          <Field label={`LAYER ${index} · NAME`} className="name-field">
            <label className="input"><input className="t-body-strong" value={nameDraft} maxLength={maxName} placeholder={`Layer ${index}`}
              onChange={e => setNameDraft(e.target.value)} onBlur={commitName} onKeyDown={e => { if (e.key === "Enter") commitName(); }} />
              <span className="t-caption muted">{nameDraft.length} / {maxName}</span></label>
          </Field>
          <div className="button-row">
            <button className="btn" disabled={index === 0} onClick={() => move(index - 1)}>Move up</button>
            <button className="btn" disabled={index === layers.length - 1} onClick={() => move(index + 1)}>Move down</button>
            <button className="btn btn-danger" disabled={layers.length <= 1} onClick={() => void removeLayer(index)}>Remove</button>
          </div>
        </div>
        <div className="panel preview-card">
          <div className="panel-head"><span className="t-caption muted">PREVIEW</span>
            <span className="t-caption muted">{countText(layer, names)}  ·  ▽ falls through to the layer below</span></div>
          <div className="preview-map"><SplitHeartMap compact width={605}
            label={i => keyText(i, layer.bindings[i], names, prefs.keyLabels, layers)}
            icon={i => keyParts(i, layer.bindings[i], names, prefs.keyLabels, layers).icon}
            state={i => isTransparent(layer.bindings[i], names) ? "transparent" : "default"} /></div>
        </div>
        <div className="activated">
          <span className="t-caption muted">ACTIVATED BY</span>
          {list.length === 0 && <p className="t-caption muted activator-empty">No key switches to this layer.</p>}
          {list.map(a => <div key={a.layerIndex + "-" + a.key} className="activator">
            <span className="chip t-label">{a.chip}</span>
            <span className="t-body">Key {a.key} on {a.layerLabel}</span>
            <span className="topbar-spacer" />
            <span className="t-caption muted">{a.hint}</span>
            <button className="link t-label variant" onClick={() => onShowKey({ layer: a.layerIndex, key: a.key })}>SHOW</button>
          </div>)}
        </div>
      </section> : <section className="layer-detail desktop-only canvas-empty"><p className="t-body-strong">{locked ? "Unlock to load layers" : "Loading layers…"}</p></section>}

    </div>
    <Overlay open={mobile && dialogOpen && !!layer}>{mobile && dialogOpen && layer && <>
      <div className="scrim scrim-blur" onClick={closeDialog} />
      <div className="dialog layer-dialog" role="dialog" aria-modal="true" aria-label={`Layer ${index}`}>
        <div className="layer-dialog-body">
        <Field label={`LAYER ${index} · NAME`}>
          <label className="input"><input className="t-body-strong" value={nameDraft} maxLength={maxName} placeholder={`Layer ${index}`}
            onChange={e => setNameDraft(e.target.value)} onBlur={commitName} onKeyDown={e => { if (e.key === "Enter") commitName(); }} />
            <span className="t-caption muted">{nameDraft.length} / {maxName}</span></label>
          <span className="t-caption muted">{countText(layer, names)}</span>
        </Field>
        <div className="half-switch"><Segmented label="Keyboard half" value={half} options={["Left", "Right"] as const} onChange={setHalf} /></div>
        <SplitHeartMap compact half={half === "Left" ? "left" : "right"}
          label={i => keyText(i, layer.bindings[i], names, prefs.keyLabels, layers)}
          icon={i => keyParts(i, layer.bindings[i], names, prefs.keyLabels, layers).icon}
          state={i => isTransparent(layer.bindings[i], names) ? "transparent" : "default"} />
        <div className="activated">
          <span className="t-caption muted">ACTIVATED BY</span>
          {list.length === 0 && <p className="t-caption muted activator-empty">No key switches to this layer.</p>}
          {list.map(a => <div key={a.layerIndex + "-" + a.key} className="activator">
            <span className="chip t-label">{a.chip}</span>
            <span className="activator-text"><span className="t-body">Key {a.key} on {a.layerLabel}</span><span className="t-caption muted">{a.hint}</span></span>
            <button className="link t-label variant" onClick={() => { closeDialog(); onShowKey({ layer: a.layerIndex, key: a.key }); }}>SHOW</button>
          </div>)}
        </div>
        </div>
        <div className="button-row even">
          <button className="btn btn-danger" disabled={layers.length <= 1} onClick={() => { setDialogOpen(false); void removeLayer(index); }}>Remove</button>
          <button className="btn btn-primary" onClick={closeDialog}>Done</button>
        </div>
      </div>
    </>}</Overlay>
  </>;
}
