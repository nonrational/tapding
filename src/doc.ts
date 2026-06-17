import { PAGE, WHITEOUT_RADIUS, dryMsForDensity, computeJitter, type Jitter } from "./geometry";

export type Ribbon = "black" | "red";

export interface Strike {
  char: string;
  page: number;
  row: number;
  col: number;
  jitter: Jitter;
  ribbon: Ribbon;
  // How smeared this strike is, 0 (clean) to 1 (struck into fully wet fluid),
  // locked at the cell's wetness the instant it was typed.
  smudge: number;
}

export interface Whiteout {
  page: number;
  row: number;
  col: number;
  appliedAt: number;
  // strikes.length at apply time: a strike at array index i in this cell is
  // hidden iff i < max(coversBefore) of the cell's whiteouts.
  coversBefore: number;
}

export interface Carriage {
  page: number;
  row: number;
  col: number;
}

export interface DocState {
  seed: number;
  font: string;
  ribbon: Ribbon;
  strikes: Strike[];
  carriage: Carriage;
  whiteout: Whiteout[];
}

export type DocEvent = "strike" | "move" | "bell" | "return" | "newpage" | "ribbon" | "whiteout";

const TAB_STOP = 8;

export class Doc {
  seed: number;
  font: string;
  ribbon: Ribbon = "black";
  strikes: Strike[] = [];
  carriage: Carriage = { page: 0, row: 0, col: 0 };
  whiteout: Whiteout[] = [];
  now: () => number;
  private listeners: ((e: DocEvent) => void)[] = [];

  constructor(seed: number, font: string, now: () => number = Date.now) {
    this.seed = seed;
    this.font = font;
    this.now = now;
  }

  on(fn: (e: DocEvent) => void): void {
    this.listeners.push(fn);
  }

  private emit(e: DocEvent): void {
    for (const fn of this.listeners) fn(e);
  }

  strike(char: string): void {
    const { page, row } = this.carriage;
    const locked = this.carriage.col >= PAGE.cols;
    const col = locked ? PAGE.cols - 1 : this.carriage.col;
    const jitter = computeJitter(this.seed, page, row, col);
    const smudge = this.wetnessAt(page, row, col);
    this.strikes.push({ char, page, row, col, jitter, ribbon: this.ribbon, smudge });
    this.emit("strike");
    if (!locked) this.advance();
  }

  space(): void {
    this.advance();
  }

  toggleRibbon(): Ribbon {
    this.ribbon = this.ribbon === "black" ? "red" : "black";
    this.emit("ribbon");
    return this.ribbon;
  }

  applyWhiteout(page: number, row: number, col: number): void {
    this.whiteout.push({ page, row, col, appliedAt: this.now(), coversBefore: this.strikes.length });
    this.emit("whiteout");
  }

  // How wet the cell is now, 0 (dry, or never whited) to 1 (just applied). Wetness
  // decays linearly over a dry time that grows with how many dabs crowd the cell, so
  // a lone correction sets fast and a dense block stays wet. Patches restored from a
  // save carry appliedAt 0 and always read dry.
  wetnessAt(page: number, row: number, col: number): number {
    let latest = -Infinity;
    for (const w of this.whiteout) {
      if (w.page === page && w.row === row && w.col === col && w.appliedAt > latest) {
        latest = w.appliedAt;
      }
    }
    if (latest <= 0) return 0;
    const dryMs = dryMsForDensity(this.densityAt(page, row, col));
    return Math.min(Math.max(1 - (this.now() - latest) / dryMs, 0), 1);
  }

  // Distinct whited cells within WHITEOUT_RADIUS (Chebyshev) on the page, counting
  // the cell itself — the local crowding that slows drying.
  private densityAt(page: number, row: number, col: number): number {
    const seen = new Set<string>();
    for (const w of this.whiteout) {
      if (w.page !== page) continue;
      if (Math.abs(w.row - row) <= WHITEOUT_RADIUS && Math.abs(w.col - col) <= WHITEOUT_RADIUS) {
        seen.add(`${w.row},${w.col}`);
      }
    }
    return seen.size;
  }

  tab(): void {
    const target = Math.min((Math.floor(this.carriage.col / TAB_STOP) + 1) * TAB_STOP, PAGE.cols);
    while (this.carriage.col < target) this.advance();
  }

  carriageBack(): void {
    const c = this.carriage;
    if (c.col > 0) {
      c.col--;
    } else if (c.row > 0) {
      c.row--;
      c.col = this.endOfLine(c.page, c.row);
    } else if (c.page > 0) {
      c.page--;
      c.row = PAGE.rows - 1;
      c.col = this.endOfLine(c.page, c.row);
    }
    this.emit("move");
  }

  private endOfLine(page: number, row: number): number {
    let max = -1;
    for (const s of this.strikes) {
      if (s.page === page && s.row === row && s.col > max) max = s.col;
    }
    return Math.min(max + 1, PAGE.cols);
  }

  carriageReturn(): void {
    this.carriage.col = 0;
    this.carriage.row++;
    this.emit("return");
    if (this.carriage.row >= PAGE.rows) {
      this.carriage.page++;
      this.carriage.row = 0;
      this.emit("newpage");
    }
    this.emit("move");
  }

  pageCount(): number {
    let max = this.carriage.page;
    for (const s of this.strikes) if (s.page > max) max = s.page;
    return max + 1;
  }

  toState(): DocState {
    return {
      seed: this.seed,
      font: this.font,
      ribbon: this.ribbon,
      strikes: [...this.strikes],
      carriage: this.carriage,
      whiteout: [...this.whiteout],
    };
  }

  static fromState(s: DocState): Doc {
    const d = new Doc(s.seed, s.font);
    d.ribbon = s.ribbon ?? "black";
    d.strikes = s.strikes.map((st) => {
      // Older saves stored a boolean `smudged`; map it to full intensity and drop it.
      const { smudged, ...rest } = st as Strike & { smudged?: boolean };
      const smudge = rest.smudge ?? (smudged ? 1 : 0);
      return { ...rest, ribbon: rest.ribbon ?? "black", smudge };
    });
    d.carriage = { ...s.carriage };
    // Persisted patches are treated as dry on reload: reset appliedAt to 0 so
    // wetnessAt() reads dry immediately. coversBefore is preserved — the strikes
    // array is identical, so indices still line up.
    d.whiteout = (s.whiteout ?? []).map((w) => ({ ...w, appliedAt: 0 }));
    return d;
  }

  private advance(): void {
    const c = this.carriage;
    if (c.col >= PAGE.cols) return;
    c.col++;
    if (c.col === PAGE.bellCol) this.emit("bell");
    this.emit("move");
  }
}
