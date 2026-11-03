const FIELD = "input, textarea";
const inField = (target: EventTarget | null) => target instanceof Element && !!target.closest(FIELD);

/**
 * Text can't be selected or dragged anywhere in the app, by mouse or by Ctrl+A, whatever the browser.
 * A form field still takes a click, typing, a double click and the keyboard, including its own
 * Ctrl+A; only a press-and-drag no longer selects. Elements marked draggable keep working.
 */
export function blockTextDrag() {
  let dragging: HTMLInputElement | null = null;

  document.addEventListener("keydown", e => {
    // The code, not the key, because a Korean keyboard layout reports "ㅁ" for this key.
    if ((e.ctrlKey || e.metaKey) && e.code === "KeyA" && !inField(e.target)) e.preventDefault();
  });
  document.addEventListener("selectstart", e => { if (!inField(e.target)) e.preventDefault(); });
  document.addEventListener("dragstart", e => {
    if (!(e.target instanceof Element && e.target.closest("[draggable=true]"))) e.preventDefault();
  });
  document.addEventListener("mousedown", e => {
    dragging = e.detail === 1 && e.target instanceof Element ? e.target.closest<HTMLInputElement>(FIELD) : null;
  });
  document.addEventListener("mouseup", () => { dragging = null; });
  document.addEventListener("selectionchange", () => {
    if (dragging && dragging.selectionStart !== dragging.selectionEnd) dragging.setSelectionRange(dragging.selectionEnd, dragging.selectionEnd);
    // The last resort, for a browser's Select All menu item.
    const selection = getSelection();
    if (selection && !selection.isCollapsed && !inField(document.activeElement)) selection.removeAllRanges();
  });
}
