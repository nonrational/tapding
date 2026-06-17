import type { Doc } from "./doc";
import type { Renderer } from "./render";

export interface WhiteoutDeps {
  doc: Doc;
  renderer: Renderer;
  feed: HTMLElement;
  onActivity: () => void;
}

// Mouse paints correction fluid onto grid cells: click for one cell, drag as a
// freeform brush over every cell the cursor enters (deduped per gesture).
export function attachWhiteout(deps: WhiteoutDeps): () => void {
  const { doc, renderer, feed, onActivity } = deps;
  let painting = false;
  const painted = new Set<string>();

  const paint = (clientX: number, clientY: number) => {
    const cell = renderer.cellAt(clientX, clientY);
    if (!cell) return;
    const key = `${cell.page},${cell.row},${cell.col}`;
    if (painted.has(key)) return;
    painted.add(key);
    doc.applyWhiteout(cell.page, cell.row, cell.col);
    onActivity();
  };

  const down = (e: PointerEvent) => {
    if (e.button !== 0) return; // left button only
    painting = true;
    painted.clear();
    paint(e.clientX, e.clientY);
  };
  const move = (e: PointerEvent) => {
    if (painting) paint(e.clientX, e.clientY);
  };
  const up = () => {
    painting = false;
  };

  feed.addEventListener("pointerdown", down);
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);

  return () => {
    feed.removeEventListener("pointerdown", down);
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
  };
}
