import { describe, it, expect } from "vitest";
import { brushSamples } from "../src/whiteout";

describe("brushSamples", () => {
  it("returns just the endpoint for a zero-length move", () => {
    expect(brushSamples(10, 10, 10, 10, 5)).toEqual([{ x: 10, y: 10 }]);
  });

  it("ends exactly at the target point", () => {
    const s = brushSamples(0, 0, 100, 40, 5);
    expect(s[s.length - 1]).toEqual({ x: 100, y: 40 });
  });

  it("never leaves a gap larger than the step between consecutive samples", () => {
    const step = 4.8;
    let prev = { x: 0, y: 0 };
    for (const p of brushSamples(prev.x, prev.y, 200, 77, step)) {
      expect(Math.hypot(p.x - prev.x, p.y - prev.y)).toBeLessThanOrEqual(step + 1e-9);
      prev = p;
    }
  });

  it("adds more samples the farther the move", () => {
    const short = brushSamples(0, 0, 10, 0, 5);
    const long = brushSamples(0, 0, 100, 0, 5);
    expect(long.length).toBeGreaterThan(short.length);
  });
});
