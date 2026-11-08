import { useEffect, useRef, type MouseEvent, type PointerEvent } from "react";

/** A finger that strays this far is scrolling, not holding. */
const SLOP_PX = 10;

/** Calls `done` once a press has been held still for `ms`. Spread the result on the element to hold. */
export function useLongPress(ms: number, done: () => void) {
  const timer = useRef<number>();
  const start = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const cancel = () => {
    window.clearTimeout(timer.current);
    start.current = null;
  };
  return {
    onPointerDown: (e: PointerEvent) => {
      if (!e.isPrimary) return;
      cancel();
      start.current = { x: e.clientX, y: e.clientY };
      timer.current = window.setTimeout(() => { start.current = null; done(); }, ms);
    },
    onPointerMove: (e: PointerEvent) => {
      const s = start.current;
      if (s && Math.hypot(e.clientX - s.x, e.clientY - s.y) > SLOP_PX) cancel();
    },
    onPointerUp: cancel,
    onPointerCancel: cancel,
    onPointerLeave: cancel,
    // A held finger would otherwise open the phone's context menu.
    onContextMenu: (e: MouseEvent) => e.preventDefault(),
  };
}
