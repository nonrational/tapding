import { describe, it, expect } from "vitest";
import { Doc } from "../src/doc";
import { PAGE } from "../src/geometry";

const newDoc = () => new Doc(123, "courier");

describe("strike", () => {
  it("records a glyph at the carriage and advances one column", () => {
    const d = newDoc();
    d.strike("a");
    expect(d.strikes).toHaveLength(1);
    expect(d.strikes[0]).toMatchObject({ char: "a", page: 0, row: 0, col: 0 });
    expect(d.carriage).toMatchObject({ page: 0, row: 0, col: 1 });
  });

  it("attaches stable jitter to each strike", () => {
    const d = newDoc();
    d.strike("a");
    const j = d.strikes[0].jitter;
    expect(typeof j.dx).toBe("number");
    expect(j.ink).toBeGreaterThanOrEqual(0.78);
  });
});

describe("space and tab", () => {
  it("space advances the carriage without recording a glyph", () => {
    const d = newDoc();
    d.space();
    expect(d.strikes).toHaveLength(0);
    expect(d.carriage.col).toBe(1);
  });

  it("tab jumps to the next 8-column stop", () => {
    const d = newDoc();
    d.strike("a"); // col -> 1
    d.tab();
    expect(d.carriage.col).toBe(8);
  });
});

describe("carriageBack (no delete)", () => {
  it("moves left without removing strikes", () => {
    const d = newDoc();
    d.strike("a");
    d.strike("b");
    expect(d.carriage.col).toBe(2);
    d.carriageBack();
    expect(d.carriage.col).toBe(1);
    expect(d.strikes).toHaveLength(2); // nothing erased
  });

  it("never moves past the left margin on the first line", () => {
    const d = newDoc();
    d.carriageBack();
    expect(d.carriage).toMatchObject({ page: 0, row: 0, col: 0 });
  });

  it("from column 0 jumps to the end of the previous line", () => {
    const d = newDoc();
    d.strike("h");
    d.strike("i");
    d.carriageReturn(); // now at row 1, col 0
    d.carriageBack();
    expect(d.carriage).toMatchObject({ page: 0, row: 0, col: 2 });
  });

  it("from column 0 on an empty previous line lands at column 0 of that line", () => {
    const d = newDoc();
    d.carriageReturn(); // row 1 col 0, previous row has no strikes
    d.carriageBack();
    expect(d.carriage).toMatchObject({ page: 0, row: 0, col: 0 });
  });
});

describe("overstrike", () => {
  it("appends a second glyph at the same cell", () => {
    const d = newDoc();
    d.strike("o");
    d.carriageBack();
    d.strike("x");
    expect(d.strikes).toHaveLength(2);
    expect(d.strikes[0]).toMatchObject({ char: "o", col: 0 });
    expect(d.strikes[1]).toMatchObject({ char: "x", col: 0 });
  });
});

describe("carriageReturn and pagination", () => {
  it("returns to column 0 on the next row", () => {
    const d = newDoc();
    d.strike("a");
    d.carriageReturn();
    expect(d.carriage).toMatchObject({ page: 0, row: 1, col: 0 });
  });

  it("rolls in a new sheet past the last row", () => {
    const d = newDoc();
    for (let i = 0; i < PAGE.rows; i++) d.carriageReturn();
    expect(d.carriage).toMatchObject({ page: 1, row: 0, col: 0 });
  });

  it("reports the page count", () => {
    const d = newDoc();
    expect(d.pageCount()).toBe(1);
    for (let i = 0; i < PAGE.rows; i++) d.carriageReturn();
    expect(d.pageCount()).toBe(2);
  });
});

describe("right margin", () => {
  it("emits a bell when the carriage reaches bellCol", () => {
    const d = newDoc();
    const seen: string[] = [];
    d.on((e) => seen.push(e));
    for (let i = 0; i < PAGE.bellCol; i++) d.strike("x");
    expect(seen).toContain("bell");
  });

  it("overstrikes the last cell when locked at the right margin", () => {
    const d = newDoc();
    for (let i = 0; i < PAGE.cols + 10; i++) d.strike("x");
    expect(d.carriage.col).toBe(PAGE.cols);
    expect(d.strikes).toHaveLength(PAGE.cols + 10);
    const overstrikes = d.strikes.filter((s) => s.col === PAGE.cols - 1);
    expect(overstrikes).toHaveLength(11); // the original + 10 overstrikes
  });

  it("tab stops at the right margin instead of overshooting", () => {
    const d = newDoc();
    for (let i = 0; i < PAGE.cols - 1; i++) d.space();
    d.tab();
    expect(d.carriage.col).toBe(PAGE.cols);
  });
});

describe("events", () => {
  it("emits strike and move on a keystrike", () => {
    const d = newDoc();
    const seen: string[] = [];
    d.on((e) => seen.push(e));
    d.strike("a");
    expect(seen).toContain("strike");
    expect(seen).toContain("move");
  });
});

describe("serialize / restore", () => {
  it("round-trips losslessly including the seed", () => {
    const d = newDoc();
    d.strike("h");
    d.strike("i");
    d.carriageReturn();
    const restored = Doc.fromState(d.toState());
    expect(restored.seed).toBe(d.seed);
    expect(restored.font).toBe(d.font);
    expect(restored.strikes).toEqual(d.strikes);
    expect(restored.carriage).toEqual(d.carriage);
  });
});
