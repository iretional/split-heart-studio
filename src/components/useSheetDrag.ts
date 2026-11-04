import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from "react";
import { flushSync } from "react-dom";
import { reducedMotion } from "./useHoverSelectFx";

/** Less movement than this is a tap. */
const TAP_PX = 4;
const SETTLE_MS = 200;
/** How far along its travel a drag has to get before the sheet goes the rest of the way. */
const COMMIT = 0.25;
/** A finger has to travel this far up, mostly straight, for a swipe to count as scrolling down. */
const SWIPE_PX = 56;
/** Wheel travel that counts as scrolling down. A single mouse wheel notch stays under it. */
const WHEEL_PX = 150;
/** A pause this long starts the wheel count over, so small scrolls don't add up. */
const WHEEL_RESET_MS = 200;
const LINE_PX = 16;
/** Touches starting here do something else with the finger. */
const OWN_GESTURE = ".sheet-handle, input, textarea, select, [draggable=true]";

/**
 * A bottom sheet that is pulled up by its handle until it covers the screen. At rest it sits in the
 * page's flow; while it moves it floats over the page, because a flow height can't be animated.
 * The page around it can't scroll, so with `scrollOpens` a deliberate scroll down opens the sheet instead.
 */
export function useSheetDrag<T extends HTMLElement>(scrollOpens = false) {
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

  useEffect(() => {
    const page = sheet.current?.parentElement;
    if (!scrollOpens || expanded || !page) return;
    const open = () => { if (!drag.current && !sheet.current?.style.transition) settle(true); };
    let swipe: { x: number; y: number } | null = null;
    let wheeled = 0, lastWheel = 0;
    const onTouchStart = (e: TouchEvent) => {
      const own = e.target instanceof Element && e.target.closest(OWN_GESTURE);
      swipe = e.touches.length === 1 && !own ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!swipe) return;
      if (e.touches.length !== 1) { swipe = null; return; }
      const up = swipe.y - e.touches[0].clientY, across = Math.abs(swipe.x - e.touches[0].clientX);
      if (up < SWIPE_PX || up < across * 2) return;
      swipe = null;
      open();
    };
    const onWheel = (e: WheelEvent) => {
      if (e.timeStamp - lastWheel > WHEEL_RESET_MS || e.deltaY <= 0) wheeled = 0;
      lastWheel = e.timeStamp;
      wheeled += Math.max(0, e.deltaY) * (e.deltaMode === WheelEvent.DOM_DELTA_LINE ? LINE_PX : 1);
      if (wheeled < WHEEL_PX) return;
      wheeled = 0;
      open();
    };
    page.addEventListener("touchstart", onTouchStart, { passive: true });
    page.addEventListener("touchmove", onTouchMove, { passive: true });
    page.addEventListener("wheel", onWheel, { passive: true });
    return () => {
      page.removeEventListener("touchstart", onTouchStart);
      page.removeEventListener("touchmove", onTouchMove);
      page.removeEventListener("wheel", onWheel);
    };
    // settle reads only refs and setters, so an older copy of it behaves the same.
  }, [scrollOpens, expanded]);

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
