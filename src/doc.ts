import { PAGE, computeJitter, type Jitter } from "./geometry";

export interface Strike {
  char: string;
  page: number;
  row: number;
  col: number;
  jitter: Jitter;
}

export interface Carriage {
  page: number;
  row: number;
  col: number;
}

export interface DocState {
  seed: number;
  font: string;
  strikes: Strike[];
  carriage: Carriage;
}

export type DocEvent = "strike" | "move" | "bell" | "return" | "newpage";

const TAB_STOP = 8;

export class Doc {
  seed: number;
  font: string;
  strikes: Strike[] = [];
  carriage: Carriage = { page: 0, row: 0, col: 0 };
  private listeners: ((e: DocEvent) => void)[] = [];

  constructor(seed: number, font: string) {
    this.seed = seed;
    this.font = font;
  }

  on(fn: (e: DocEvent) => void): void {
    this.listeners.push(fn);
  }

  private emit(e: DocEvent): void {
    for (const fn of this.listeners) fn(e);
  }

  strike(char: string): void {
    const { page, row, col } = this.carriage;
    const jitter = computeJitter(this.seed, page, row, col);
    this.strikes.push({ char, page, row, col, jitter });
    this.emit("strike");
    this.advance();
  }

  space(): void {
    this.advance();
  }

  tab(): void {
    const target = Math.min(
      (Math.floor(this.carriage.col / TAB_STOP) + 1) * TAB_STOP,
      PAGE.cols - 1,
    );
    while (this.carriage.col < target) this.advance();
  }

  carriageBack(): void {
    if (this.carriage.col > 0) this.carriage.col--;
    this.emit("move");
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
      strikes: this.strikes,
      carriage: this.carriage,
    };
  }

  static fromState(s: DocState): Doc {
    const d = new Doc(s.seed, s.font);
    d.strikes = s.strikes;
    d.carriage = { ...s.carriage };
    return d;
  }

  private advance(): void {
    const c = this.carriage;
    if (c.col >= PAGE.cols - 1) {
      this.emit("move");
      return; // locked at the right edge
    }
    c.col++;
    if (c.col === PAGE.bellCol) this.emit("bell");
    this.emit("move");
  }
}
