import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from "react";
import { flushSync } from "react-dom";
import { reducedMotion } from "./useHoverSelectFx";

/** Less movement than this is a tap. */
const TAP_PX = 4;
const SETTLE_MS = 200;
/** How far along its travel a drag has to get before the sheet goes the rest of the way. */
const COMMIT = 0.25;
/** Share of the screen the sheet covers at rest, and raised. Keep in step with `.key-sheet` in styles.css. */
const REST = 0.25;
const OPEN = 0.75;
/** A finger has to travel this far, mostly straight, for a swipe to count as a scroll. */
const SWIPE_PX = 56;
/** Wheel travel that counts as a scroll. A single mouse wheel notch stays under it. */
const WHEEL_PX = 150;
/** A pause this long starts the wheel count over, so small scrolls don't add up. */
const WHEEL_RESET_MS = 200;
const LINE_PX = 16;
/** Touches starting here do something else with the finger. */
const OWN_GESTURE = ".sheet-handle, input, textarea, select, [draggable=true]";

/**
 * A bottom sheet over the foot of the page, with two sizes: a quarter of the screen at rest, three quarters raised.
 * Its handle drags or toggles it. Neither the page nor the sheet scrolls, so with `scrollMoves` a deliberate
 * scroll down raises the sheet and a scroll up lowers it.
 */
export function useSheetDrag<T extends HTMLElement>(scrollMoves = false) {
  const sheet = useRef<T>(null);
  const [expanded, setExpanded] = useState(false);
  const [floating, setFloating] = useState(false);
  const drag = useRef<{ y: number; start: number; moved: boolean } | null>(null);
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const heightOf = (open: boolean) => window.innerHeight * (open ? OPEN : REST);

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
    if (reducedMotion()) return finish();
    float(el, el.getBoundingClientRect().height);
    el.getBoundingClientRect();
    el.style.transition = `height ${SETTLE_MS}ms ease-out`;
    el.style.height = heightOf(open) + "px";
    timer.current = window.setTimeout(finish, SETTLE_MS);
  };

  useEffect(() => {
    const el = sheet.current;
    // The sheet sits inside this, so a scroll anywhere on the page counts, over the sheet or not.
    const target = el?.parentElement;
    if (!scrollMoves || !el || !target) return;
    const move = (open: boolean) => {
      if (open !== expanded && !drag.current && !el.style.transition) settle(open);
    };
    let swipe: { x: number; y: number } | null = null;
    let wheeled = 0, lastWheel = 0, wheelCounts = true;
    const onTouchStart = (e: TouchEvent) => {
      const own = e.target instanceof Element && e.target.closest(OWN_GESTURE);
      swipe = e.touches.length === 1 && !own ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!swipe) return;
      if (e.touches.length !== 1) { swipe = null; return; }
      const along = swipe.y - e.touches[0].clientY, across = Math.abs(swipe.x - e.touches[0].clientX);
      if (Math.abs(along) < SWIPE_PX || Math.abs(along) < across * 2) return;
      // One swipe counts once.
      swipe = null;
      move(along > 0);
    };
    const onWheel = (e: WheelEvent) => {
      // A wheel has to pause before it counts again, so one flick's momentum can't move the sheet and back.
      if (e.timeStamp - lastWheel > WHEEL_RESET_MS) { wheeled = 0; wheelCounts = true; }
      lastWheel = e.timeStamp;
      if (!wheelCounts) return;
      const delta = e.deltaY * (e.deltaMode === WheelEvent.DOM_DELTA_LINE ? LINE_PX : 1);
      // A change of direction starts the count over.
      wheeled = Math.sign(delta) === Math.sign(wheeled) ? wheeled + delta : delta;
      if (Math.abs(wheeled) < WHEEL_PX) return;
      wheelCounts = false;
      move(wheeled > 0);
      wheeled = 0;
    };
    target.addEventListener("touchstart", onTouchStart, { passive: true });
    target.addEventListener("touchmove", onTouchMove, { passive: true });
    target.addEventListener("wheel", onWheel, { passive: true });
    return () => {
      target.removeEventListener("touchstart", onTouchStart);
      target.removeEventListener("touchmove", onTouchMove);
      target.removeEventListener("wheel", onWheel);
    };
    // settle reads only refs and setters, so an older copy of it behaves the same.
  }, [scrollMoves, expanded]);

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
      float(el, Math.min(heightOf(true), Math.max(heightOf(false), d.start + pulled)));
    },
    onPointerUp: () => {
      const el = sheet.current, d = drag.current;
      drag.current = null;
      if (!el || !d) return;
      if (!d.moved) return settle(!expanded);
      const rest = heightOf(false), open = heightOf(true), height = el.getBoundingClientRect().height;
      const travelled = (expanded ? open - height : height - rest) / Math.max(1, open - rest);
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

  /** Pressing the empty space under a raised sheet's content puts it back. */
  const onSheetClick = (e: MouseEvent) => {
    const el = sheet.current;
    // A menu opened from the sheet sits elsewhere on the page, but its clicks still arrive here.
    if (!el || !expanded || !el.contains(e.target as Node)) return;
    const end = el.lastElementChild?.lastElementChild ?? el.lastElementChild;
    if (end && e.clientY > end.getBoundingClientRect().bottom) settle(false);
  };

  return { sheet, handle, onSheetClick, expanded, floating };
}
