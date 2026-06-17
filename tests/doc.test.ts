import { describe, it, expect } from "vitest";
import { Doc } from "../src/doc";
import { PAGE, DRY_MS_BASE, DRY_MS_MAX } from "../src/geometry";

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

describe("ribbon", () => {
  it("defaults strikes to black ink", () => {
    const d = newDoc();
    d.strike("a");
    expect(d.strikes[0].ribbon).toBe("black");
    expect(d.ribbon).toBe("black");
  });

  it("toggleRibbon flips color, returns it, and emits a ribbon event", () => {
    const d = newDoc();
    const events: string[] = [];
    d.on((e) => events.push(e));
    expect(d.toggleRibbon()).toBe("red");
    d.strike("a");
    expect(d.strikes[0].ribbon).toBe("red");
    expect(d.toggleRibbon()).toBe("black");
    d.strike("b");
    expect(d.strikes[1].ribbon).toBe("black");
    expect(events).toContain("ribbon");
  });

  it("round-trips ribbon through toState/fromState", () => {
    const d = newDoc();
    d.toggleRibbon();
    d.strike("a");
    const restored = Doc.fromState(d.toState());
    expect(restored.ribbon).toBe("red");
    expect(restored.strikes[0].ribbon).toBe("red");
  });

  it("defaults missing ribbon fields to black on fromState (back-compat)", () => {
    const d = newDoc();
    d.strike("a");
    const state = d.toState() as any;
    delete state.ribbon;
    delete state.strikes[0].ribbon;
    const restored = Doc.fromState(state);
    expect(restored.ribbon).toBe("black");
    expect(restored.strikes[0].ribbon).toBe("black");
  });
});

describe("white-out", () => {
  it("records appliedAt from the injected clock and coversBefore = strikes.length", () => {
    let t = 1000;
    const d = new Doc(123, "courier", () => t);
    d.strike("a"); // index 0
    d.applyWhiteout(0, 0, 0);
    expect(d.whiteout).toHaveLength(1);
    expect(d.whiteout[0]).toMatchObject({
      page: 0, row: 0, col: 0, appliedAt: 1000, coversBefore: 1,
    });
  });

  it("wetness decays linearly from 1 to 0 over a lone dab's dry time", () => {
    let t = 1;
    const d = new Doc(123, "courier", () => t);
    d.applyWhiteout(0, 0, 0); // lone dab -> dries in DRY_MS_BASE
    expect(d.wetnessAt(0, 0, 0)).toBeCloseTo(1, 5);
    t = 1 + DRY_MS_BASE / 2;
    expect(d.wetnessAt(0, 0, 0)).toBeCloseTo(0.5, 5);
    t = 1 + DRY_MS_BASE;
    expect(d.wetnessAt(0, 0, 0)).toBe(0);
    t = 1 + DRY_MS_BASE + 5000; // clamped, never negative
    expect(d.wetnessAt(0, 0, 0)).toBe(0);
  });

  it("reports an unwhited cell as dry (wetness 0)", () => {
    const d = new Doc(123, "courier", () => 1);
    expect(d.wetnessAt(0, 0, 0)).toBe(0);
  });

  it("keeps dense white-out wet long after a lone dab has dried", () => {
    let t = 1;
    const lone = new Doc(1, "courier", () => t);
    lone.applyWhiteout(0, 0, 0);
    const block = new Doc(1, "courier", () => t);
    for (let r = 4; r <= 6; r++) for (let c = 4; c <= 6; c++) block.applyWhiteout(0, r, c);
    t = 1 + DRY_MS_BASE; // a lone dab is fully dry by now
    expect(lone.wetnessAt(0, 0, 0)).toBe(0);
    expect(block.wetnessAt(0, 5, 5)).toBeGreaterThan(0); // crowded center still wet
  });

  it("sets a strike's smudge to the cell's wetness at strike time", () => {
    let t = 1;
    const d = new Doc(1, "courier", () => t);
    d.applyWhiteout(0, 0, 0);
    t = 1 + DRY_MS_BASE / 4; // 75% wet
    d.strike("x");
    expect(d.strikes[0].smudge).toBeCloseTo(0.75, 5);
  });

  it("smudges a later strike less than an earlier one (the sooner, the blurrier)", () => {
    let t = 1;
    const d = new Doc(1, "courier", () => t);
    d.applyWhiteout(0, 0, 0);
    t = 1 + 200;
    d.strike("a");      // strikes[0] — typed early, very wet
    d.carriageBack();   // back onto the same cell
    t = 1 + DRY_MS_BASE - 200;
    d.strike("b");      // strikes[1] — typed late, nearly dry
    expect(d.strikes[0].smudge).toBeGreaterThan(d.strikes[1].smudge);
    expect(d.strikes[1].smudge).toBeGreaterThanOrEqual(0);
  });

  it("leaves a strike on a fully dried cell clean", () => {
    let t = 1;
    const d = new Doc(123, "courier", () => t);
    d.applyWhiteout(0, 0, 0);
    t = 1 + DRY_MS_BASE; // dry
    d.strike("x");
    expect(d.strikes[0].smudge).toBe(0);
  });

  it("leaves a strike on an unwhited cell clean", () => {
    const d = new Doc(123, "courier", () => 1);
    d.strike("a");
    expect(d.strikes[0].smudge).toBe(0);
  });

  it("lets the most recent whiteout govern wetness", () => {
    let t = 1;
    const d = new Doc(123, "courier", () => t);
    d.applyWhiteout(0, 0, 0);    // appliedAt 1
    t = 1 + DRY_MS_MAX + 100;    // first patch dry under any density
    d.applyWhiteout(0, 0, 0);    // fresh patch on the same cell
    expect(d.wetnessAt(0, 0, 0)).toBeCloseTo(1, 5);
  });

  it("emits a whiteout event", () => {
    const d = new Doc(123, "courier", () => 0);
    const seen: string[] = [];
    d.on((e) => seen.push(e));
    d.applyWhiteout(0, 0, 0);
    expect(seen).toContain("whiteout");
  });
});

describe("white-out persistence", () => {
  it("round-trips whiteout and the smudge intensity", () => {
    let t = 1;
    const d = new Doc(123, "courier", () => t);
    d.applyWhiteout(0, 0, 0);
    t = 1 + DRY_MS_BASE / 2; // strike at 50% wet
    d.strike("x");
    const restored = Doc.fromState(d.toState());
    expect(restored.whiteout).toHaveLength(1);
    expect(restored.whiteout[0]).toMatchObject({ page: 0, row: 0, col: 0, coversBefore: 0 });
    expect(restored.strikes[0].smudge).toBeCloseTo(0.5, 5);
  });

  it("treats restored whiteout as dry regardless of elapsed time", () => {
    const d = new Doc(123, "courier", () => 1);
    d.applyWhiteout(0, 0, 0);
    const restored = Doc.fromState(d.toState());
    restored.now = () => 2; // barely any time passed since reset
    expect(restored.whiteout[0].appliedAt).toBe(0);
    expect(restored.wetnessAt(0, 0, 0)).toBe(0);
  });

  it("defaults missing whiteout and smudge on fromState (back-compat)", () => {
    const d = new Doc(123, "courier");
    d.strike("a");
    const state = d.toState() as any;
    delete state.whiteout;
    delete state.strikes[0].smudge;
    const restored = Doc.fromState(state);
    expect(restored.whiteout).toEqual([]);
    expect(restored.strikes[0].smudge).toBe(0);
  });

  it("maps a legacy boolean smudged flag to full intensity", () => {
    const d = new Doc(123, "courier");
    d.strike("a");
    const state = d.toState() as any;
    delete state.strikes[0].smudge;
    state.strikes[0].smudged = true; // pre-gradient save format
    const restored = Doc.fromState(state);
    expect(restored.strikes[0].smudge).toBe(1);
  });
});
