import { useLayoutEffect, useRef } from "react";
import { reducedMotion } from "./useHoverSelectFx";

const LEAF = "button, a, input, select, textarea, label, svg, .box, [role=button], [data-enter-item]";
const SKIP = ".scrim, title, defs, .key, .digit-band, details:not([open]) > :not(summary)";
const CONTROL = "input, select, textarea";
/** Layers an effect draws over an element, which are not part of its value. */
const BANDS = ".nav-band, .tab-band, .btn-band, .fx-shuffle";
const CLEAR = "rgba(0, 0, 0, 0)";
const FINISH = new WeakSet<Element>();

const onScreen = (el: Element) => {
  const r = el.getBoundingClientRect();
  return el.getClientRects().length > 0 && r.right > 0 && r.left < window.innerWidth && r.bottom > 0 && r.top < window.innerHeight;
};
const hasText = (el: Element) => [...el.childNodes].some(n => n.nodeType === Node.TEXT_NODE && n.textContent?.trim());
/** An empty element still counts when it draws something, like a status dot. */
const painted = (el: Element) => {
  const s = getComputedStyle(el);
  return s.backgroundColor !== CLEAR || parseFloat(s.borderTopWidth) > 0 || parseFloat(s.borderBottomWidth) > 0;
};

type Item = HTMLElement | SVGElement;

/** Finds the elements that enter one by one, in page order, without splitting a control into pieces. */
function collect(parent: Element, out: Item[], onMap?: (at: number, map: SVGElement) => void) {
  for (const el of parent.children) {
    if (el.matches(SKIP) || !onScreen(el)) continue;
    if (el.matches(".fx-enter-map")) {
      onMap?.(out.length, el as SVGElement);
      collect(el, out);
    } else if (el.matches(LEAF) || hasText(el) || (el.children.length === 0 && painted(el))) out.push(el as Item);
    else collect(el, out, onMap);
  }
}

/** What an element shows and where: an element matching one from before the switch hasn't changed. */
function signature(el: Element) {
  const r = el.getBoundingClientRect();
  const control = el.matches(CONTROL) ? el as HTMLInputElement : el.querySelector<HTMLInputElement>(CONTROL);
  const shown = el.matches("svg") ? el.innerHTML : [...el.childNodes].filter(n => !(n instanceof Element && n.matches(BANDS))).map(n => n.textContent).join("");
  return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height), shown, control?.value, el.getAttribute("aria-checked"), el.getAttribute("aria-pressed")].join("|");
}

function signatures(root: Element) {
  const items: Item[] = [];
  collect(root, items);
  return new Set(items.map(signature));
}

function play(root: Element, before: Set<string>) {
  const items: Item[] = [];
  let mapAt = 0, map: SVGElement | undefined;
  collect(root, items, (at, el) => { mapAt = at; map = el; });
  const changed = items.filter((el, i) => {
    const same = before.has(signature(el));
    if (same && i < mapAt) mapAt--;
    return !same;
  });
  map?.style.setProperty("--fx-keys-at", String(mapAt));
  changed.forEach((el, i) => {
    // An element still entering from a switch a moment ago has to restart.
    if (el.hasAttribute("data-enter")) { el.removeAttribute("data-enter"); el.getBoundingClientRect(); }
    el.style.setProperty("--fx-enter-i", String(i));
    if (!el.style.getPropertyValue("--fx-enter-o")) el.style.setProperty("--fx-enter-o", getComputedStyle(el).opacity);
    el.setAttribute("data-enter", "");
    if (FINISH.has(el)) return;
    FINISH.add(el);
    const finish = (e: Event) => {
      if (e.target !== el || (e as AnimationEvent).animationName !== "fx-enter") return;
      // A hover effect can replace the entrance, which must not resume afterwards; a restart keeps it.
      if (e.type === "animationcancel" && el.getAnimations().some(x => (x as CSSAnimation).animationName === "fx-enter")) return;
      el.removeAttribute("data-enter");
    };
    el.addEventListener("animationend", finish);
    el.addEventListener("animationcancel", finish);
  });
}

/**
 * Plays the staggered entrance inside the returned ref whenever `view` changes, for the elements
 * whose value or place differs from before the change. A tab passes `onMount` false because the
 * page entrance has already covered its first render.
 */
export function useEntrance<T extends Element>(view: string, onMount = true) {
  const root = useRef<T>(null);
  const last = useRef(onMount ? null : view);
  const before = useRef(new Set<string>());
  // Read while rendering, because the old values are gone from the DOM by the time an effect runs.
  if (last.current !== view && root.current) before.current = signatures(root.current);
  useLayoutEffect(() => {
    if (last.current === view) return;
    last.current = view;
    if (root.current && !reducedMotion()) play(root.current, before.current);
  }, [view]);
  return root;
}
