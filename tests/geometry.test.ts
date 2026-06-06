import { describe, it, expect } from "vitest";
import { seededRandom, computeJitter, PAGE, SHEET_W, SHEET_H } from "../src/geometry";

describe("PAGE geometry", () => {
  it("derives sheet pixel size from the grid", () => {
    expect(SHEET_W).toBe(PAGE.cols * PAGE.colWidth);
    expect(SHEET_H).toBe(PAGE.rows * PAGE.rowHeight);
  });
  it("rings the bell before the right edge", () => {
    expect(PAGE.bellCol).toBeLessThan(PAGE.cols);
  });
});

describe("seededRandom", () => {
  it("is deterministic for the same seed", () => {
    const a = seededRandom(42);
    const b = seededRandom(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
  it("differs across seeds", () => {
    expect(seededRandom(1)()).not.toEqual(seededRandom(2)());
  });
  it("stays within [0, 1)", () => {
    const r = seededRandom(7);
    for (let i = 0; i < 200; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("computeJitter", () => {
  it("is stable for the same cell", () => {
    expect(computeJitter(99, 0, 1, 2)).toEqual(computeJitter(99, 0, 1, 2));
  });
  it("varies between cells", () => {
    expect(computeJitter(99, 0, 1, 2)).not.toEqual(computeJitter(99, 0, 1, 3));
  });
  it("keeps ink in the subtle band [0.78, 1.0]", () => {
    for (let c = 0; c < 100; c++) {
      const j = computeJitter(5, 0, 0, c);
      expect(j.ink).toBeGreaterThanOrEqual(0.78);
      expect(j.ink).toBeLessThanOrEqual(1.0);
    }
  });
});
