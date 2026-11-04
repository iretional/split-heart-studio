/**
 * The home row behaviors of the Split Heart's keymap, copied from zmk-config at c816ef4.
 * ZMK Studio can't read a hold-tap's settings from the keyboard, so if split_heart.keymap
 * changes, this file has to change with it.
 */
const LEFT = "home_row_mod_left";
const RIGHT = "home_row_mod_right";

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
