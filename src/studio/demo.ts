import type { GetBehaviorDetailsResponse } from "@zmkfirmware/zmk-studio-ts-client/behaviors";
import type { BehaviorBinding, Keymap, KeyPhysicalAttrs } from "@zmkfirmware/zmk-studio-ts-client/keymap";
import { useState, useSyncExternalStore } from "react";
import { ALL_KEYCODES } from "../keyLabels";
import type { RemovedLayer, Studio } from "./useStudio";

// The Split Heart as zmk-config defines it (open the app with ?demo or ?demo=locked), so the UI can be checked without hardware.
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
const values = (...items: [string, number][]) => items.map(([name, constant]) => ({ name, constant }));
const one = (param1: GetBehaviorDetailsResponse["metadata"][number]["param1"], param2: typeof param1 = []) => [{ param1, param2 }];
const BT_PROFILE = { name: "Profile", range: { min: 0, max: 4 } };
// What zmk-config should report on ZMK v0.3, read from their source. Ids are made up.
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
    { param1: values(["Next Profile", 1], ["Previous Profile", 2], ["Clear All Profiles", 4], ["Clear Selected Profile", 0]), param2: [] },
    { param1: values(["Select Profile", 3], ["Disconnect Profile", 5]), param2: [BT_PROFILE] },
  ] },
  { id: 14, displayName: "To Layer", metadata: one([layerParam]) },
  { id: 15, displayName: "Grave/Escape", metadata: [] },
  { id: 16, displayName: "Mouse Key Press", metadata: one(values(["MB1", 1], ["MB2", 2], ["MB3", 4], ["MB4", 8], ["MB5", 16])) },
  // Firmware reports no parameter details for these two.
  { id: 17, displayName: "mouse_move", metadata: [] },
  { id: 18, displayName: "mouse_scroll", metadata: [] },
  { id: 19, displayName: "Output Selection", metadata: one(values(["Toggle", 0], ["USB", 1], ["Bluetooth", 2])) },
  { id: 20, displayName: "Backlight", metadata: one(values(["Toggle On/Off", 2], ["Turn On", 0], ["Turn OFF", 1], ["Increase Brightness", 3], ["Decrease Brightness", 4], ["Cycle Brightness", 5])) },
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

// The bindings blocks of split_heart.keymap in zmk-config at 60daf65, unchanged. Keep them in sync by copying.
const KEYMAP_SOURCE = [
  // default_layer
  `&kp GRAVE     &kp N1        &kp N2        &kp N3        &kp N4        &kp N5          &kp N6         &kp N7         &kp N8         &kp N9         &kp N0         &kp MINUS
&kp TAB       &kp Q         &kp W         &kp E         &kp R         &kp T           &kp Y          &kp U          &kp I          &kp O          &kp P          &kp EQUAL
&lt 4 DEL     &kp A         &hml LALT S   &hml LSHIFT D &hml LCTRL F  &kp G           &kp H          &hmr LCTRL J   &hmr RSHIFT K  &hmr LALT L    &kp SLASH      &kp SEMI
&kp LSHIFT    &kp Z         &kp X         &kp C         &kp V         &kp B           &kp N          &kp M          &kp COMMA      &kp DOT        &kp SQT        &kp LANG2
&kp LGUI      &kp LALT                                                                  &kp LBKT       &kp RBKT
&lt 1 BSPC    &kp SPACE     &lt 2 ESC     &kp LCTRL       &lt 5 LANG1    &lt 3 ENTER    &kp SPACE      &kp RSHFT`,
  // number_layer
  `&kp LBKT      &kp RBKT      &kp COMMA     &kp KP_DIVIDE    &kp KP_MULTIPLY   &kp EQUAL       &none          &kp F10        &kp F11        &kp F12        &none          &none
&kp LBRC      &kp RBRC      &kpn7         &kpn8         &kpn9         &kpminus        &none          &kp F7         &kp F8         &kp F9         &none          &none
&kp LPAR      &kp RPAR      &kpn4         &kpn5         &kpn6         &kpplus         &none          &kp F4         &kp F5         &kp F6         &none          &none
&kp LT        &kp GT        &kpn1         &kpn2         &kpn3         &kp ENTER       &none          &kp F1         &kp F2         &kp F3         &none          &kp BSLH
&kpn0         &kp KP_DOT                                                                &none          &none
&trans        &trans        &trans        &trans          &trans         &trans         &trans         &trans`,
  // navigation_layer
  `&kp KP_NUM    &kp PSCRN     &kp PG_UP     &none         &kp PG_DN     &none           &none          &none           &mmv MOVE_Y(-1500) &none           &none           &none
&kp CAPS      &none         &kp HOME      &kp UP        &kp END       &msc SCRL_UP    &none          &none           &mmv MOVE_Y(-600)  &none           &none           &none
&trans        &tdmb45       &kp LEFT      &kp DOWN      &kp RIGHT     &msc SCRL_DOWN  &mmv MOVE_X(-1500) &mmv MOVE_X(-600)   &mmv MOVE_Y(600)   &mmv MOVE_X(600)    &mmv MOVE_X(1500)   &none
&trans        &trans        &mkp MB1      &mkp MB2      &mkp MB3      &kp SPACE       &none          &none           &mmv MOVE_Y(1500)  &none           &none           &none
&none         &kp DEL                                                                    &none          &none
&trans        &trans        &trans       &trans         &trans         &trans          &trans         &trans`,
  // system_layer
  `&kp MINUS    &kp N0         &kp N9        &kp N8        &kp N7        &kp N6          &bt BT_SEL 0   &bt BT_SEL 1   &bt BT_SEL 2 &bt BT_SEL 3 &bt BT_SEL 4  &bt BT_CLR
&kp EQUAL    &kp P          &kp O         &kp I         &kp U         &kp Y           &none          &none          &none        &none        &studio_unlock &none
&bootloader       &kp SLASH      &kp L         &kp K         &kp J         &kp H           &kp C_MUTE     &kp C_VOL_UP   &kp C_VOL_DN &none        &none         &bootloader
&kp LANG2    &kp SQT        &kp DOT       &kp M         &kp N         &kp B           &bl BL_CYCLE   &bl BL_TOG     &none        &bt BT_CLR_ALL        &none         &kp BSLH
&kp LANG1     &kp COMMA                                                                 &none        &none
&trans        &trans        &trans        &trans          &trans         &trans         &trans       &trans`,
  // mirror_layer
  `&kp MINUS    &kp N0         &kp N9        &kp N8        &kp N7       &kp N6          &kp N5       &kp N4       &kp N3        &kp N2       &kp N1       &kp GRAVE
&kp EQUAL    &kp P          &kp O         &kp I         &kp U        &kp Y           &kp T        &kp R        &kp E         &kp W        &kp Q        &kp TAB
&trans       &kp SLASH      &hml LALT L   &hml LSHIFT K &hml LCTRL J &kp H           &kp G        &hmr LCTRL F &hmr RSHIFT D &hmr LALT S  &kp A        &kp ESC
&kp LANG2    &kp SQT        &kp DOT       &kp COMMA     &kp M        &kp N           &kp B        &kp V        &kp C         &kp X        &kp Z        &kp LALT
&kp RBKT      &kp LBKT                                                             &kp ENTER     &kp LGUI
&kp RSHFT     &kp SPACE     &kp ENTER    &kp LANG1       &kp LALT     &kp LCTRL    &kp BSPC      &trans`,
  // sub_navigation_layer
  `&kp KP_NUM    &kp PSCRN     &kp PG_UP     &none         &kp PG_DN     &none           &none          &none           &none          &none           &none           &none
&kp CAPS      &kp DEL       &kp HOME      &kp UP        &kp END       &msc SCRL_UP    &none          &none           &none          &none           &none           &none
&trans        &none         &kp LEFT      &kp DOWN      &kp RIGHT     &msc SCRL_DOWN  &none          &none           &kp UP          &none           &none           &none
&kp LSHFT     &none         &mkp MB1      &mkp MB2      &mkp MB4      &mkp MB5        &none          &kp LEFT        &kp DOWN        &kp RIGHT      &none           &none
&none         &mkp MB3                                                                   &none          &none
&kp DEL       &kp LC(BSPC)  &trans        &trans          &trans         &trans          &trans         &trans`,
];

const MOD_BITS: Record<string, number> = { LC: 0x01, LS: 0x02, LA: 0x04, LG: 0x08, RC: 0x10, RS: 0x20, RA: 0x40, RG: 0x80 };
const MOUSE_BUTTONS: Record<string, number> = { MB1: 1, MB2: 2, MB3: 4, MB4: 8, MB5: 16 };
const BT_COMMANDS: Record<string, number> = { BT_CLR: 0, BT_SEL: 3, BT_CLR_ALL: 4 };
const BL_COMMANDS: Record<string, number> = { BL_TOG: 2, BL_CYCLE: 5 };
// zmk-config sets ZMK_POINTING_DEFAULT_SCRL_VAL to 20.
const SCROLLS: Record<string, string> = { SCRL_UP: "MOVE_Y(20)", SCRL_DOWN: "MOVE_Y(-20)" };
const SIMPLE: Record<string, number> = {
  trans: 2, none: 4, bootloader: 22, studio_unlock: 23, tdmb45: 26, kpminus: 37, kpplus: 38,
  kpn1: 27, kpn2: 28, kpn3: 29, kpn4: 30, kpn5: 31, kpn6: 32, kpn7: 33, kpn8: 34, kpn9: 35, kpn0: 36,
};

/** A keycode as a keymap writes it, such as SLASH or LC(BSPC). */
function usageOf(name: string): number {
  const modded = /^([LR][CSAG])\((.+)\)$/.exec(name);
  if (modded) return ((MOD_BITS[modded[1]] << 24) | usageOf(modded[2])) >>> 0;
  const code = ALL_KEYCODES.find(c => c.zmk === name || c.aliases.includes(name));
  if (!code) throw new Error("Unknown keycode in demo keymap: " + name);
  return code.usage;
}

/** MOVE_X and MOVE_Y from ZMK's pointing.h. */
function axisOf(name: string): number {
  const move = /^MOVE_([XY])\((-?\d+)\)$/.exec(SCROLLS[name] ?? name);
  if (!move) throw new Error("Unknown movement in demo keymap: " + name);
  const value = Number(move[2]) & 0xffff;
  return (move[1] === "X" ? value << 16 : value) >>> 0;
}

function bindingOf(source: string): BehaviorBinding {
  const [name, a = "", b = ""] = source.trim().split(/\s+/);
  const make = (behaviorId: number, param1 = 0, param2 = 0) => ({ behaviorId, param1, param2 });
  if (name in SIMPLE) return make(SIMPLE[name]);
  switch (name) {
    case "kp": return make(1, usageOf(a));
    case "lt": return make(6, Number(a), usageOf(b));
    case "hml": return make(24, usageOf(a), usageOf(b));
    case "hmr": return make(25, usageOf(a), usageOf(b));
    case "mkp": return make(16, MOUSE_BUTTONS[a]);
    case "mmv": return make(17, axisOf(a));
    case "msc": return make(18, axisOf(a));
    case "bt": return make(13, BT_COMMANDS[a], Number(b || 0));
    case "bl": return make(20, BL_COMMANDS[a]);
    default: throw new Error("Unknown behavior in demo keymap: " + name);
  }
}

const keymap: Keymap = {
  // The keymap gives its layers no display name, and reserves none for adding more.
  layers: KEYMAP_SOURCE.map((source, id) => ({ id, name: "", bindings: source.split("&").slice(1).map(bindingOf) })),
  availableLayers: 0, maxLayerNameLength: 20,
} as Keymap;

export const isDemo = () => new URLSearchParams(window.location.search).has("demo");

const DEMO_CHANGE = "demochange";
const onDemoChange = (changed: () => void) => {
  window.addEventListener(DEMO_CHANGE, changed);
  window.addEventListener("popstate", changed);
  return () => {
    window.removeEventListener(DEMO_CHANGE, changed);
    window.removeEventListener("popstate", changed);
  };
};

/** Whether the demo is on, following setDemo. */
export const useIsDemo = () => useSyncExternalStore(onDemoChange, isDemo);

/** Turns the demo on or off in place. Only the address changes: a reload would also end fullscreen. */
export function setDemo(on: boolean) {
  const url = new URL(window.location.href);
  url.search = on ? "?demo" : "";
  history.replaceState(history.state, "", url);
  window.dispatchEvent(new Event(DEMO_CHANGE));
}

/** Same surface as useStudio, kept in memory so every screen can be exercised without a keyboard. */
export function useDemoStudio(real: Studio): Studio {
  const [locked, setLocked] = useState(() => new URLSearchParams(window.location.search).get("demo") === "locked");
  const [map, setMap] = useState<Keymap>(keymap);
  const [unsaved, setUnsaved] = useState(0);
  const [removed, setRemoved] = useState<RemovedLayer[]>([]);
  const [activeLayout, setActive] = useState(0);
  const layouts = [{ name: "Split Heart (schematic)", keys }];
  const dirty = () => setUnsaved(n => n + 1);
  return {
    ...real, hasSerial: true, connected: true, device: "Split Heart", loading: false, locked, error: null, lastSync: new Date(),
    unsaved, removed, firmware: "v0.1.0 · ZMK 0.3",
    layouts, activeLayout, layout: locked ? undefined : layouts[activeLayout], keymap: locked ? null : map, names: BEHAVIORS, behaviors: DEMO_BEHAVIORS,
    connect: async () => {}, disconnect: () => {}, refresh: () => {},
    setBinding: async (layerId, pos, binding) => { setMap(m => ({ ...m, layers: m.layers.map(l => l.id !== layerId ? l : { ...l, bindings: l.bindings.map((b, i) => i === pos ? binding : b) }) })); dirty(); },
    renameLayer: async (id, name) => { setMap(m => ({ ...m, layers: m.layers.map(l => l.id === id ? { ...l, name } : l) })); dirty(); },
    moveLayer: async (from, to) => { setMap(m => { const layers = [...m.layers]; layers.splice(to, 0, layers.splice(from, 1)[0]); return { ...m, layers }; }); dirty(); },
    addLayer: async () => { setMap(m => ({ ...m, availableLayers: m.availableLayers - 1, layers: [...m.layers, { id: Date.now() % 1000 + 10, name: "", bindings: names.map(() => bindingOf("trans")) }] })); dirty(); },
    removeLayer: async index => { setRemoved(r => [...r, { layer: map.layers[index], index }]); setMap(m => ({ ...m, availableLayers: m.availableLayers + 1, layers: m.layers.filter((_, i) => i !== index) })); dirty(); },
    restoreLayer: async item => { setMap(m => { const layers = [...m.layers]; layers.splice(Math.min(item.index, layers.length), 0, item.layer); return { ...m, availableLayers: m.availableLayers - 1, layers }; }); setRemoved(r => r.filter(x => x !== item)); setUnsaved(n => Math.max(0, n - 1)); },
    saveChanges: async () => { setUnsaved(0); setRemoved([]); },
    discardChanges: async () => { setMap(keymap); setUnsaved(0); setRemoved([]); },
    setActiveLayoutIndex: async i => { setActive(i); dirty(); },
    lock: async () => setLocked(true),
    resetSettings: async () => { setMap(keymap); setUnsaved(0); setRemoved([]); },
  };
}
