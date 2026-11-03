import { useState, type CSSProperties } from "react";

export const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
/** Which way a glitch splits: 1 is top left and bottom right, -1 the mirror of that. */
export const randomDir = () => Math.random() < 0.5 ? 1 : -1;
export const canHover = () => window.matchMedia("(hover: hover)").matches;

/**
 * Which item is playing the hover stroke-in-fill or the select glitch.
 * Band copies for the glitch exist only while it plays, so idle lists stay light.
 * The hover class stays until the pointer leaves, and its animation runs once per entry.
 */
export function useHoverSelectFx<T>() {
  const [hovering, setHovering] = useState<T | null>(null);
  const [selecting, setSelecting] = useState<T | null>(null);
  const [dir, setDir] = useState(1);
  return {
    hovering, selecting,
    /** Style for the glitch copies, so each glitch can split either way. */
    bandStyle: { "--fx-dir": dir } as CSSProperties,
    enter: (id: T) => { if (canHover() && !reducedMotion()) setHovering(id); },
    leave: (id: T) => setHovering(h => h === id ? null : h),
    select: (id: T) => { setDir(randomDir()); setHovering(null); setSelecting(reducedMotion() ? null : id); },
    selectEnd: () => setSelecting(null),
  };
}
