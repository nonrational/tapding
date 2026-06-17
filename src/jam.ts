// Two QWERTY-adjacent typebars swung up together clash before either reaches the
// paper. JAM_WINDOW_MS is how close in time two adjacent keys must fall to jam;
// JAM_CLEAR_MS is how long the hammers stay locked before they fall back. Tunable.
export const JAM_WINDOW_MS = 70;
export const JAM_CLEAR_MS = 1000;

// The three letter rows, each staggered half a key to the right of the one above —
// enough offset that a key's nearest neighbors are its row siblings and the two
// keys diagonally below/above it, and nothing further.
const ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];
const ROW_OFFSET = [0, 0.5, 1];
// Same-row neighbors sit 1.0 apart and nearest diagonals ~1.12; the next ring is
// 1.6+. A 1.2 cutoff keeps exactly the touching keys.
const ADJ_THRESHOLD = 1.2;

const neighbors = buildNeighbors();

function buildNeighbors(): Map<string, Set<string>> {
  const pos = new Map<string, { x: number; y: number }>();
  ROWS.forEach((row, r) => {
    [...row].forEach((ch, i) => pos.set(ch, { x: i + ROW_OFFSET[r], y: r }));
  });
  const map = new Map<string, Set<string>>();
  for (const [a, pa] of pos) {
    const set = new Set<string>();
    for (const [b, pb] of pos) {
      if (a === b) continue;
      if (Math.hypot(pa.x - pb.x, pa.y - pb.y) <= ADJ_THRESHOLD) set.add(b);
    }
    map.set(a, set);
  }
  return map;
}

// Whether two keys sit on neighboring typebars. Letters only; case-insensitive.
export function areAdjacent(a: string, b: string): boolean {
  return neighbors.get(a.toLowerCase())?.has(b.toLowerCase()) ?? false;
}

export interface Jam {
  // Verdict for a character keystroke: "print" it, or "jam" (swallow it and lock).
  offer(key: string, now: number): "print" | "jam";
  // Whether the hammers are still locked at this instant.
  isJammed(now: number): boolean;
  // Forget the last key so a jam can't bridge a non-character keystroke (space, etc.).
  reset(): void;
}

export function createJam(): Jam {
  let last: { key: string; time: number } | null = null;
  let jammedUntil = 0;

  return {
    offer(key, now) {
      const k = key.toLowerCase();
      if (last && now - last.time <= JAM_WINDOW_MS && areAdjacent(k, last.key)) {
        jammedUntil = now + JAM_CLEAR_MS;
        last = null; // the clashing pair never lands; start fresh once it clears
        return "jam";
      }
      last = { key: k, time: now };
      return "print";
    },
    isJammed(now) {
      return now < jammedUntil;
    },
    reset() {
      last = null;
    },
  };
}
