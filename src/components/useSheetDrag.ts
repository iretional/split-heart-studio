import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from "react";
import { flushSync } from "react-dom";
import { reducedMotion } from "./useHoverSelectFx";

/** Less movement than this is a tap. */
const TAP_PX = 4;
const SETTLE_MS = 200;
/** How far along its travel a drag has to get before the sheet goes the rest of the way. */
const COMMIT = 0.25;
/** A finger has to travel this far, mostly straight, for a swipe to count as a scroll. */
const SWIPE_PX = 56;
/** Wheel travel that counts as a scroll. A single mouse wheel notch stays under it. */
const WHEEL_PX = 150;
/** A pause this long starts the wheel count over, so small scrolls don't add up. */
const WHEEL_RESET_MS = 200;
const LINE_PX = 16;
/** Touches starting here do something else with the finger. */
const OWN_GESTURE = ".sheet-handle, input, textarea, select, [draggable=true]";

/** Where the sheet can come to rest: in the page's flow, over half the screen, or over all of it. */
type Stop = "rest" | "half" | "full";

/**
 * A bottom sheet that is pulled up by its handle until it covers the screen. At rest it sits in the
 * page's flow; while it moves it floats over the page, because a flow height can't be animated.
 * The page around it can't scroll, so with `scrollMoves` a deliberate scroll down raises the sheet to half the screen.
 * Once open, a scroll up from the top of its content closes it again. Only the handle takes it all the way up.
 */
export function useSheetDrag<T extends HTMLElement>(scrollMoves = false) {
  const sheet = useRef<T>(null);
  const [stop, setStop] = useState<Stop>("rest");
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

  const settle = (to: Stop) => {
    const el = sheet.current;
    if (!el) return;
    const finish = () => {
      el.style.height = "";
      el.style.transition = "";
      setStop(to);
      setFloating(false);
    };
    if (to === "rest") el.scrollTop = 0;
    if (reducedMotion()) return finish();
    float(el, el.getBoundingClientRect().height);
    el.getBoundingClientRect();
    el.style.transition = `height ${SETTLE_MS}ms ease-out`;
    el.style.height = (to === "full" ? window.innerHeight : to === "half" ? window.innerHeight / 2 : restHeight(el)) + "px";
    timer.current = window.setTimeout(finish, SETTLE_MS);
  };

  useEffect(() => {
    const el = sheet.current;
    // A full sheet leaves no page to touch. At half, the keyboard above it answers too.
    const target = stop === "full" ? el : el?.parentElement;
    if (!scrollMoves || !el || !target) return;
    const toward = stop === "rest" ? 1 : -1;
    const move = () => {
      if (drag.current || el.style.transition) return;
      if (stop !== "rest") return settle("rest");
      // On a screen where the sheet already fills half, there's nothing to raise it to.
      if (restHeight(el) < window.innerHeight / 2) settle("half");
    };
    // An open sheet scrolls its own content first, so it only closes from the top of that content.
    const atEnd = () => stop === "rest" || el.scrollTop <= 0;
    let swipe: { x: number; y: number } | null = null;
    let wheeled = 0, lastWheel = 0, wheelCounts = true;
    const onTouchStart = (e: TouchEvent) => {
      const own = e.target instanceof Element && e.target.closest(OWN_GESTURE);
      swipe = e.touches.length === 1 && !own && atEnd() ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!swipe) return;
      if (e.touches.length !== 1 || !atEnd()) { swipe = null; return; }
      const along = (swipe.y - e.touches[0].clientY) * toward, across = Math.abs(swipe.x - e.touches[0].clientX);
      if (along < SWIPE_PX || along < across * 2) return;
      swipe = null;
      move();
    };
    const onWheel = (e: WheelEvent) => {
      // A wheel that was scrolling the content needs a pause first, or its momentum would close the sheet.
      if (e.timeStamp - lastWheel > WHEEL_RESET_MS) { wheeled = 0; wheelCounts = true; }
      lastWheel = e.timeStamp;
      if (!atEnd()) wheelCounts = false;
      const along = e.deltaY * toward;
      if (!wheelCounts || along <= 0) { wheeled = 0; return; }
      wheeled += along * (e.deltaMode === WheelEvent.DOM_DELTA_LINE ? LINE_PX : 1);
      if (wheeled < WHEEL_PX) return;
      wheeled = 0;
      move();
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
  }, [scrollMoves, stop]);

  const toggle = () => settle(stop === "full" ? "rest" : "full");

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
      if (!d.moved) return toggle();
      const height = el.getBoundingClientRect().height, up = height > d.start;
      const travelled = up ? (height - d.start) / (window.innerHeight - d.start) : (d.start - height) / (d.start - restHeight(el));
      settle(travelled > COMMIT ? (up ? "full" : "rest") : stop);
    },
    onPointerCancel: () => {
      if (drag.current?.moved) settle(stop);
      drag.current = null;
    },
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
    },
  };

  /** Pressing the empty space under an expanded sheet's content puts it back. */
  const onSheetClick = (e: MouseEvent) => {
    const el = sheet.current;
    // A menu opened from the sheet sits elsewhere on the page, but its clicks still arrive here.
    if (!el || stop === "rest" || !el.contains(e.target as Node)) return;
    const end = el.lastElementChild?.lastElementChild ?? el.lastElementChild;
    if (end && e.clientY > end.getBoundingClientRect().bottom) settle("rest");
  };

  return { sheet, handle, onSheetClick, stop, floating };
}
