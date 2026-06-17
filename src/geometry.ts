// US Letter at a 10 cpi / 6 lpi typewriter grid, rendered at 96dpi.
// Sheet: 8.5in x 11in => 816 x 1056 px.
// Top/left/bottom inset by 0.5in (48px). The bell at bellCol warns the typist;
// the carriage locks at cols, refusing further strikes until carriage return.
export const PAGE = {
  cols: 80,
  rows: 60,
  colWidth: 9.6,
  rowHeight: 16,
  bellCol: 73,
  marginX: 48,
  marginY: 48,
} as const;

// Correction fluid dries after this long; a dried cell accepts a clean retype,
// a still-wet one smears the fresh strike into a smudge. Tunable.
export const DRY_MS = 4000;

export const SHEET_W = 816;
export const SHEET_H = 1056;

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
    dx: (r() - 0.5) * 0.8,
    dy: (r() - 0.5) * 1.1,
    rot: (r() - 0.5) * 1.2,
    ink: 0.89 + r() * 0.11,
  };
}

// Most pages feed in straight; about 1 in 10 sits crooked, by a small fixed angle
// that's stable per (seed, page) like cell jitter.
export const SKEW_MAX_DEG = 1.5;
export const SKEW_PROBABILITY = 0.1;

export function pageSkew(seed: number, page: number): number {
  const r = seededRandom(hash(seed, page));
  if (r() >= SKEW_PROBABILITY) return 0;
  return (r() - 0.5) * 2 * SKEW_MAX_DEG;
}
