import { useEffect, useLayoutEffect, useMemo, useRef, useState, type Ref } from "react";
import { ALL_KEYCODES, KEYCODE_TABS, keycodeForUsage, type Keycode } from "../keyLabels";
import { useIsMobile } from "../studio/prefs";
import { Icon } from "./Icon";
import { useEntrance } from "./useEntrance";

/** Buttons for a list of keycodes, split into their ZMK groups. */
function KeycodeGroups({ codes, current, onPick, listRef }: { codes: Keycode[]; current: number | null; onPick: (usage: number) => void; listRef: Ref<HTMLDivElement> }) {
  const selected = current === null ? undefined : keycodeForUsage(current)?.usage;
  const groups = [...new Set(codes.map(c => c.group))];
  return <div ref={listRef} className="keycode-list">
    {groups.map(g => <div key={g} className="keycode-group">
      <span className="t-caption muted">{g}</span>
      <div className="keycode-grid">
        {codes.filter(c => c.group === g).map(c => <button key={c.usage} title={c.description || c.zmk} aria-label={c.zmk} aria-pressed={c.usage === selected}
          className={"keycode" + (c.usage === selected ? " selected" : "")} onClick={() => onPick(c.usage)}><span className="t-body">{c.label}</span>{c.zmk.toLowerCase() !== c.label.toLowerCase() && <span className="keycode-name t-caption">{c.zmk}</span>}</button>)}
      </div>
    </div>)}
  </div>;
}

export function KeycodeDialog({ target, current, onPick, onClose }: { target: string; current: number; onPick: (usage: number) => void; onClose: () => void }) {
  const [tab, setTab] = useState(() => keycodeForUsage(current)?.tab ?? KEYCODE_TABS[0]);
  const [search, setSearch] = useState("");
  // On a phone, focusing the field would zoom the page and raise the on-screen keyboard over the list.
  const mobile = useIsMobile();
  const dialog = useRef<HTMLDivElement>(null);
  const listRoot = useEntrance<HTMLDivElement>(tab, false);
  // Runs on open, before paint, so the list never shows at the top first. Adjusting from the
  // current scroll position keeps the result the same if React runs this twice.
  useLayoutEffect(() => {
    const root = dialog.current;
    const list = root?.querySelector<HTMLElement>(".keycode-list");
    const key = list?.querySelector<HTMLElement>(".keycode.selected");
    if (list && key) list.scrollTop += key.getBoundingClientRect().top - list.getBoundingClientRect().top - (list.clientHeight - key.offsetHeight) / 2;
    const bar = root?.querySelector<HTMLElement>(".keycode-tabs");
    const tabEl = bar?.querySelector<HTMLElement>(".tab.active");
    if (bar && tabEl) bar.scrollLeft += tabEl.getBoundingClientRect().left - bar.getBoundingClientRect().left - (bar.clientWidth - tabEl.offsetWidth) / 2;
  }, []);
  const q = search.trim().toLowerCase();
  const codes = useMemo(() => q
    ? ALL_KEYCODES.filter(c => c.label.toLowerCase().includes(q) || c.zmk.toLowerCase().includes(q) || c.aliases.some(a => a.toLowerCase().includes(q)))
    : ALL_KEYCODES.filter(c => c.tab === tab), [q, tab]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return <>
    <div className="scrim scrim-blur" onClick={onClose} />
    <div ref={dialog} className="dialog keycode-dialog" role="dialog" aria-modal="true" aria-labelledby="keycode-title">
      <div className="keycode-dialog-head">
        <div><span id="keycode-title" className="t-body-strong">Keycode</span><span className="t-caption muted">{target}</span></div>
        <label className="search box t-body muted"><Icon name="search" size={14} /><input autoFocus={!mobile} aria-label="Search keycodes" placeholder="Search keycodes…" value={search} onChange={e => setSearch(e.target.value)} /></label>
      </div>
      <div className="tabs keycode-tabs" role="tablist" aria-label="Keycode categories">
        {KEYCODE_TABS.map(t => <button key={t} role="tab" aria-selected={!q && t === tab} className={"tab t-label" + (!q && t === tab ? " active" : "")}
          onClick={() => { setTab(t); setSearch(""); dialog.current?.querySelector(".keycode-list")?.scrollTo(0, 0); }}>{t}</button>)}
      </div>
      {codes.length ? <KeycodeGroups listRef={listRoot} codes={codes} current={current} onPick={onPick} />
        : <div className="keycode-list"><p className="t-caption muted">No keycode matches “{search}”.</p></div>}
      <div className="keycode-dialog-foot">
        <span className="t-caption muted">Keycodes follow ZMK. Picking one applies it and closes this window.</span>
        <button className="btn" onClick={onClose}>Cancel</button>
      </div>
    </div>
  </>;
}
