import { useRef, useState, type ReactNode } from "react";
import type { Keymap } from "@zmkfirmware/zmk-studio-ts-client/keymap";
import { Icon } from "../components/Icon";
import { ConnectionStatus, LockBanner, TopBar, syncText } from "../components/Shell";
import { MiniKeymap } from "../components/SplitHeartMap";
import { Select } from "../components/Select";
import { Segmented } from "../components/ui";
import type { KeyLabelMode, Prefs, Theme } from "../studio/prefs";
import type { Studio } from "../studio/useStudio";

const Section = ({ title, lead, shortLead, children, className }: { title: string; lead?: string; shortLead?: string; children: ReactNode; className?: string }) =>
  <section className={"set-section" + (className ? " " + className : "")}>
    <div className="set-head"><span className="t-caption set-title">{title}</span>
      {lead && <span className="t-body variant desktop-only">{lead}</span>}
      {(shortLead ?? lead) && <span className="t-caption muted mobile-only">{shortLead ?? lead}</span>}
    </div>
    <div className="set-body">{children}</div>
  </section>;

const Row = ({ title, sub, children, stack }: { title: string; sub?: ReactNode; children?: ReactNode; stack?: boolean }) =>
  <div className={"set-row" + (stack ? " stack" : "")}>
    <div className="set-text"><span className="t-body-strong">{title}</span>{sub && <span className="t-caption muted">{sub}</span>}</div>
    {children && <div className="set-controls">{children}</div>}
  </div>;

const FILE = "split-heart-keymap.json";

export function SettingsPage({ studio, onMenu, prefs }: { studio: Studio; onMenu: () => void; prefs: Prefs }) {
  const { device, firmware, connected, locked, loading, refresh, transport, disconnect, lock, layouts, activeLayout, setActiveLayoutIndex, keymap, setBinding, renameLayer, resetSettings, error } = studio;
  const [confirm, setConfirm] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const link = transport === "usb" ? "USB serial" : "Bluetooth";

  const exportFile = () => {
    if (!keymap) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify({ device, layers: keymap.layers }, null, 2)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = FILE; a.click();
    URL.revokeObjectURL(url);
    prefs.setLastExport(syncText(new Date()).replace("  ", " "));
  };

  /** Applies only bindings that differ; like any edit they stay unsaved until Save. */
  const importFile = async (file: File) => {
    setImportError(null);
    try {
      const data = JSON.parse(await file.text()) as { layers?: Keymap["layers"] };
      if (!keymap || !Array.isArray(data.layers)) throw new Error("not a keymap file");
      for (const [li, incoming] of data.layers.entries()) {
        const target = keymap.layers[li];
        if (!target || incoming.bindings?.length !== target.bindings.length) throw new Error(`layer ${li} doesn't match this keyboard`);
      }
      for (const [li, incoming] of data.layers.entries()) {
        const target = keymap.layers[li];
        if (incoming.name !== target.name) await renameLayer(target.id, incoming.name);
        for (const [pos, b] of incoming.bindings.entries()) {
          const cur = target.bindings[pos];
          if (b.behaviorId !== cur.behaviorId || b.param1 !== cur.param1 || b.param2 !== cur.param2) await setBinding(target.id, pos, b);
        }
      }
    } catch (e) { setImportError(e instanceof Error ? e.message : String(e)); }
  };

  return <>
    <TopBar title="Settings" subtitle={`${device} · ${link === "USB serial" ? "USB" : link}`} studio={studio} onMenu={onMenu} />
    {locked && <LockBanner onRefresh={refresh} loading={loading} />}
    <div className="settings-body">
      <div className="settings-grid">
        <Section title="DEVICE">
          <Row title={device} sub="Reported by the keyboard over ZMK Studio"><span className="t-body variant">Left half · central</span></Row>
          <Row title="Firmware" sub="Rebuild in zmk-config to update"><span className="t-body variant">{firmware}</span></Row>
          <Row title="Connection" sub={link}><ConnectionStatus connected={connected} variant="desktop" /><button className="btn" onClick={disconnect}>Disconnect</button></Row>
          <Row title="Studio lock" sub="Locks again after reconnecting or idling"><span className="t-body variant">{locked ? "Locked" : "Unlocked"}</span><button className="btn" disabled={locked} onClick={() => void lock()}>Lock</button></Row>
        </Section>
        <Section title="PHYSICAL LAYOUT" lead="The firmware reports these layouts. Switching changes which key positions the keymap uses." shortLead="Switching changes which key positions the keymap uses.">
          <div className="radio-cards" role="radiogroup" aria-label="Physical layout">
            {layouts.length === 0 && <p className="t-caption muted">Unlock the keyboard to read its layouts.</p>}
            {layouts.map((l, i) => <button key={l.name + i} role="radio" aria-checked={i === activeLayout} className={"radio-card" + (i === activeLayout ? " selected" : "")} onClick={() => { if (i !== activeLayout) void setActiveLayoutIndex(i); }}>
              <span className="radio-head"><span className="radio"><i /></span><span className="radio-text"><span className="t-body-strong">{l.name}</span><span className="t-caption muted">{l.keys.length} keys{i === 0 ? " · default" : ""}</span></span></span>
              <span className="radio-preview"><MiniKeymap bound={() => true} count={l.keys.length} /></span>
            </button>)}
          </div>
        </Section>
        <Section title="APPEARANCE">
          <Row title="Theme"><Segmented<Theme> label="Theme" value={prefs.theme} options={["Light", "Dark", "System"]} onChange={prefs.setTheme} /></Row>
          <Row title="Language"><Select label="Language" value="en" disabled options={[{ value: "en", label: "English" }]} onChange={() => {}} /></Row>
          <Row title="Key labels" sub="What the keyboard map shows on each key" stack><Segmented<KeyLabelMode> label="Key labels" value={prefs.keyLabels} options={["Keycode", "Position", "Both"]} onChange={prefs.setKeyLabels} /></Row>
        </Section>
        <Section title="BACKUP" lead="Save every layer as a file, or load one back. Imported changes stay unsaved until you press Save." shortLead="Imported changes stay unsaved until you press Save.">
          <Row title="Keymap file" sub={prefs.lastExport ? `Last export ${prefs.lastExport} · ${FILE}` : "Not exported yet"} stack>
            <button className="btn" disabled={!keymap} onClick={() => fileInput.current?.click()}>Import</button>
            <button className="btn btn-primary" disabled={!keymap} onClick={exportFile}>Export</button>
            <input ref={fileInput} type="file" accept="application/json" hidden onChange={e => { const f = e.target.files?.[0]; if (f) void importFile(f); e.target.value = ""; }} />
          </Row>
          {importError && <p className="t-caption danger-text set-error">Couldn’t import: {importError}</p>}
        </Section>
      </div>
      <Section title="DANGER ZONE" className="danger-zone">
        <Row title="Reset keyboard" sub="Erases every change made in Studio and returns to the keymap built into the firmware. This cannot be undone." stack>
          <button className="btn btn-danger" disabled={locked} onClick={() => setConfirm(true)}>Reset settings</button>
        </Row>
      </Section>
      {error && <p className="t-caption danger-text">{error.message}</p>}
    </div>
    {confirm && <>
      <div className="scrim dialog-scrim" onClick={() => setConfirm(false)} />
      <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="reset-title">
        <span className="dialog-icon"><Icon name="warning" size={20} /></span>
        <div className="dialog-text">
          <p id="reset-title" className="t-body-strong">Reset keyboard settings?</p>
          <p className="t-body variant">This erases every change saved from Studio — key bindings, layer names and order — and brings back the keymap built into the firmware.</p>
          <p className="t-caption muted">Firmware, macros and combos are not affected. This cannot be undone.</p>
        </div>
        <div className="dialog-buttons">
          <button className="btn" disabled={!keymap} onClick={exportFile}>Export backup first</button>
          <span className="topbar-spacer" />
          <button className="btn" onClick={() => setConfirm(false)}>Cancel</button>
          <button className="btn btn-danger" onClick={() => { setConfirm(false); void resetSettings(); }}>Reset</button>
        </div>
      </div>
    </>}
  </>;
}
