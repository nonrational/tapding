import { PAGE, DRY_MS, computeJitter, type Jitter } from "./geometry";

export type Ribbon = "black" | "red";

export interface Strike {
  char: string;
  page: number;
  row: number;
  col: number;
  jitter: Jitter;
  ribbon: Ribbon;
  smudged: boolean;
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
    const smudged = this.wetAt(page, row, col);
    this.strikes.push({ char, page, row, col, jitter, ribbon: this.ribbon, smudged });
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

  // Wet iff the most recent patch in the cell was applied less than DRY_MS ago.
  wetAt(page: number, row: number, col: number): boolean {
    let latest = -Infinity;
    for (const w of this.whiteout) {
      if (w.page === page && w.row === row && w.col === col && w.appliedAt > latest) {
        latest = w.appliedAt;
      }
    }
    if (latest === -Infinity) return false;
    return this.now() - latest < DRY_MS;
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
    };
  }

  static fromState(s: DocState): Doc {
    const d = new Doc(s.seed, s.font);
    d.ribbon = s.ribbon ?? "black";
    d.strikes = s.strikes.map((st) => ({ ...st, ribbon: st.ribbon ?? "black" }));
    d.carriage = { ...s.carriage };
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
