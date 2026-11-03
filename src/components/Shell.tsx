import { useState, type ReactNode } from "react";
import type { Studio } from "../studio/useStudio";
import { Icon, type IconName } from "./Icon";

export const PAGES = ["keymap", "layers", "settings"] as const;
export type Page = typeof PAGES[number];
const PAGE_ICONS: Record<Page, IconName> = { keymap: "caseSensitive", layers: "layers", settings: "settings" };

/** Connection Status component: dot + label on desktop, dot only in the phone top bar. */
export function ConnectionStatus({ connected, variant }: { connected: boolean; variant: "desktop" | "mobile" }) {
  const label = connected ? "Connected" : "Disconnected";
  return <span className={"status " + variant + (connected ? " connected" : "")}
    role="status" aria-label={variant === "mobile" ? label : undefined}>
    <span className="status-dot" />{variant === "desktop" && <span className="t-body">{label}</span>}
  </span>;
}

type SidebarProps = {
  page: Page; onNavigate: (page: Page) => void; navEnabled: boolean;
  device: string; connected: boolean; lastSync: Date | null;
  open: boolean; onClose: () => void;
};

export const syncText = (d: Date | null) => d
  ? `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}  `
    + `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
  : "—";

export function Sidebar({ page, onNavigate, navEnabled, device, connected, lastSync, open, onClose }: SidebarProps) {
  return <>
    {open && <div className="scrim drawer-scrim" onClick={onClose} />}
    <aside className={"sidebar" + (open ? " open" : "")}>
      <div className="brand">
        <span className="t-logo">SPLIT STUDIO</span>
        <button className="icon-btn drawer-close" onClick={onClose} aria-label="Close menu"><Icon name="close" size={20} /></button>
      </div>
      <nav className={"nav" + (navEnabled ? "" : " disabled")} aria-label="Pages">
        {PAGES.map(p => <button key={p} className={"nav-item t-label" + (page === p ? " active" : "")}
          aria-current={page === p ? "page" : undefined}
          onClick={() => { onNavigate(p); onClose(); }}><Icon name={PAGE_ICONS[p]} size={20} />{p.toUpperCase()}</button>)}
      </nav>
      <div className="device">
        <span className="t-caption muted">DEVICE</span>
        <span className="t-body-strong">{connected ? device : "No keyboard"}</span>
        <ConnectionStatus connected={connected} variant="desktop" />
      </div>
      <div className="meta">
        <span className="t-caption muted">LAST SYNC</span><span className="t-caption muted">{syncText(lastSync)}</span>
      </div>
    </aside>
  </>;
}

/** Save Status component. Phones show the short form from the design: "Saved" or "Save · n". */
function SaveStatus({ studio }: { studio: Studio }) {
  const { unsaved, saveChanges, discardChanges } = studio;
  if (!unsaved) return <>
    <span className="save-status desktop-only t-caption muted"><Icon name="check" size={14} />All changes saved</span>
    <span className="save-status mobile-only t-caption muted"><Icon name="check" size={14} />Saved</span>
  </>;
  return <>
    <span className="save-status desktop-only">
      <span className="dot-danger" />
      <span className="t-caption variant">{unsaved} unsaved change{unsaved === 1 ? "" : "s"}</span>
      <button className="btn" onClick={() => void discardChanges()}>Discard</button>
      <button className="btn btn-primary" onClick={() => void saveChanges()}>Save</button>
    </span>
    <button className="btn btn-primary mobile-only" onClick={() => void saveChanges()}>Save · {unsaved}</button>
  </>;
}

/** Top bar shared by every page. title, subtitle and tabs vary; the right side is always the same. */
export function TopBar({ title, subtitle, tabs, studio, onMenu, onBack, mobileAction, showSave = true }: {
  title?: string; subtitle?: string; tabs?: ReactNode; studio: Studio; onMenu: () => void;
  onBack?: () => void; mobileAction?: ReactNode; showSave?: boolean;
}) {
  const { connected, device, loading, refresh, disconnect, unsaved, discardChanges } = studio;
  const [menu, setMenu] = useState(false);
  const [sheet, setSheet] = useState(false);
  return <header className="topbar">
    <div className={"topbar-title" + (tabs ? " with-tabs" : "")}>
      {onBack
        ? <button className="icon-btn menu-btn" onClick={onBack} aria-label="Back"><Icon name="back" size={24} /></button>
        : <button className="icon-btn menu-btn" onClick={onMenu} aria-label="Open menu"><Icon name="menu" size={24} /></button>}
      {title && <span className="t-body-strong topbar-name">{title}</span>}
      {subtitle && <span className="t-caption muted topbar-sub">{subtitle}</span>}
    </div>
    {tabs}
    <div className="topbar-spacer" />
    <div className="right-actions">
      <button className="icon-btn mobile-only conn-btn" aria-label="Connection details" onClick={() => setSheet(true)}>
        <ConnectionStatus connected={connected} variant="mobile" />
      </button>
      {mobileAction && <span className="mobile-only">{mobileAction}</span>}
      {connected && showSave && <div className="save-slot"><SaveStatus studio={studio} /></div>}
      <div className="keyboard-select desktop-only"><span className="t-label">{(device || "Split Heart").toUpperCase()}</span><Icon name="chevronDown" size={14} /></div>
      <span className="menu-anchor more-slot mobile-only">
        <button className="icon-btn" aria-label="More" aria-expanded={menu} onClick={() => setMenu(m => !m)}><Icon name="more" size={18} /></button>
        {menu && <div className="popover card" role="menu" onClick={() => setMenu(false)}>
          <button role="menuitem" className="t-body" onClick={refresh} disabled={loading || !connected}>Refresh from keyboard</button>
          {unsaved > 0 && <button role="menuitem" className="t-body" onClick={() => void discardChanges()}>Discard changes</button>}
          <button role="menuitem" className="t-body" onClick={disconnect} disabled={!connected}>Disconnect</button>
        </div>}
      </span>
    </div>
    {sheet && <ConnectionSheet studio={studio} onClose={() => setSheet(false)} />}
  </header>;
}

function ConnectionSheet({ studio, onClose }: { studio: Studio; onClose: () => void }) {
  const { connected, device, firmware, locked, transport, lock, disconnect } = studio;
  return <>
    <div className="scrim" onClick={onClose} />
    <div className="connection-sheet" role="dialog" aria-label="Connection">
      <div className="sheet-handle" />
      <div className="connection-head"><span className="t-body-strong">Connection</span><ConnectionStatus connected={connected} variant="desktop" /></div>
      <div className="connection-row"><span className="t-body variant">Keyboard</span><span className="t-body-strong">{connected ? device : "None"}</span></div>
      <div className="connection-row"><span className="t-body variant">Link</span><span className="t-body-strong">{transport === "usb" ? "USB serial" : "Bluetooth"}</span></div>
      <div className="connection-row"><span className="t-body variant">Firmware</span><span className="t-body-strong">{firmware}</span></div>
      <div className="connection-row"><span className="t-body variant">Studio lock</span>
        <span className="connection-value"><span className="t-body-strong">{locked ? "Locked" : "Unlocked"}</span>
          <button className="btn" disabled={locked || !connected} onClick={() => void lock()}>Lock</button></span></div>
      <div className="connection-actions"><button className="btn btn-lg btn-block" disabled={!connected} onClick={() => { disconnect(); onClose(); }}>Disconnect</button></div>
    </div>
  </>;
}

export function LockBanner({ onRefresh, loading }: { onRefresh: () => void; loading: boolean }) {
  return <div className="banner" role="alert">
    <Icon name="lock" />
    <p className="t-body">Keyboard is locked. Hold the System layer and press P on the keyboard to unlock editing.</p>
    <button onClick={onRefresh} disabled={loading}>{loading ? "CHECKING…" : "REFRESH"}</button>
  </div>;
}
