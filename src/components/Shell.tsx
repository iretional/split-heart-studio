import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Studio } from "../studio/useStudio";
import { Icon, type IconName } from "./Icon";
import { Overlay, useOverlay } from "./Overlay";
import { useFullscreen } from "./useFullscreen";
import { isDemo } from "../studio/demo";
import { useHoverSelectFx } from "./useHoverSelectFx";

export const PAGES = ["keymap", "layers", "settings", "motion"] as const;
export type Page = typeof PAGES[number];
const PAGE_ICONS: Record<Page, IconName> = { keymap: "caseSensitive", layers: "layers", settings: "settings", motion: "play" };
/** These pages work without a keyboard connected. */
const OFFLINE_PAGES: readonly Page[] = ["motion"];
/** Opened by typing the address. The nav lists them only while they are open. */
const UNLISTED_PAGES: readonly Page[] = ["motion"];

/** Connection Status component: a dot and its label. */
export function ConnectionStatus({ connected }: { connected: boolean }) {
  return <span className={"status desktop" + (connected ? " connected" : "")} role="status">
    <span className="status-dot" /><span className="t-body">{connected ? "Connected" : "Disconnected"}</span>
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
  const fx = useHoverSelectFx<Page>();
  const stage = useOverlay(open);
  const fullscreen = useFullscreen();
  return <>
    <Overlay open={open}><div className="scrim drawer-scrim" onClick={onClose} /></Overlay>
    <aside className={"sidebar" + (open ? " open" : "") + (stage ? " overlay-" + stage : "")}>
      <div className="brand">
        <span className="t-logo">SPLIT STUDIO</span>
        <button className="icon-btn drawer-close" onClick={onClose} aria-label="Close menu"><Icon name="close" size={20} /></button>
      </div>
      <nav className="nav" aria-label="Pages">
        {PAGES.filter(p => !UNLISTED_PAGES.includes(p) || page === p).map(p => {
          const face = <><Icon name={PAGE_ICONS[p]} size={20} />{p.toUpperCase()}</>;
          const selecting = page === p && fx.selecting === p;
          return <button key={p} className={"nav-item t-label" + (page === p ? " active" : "") + (navEnabled || OFFLINE_PAGES.includes(p) ? "" : " disabled")
            + (fx.hovering === p ? " fx-hover" : "") + (selecting ? " fx-select" : "")}
            aria-current={page === p ? "page" : undefined}
            onMouseEnter={() => { if (page !== p) fx.enter(p); }} onMouseLeave={() => fx.leave(p)}
            onClick={() => { if (page !== p) fx.select(p); onNavigate(p); onClose(); }}>
            {face}
            {selecting && [1, 2, 3, 4].map(n => <span key={n} aria-hidden="true" className={"nav-band fx-band-" + n} style={fx.bandStyle} onAnimationEnd={n === 4 ? fx.selectEnd : undefined}>{face}</span>)}
          </button>;
        })}
      </nav>
      {/* A reload, since the app picks demo data or the keyboard when it starts. */}
      <a className="side-action demo-link mobile-only t-caption" href={isDemo() ? "./" : "./?demo"}>
        <Icon name="play" size={14} />{isDemo() ? "Exit demo" : "Demo"}</a>
      {fullscreen.supported && <button className="side-action fullscreen-toggle mobile-only t-caption" aria-pressed={fullscreen.active} onClick={fullscreen.toggle}>
        <Icon name={fullscreen.active ? "fullscreenExit" : "fullscreen"} size={14} />{fullscreen.active ? "Exit fullscreen" : "Fullscreen"}</button>}
      <div className="device">
        <span className="t-caption muted">DEVICE</span>
        <span className="t-body-strong">{connected ? device : "No keyboard"}</span>
        <ConnectionStatus connected={connected} />
      </div>
      <div className="meta">
        <span className="t-caption muted">LAST SYNC</span><span className="t-caption muted">{syncText(lastSync)}</span>
      </div>
    </aside>
  </>;
}

/** Save Status component. Phones show two buttons whose icon and color say whether there is anything to do. */
function SaveStatus({ studio }: { studio: Studio }) {
  const { unsaved, saveChanges, discardChanges } = studio;
  const pending = unsaved > 0;
  const activeIf = pending ? " active" : "";
  return <>
    {pending
      ? <span className="save-status desktop-only">
          <span className="dot-danger" />
          <span className="t-caption variant">{unsaved} unsaved change{unsaved === 1 ? "" : "s"}</span>
          <button className="btn" onClick={() => void discardChanges()}>Discard</button>
          <button className="btn btn-primary" onClick={() => void saveChanges()}>Save</button>
        </span>
      : <span className="save-status desktop-only t-caption muted"><Icon name="check" size={14} />All changes saved</span>}
    <span className="save-actions mobile-only">
      <button className={"icon-btn save-action" + activeIf} disabled={!pending} aria-label={pending ? `Save ${unsaved} unsaved change${unsaved === 1 ? "" : "s"}` : "All changes saved"} onClick={() => void saveChanges()}><Icon name={pending ? "save" : "check"} size={20} /></button>
      <button className={"icon-btn discard-action" + activeIf} disabled={!pending} aria-label="Discard changes" onClick={() => void discardChanges()}><Icon name="close" size={20} /></button>
    </span>
  </>;
}

/** Top bar shared by every page. title, subtitle and tabs vary; the right side is always the same. */
export function TopBar({ title, subtitle, tabs, studio, onMenu, onBack, showSave = true }: {
  title?: string; subtitle?: string; tabs?: ReactNode; studio: Studio; onMenu: () => void;
  onBack?: () => void; showSave?: boolean;
}) {
  const { connected, device, loading, refresh, disconnect } = studio;
  const [menu, setMenu] = useState(false);
  const menuAnchor = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!menu) return;
    const onPress = (e: PointerEvent) => { if (!menuAnchor.current?.contains(e.target as Node)) setMenu(false); };
    document.addEventListener("pointerdown", onPress);
    return () => document.removeEventListener("pointerdown", onPress);
  }, [menu]);
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
      {connected && showSave && <div className="save-slot"><SaveStatus studio={studio} /></div>}
      <div className="keyboard-select desktop-only"><span className="t-label">{(device || "Split Heart").toUpperCase()}</span><Icon name="chevronDown" size={14} /></div>
      <span ref={menuAnchor} className="menu-anchor more-slot mobile-only">
        <button className="icon-btn" aria-label="More" aria-expanded={menu} onClick={() => setMenu(m => !m)}><Icon name="more" size={18} /></button>
        <Overlay open={menu}>{menu && <div className="popover card" role="menu" onClick={() => setMenu(false)}>
          <button role="menuitem" className="t-body" onClick={refresh} disabled={loading || !connected}><Icon name="refresh" size={16} />Refresh from keyboard</button>
          <button role="menuitem" className="t-body" onClick={disconnect} disabled={!connected}><Icon name="plug" size={16} />Disconnect</button>
        </div>}</Overlay>
      </span>
    </div>
  </header>;
}

export function LockBanner({ onRefresh, loading }: { onRefresh: () => void; loading: boolean }) {
  return <div className="banner" role="alert">
    <Icon name="lock" />
    <p className="t-body">Keyboard is locked. Hold the System layer and press P on the keyboard to unlock editing.</p>
    <button onClick={onRefresh} disabled={loading}>{loading ? "CHECKING…" : "REFRESH"}</button>
  </div>;
}
