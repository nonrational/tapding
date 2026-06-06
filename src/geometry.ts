// US Letter at a 10 cpi / 6 lpi typewriter grid, rendered at 96dpi.
// 8.5in x 11in => 816 x 1056 px. 816/85 = 9.6, 1056/66 = 16.
export const PAGE = {
  cols: 85,
  rows: 66,
  colWidth: 9.6,
  rowHeight: 16,
  bellCol: 78,
} as const;

export const SHEET_W = PAGE.cols * PAGE.colWidth;
export const SHEET_H = PAGE.rows * PAGE.rowHeight;

export interface Jitter {
  dx: number;
  dy: number;
  rot: number;
  ink: number;
}

// mulberry32
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(...nums: number[]): number {
  let h = 2166136261 >>> 0;
  for (const n of nums) {
    h ^= n >>> 0;
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

// Subtle "Level B" mechanical variation, stable per cell.
export function computeJitter(seed: number, page: number, row: number, col: number): Jitter {
  const r = seededRandom(hash(seed, page, row, col));
  return {
    dx: (r() - 0.5) * 1.6,
    dy: (r() - 0.5) * 2.2,
    rot: (r() - 0.5) * 2.4,
    ink: 0.78 + r() * 0.22,
  };
}
