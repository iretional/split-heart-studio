import type { BehaviorBinding, Layer } from "@zmkfirmware/zmk-studio-ts-client/keymap";
import { bindingLabel, keycodeForUsage } from "../keyLabels";
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

const LAYER_CODES: [RegExp, string][] = [[/momentary/, "MO"], [/toggle layer/, "TG"], [/to layer/, "TO"], [/sticky layer/, "SL"]];

/** What a map key shows: a readable name, the original code below it, and a longer description for the tooltip. */
export function keyParts(i: number, b: BehaviorBinding | undefined, names: Record<number, string>, mode: KeyLabelMode = "Keycode", layers: Layer[] = []) {
  if (mode === "Position") return { name: positionName(i), code: "", hint: "" };
  if (!b) return { name: "?", code: "", hint: "" };
  const behavior = names[b.behaviorId] ?? "";
  const lower = behavior.toLowerCase();
  const below = (code: string) => mode === "Both" ? positionName(i) : code;
  const layerCode = LAYER_CODES.find(([re]) => re.test(lower))?.[1];
  if (layerCode) {
    const index = layers.findIndex(l => l.id === b.param1);
    const layer = layers[index];
    const shown = index < 0 ? b.param1 : index;
    return { name: layer ? layer.name || "Layer " + index : "Layer " + shown, code: below(`${layerCode} ${shown}`), hint: behavior };
  }
  const name = bindingLabel(b.behaviorId, b.param1, b.param2, names).title;
  const tapKey = lower.includes("tap") && (lower.includes("hold") || lower.includes("mod") || lower.includes("layer"));
  const isKey = tapKey || lower.includes("key press") || lower === "kp" || lower.includes("key toggle") || lower.includes("sticky key");
  const key = isKey ? keycodeForUsage(tapKey ? b.param2 : b.param1) : undefined;
  // A key that reads the same both ways (W, Tab) has no room to say it twice.
  const code = key && key.zmk.toLowerCase() !== name.toLowerCase() ? key.zmk : "";
  return { name, code: below(code), hint: key ? (tapKey || !lower.includes("key press") ? `${behavior}: ` : "") + key.description : behavior };
}

export const keyText = (i: number, b: BehaviorBinding | undefined, names: Record<number, string>, mode: KeyLabelMode = "Keycode", layers: Layer[] = []) =>
  keyParts(i, b, names, mode, layers).name;

export const behaviorId = (names: Record<number, string>, test: RegExp) =>
  Object.entries(names).find(([, n]) => test.test(n))?.[0];
