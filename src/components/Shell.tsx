import type { ReactNode } from "react";
import { Icon } from "./Icon";

export const PAGES = ["keymap", "layers", "macros", "combos", "settings"] as const;
export type Page = typeof PAGES[number];

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

const syncText = (d: Date | null) => d
  ? `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}  `
    + `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
  : "—";

export function Sidebar({ page, onNavigate, navEnabled, device, connected, lastSync, open, onClose }: SidebarProps) {
  return <>
    {open && <div className="scrim" onClick={onClose} />}
    <aside className={"sidebar" + (open ? " open" : "")}>
      <div className="brand">
        <span className="t-logo">MAPPIE</span>
        <button className="icon-btn drawer-close" onClick={onClose} aria-label="Close menu"><Icon name="close" size={20} /></button>
      </div>
      <nav className={"nav" + (navEnabled ? "" : " disabled")} aria-label="Pages">
        {PAGES.map(p => <button key={p} className={"nav-item t-label" + (page === p ? " active" : "")}
          aria-current={page === p ? "page" : undefined}
          onClick={() => { onNavigate(p); onClose(); }}>{p.toUpperCase()}</button>)}
      </nav>
      <div className="device">
        <span className="t-caption muted">DEVICE</span>
        <span className="t-body-strong">{connected ? device : "No keyboard"}</span>
        <ConnectionStatus connected={connected} variant="desktop" />
      </div>
      <div className="meta">
        <div><span className="t-caption muted">LINK</span><span className="t-caption muted">{connected ? "USB · Studio RPC" : "—"}</span></div>
        <div><span className="t-caption muted">LAST SYNC</span><span className="t-caption muted">{syncText(lastSync)}</span></div>
      </div>
    </aside>
  </>;
}

/** Top bar shared by every page; on phones it also carries the menu button and connection dot. */
export function TopBar({ title, subtitle, tabs, actions, connected, onMenu }: {
  title?: string; subtitle?: string; tabs?: ReactNode; actions?: ReactNode; connected: boolean; onMenu: () => void;
}) {
  return <header className="topbar">
    <div className="topbar-title">
      <button className="icon-btn menu-btn" onClick={onMenu} aria-label="Open menu"><Icon name="menu" size={24} /></button>
      {title && <span className={"t-body-strong" + (tabs ? " mobile-only" : "")}>{title}</span>}
      {subtitle && <span className={"t-caption muted" + (tabs ? " mobile-only" : "")}>{subtitle}</span>}
    </div>
    {tabs}
    <div className="topbar-spacer" />
    <div className="topbar-actions">
      <span className="mobile-only"><ConnectionStatus connected={connected} variant="mobile" /></span>
      {actions}
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
