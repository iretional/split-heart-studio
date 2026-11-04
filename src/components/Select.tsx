import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { useIsMobile } from "../studio/prefs";
import { Icon } from "./Icon";

export type SelectOption<T extends string> = { value: T; label: string; group?: string };

const GAP = 4;
const EDGE = 8;
const MIN_WIDTH = 220;
const MAX_HEIGHT = 360;

/** Select component: a list in a floating menu, on the page itself so the panel around it can't clip it. Phones show it as an overlay. */
export function Select<T extends string>({ value, options, onChange, disabled, label }: {
  value: T; options: readonly SelectOption<T>[]; onChange: (v: T) => void; disabled?: boolean; label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const id = useId();
  const mobile = useIsMobile();
  const current = options.findIndex(o => o.value === value);
  const shown = options[current]?.label ?? "";

  // Phones split a grouped list into tabs, starting on the current value's group.
  const groups = [...new Set(options.flatMap(o => o.group ? [o.group] : []))];
  const tabbed = mobile && groups.length > 1;
  const [tab, setTab] = useState("");
  const visible = [...options.keys()].filter(i => !tabbed || options[i].group === tab);
  const showTab = (g: string) => {
    setTab(g);
    setActive(options.findIndex(o => o.group === g));
    if (list.current) list.current.scrollTop = 0;
  };

  const show = () => { setActive(Math.max(current, 0)); setTab(options[current]?.group ?? groups[0] ?? ""); setOpen(true); };
  const hide = () => { setOpen(false); trigger.current?.focus(); };
  const pick = (i: number) => { hide(); if (options[i].value !== value) onChange(options[i].value); };

  // Opens below the field, or above it when only that side has room for the whole list.
  useLayoutEffect(() => {
    const el = menu.current, field = trigger.current;
    if (!open || !el || !field) return;
    if (mobile) {
      el.querySelector(".select-tabs .tab.active")?.scrollIntoView({ block: "nearest", inline: "center" });
      el.focus({ preventScroll: true });
      return;
    }
    const r = field.getBoundingClientRect();
    const width = Math.max(r.width, MIN_WIDTH);
    const below = window.innerHeight - r.bottom - GAP - EDGE, above = r.top - GAP - EDGE;
    const up = el.scrollHeight > below && above > below;
    const height = Math.min(el.scrollHeight + 2, up ? above : below, MAX_HEIGHT);
    Object.assign(el.style, {
      width: width + "px", maxHeight: height + "px",
      left: Math.max(EDGE, Math.min(r.left, window.innerWidth - width - EDGE)) + "px",
      top: (up ? r.top - GAP - height : r.bottom + GAP) + "px",
    });
    el.focus({ preventScroll: true });
  }, [open, mobile]);

  useLayoutEffect(() => {
    if (open) menu.current?.querySelector(".select-option.active")?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  useEffect(() => {
    if (!open) return;
    const inside = (t: EventTarget | null) => t instanceof Node && (!!menu.current?.contains(t) || !!trigger.current?.contains(t));
    const onPress = (e: PointerEvent) => { if (!inside(e.target)) setOpen(false); };
    const onScroll = (e: Event) => { if (!inside(e.target)) setOpen(false); };
    const onResize = () => setOpen(false);
    // The overlay closes from its scrim's click, so the tap can't fall through to what is underneath.
    if (!mobile) document.addEventListener("pointerdown", onPress);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("pointerdown", onPress);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open, mobile]);

  const onMenuKey = (e: KeyboardEvent) => {
    const at = visible.indexOf(active), last = visible.length - 1;
    const moves: Record<string, number> = { ArrowDown: visible[Math.min(at + 1, last)], ArrowUp: visible[Math.max(at - 1, 0)], Home: visible[0], End: visible[last] };
    if (e.key in moves) setActive(moves[e.key]);
    else if (e.key === "Enter" || e.key === " ") pick(active);
    else if (e.key === "Escape" || e.key === "Tab") hide();
    else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      const starts = (i: number) => options[i].label.toLowerCase().startsWith(e.key.toLowerCase());
      const next = visible.find(i => i > active && starts(i)) ?? visible.find(starts);
      if (next !== undefined) setActive(next);
      else return;
    } else return;
    e.preventDefault();
  };

  return <span className={"select" + (disabled ? " disabled" : "")}>
    <button ref={trigger} type="button" className="select-trigger t-body" disabled={disabled} aria-label={label ? `${label}: ${shown}` : undefined}
      aria-haspopup="listbox" aria-expanded={open} onClick={() => open ? hide() : show()}
      onKeyDown={e => { if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); show(); } }}>
      <span className="select-value">{shown}</span><Icon name="chevronDown" size={14} />
    </button>
    {open && createPortal(<>
      {mobile && <div className="scrim scrim-blur select-scrim" onClick={hide} />}
      <div ref={menu} className={"select-menu" + (mobile ? " overlay" : "") + (tabbed ? " tabbed" : "")} role="listbox" tabIndex={-1} aria-label={label} aria-activedescendant={`${id}-${active}`} onKeyDown={onMenuKey}>
        {tabbed && <div className="tabs select-tabs" role="tablist" aria-label={label && `${label} groups`}>
          {groups.map(g => <button key={g} type="button" role="tab" tabIndex={-1} aria-selected={g === tab} className={"tab t-label" + (g === tab ? " active" : "")} onClick={() => showTab(g)}>{g.toUpperCase()}</button>)}
        </div>}
        <div ref={list} className={tabbed ? "select-list" : "select-rows"}>
          {visible.map(i => { const o = options[i]; return <div key={o.value} className="select-row">
            {!tabbed && o.group && o.group !== options[i - 1]?.group && <span className="select-group t-caption muted">{o.group}</span>}
            <button id={`${id}-${i}`} type="button" role="option" tabIndex={-1} aria-selected={i === current}
              className={"select-option t-body" + (i === active ? " active" : "")}
              onMouseEnter={() => setActive(i)} onMouseDown={e => e.preventDefault()} onClick={() => pick(i)}>
              <span className="select-value">{o.label}</span>{i === current && <Icon name="check" size={14} />}
            </button>
          </div>; })}
        </div>
      </div>
    </>, document.body)}
  </span>;
}
