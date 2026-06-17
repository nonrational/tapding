import type { Doc } from "./doc";
import type { Renderer } from "./render";
import { PAGE } from "./geometry";

export interface WhiteoutDeps {
  doc: Doc;
  renderer: Renderer;
  feed: HTMLElement;
  onActivity: () => void;
}

// Sample finer than a cell so a straight move can't step over one.
const STEP = Math.min(PAGE.colWidth, PAGE.rowHeight) / 2;

// Evenly spaced points along the segment from (x0,y0) to (x1,y1), excluding the
// start and including the end, with no gap wider than `step`. A zero-length move
// yields the single point. Pointer events arrive far apart on a fast drag; walking
// the gap between them is what keeps the painted path unbroken.
export function brushSamples(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  step = STEP,
): Array<{ x: number; y: number }> {
  const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / step));
  const out: Array<{ x: number; y: number }> = [];
  for (let i = 1; i <= steps; i++) {
    out.push({ x: x0 + ((x1 - x0) * i) / steps, y: y0 + ((y1 - y0) * i) / steps });
  }
  return out;
}

// Mouse paints correction fluid onto grid cells: click for one cell, drag as a
// freeform brush. The cursor's path between pointer events is interpolated so a
// fast flick still fills every cell it crosses (deduped per gesture).
export function attachWhiteout(deps: WhiteoutDeps): () => void {
  const { doc, renderer, feed, onActivity } = deps;
  let painting = false;
  let lastX = 0;
  let lastY = 0;
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
    lastX = e.clientX;
    lastY = e.clientY;
  };
  const move = (e: PointerEvent) => {
    if (!painting) return;
    for (const p of brushSamples(lastX, lastY, e.clientX, e.clientY)) paint(p.x, p.y);
    lastX = e.clientX;
    lastY = e.clientY;
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
