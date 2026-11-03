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

export type Keycode = { label: string; usage: number; zmk: string };
const page7 = (id: number) => 0x70000 | id;
const k = (label: string, id: number, zmk: string): Keycode => ({ label, usage: page7(id), zmk });
const consumer = (label: string, id: number, zmk: string): Keycode => ({ label, usage: 0xc0000 | id, zmk });

const letters = Array.from({ length: 26 }, (_, i) => k(String.fromCharCode(65 + i), 4 + i, String.fromCharCode(65 + i)));
const digits = "1234567890".split("").map((d, i) => k(d, 0x1e + i, "N" + d));

/** Keycode picker contents, per category tab. ZMK names come from dt-bindings/zmk/keys.h. */
export const KEYCODES: Record<string, Keycode[]> = {
  BASIC: [...letters, ...digits, k("Enter", 0x28, "ENTER"), k("Esc", 0x29, "ESC")],
  SYMBOLS: [k("-", 0x2d, "MINUS"), k("=", 0x2e, "EQUAL"), k("[", 0x2f, "LBKT"), k("]", 0x30, "RBKT"), k("\\", 0x31, "BSLH"), k(";", 0x33, "SEMI"),
    k("'", 0x34, "SQT"), k("`", 0x35, "GRAVE"), k(",", 0x36, "COMMA"), k(".", 0x37, "DOT"), k("/", 0x38, "FSLH"),
    ...Array.from({ length: 12 }, (_, i) => k("F" + (i + 1), 0x3a + i, "F" + (i + 1)))],
  MODIFIERS: [k("L Ctrl", 0xe0, "LCTRL"), k("L Shift", 0xe1, "LSHFT"), k("L Alt", 0xe2, "LALT"), k("L GUI", 0xe3, "LGUI"),
    k("R Ctrl", 0xe4, "RCTRL"), k("R Shift", 0xe5, "RSHFT"), k("R Alt", 0xe6, "RALT"), k("R GUI", 0xe7, "RGUI"), k("Caps", 0x39, "CAPS")],
  NAVIGATION: [k("Home", 0x4a, "HOME"), k("End", 0x4d, "END"), k("PgUp", 0x4b, "PG_UP"), k("PgDn", 0x4e, "PG_DN"), k("←", 0x50, "LEFT"), k("↓", 0x51, "DOWN"),
    k("↑", 0x52, "UP"), k("→", 0x4f, "RIGHT"), k("Ins", 0x49, "INS"), k("Del", 0x4c, "DEL")],
  MEDIA: [consumer("Play", 0xcd, "C_PP"), consumer("Next", 0xb5, "C_NEXT"), consumer("Prev", 0xb6, "C_PREV"), consumer("Vol +", 0xe9, "C_VOL_UP"),
    consumer("Vol -", 0xea, "C_VOL_DN"), consumer("Mute", 0xe2, "C_MUTE"), consumer("Bri +", 0x6f, "C_BRI_UP"), consumer("Bri -", 0x70, "C_BRI_DN")],
};
export const WIDE_KEYS: Keycode[] = [k("Backspace", 0x2a, "BSPC"), k("Tab", 0x2b, "TAB"), k("Space", 0x2c, "SPACE")];
export const ALL_KEYCODES = [...Object.values(KEYCODES).flat(), ...WIDE_KEYS];

export function keycodeForUsage(code: number): Keycode | undefined {
  const plain = code & 0xffffff;
  return ALL_KEYCODES.find(c => c.usage === plain || (plain >>> 16 === 0 && c.usage === page7(plain)));
}

export function keyboardUsageLabel(code: number): string | null {
  const media = KEYCODES.MEDIA.find(c => c.usage === (code & 0xffffff));
  if (media) return media.label;
  // Keycode is usually a 32-bit HID usage (page 0x07, ID in low 16 bits).
  const page = (code >>> 16) & 0xffff;
  if (page !== 0 && (page & 0xff) !== 0x07) return null;
  const usage = code & 0xffff;
  if (usage >= 0x04 && usage <= 0x1d)
    return String.fromCharCode(65 + usage - 0x04);
  if (usage >= 0x1e && usage <= 0x27)
    return "1234567890"[usage - 0x1e];
  if (usage >= 0x3a && usage <= 0x45)
    return "F" + (usage - 0x3a + 1);
  return special[usage] ?? null;
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
  const isHoldTap = lower.includes("hold") && lower.includes("tap");
  const isKey = lower.includes("key press") || lower === "key press" || lower === "kp";
  if (isHoldTap || isKey) {
    const label = keyboardUsageLabel(isHoldTap ? param2 : param1);
    if (label) return { title: label, subtitle: isHoldTap ? "Hold-Tap" : "" };
  }
  return { title: name.length > 12 ? name.slice(0, 11) + "…" : name, subtitle: "" };
}
