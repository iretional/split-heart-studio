import { useEffect, useState } from "react";

/** The app opened from its home screen icon already fills the screen, so it needs no toggle. */
const installed = window.matchMedia("(display-mode: fullscreen), (display-mode: standalone)").matches && !document.fullscreenElement;
/** iPhones don't let a page go fullscreen. */
const supported = !installed && !!document.fullscreenEnabled;

export function useFullscreen() {
  const [active, setActive] = useState(() => !!document.fullscreenElement);
  useEffect(() => {
    const onChange = () => setActive(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);
  const toggle = () => {
    // A browser can refuse, and then the page simply stays as it is.
    const change = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen({ navigationUI: "hide" });
    change.catch(() => {});
  };
  return { supported, active, toggle };
}
