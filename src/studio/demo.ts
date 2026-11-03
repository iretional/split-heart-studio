import type { GetBehaviorDetailsResponse } from "@zmkfirmware/zmk-studio-ts-client/behaviors";
import type { Keymap, KeyPhysicalAttrs } from "@zmkfirmware/zmk-studio-ts-client/keymap";
import { useState } from "react";
import type { RemovedLayer, Studio } from "./useStudio";

// Dev-only sample data (open the app with ?demo or ?demo=locked) so the UI can be checked without hardware.
// Geometry follows the Figma Split Heart canvas; 1 key pitch = 100 units, like ZMK physical layouts.

const PITCH_PX = 56;
const X = (x: number) => ((x - 215) * 0.86) / PITCH_PX * 100;
const Y = (y: number) => ((y - 86) * 0.86) / PITCH_PX * 100;
const MX = (x: number) => 1569 - x - 58;
const colsX = [297, 362, 428, 493, 558, 623];
const rowsMain = [183, 246, 310, 374], rowsOuter = [221, 285, 348, 412];

const keys: KeyPhysicalAttrs[] = [];
const names: string[] = [];
const add = (name: string, x: number, y: number, deg = 0) => {
  const k: KeyPhysicalAttrs = { x: Math.round(X(x)), y: Math.round(Y(y)), width: 100, height: 100, r: 0, rx: 0, ry: 0 };
  if (deg) { k.r = deg * 100; k.rx = k.x + 50; k.ry = k.y + 50; }
  keys.push(k); names.push(name);
};
for (let r = 0; r < 4; r++) {
  for (let c = 0; c < 6; c++) add(`${r}${c}`, colsX[c], c < 2 ? rowsOuter[r] : rowsMain[r]);
  for (let c = 0; c < 6; c++) add(`${r}${c + 6}`, MX(colsX[5 - c]), 5 - c < 2 ? rowsOuter[r] : rowsMain[r]);
}
add("42", colsX[2], 442); add("43", colsX[3], 442); add("48", MX(colsX[3]), 442); add("49", MX(colsX[2]), 442);
// Thumb keys: [name, centre x, centre y, clockwise degrees]
// Same index order as the firmware (see FIGMA_FOR_INDEX in splitHeartGeometry.ts).
for (const [n, cx, cy, deg] of [["50", 594, 510, 15], ["51", 658, 516, 20], ["52", 706, 572, -35], ["53", 651, 607, -35],
  ["58", 1569 - 651, 607, 35], ["59", 1569 - 706, 572, 35], ["510", 1569 - 658, 516, -20], ["511", 1569 - 594, 510, -15]] as const)
  add(n, cx - 29, cy - 29, deg);

const hid = (name: string) => ({ name, hidUsage: { keyboardMax: 0, consumerMax: 0 } });
const layerParam = { name: "Layer", layerId: {} };
const constants = (...labels: string[]) => labels.map((name, constant) => ({ name, constant }));
const one = (param1: GetBehaviorDetailsResponse["metadata"][number]["param1"], param2: typeof param1 = []) => [{ param1, param2 }];
// What zmk-config should report on ZMK v0.3, read from their source. Ids and parameter details are made up.
// Behaviors a keymap defines without a display name arrive under their device name.
const DEMO_BEHAVIORS: GetBehaviorDetailsResponse[] = [
  { id: 1, displayName: "Key Press", metadata: one([hid("Key")]) },
  { id: 2, displayName: "Transparent", metadata: [] },
  { id: 3, displayName: "Momentary Layer", metadata: one([layerParam]) },
  { id: 4, displayName: "None", metadata: [] },
  { id: 5, displayName: "Mod-Tap", metadata: one([hid("Hold")], [hid("Tap")]) },
  { id: 6, displayName: "Layer-Tap", metadata: one([layerParam], [hid("Tap")]) },
  { id: 7, displayName: "Key Toggle", metadata: one([hid("Key")]) },
  { id: 8, displayName: "Sticky Key", metadata: one([hid("Key")]) },
  { id: 9, displayName: "Sticky Layer", metadata: one([layerParam]) },
  { id: 10, displayName: "Toggle Layer", metadata: one([layerParam]) },
  { id: 11, displayName: "Caps Word", metadata: [] },
  { id: 12, displayName: "Key Repeat", metadata: [] },
  { id: 13, displayName: "Bluetooth", metadata: [
    { param1: [{ name: "Clear", constant: 0 }, { name: "Next", constant: 1 }, { name: "Prev", constant: 2 }], param2: [] },
    { param1: [{ name: "Select", constant: 3 }], param2: [{ name: "Profile", range: { min: 0, max: 4 } }] },
  ] },
  { id: 14, displayName: "To Layer", metadata: one([layerParam]) },
  { id: 15, displayName: "Grave/Escape", metadata: [] },
  { id: 16, displayName: "Mouse Key Press", metadata: one(constants("Left", "Right", "Middle", "Back", "Forward")) },
  { id: 17, displayName: "mouse_move", metadata: one(constants("Up", "Down", "Left", "Right")) },
  { id: 18, displayName: "mouse_scroll", metadata: one(constants("Up", "Down", "Left", "Right")) },
  { id: 19, displayName: "Output Selection", metadata: one(constants("Toggle", "USB", "Bluetooth")) },
  { id: 20, displayName: "Backlight", metadata: one(constants("On", "Off", "Toggle", "Brighter", "Dimmer")) },
  { id: 21, displayName: "Reset", metadata: [] },
  { id: 22, displayName: "Bootloader", metadata: [] },
  { id: 23, displayName: "Studio Unlock", metadata: [] },
  { id: 24, displayName: "home_row_mod_left", metadata: one([hid("Hold")], [hid("Tap")]) },
  { id: 25, displayName: "home_row_mod_right", metadata: one([hid("Hold")], [hid("Tap")]) },
  { id: 26, displayName: "tap_dance_mouse_m45", metadata: [] },
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((n, i) => ({ id: 27 + i, displayName: `kpn${n}_shiftn${n}`, metadata: [] })),
  { id: 37, displayName: "kpminus_under", metadata: [] },
  { id: 38, displayName: "kpplus_equal", metadata: [] },
];
const BEHAVIORS: Record<number, string> = Object.fromEntries(DEMO_BEHAVIORS.map(b => [b.id, b.displayName]));
const usage: Record<string, number> = {
  Esc: 0x29, Tab: 0x2b, Ctrl: 0xe0, Shft: 0xe1, Alt: 0xe2, GUI: 0xe3, Spc: 0x2c, Ent: 0x28, Bspc: 0x2a, Del: 0x4c,
  "-": 0x2d, "[": 0x2f, "]": 0x30, "\\": 0x31, ";": 0x33, "'": 0x34, "`": 0x35, ",": 0x36, ".": 0x37, "/": 0x38,
  "←": 0x50, "↓": 0x51, "↑": 0x52, "→": 0x4f,
};
const bind = (label: string) => {
  if (label === "▽") return { behaviorId: 2, param1: 0, param2: 0 };
  if (label === "VolUp") return { behaviorId: 1, param1: 0xc00e9, param2: 0 };
  if (label === "VolDn") return { behaviorId: 1, param1: 0xc00ea, param2: 0 };
  if (label.startsWith("MO")) return { behaviorId: 3, param1: Number(label.slice(2)), param2: 0 };
  if (/^[A-Z]$/.test(label)) return { behaviorId: 1, param1: 0x70000 | (0x04 + label.charCodeAt(0) - 65), param2: 0 };
  if (/^[0-9]$/.test(label)) return { behaviorId: 1, param1: 0x70000 | (label === "0" ? 0x27 : 0x1e + Number(label) - 1), param2: 0 };
  if (/^F\d+$/.test(label)) return { behaviorId: 1, param1: 0x70000 | (0x3a + Number(label.slice(1)) - 1), param2: 0 };
  return { behaviorId: 1, param1: 0x70000 | (usage[label] ?? 0x2c), param2: 0 };
};
const layer = (map: Record<string, string>) => names.map(n => bind(map[n] ?? "▽"));
const rowMap = (prefix: string[], labels: string[][]) =>
  Object.fromEntries(labels.flatMap((row, r) => row.map((l, c) => [`${r}${prefix[c]}`, l])));
const cols = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"];

const base = {
  ...rowMap(cols, [["Esc", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-"],
    ["Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "\\"],
    ["Ctrl", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'"],
    ["Shft", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Shft"]]),
  42: "Alt", 43: "GUI", 48: "[", 49: "]", 50: "MO1", 51: "Spc", 52: "Del", 53: "Bspc", 510: "Ent", 511: "MO2", 59: "VolDn", 58: "VolUp",
};
const lower = rowMap(cols, [["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "Bspc"],
  ["▽", "▽", "▽", "▽", "▽", "▽", "▽", "▽", "▽", "▽", "▽", "▽"],
  ["▽", "F1", "F2", "F3", "F4", "F5", "←", "↓", "↑", "→", "▽", "▽"],
  ["▽", "▽", "▽", "▽", "▽", "▽", "F6", "F7", "F8", "F9", "F10", "▽"]]);

const keymap: Keymap = {
  layers: [
    { id: 0, name: "Base", bindings: layer(base) },
    { id: 1, name: "Lower", bindings: layer(lower) },
    { id: 2, name: "Raise", bindings: layer(rowMap(cols, [["F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12"]])) },
    { id: 3, name: "System", bindings: layer({ "00": "Esc" }) },
  ],
  availableLayers: 4, maxLayerNameLength: 16,
} as Keymap;

export const isDemo = () => import.meta.env.DEV && new URLSearchParams(window.location.search).has("demo");

/** Same surface as useStudio, kept in memory so every screen can be exercised without a keyboard. */
export function useDemoStudio(real: Studio): Studio {
  const [locked, setLocked] = useState(() => new URLSearchParams(window.location.search).get("demo") === "locked");
  const [map, setMap] = useState<Keymap>(keymap);
  const [unsaved, setUnsaved] = useState(0);
  const [removed, setRemoved] = useState<RemovedLayer[]>([]);
  const [activeLayout, setActive] = useState(0);
  const layouts = [{ name: "Split Heart 60", keys }, { name: "Split Heart 58", keys: keys.slice(0, 58) }];
  const dirty = () => setUnsaved(n => n + 1);
  return {
    ...real, hasSerial: true, connected: true, device: "Split Heart", loading: false, locked, error: null, lastSync: new Date(),
    unsaved, removed, firmware: "v0.1.0 · ZMK 0.3",
    layouts, activeLayout, layout: locked ? undefined : layouts[activeLayout], keymap: locked ? null : map, names: BEHAVIORS, behaviors: DEMO_BEHAVIORS,
    connect: async () => {}, disconnect: () => {}, refresh: () => {},
    setBinding: async (layerId, pos, binding) => { setMap(m => ({ ...m, layers: m.layers.map(l => l.id !== layerId ? l : { ...l, bindings: l.bindings.map((b, i) => i === pos ? binding : b) }) })); dirty(); },
    renameLayer: async (id, name) => { setMap(m => ({ ...m, layers: m.layers.map(l => l.id === id ? { ...l, name } : l) })); dirty(); },
    moveLayer: async (from, to) => { setMap(m => { const layers = [...m.layers]; layers.splice(to, 0, layers.splice(from, 1)[0]); return { ...m, layers }; }); dirty(); },
    addLayer: async () => { setMap(m => ({ ...m, availableLayers: m.availableLayers - 1, layers: [...m.layers, { id: Date.now() % 1000 + 10, name: "", bindings: names.map(() => bind("▽")) }] })); dirty(); },
    removeLayer: async index => { setRemoved(r => [...r, { layer: map.layers[index], index }]); setMap(m => ({ ...m, availableLayers: m.availableLayers + 1, layers: m.layers.filter((_, i) => i !== index) })); dirty(); },
    restoreLayer: async item => { setMap(m => { const layers = [...m.layers]; layers.splice(Math.min(item.index, layers.length), 0, item.layer); return { ...m, availableLayers: m.availableLayers - 1, layers }; }); setRemoved(r => r.filter(x => x !== item)); setUnsaved(n => Math.max(0, n - 1)); },
    saveChanges: async () => { setUnsaved(0); setRemoved([]); },
    discardChanges: async () => { setMap(keymap); setUnsaved(0); setRemoved([]); },
    setActiveLayoutIndex: async i => { setActive(i); dirty(); },
    lock: async () => setLocked(true),
    resetSettings: async () => { setMap(keymap); setUnsaved(0); setRemoved([]); },
  };
}
