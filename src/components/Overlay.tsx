import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { reducedMotion } from "./useHoverSelectFx";

/** A little longer than --fx-overlay, because the animation starts on the frame after the timer. */
const OVERLAY_MS = 320;
const BLOCKED = ["keydown", "pointerdown", "mousedown", "click"];

const block = (e: Event) => { e.preventDefault(); e.stopImmediatePropagation(); };
let locks = 0;

/** Stops all input on the page. Overlapping overlays share it, so it ends with the last one. */
function lockInput() {
  if (locks++ > 0) return;
  document.documentElement.classList.add("overlay-lock");
  BLOCKED.forEach(type => window.addEventListener(type, block, true));
}

function unlockInput() {
  if (--locks > 0) return;
  document.documentElement.classList.remove("overlay-lock");
  BLOCKED.forEach(type => window.removeEventListener(type, block, true));
}

export type OverlayStage = "in" | "open" | "out" | null;

/** Where an overlay is in its life. Input is blocked for the whole of "in" and "out". */
export function useOverlay(open: boolean): OverlayStage {
  const [seen, setSeen] = useState(false);
  const [stage, setStage] = useState<OverlayStage>(null);
  if (open !== seen) {
    setSeen(open);
    setStage(reducedMotion() ? (open ? "open" : null) : open ? "in" : "out");
  }
  useLayoutEffect(() => {
    if (stage !== "in" && stage !== "out") return;
    lockInput();
    const timer = setTimeout(() => setStage(stage === "in" ? "open" : null), OVERLAY_MS);
    return () => { clearTimeout(timer); unlockInput(); };
  }, [stage]);
  return stage;
}

/** Plays an overlay's entrance and exit. Its content stays as it last was while it leaves. */
export function Overlay({ open, children }: { open: boolean; children: ReactNode }) {
  const stage = useOverlay(open);
  const shown = useRef(children);
  if (open) shown.current = children;
  return stage && <div className={"overlay-stage overlay-" + stage}>{shown.current}</div>;
}
