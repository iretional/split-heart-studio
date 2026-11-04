import type { IconName } from "./components/Icon";
import { KEYCODE_ICONS, KEYCODE_NAMES, KEYCODE_SYMBOLS } from "./keycodeNames";
import { ZMK_KEYCODE_ROWS } from "./zmkKeycodes";

/** label is the key's role, symbol or icon is what the keyboard map shows. */
export type Keycode = { label: string; symbol: string; icon?: IconName; usage: number; zmk: string; aliases: string[]; tab: string; group: string; description: string };
const page7 = (id: number) => 0x70000 | id;

const KEYPAD_GROUPS = ["NUMBERS", "SYMBOLS", "FUNCTIONS"];
const keypadGroup = (zmk: string) => /^KP_N\d$/.test(zmk) ? "NUMBERS" : ["KP_NUM", "KP_ENTER", "KP_CLEAR"].includes(zmk) ? "FUNCTIONS" : "SYMBOLS";
const keypadRows = ZMK_KEYCODE_ROWS.filter(r => r[0] === "KEYPAD")
  .map(r => [...r.slice(0, 1), keypadGroup(r[2]), ...r.slice(2)] as unknown as typeof r)
  .sort((a, b) => KEYPAD_GROUPS.indexOf(a[1]) - KEYPAD_GROUPS.indexOf(b[1]));

/** Every ZMK keycode. `zmk` is the name written in a keymap, `label` is what the button shows. */
export const ALL_KEYCODES: Keycode[] = ZMK_KEYCODE_ROWS.map(r => r[0] === "KEYPAD" ? keypadRows.shift()! : r).map(([tab, group, zmk, usage, aliases, description]) =>
  {
    const label = KEYCODE_NAMES[zmk] ?? zmk;
    const symbol = KEYCODE_SYMBOLS[zmk] ?? (tab === "KEYPAD" ? "KP " + label : label);
    return { label, symbol, icon: KEYCODE_ICONS[zmk], usage, zmk, aliases: aliases ? aliases.split(" ") : [], tab, group, description };
  });

/** Label outside the Keypad tab, where 1 and KP_N1 would otherwise read the same. */
export const keycodeText = (c: Keycode) => c.tab === "KEYPAD" ? "Keypad " + c.label : c.label;
export const KEYCODE_TABS = [...new Set(ALL_KEYCODES.map(c => c.tab))];

export function keycodeForUsage(code: number): Keycode | undefined {
  const plain = code & 0xffffff;
  return ALL_KEYCODES.find(c => c.usage === code >>> 0)
    ?? ALL_KEYCODES.find(c => c.usage === plain || (plain >>> 16 === 0 && c.usage === page7(plain)));
}

export function keyboardUsageLabel(code: number): string | null {
  const c = keycodeForUsage(code);
  return c ? keycodeText(c) : null;
}

// ZMK stores implicit modifiers in the top byte of a key press usage (APPLY_MODS).
const modBits: [number, string][] = [[0x11, "Ctrl"], [0x22, "Shift"], [0x44, "Alt"], [0x88, "GUI"]];

/** Toggles one implicit modifier (top byte of a ZMK keycode). */
export function toggleMod(code: number, name: string): number {
  const bits = modBits.filter(([, n]) => n === name).reduce((a, [b]) => a | b, 0);
  const mods = (code >>> 24) & 0xff;
  const next = mods & bits ? mods & ~bits : mods | (bits & 0x0f);
  return ((next << 24) | (code & 0xffffff)) >>> 0;
}

/** A newly picked keycode replaces the old one, keeping modifiers the user ticked but not ones that were part of the old keycode (EXCL is LS(N1)). */
export function withKeptMods(previous: number, usage: number): number {
  const kept = ALL_KEYCODES.some(c => c.usage === previous >>> 0) ? 0 : previous & 0xff000000;
  return (kept | usage) >>> 0;
}

export function implicitMods(code: number): string[] {
  const mods = (code >>> 24) & 0xff;
  return modBits.filter(([bits]) => mods & bits).map(([, name]) => name);
}

export function bindingLabel(
  behaviorId: number,
  param1: number,
  param2: number,
  behaviorNames: Record<number, string>
): { title: string; subtitle: string } {
  const name = behaviorNames[behaviorId] ?? "Behavior #" + behaviorId;
  const lower = name.toLowerCase();
  if (lower.includes("transparent")) return { title: "▽", subtitle: "Transparent" };
  if (lower === "none" || lower.includes("none behavior"))
    return { title: "—", subtitle: "None" };
  if (lower.includes("momentary layer")) return { title: "MO " + param1, subtitle: "" };
  const isHoldTap = lower.includes("tap") && (lower.includes("hold") || lower.includes("mod") || lower.includes("layer"));
  const isKey = (lower.includes("key press") && !lower.includes("mouse")) || lower === "kp" || lower.includes("key toggle") || lower.includes("sticky key");
  if (isHoldTap || isKey) {
    const label = keyboardUsageLabel(isHoldTap ? param2 : param1);
    if (label) return { title: label, subtitle: isHoldTap ? "Hold-Tap" : "" };
  }
  return { title: name.length > 12 ? name.slice(0, 11) + "…" : name, subtitle: "" };
}
