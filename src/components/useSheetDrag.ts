import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from "react";
import { flushSync } from "react-dom";
import { reducedMotion } from "./useHoverSelectFx";

/** Less movement than this is a tap. */
const TAP_PX = 4;
const SETTLE_MS = 200;
/** How far along its travel a drag has to get before the sheet goes the rest of the way. */
const COMMIT = 0.25;

/**
 * A bottom sheet that is pulled up by its handle until it covers the screen. At rest it sits in the
 * page's flow; while it moves it floats over the page, because a flow height can't be animated.
 */
export function useSheetDrag<T extends HTMLElement>() {
  const sheet = useRef<T>(null);
  const [expanded, setExpanded] = useState(false);
  const [floating, setFloating] = useState(false);
  const drag = useRef<{ y: number; start: number; moved: boolean } | null>(null);
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);

  /** The sheet's height at rest: what the keyboard leaves of the page. */
  const restHeight = (el: T) => {
    const body = el.parentElement!;
    const above = body.querySelector(".canvas")!;
    return body.getBoundingClientRect().bottom - above.getBoundingClientRect().bottom;
  };

  const float = (el: T, height: number) => {
    flushSync(() => setFloating(true));
    el.style.height = height + "px";
  };

  const settle = (open: boolean) => {
    const el = sheet.current;
    if (!el) return;
    const finish = () => {
      el.style.height = "";
      el.style.transition = "";
      setExpanded(open);
      setFloating(false);
    };
    if (!open) el.scrollTop = 0;
    if (reducedMotion()) return finish();
    float(el, el.getBoundingClientRect().height);
    el.getBoundingClientRect();
    el.style.transition = `height ${SETTLE_MS}ms ease-out`;
    el.style.height = (open ? window.innerHeight : restHeight(el)) + "px";
    timer.current = window.setTimeout(finish, SETTLE_MS);
  };

  const handle = {
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      const el = sheet.current;
      if (!el || el.style.transition) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      drag.current = { y: e.clientY, start: el.getBoundingClientRect().height, moved: false };
    },
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      const el = sheet.current, d = drag.current;
      if (!el || !d) return;
      const pulled = d.y - e.clientY;
      if (!d.moved && Math.abs(pulled) < TAP_PX) return;
      d.moved = true;
      float(el, Math.min(window.innerHeight, Math.max(restHeight(el), d.start + pulled)));
    },
    onPointerUp: () => {
      const el = sheet.current, d = drag.current;
      drag.current = null;
      if (!el || !d) return;
      if (!d.moved) return settle(!expanded);
      const rest = restHeight(el), full = window.innerHeight, height = el.getBoundingClientRect().height;
      const travelled = (expanded ? full - height : height - rest) / Math.max(1, full - rest);
      settle(travelled > COMMIT ? !expanded : expanded);
    },
    onPointerCancel: () => {
      if (drag.current?.moved) settle(expanded);
      drag.current = null;
    },
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); settle(!expanded); }
    },
  };

  /** Pressing the empty space under an expanded sheet's content puts it back. */
  const onSheetClick = (e: MouseEvent) => {
    const el = sheet.current;
    // A menu opened from the sheet sits elsewhere on the page, but its clicks still arrive here.
    if (!el || !expanded || !el.contains(e.target as Node)) return;
    const end = el.lastElementChild?.lastElementChild ?? el.lastElementChild;
    if (end && e.clientY > end.getBoundingClientRect().bottom) settle(false);
  };

  return { sheet, handle, onSheetClick, expanded, floating };
}
