import type { BehaviorParameterValueDescription as ParamValue, GetBehaviorDetailsResponse } from "@zmkfirmware/zmk-studio-ts-client/behaviors";
import type { BehaviorBinding, Layer } from "@zmkfirmware/zmk-studio-ts-client/keymap";

export type ParamField = {
  which: 1 | 2; label: string; kind: "hid" | "layer" | "options";
  options: { value: string; label: string }[];
};

/** Fallback when a behavior needs a keycode and the key has none: KC A, since firmware rejects usage 0. */
const DEFAULT_USAGE = 0x70004;

const matches = (d: ParamValue, value: number) => {
  if (d.nil) return value === 0;
  if (d.constant !== undefined) return value === d.constant;
  if (d.range) return value >= d.range.min && value <= d.range.max;
  return !!(d.hidUsage || d.layerId);
};
const param2Values = (b: GetBehaviorDetailsResponse, param1: number) =>
  b.metadata.filter(s => s.param1.some(d => matches(d, param1))).flatMap(s => s.param2);

const isHid = (value: number) => value >>> 16 !== 0;

function field(which: 1 | 2, values: ParamValue[], solo: boolean, layers: Layer[]): ParamField | null {
  const shown = values.filter(d => !d.nil);
  if (!shown.length) return null;
  const named = shown.length === 1 && shown[0].name ? shown[0].name.toUpperCase() : "VALUE " + which;
  if (shown.some(d => d.hidUsage)) return { which, kind: "hid", label: solo ? "KEYCODE" : named, options: [] };
  if (shown.some(d => d.layerId))
    return { which, kind: "layer", label: named, options: layers.map((l, i) => ({ value: String(l.id), label: l.name || "Layer " + i })) };
  const options = shown.flatMap(d => {
    if (d.constant !== undefined) return [{ value: String(d.constant), label: d.name || String(d.constant) }];
    if (!d.range) return [];
    const { min, max } = d.range;
    return Array.from({ length: max - min + 1 }, (_, i) => ({ value: String(min + i), label: String(min + i) }));
  });
  return { which, kind: "options", label: named, options };
}

/** Order of the Behavior list. Anything a keymap defines for itself goes last, under Custom. */
const BEHAVIOR_GROUPS: [string, string[]][] = [
  ["Basic", ["Key Press", "Transparent", "None"]],
  ["Layers", ["Momentary Layer", "Layer-Tap", "Toggle Layer", "To Layer", "Sticky Layer"]],
  ["Keys", ["Mod-Tap", "Sticky Key", "Key Toggle", "Key Repeat", "Caps Word", "Grave/Escape"]],
  ["Mouse", ["Mouse Key Press", "Mouse Move", "Mouse Scroll"]],
  ["System", ["Bluetooth", "Output Selection", "Backlight", "Underglow", "External Power", "Reset", "Bootloader", "Studio Unlock", "Soft Off"]],
];
const CUSTOM_GROUP = "Custom";
/** Firmware falls back to the device name for a behavior without a display name. */
const DEVICE_NAMES: Record<string, string> = {
  mouse_move: "Mouse Move", mouse_scroll: "Mouse Scroll", z_so_off: "Soft Off", tap_dance_mouse_m45: "Tap Dance Mouse",
  kpminus_under: "Keypad - / _", kpplus_equal: "Keypad + / =",
};
const SHIFTED_DIGITS = ")!@#$%^&*(";

/** A readable name for what the firmware reports, which for a keymap's own behaviors is a device name. */
export function behaviorName(name: string) {
  if (DEVICE_NAMES[name]) return DEVICE_NAMES[name];
  const digit = /^kpn(\d)_shiftn\1$/.exec(name)?.[1];
  if (digit) return `Keypad ${digit} / ${SHIFTED_DIGITS[Number(digit)]}`;
  return /^[a-z0-9_]+$/.test(name) ? name.split("_").map(w => w[0].toUpperCase() + w.slice(1)).join(" ") : name;
}

/** What a keymap's own keypad behaviors show on a key: what they type, not their long name. */
export function behaviorKeySymbol(name: string) {
  return /^kpn(\d)_shiftn\1$/.exec(name)?.[1] ?? { kpminus_under: "-", kpplus_equal: "+" }[name];
}

/** The Behavior list for a Select: readable names, grouped, in a fixed order. */
export function behaviorOptions(behaviors: GetBehaviorDetailsResponse[]) {
  const place = (label: string) => {
    const group = BEHAVIOR_GROUPS.findIndex(([, list]) => list.includes(label));
    return group < 0 ? { group: BEHAVIOR_GROUPS.length, order: 0 } : { group, order: BEHAVIOR_GROUPS[group][1].indexOf(label) };
  };
  return behaviors.map(b => {
    const label = behaviorName(b.displayName || "Behavior #" + b.id);
    return { value: String(b.id), label, ...place(label) };
  }).sort((a, b) => a.group - b.group || a.order - b.order || a.label.localeCompare(b.label, undefined, { numeric: true }))
    .map(({ value, label, group }) => ({ value, label, group: BEHAVIOR_GROUPS[group]?.[0] ?? CUSTOM_GROUP }));
}

/** The value fields a behavior asks for, read from the metadata the firmware reports. */
export function paramFields(b: GetBehaviorDetailsResponse | undefined, binding: BehaviorBinding, layers: Layer[]): ParamField[] {
  if (!b) return [];
  const first = b.metadata.flatMap(s => s.param1), second = param2Values(b, binding.param1);
  const solo = first.filter(d => !d.nil).length > 0 && second.filter(d => !d.nil).length === 0;
  return [field(1, first, solo, layers), field(2, second, false, layers)].filter((f): f is ParamField => !!f);
}

function firstValue(values: ParamValue[], keep: number, layers: Layer[]) {
  const d = values.find(x => !x.nil);
  if (!d) return 0;
  if (d.hidUsage) return isHid(keep) ? keep : DEFAULT_USAGE;
  if (d.layerId) return layers[0]?.id ?? 0;
  return d.constant ?? d.range?.min ?? 0;
}

/** Binding for a newly chosen behavior. Keeps the current keycode when the new behavior takes one. */
export function defaultBinding(b: GetBehaviorDetailsResponse, current: BehaviorBinding, layers: Layer[]): BehaviorBinding {
  const keep = isHid(current.param2) ? current.param2 : current.param1;
  const param1 = firstValue(b.metadata.flatMap(s => s.param1), keep, layers);
  return { behaviorId: b.id, param1, param2: firstValue(param2Values(b, param1), keep, layers) };
}
