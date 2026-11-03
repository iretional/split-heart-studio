import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./Icon";

export type SelectOption<T extends string> = { value: T; label: string; group?: string };

const GAP = 4;
const EDGE = 8;
const MIN_WIDTH = 220;
const MAX_HEIGHT = 360;

/** Select component: a list in a floating menu, on the page itself so the panel around it can't clip it. */
export function Select<T extends string>({ value, options, onChange, disabled, label }: {
  value: T; options: readonly SelectOption<T>[]; onChange: (v: T) => void; disabled?: boolean; label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const id = useId();
  const current = options.findIndex(o => o.value === value);
  const shown = options[current]?.label ?? "";

  const show = () => { setActive(Math.max(current, 0)); setOpen(true); };
  const hide = () => { setOpen(false); trigger.current?.focus(); };
  const pick = (i: number) => { hide(); if (options[i].value !== value) onChange(options[i].value); };

  // Opens below the field, or above it when only that side has room for the whole list.
  useLayoutEffect(() => {
    const el = menu.current, field = trigger.current;
    if (!open || !el || !field) return;
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
  }, [open]);

  useLayoutEffect(() => {
    if (open) menu.current?.querySelector(".select-option.active")?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  useEffect(() => {
    if (!open) return;
    const inside = (t: EventTarget | null) => t instanceof Node && (!!menu.current?.contains(t) || !!trigger.current?.contains(t));
    const onPress = (e: PointerEvent) => { if (!inside(e.target)) setOpen(false); };
    const onScroll = (e: Event) => { if (!inside(e.target)) setOpen(false); };
    const onResize = () => setOpen(false);
    document.addEventListener("pointerdown", onPress);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("pointerdown", onPress);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  const onMenuKey = (e: KeyboardEvent) => {
    const last = options.length - 1;
    const moves: Record<string, number> = { ArrowDown: Math.min(active + 1, last), ArrowUp: Math.max(active - 1, 0), Home: 0, End: last };
    if (e.key in moves) setActive(moves[e.key]);
    else if (e.key === "Enter" || e.key === " ") pick(active);
    else if (e.key === "Escape" || e.key === "Tab") hide();
    else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      const starts = (i: number) => options[i].label.toLowerCase().startsWith(e.key.toLowerCase());
      const next = [...options.keys()].find(i => i > active && starts(i)) ?? [...options.keys()].find(starts);
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
    {open && createPortal(<div ref={menu} className="select-menu" role="listbox" tabIndex={-1} aria-label={label} aria-activedescendant={`${id}-${active}`} onKeyDown={onMenuKey}>
      {options.map((o, i) => <div key={o.value} className="select-row">
        {o.group && o.group !== options[i - 1]?.group && <span className="select-group t-caption muted">{o.group}</span>}
        <button id={`${id}-${i}`} type="button" role="option" tabIndex={-1} aria-selected={i === current}
          className={"select-option t-body" + (i === active ? " active" : "")}
          onMouseEnter={() => setActive(i)} onMouseDown={e => e.preventDefault()} onClick={() => pick(i)}>
          <span className="select-value">{o.label}</span>{i === current && <Icon name="check" size={14} />}
        </button>
      </div>)}
    </div>, document.body)}
  </span>;
}
