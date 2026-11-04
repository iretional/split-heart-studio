/**
 * The home row mods of the Split Heart's stock keymap, copied from zmk-config at c816ef4.
 * ZMK Studio can't read a hold-tap's settings from the keyboard, so if split_heart.keymap
 * changes, this file has to change with it.
 */
const LEFT = "home_row_mod_left";
const RIGHT = "home_row_mod_right";

const key = (code: number) => 0x70000 | code;
const LCTRL = key(0xe0), LSHIFT = key(0xe1), LALT = key(0xe2), RSHIFT = key(0xe5);
const D = key(0x07), F = key(0x09), J = key(0x0d), K = key(0x0e), L = key(0x0f), S = key(0x16);

export type HomeRowKey = { behavior: string; hold: number; tap: number };

/** Layer id, then key position. The mirror layer swaps the letters but keeps the same mods. */
const STOCK: Record<number, Record<number, HomeRowKey>> = {
  0: {
    26: { behavior: LEFT, hold: LALT, tap: S }, 27: { behavior: LEFT, hold: LSHIFT, tap: D }, 28: { behavior: LEFT, hold: LCTRL, tap: F },
    31: { behavior: RIGHT, hold: LCTRL, tap: J }, 32: { behavior: RIGHT, hold: RSHIFT, tap: K }, 33: { behavior: RIGHT, hold: LALT, tap: L },
  },
  4: {
    26: { behavior: LEFT, hold: LALT, tap: L }, 27: { behavior: LEFT, hold: LSHIFT, tap: K }, 28: { behavior: LEFT, hold: LCTRL, tap: J },
    31: { behavior: RIGHT, hold: LCTRL, tap: F }, 32: { behavior: RIGHT, hold: RSHIFT, tap: D }, 33: { behavior: RIGHT, hold: LALT, tap: S },
  },
};

/** What the stock keymap has on this key, if it is a home row mod there. */
export const homeRowKey = (layerId: number, position: number): HomeRowKey | undefined => STOCK[layerId]?.[position];

/** The settings of a home row behavior, by the name the firmware reports for it. */
export function homeRowTiming(behavior: string | undefined): [string, string][] | null {
  if (behavior !== LEFT && behavior !== RIGHT) return null;
  return [
    ["Tapping term", "280 ms"],
    ["Quick tap", "175 ms"],
    ["Prior idle", "150 ms"],
    ["Flavor", "Balanced"],
    ["Hold triggers", behavior === LEFT ? "Right hand, thumbs" : "Left hand, thumbs"],
    ["Trigger on release", "On"],
  ];
}
