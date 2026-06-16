import { describe, it, expect } from "vitest";
import { seededRandom, computeJitter, pageSkew, SKEW_MAX_DEG, PAGE, SHEET_W, SHEET_H } from "../src/geometry";

describe("PAGE geometry", () => {
  it("is US Letter at 96dpi", () => {
    expect(SHEET_W).toBe(816);
    expect(SHEET_H).toBe(1056);
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
  it("keeps ink in the subtle band [0.89, 1.0]", () => {
    for (let c = 0; c < 100; c++) {
      const j = computeJitter(5, 0, 0, c);
      expect(j.ink).toBeGreaterThanOrEqual(0.89);
      expect(j.ink).toBeLessThanOrEqual(1.0);
    }
  });
});

describe("pageSkew", () => {
  it("is deterministic for a given seed and page", () => {
    expect(pageSkew(42, 3)).toBe(pageSkew(42, 3));
  });

  it("stays within ±SKEW_MAX_DEG", () => {
    for (let page = 0; page < 200; page++) {
      expect(Math.abs(pageSkew(42, page))).toBeLessThanOrEqual(SKEW_MAX_DEG);
    }
  });

  it("leaves most pages perfectly straight", () => {
    let crooked = 0;
    for (let page = 0; page < 100; page++) if (pageSkew(42, page) !== 0) crooked++;
    expect(crooked).toBeGreaterThan(0); // it does happen
    expect(crooked).toBeLessThan(25); // but it's the rare exception
  });

  it("tilts roughly one page in ten across a large sample", () => {
    const N = 2000;
    let crooked = 0;
    for (let page = 0; page < N; page++) if (pageSkew(7, page) !== 0) crooked++;
    const rate = crooked / N;
    expect(rate).toBeGreaterThan(0.06);
    expect(rate).toBeLessThan(0.15);
  });

  it("gives crooked pages a varied angle", () => {
    const angles = new Set<number>();
    for (let page = 0; page < 500; page++) {
      const a = pageSkew(42, page);
      if (a !== 0) angles.add(a);
    }
    expect(angles.size).toBeGreaterThan(1);
  });
});
