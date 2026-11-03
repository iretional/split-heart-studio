import { KEYCODE_NAMES } from "./keycodeNames";
import { ZMK_KEYCODE_ROWS } from "./zmkKeycodes";

// USB HID keyboard usage names. RPC may also return non-keyboard usages.
const special: Record<number, string> = {
  0x28: "Enter", 0x29: "Esc", 0x2a: "Bksp", 0x2b: "Tab",
  0x2c: "Space", 0x2d: "-", 0x2e: "=", 0x2f: "[", 0x30: "]",
  0x31: "\\", 0x33: ";", 0x34: "'", 0x35: "`",
  0x36: ",", 0x37: ".", 0x38: "/", 0x39: "Caps", 0x4c: "Del",
  0x4f: "→", 0x50: "←", 0x51: "↓", 0x52: "↑",
  0xe0: "LCtrl", 0xe1: "LShift", 0xe2: "LAlt", 0xe3: "LGUI",
  0xe4: "RCtrl", 0xe5: "RShift", 0xe6: "RAlt", 0xe7: "RGUI",
};

export type Keycode = { label: string; usage: number; zmk: string; aliases: string[]; tab: string; group: string; description: string };
const page7 = (id: number) => 0x70000 | id;

/** Every ZMK keycode. `zmk` is the name written in a keymap, `label` is what the button shows. */
export const ALL_KEYCODES: Keycode[] = ZMK_KEYCODE_ROWS.map(([tab, group, zmk, usage, aliases, description]) =>
  ({ label: KEYCODE_NAMES[zmk] ?? zmk, usage, zmk, aliases: aliases ? aliases.split(" ") : [], tab, group, description }));

/** Label outside the Keypad tab, where 1 and KP_N1 would otherwise read the same. */
export const keycodeText = (c: Keycode) => c.tab === "KEYPAD" ? "Keypad " + c.label : c.label;
export const KEYCODE_TABS = [...new Set(ALL_KEYCODES.map(c => c.tab))];

export function keycodeForUsage(code: number): Keycode | undefined {
  const plain = code & 0xffffff;
  return ALL_KEYCODES.find(c => c.usage === code >>> 0)
    ?? ALL_KEYCODES.find(c => c.usage === plain || (plain >>> 16 === 0 && c.usage === page7(plain)));
}

export function keyboardUsageLabel(code: number): string | null {
  const media = ALL_KEYCODES.find(c => c.usage >>> 16 === 0x0c && c.usage === (code & 0xffffff));
  if (media) return media.label;
  // Keycode is usually a 32-bit HID usage (page 0x07, ID in low 16 bits).
  const page = (code >>> 16) & 0xffff;
  const listed = keycodeForUsage(code);
  const listedText = listed ? keycodeText(listed) : null;
  if (page !== 0 && (page & 0xff) !== 0x07) return listedText;
  const usage = code & 0xffff;
  if (usage >= 0x04 && usage <= 0x1d)
    return String.fromCharCode(65 + usage - 0x04);
  if (usage >= 0x1e && usage <= 0x27)
    return "1234567890"[usage - 0x1e];
  if (usage >= 0x3a && usage <= 0x45)
    return "F" + (usage - 0x3a + 1);
  return special[usage] ?? listedText;
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
  const isKey = lower.includes("key press") || lower === "kp" || lower.includes("key toggle") || lower.includes("sticky key");
  if (isHoldTap || isKey) {
    const label = keyboardUsageLabel(isHoldTap ? param2 : param1);
    if (label) return { title: label, subtitle: isHoldTap ? "Hold-Tap" : "" };
  }
  return { title: name.length > 12 ? name.slice(0, 11) + "…" : name, subtitle: "" };
}
