import { useEffect, useLayoutEffect, useMemo, useRef, useState, type Ref } from "react";
import { ALL_KEYCODES, KEYCODE_TABS, keycodeForUsage, type Keycode } from "../keyLabels";
import { useIsMobile } from "../studio/prefs";
import { Icon } from "./Icon";
import { useEntrance } from "./useEntrance";

/** A table of keycodes, one per row, under a heading for each of their ZMK groups. Phones leave out the ZMK code column. */
function KeycodeTable({ codes, selected, showCode, onSelect, listRef }: { codes: Keycode[]; selected: number | undefined; showCode: boolean; onSelect: (usage: number) => void; listRef: Ref<HTMLDivElement> }) {
  const groups = [...new Set(codes.map(c => c.group))];
  return <div ref={listRef} className="keycode-list">
    <table className="keycode-table" role="grid">
      <thead><tr>{["Key", ...(showCode ? ["ZMK code"] : []), "Description"].map((h, i) => <th key={h} scope="col" className={"t-caption muted col-" + (i + 1)}>{h.toUpperCase()}</th>)}</tr></thead>
      {groups.map(g => <tbody key={g}>
        <tr className="keycode-group-row"><th colSpan={showCode ? 3 : 2} scope="rowgroup" className="t-caption muted">{g}</th></tr>
        {codes.filter(c => c.group === g).map(c => <tr key={c.usage} tabIndex={0} aria-selected={c.usage === selected} aria-label={c.zmk}
          className={"keycode-row" + (c.usage === selected ? " selected" : "")} onClick={() => onSelect(c.usage)}
          onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(c.usage); } }}>
          <td className="t-body">{c.label}</td>
          {showCode && <td className="t-code">{c.zmk}</td>}
          <td className="t-caption">{c.description}</td>
        </tr>)}
      </tbody>)}
    </table>
  </div>;
}

export function KeycodeDialog({ target, current, onPick, onClose }: { target: string; current: number; onPick: (usage: number) => void; onClose: () => void }) {
  const [tab, setTab] = useState(() => keycodeForUsage(current)?.tab ?? KEYCODE_TABS[0]);
  const [search, setSearch] = useState("");
  // A row only marks the choice. Nothing reaches the key until Apply.
  const original = keycodeForUsage(current)?.usage;
  const [selected, setSelected] = useState(original);
  // On a phone, focusing the field would zoom the page and raise the on-screen keyboard over the list.
  const mobile = useIsMobile();
  const dialog = useRef<HTMLDivElement>(null);
  const listRoot = useEntrance<HTMLDivElement>(tab, false);
  // Runs on open, before paint, so the list never shows at the top first. Adjusting from the
  // current scroll position keeps the result the same if React runs this twice.
  useLayoutEffect(() => {
    const root = dialog.current;
    const list = root?.querySelector<HTMLElement>(".keycode-list");
    const key = list?.querySelector<HTMLElement>(".keycode-row.selected");
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
    <div ref={dialog} className="dialog keycode-dialog" role="dialog" aria-modal="true" aria-label={`Keycode for ${target}`}>
      <div className="keycode-dialog-head">
        {!mobile && <span className="t-body-strong">Keycode</span>}
        <label className="search box t-body muted"><Icon name="search" size={14} /><input autoFocus={!mobile} aria-label="Search keycodes" placeholder="Search keycodes…" value={search} onChange={e => setSearch(e.target.value)} /></label>
      </div>
      <div className="keycode-dialog-body">
      <div className="tabs keycode-tabs" role="tablist" aria-label="Keycode categories">
        {KEYCODE_TABS.map(t => <button key={t} role="tab" aria-selected={!q && t === tab} className={"tab t-label" + (!q && t === tab ? " active" : "")}
          onClick={() => { setTab(t); setSearch(""); dialog.current?.querySelector(".keycode-list")?.scrollTo(0, 0); }}>{t}</button>)}
      </div>
      {codes.length ? <KeycodeTable showCode={!mobile} listRef={listRoot} codes={codes} selected={selected} onSelect={setSelected} />
        : <div className="keycode-list"><p className="t-caption muted">No keycode matches “{search}”.</p></div>}
      <div className="keycode-dialog-foot">
        <button className="btn btn-primary" disabled={selected === undefined || selected === original} onClick={() => { if (selected !== undefined) onPick(selected); }}>Apply</button>
        <button className="btn" onClick={onClose}>Cancel</button>
      </div>
      </div>
    </div>
  </>;
}
