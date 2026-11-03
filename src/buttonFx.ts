import { canHover, randomDir, reducedMotion } from "./components/useHoverSelectFx";

/** Buttons with effects of their own. Everything else gets the default here. */
const OWN_EFFECT = ".nav-item, .layer-tabs .tab, .motion-card";
const BAND_COUNT = 4;
const SETTLE_MS = 20;

const buttonOf = (target: EventTarget | null) => {
  const button = target instanceof Element ? target.closest<HTMLButtonElement>("button") : null;
  return button && !button.matches(OWN_EFFECT) && !button.disabled && !button.matches(".disabled") ? button : null;
};

function glitch(button: HTMLButtonElement) {
  if (!button.isConnected || button.hasAttribute("data-fx-glitch")) return;
  const s = getComputedStyle(button);
  const face = button.innerHTML;
  const dir = String(randomDir());
  const bands = Array.from({ length: BAND_COUNT }, (_, i) => {
    const band = document.createElement("span");
    band.className = "btn-band fx-band-" + (i + 1);
    band.setAttribute("aria-hidden", "true");
    band.innerHTML = face;
    band.style.setProperty("--fx-dir", dir);
    Object.assign(band.style, {
      inset: `-${s.borderTopWidth} -${s.borderRightWidth} -${s.borderBottomWidth} -${s.borderLeftWidth}`,
      // A plain button centres its content by itself, which a span doesn't.
      ...(/flex|grid/.test(s.display)
        ? { display: s.display.replace("inline-", ""), alignItems: s.alignItems, justifyContent: s.justifyContent, flexDirection: s.flexDirection, gap: s.gap }
        : { display: "flex", alignItems: "center", justifyContent: "center" }),
      padding: s.padding, border: s.border, borderRadius: s.borderRadius, background: s.background, color: s.color, textAlign: s.textAlign,
    });
    return band;
  });
  if (s.position === "static") button.setAttribute("data-fx-relative", "");
  button.setAttribute("data-fx-glitch", "");
  button.append(...bands);
  // A timer rather than animationend: React can replace a button's text, and the bands with it.
  setTimeout(() => {
    bands.forEach(band => band.remove());
    button.removeAttribute("data-fx-glitch");
    button.removeAttribute("data-fx-relative");
  }, parseFloat(getComputedStyle(bands[0]).animationDuration) * 1000 + SETTLE_MS);
}

/**
 * The default for every button without effects of its own: Blinky on hover, Glitch In on click.
 * Delegated from the document so a new button gets it without any wiring. This listener runs after
 * React's, so the glitch copies the button as the click left it.
 */
export function defaultButtonFx() {
  document.addEventListener("mouseover", e => {
    const button = buttonOf(e.target);
    if (button && button !== buttonOf(e.relatedTarget) && canHover() && !reducedMotion()) button.setAttribute("data-fx-hover", "");
  });
  document.addEventListener("mouseout", e => {
    const button = buttonOf(e.target);
    if (button && button !== buttonOf(e.relatedTarget)) button.removeAttribute("data-fx-hover");
  });
  document.addEventListener("click", e => {
    const button = buttonOf(e.target);
    if (!button || reducedMotion()) return;
    button.removeAttribute("data-fx-hover");
    glitch(button);
  });
}
