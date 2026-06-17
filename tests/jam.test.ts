import { describe, it, expect } from "vitest";
import { createJam, areAdjacent, JAM_WINDOW_MS, JAM_CLEAR_MS } from "../src/jam";

describe("typebar adjacency", () => {
  it("treats QWERTY same-row and diagonal neighbors as adjacent", () => {
    expect(areAdjacent("r", "t")).toBe(true); // same row
    expect(areAdjacent("e", "d")).toBe(true); // diagonal below
    expect(areAdjacent("e", "s")).toBe(true); // diagonal below
    expect(areAdjacent("a", "z")).toBe(true); // diagonal below
    expect(areAdjacent("a", "q")).toBe(true); // diagonal above
  });

  it("treats distant keys as not adjacent", () => {
    expect(areAdjacent("q", "p")).toBe(false); // opposite ends
    expect(areAdjacent("q", "e")).toBe(false); // two along the row
    expect(areAdjacent("e", "x")).toBe(false); // two rows apart
    expect(areAdjacent("a", "a")).toBe(false); // a key is not adjacent to itself
  });

  it("is case-insensitive and ignores non-letters", () => {
    expect(areAdjacent("R", "T")).toBe(true);
    expect(areAdjacent("1", "2")).toBe(false);
    expect(areAdjacent(",", ".")).toBe(false);
  });
});

describe("jam detector", () => {
  it("prints a lone keystroke", () => {
    const jam = createJam();
    expect(jam.offer("a", 0)).toBe("print");
  });

  it("jams the second of two adjacent keys struck within the window", () => {
    const jam = createJam();
    expect(jam.offer("r", 1000)).toBe("print");
    expect(jam.offer("t", 1000 + JAM_WINDOW_MS)).toBe("jam");
  });

  it("prints both when adjacent keys land outside the window", () => {
    const jam = createJam();
    expect(jam.offer("r", 1000)).toBe("print");
    expect(jam.offer("t", 1000 + JAM_WINDOW_MS + 1)).toBe("print");
  });

  it("prints both when near-simultaneous keys are not adjacent", () => {
    const jam = createJam();
    expect(jam.offer("a", 1000)).toBe("print");
    expect(jam.offer("p", 1010)).toBe("print");
  });

  it("locks input until JAM_CLEAR_MS after a jam, then unlocks", () => {
    const jam = createJam();
    jam.offer("r", 1000);
    jam.offer("t", 1010); // jam fires at t=1010
    expect(jam.isJammed(1010)).toBe(true);
    expect(jam.isJammed(1010 + JAM_CLEAR_MS - 1)).toBe(true);
    expect(jam.isJammed(1010 + JAM_CLEAR_MS)).toBe(false);
  });

  it("does not jam across a reset (a space between the two keys)", () => {
    const jam = createJam();
    jam.offer("r", 1000);
    jam.reset();
    expect(jam.offer("t", 1010)).toBe("print");
  });

  it("forgets the swallowed key after a jam clears", () => {
    const jam = createJam();
    jam.offer("r", 1000);
    jam.offer("t", 1010); // jam; the swallowed 't' must not linger
    expect(jam.offer("y", 1010 + JAM_CLEAR_MS)).toBe("print");
  });
});
