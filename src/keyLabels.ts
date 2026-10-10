// USB HID keyboard usage names. RPC may also return non-keyboard usages.
const special: Record<number, string> = {
  0x28: "Enter", 0x29: "Esc", 0x2a: "Bksp", 0x2b: "Tab",
  0x2c: "Space", 0x2d: "-", 0x2e: "=", 0x2f: "[", 0x30: "]",
  0x31: "\\", 0x33: ";", 0x34: "'", 0x35: "`",
  0x36: ",", 0x37: ".", 0x38: "/", 0x39: "Caps",
  0x4f: "→", 0x50: "←", 0x51: "↓", 0x52: "↑",
  0xe0: "LCtrl", 0xe1: "LShift", 0xe2: "LAlt", 0xe3: "LGUI",
  0xe4: "RCtrl", 0xe5: "RShift", 0xe6: "RAlt", 0xe7: "RGUI",
};

export function keyboardUsageLabel(code: number): string | null {
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
  const isHoldTap = lower.includes("hold") && lower.includes("tap");
  const isKey = lower.includes("key press") || lower === "key press" || lower === "kp";
  if (isHoldTap || isKey) {
    const label = keyboardUsageLabel(isHoldTap ? param2 : param1);
    if (label) return { title: label, subtitle: isHoldTap ? "Hold-Tap" : "" };
  }
  return { title: name.length > 12 ? name.slice(0, 11) + "…" : name, subtitle: "" };
}
