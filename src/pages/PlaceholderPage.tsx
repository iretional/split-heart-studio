import { LockBanner, TopBar, type Page } from "../components/Shell";
import type { Studio } from "../studio/useStudio";

const planned: Record<Exclude<Page, "keymap">, [string, string]> = {
  layers: ["Layers", "Add, remove, rename and reorder layers, with a preview of each one."],
  macros: ["Macros", "Macros from the firmware, plus drafts you can export as devicetree code."],
  combos: ["Combos", "Pick keys on the map and export the combo as devicetree code."],
  settings: ["Settings", "Device, physical layout, appearance, backup and reset."],
};

/** Pages that are designed in Figma but not built yet. */
export function PlaceholderPage({ page, studio, onMenu }: { page: Exclude<Page, "keymap">; studio: Studio; onMenu: () => void }) {
  const [title, text] = planned[page];
  return <>
    <TopBar title={title} subtitle={studio.device} connected={studio.connected} onMenu={onMenu} />
    {studio.locked && <LockBanner onRefresh={studio.refresh} loading={studio.loading} />}
    <div className="placeholder-body">
      <span className="t-caption muted">COMING NEXT</span>
      <h1 className="t-display">{title}</h1>
      <p className="t-body variant">{text}</p>
    </div>
  </>;
}
