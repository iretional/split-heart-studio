import type { BehaviorBinding, Layer } from "@zmkfirmware/zmk-studio-ts-client/keymap";
import type { IconName } from "../components/Icon";
import { bindingLabel, implicitMods, keycodeForUsage, keycodeText } from "../keyLabels";
import { behaviorKeySymbol, behaviorName } from "./behaviors";
import { positionName } from "./splitHeartGeometry";
import type { KeyLabelMode } from "./prefs";

export const isTransparent = (b: BehaviorBinding | undefined, names: Record<number, string>) =>
  !b || (names[b.behaviorId] ?? "").toLowerCase().includes("transparent");

export function layerCounts(layer: Layer, names: Record<number, string>) {
  const transparent = layer.bindings.filter(b => isTransparent(b, names)).length;
  return { bound: layer.bindings.length - transparent, transparent };
}

export const countText = (layer: Layer, names: Record<number, string>) => {
  const { bound, transparent } = layerCounts(layer, names);
  return `${bound} bound · ${transparent} transparent`;
};

/** Real keycodes carry a usage page in their upper bits; layer numbers and option indexes don't. */
const isKeycode = (param: number) => (param & 0xffffff) >>> 16 !== 0 && !!keycodeForUsage(param);

const LAYER_CODES: [RegExp, string][] = [[/momentary/, "MO"], [/toggle layer/, "TG"], [/to layer/, "TO"], [/sticky layer/, "SL"]];

/** What a map key shows: its symbol or icon, plus a tooltip with the role, keycode and description. */
export function keyParts(i: number, b: BehaviorBinding | undefined, names: Record<number, string>, mode: KeyLabelMode = "Keycode", layers: Layer[] = []): { name: string; icon?: IconName; code: string; hint: string } {
  if (mode === "Position") return { name: positionName(i), code: "", hint: "" };
  if (!b) return { name: "?", code: "", hint: "" };
  const behavior = names[b.behaviorId] ?? "";
  const lower = behavior.toLowerCase();
  // Only the Both setting adds a second line: the key's position.
  const code = mode === "Both" ? positionName(i) : "";
  const layerCode = LAYER_CODES.find(([re]) => re.test(lower))?.[1];
  if (layerCode) {
    const index = layers.findIndex(l => l.id === b.param1);
    const layer = layers[index];
    const shown = index < 0 ? b.param1 : index;
    return { name: layer ? layer.name || "Layer " + index : "Layer " + shown, code, hint: `${behavior} (${layerCode} ${shown})` };
  }
  const shown = behaviorName(behavior);
  // A keymap's own hold-taps (home row mods) have any name, so a keycode in the second parameter is what marks them.
  const tapKey = (lower.includes("tap") && (lower.includes("hold") || lower.includes("mod") || lower.includes("layer"))) || isKeycode(b.param2);
  const isKey = tapKey || lower.includes("key press") || lower === "kp" || lower.includes("key toggle") || lower.includes("sticky key");
  const value = tapKey ? b.param2 : b.param1;
  const key = isKey ? keycodeForUsage(value) : undefined;
  if (!key) return { name: behaviorKeySymbol(behavior) ?? (shown !== behavior ? shown : bindingLabel(b.behaviorId, b.param1, b.param2, names).title), code, hint: shown };
  const hold = tapKey && isKeycode(b.param1) ? keycodeForUsage(b.param1) : undefined;
  const prefix = lower.includes("key press") ? "" : shown + ": " + (hold ? `hold ${keycodeText(hold)}, tap ` : "");
  const mods = implicitMods(value);
  return { name: mods.length ? `${mods.join("+")} ${key.symbol}` : key.symbol, icon: mods.length ? undefined : key.icon, code,
    hint: `${prefix}${mods.map(m => m + " + ").join("")}${keycodeText(key)} (${key.zmk})\n${key.description}` };
}

export const keyText = (i: number, b: BehaviorBinding | undefined, names: Record<number, string>, mode: KeyLabelMode = "Keycode", layers: Layer[] = []) =>
  keyParts(i, b, names, mode, layers).name;

export const behaviorId = (names: Record<number, string>, test: RegExp) =>
  Object.entries(names).find(([, n]) => test.test(n))?.[0];
