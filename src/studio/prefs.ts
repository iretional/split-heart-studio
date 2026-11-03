import { useEffect, useState } from "react";

export type Theme = "Light" | "Dark" | "System";
export type KeyLabelMode = "Keycode" | "Position" | "Both";

export function loadJson<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback; }
  catch { return fallback; }
}
export function saveJson(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode: keep working in memory */ }
}

/** State mirrored into localStorage; preferences live only in this browser. */
export function useStored<T>(key: string, fallback: () => T): [T, (v: T | ((old: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => loadJson(key, fallback()));
  useEffect(() => saveJson(key, value), [key, value]);
  return [value, setValue];
}

export function usePrefs() {
  const [theme, setTheme] = useStored<Theme>("split-studio.theme", () => "System");
  const [keyLabels, setKeyLabels] = useStored<KeyLabelMode>("split-studio.keyLabels", () => "Keycode");
  const [lastExport, setLastExport] = useStored<string | null>("split-studio.lastExport", () => null);
  useEffect(() => {
    if (theme === "System") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", theme.toLowerCase());
  }, [theme]);
  return { theme, setTheme, keyLabels, setKeyLabels, lastExport, setLastExport };
}
export type Prefs = ReturnType<typeof usePrefs>;

export function useIsMobile() {
  const query = "(max-width: 760.98px)";
  const [mobile, setMobile] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const m = window.matchMedia(query);
    const on = () => setMobile(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return mobile;
}
