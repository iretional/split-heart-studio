import type { BehaviorBinding, Layer } from "@zmkfirmware/zmk-studio-ts-client/keymap";
import { bindingLabel } from "../keyLabels";
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

export function keyText(i: number, b: BehaviorBinding | undefined, names: Record<number, string>, mode: KeyLabelMode = "Keycode") {
  if (mode === "Position") return positionName(i);
  const text = b ? bindingLabel(b.behaviorId, b.param1, b.param2, names).title : "?";
  return mode === "Both" ? `${positionName(i)} ${text}` : text;
}

export const behaviorId = (names: Record<number, string>, test: RegExp) =>
  Object.entries(names).find(([, n]) => test.test(n))?.[0];
