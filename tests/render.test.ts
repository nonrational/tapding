// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { Doc } from "../src/doc";
import { Renderer } from "../src/render";
import { PAGE } from "../src/geometry";

describe("Renderer", () => {
  let root: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '<div id="feed"></div>';
    root = document.getElementById("feed")!;
  });

  it("renders one sheet for a fresh document", () => {
    const d = new Doc(1, "courier");
    new Renderer(root).attach(d);
    expect(root.querySelectorAll(".sheet")).toHaveLength(1);
  });

  it("appends one glyph element per strike", () => {
    const d = new Doc(1, "courier");
    new Renderer(root).attach(d);
    d.strike("a");
    d.strike("b");
    expect(root.querySelectorAll(".glyph")).toHaveLength(2);
  });

  it("positions a glyph on the grid", () => {
    const d = new Doc(1, "courier");
    new Renderer(root).attach(d);
    d.strike("a"); // at col 0
    d.strike("b"); // at col 1
    const second = root.querySelectorAll<HTMLElement>(".glyph")[1];
    expect(second.style.left).toBe(`${PAGE.marginX + 1 * PAGE.colWidth}px`);
  });

  it("marks red-ribbon strikes with the ink-red class, black ones without", () => {
    const d = new Doc(1, "courier");
    new Renderer(root).attach(d);
    d.strike("a"); // black
    d.toggleRibbon();
    d.strike("b"); // red
    const glyphs = root.querySelectorAll<HTMLElement>(".glyph");
    expect(glyphs[0].classList.contains("ink-red")).toBe(false);
    expect(glyphs[1].classList.contains("ink-red")).toBe(true);
  });

  it("adds a second sheet after pagination", () => {
    const d = new Doc(1, "courier");
    new Renderer(root).attach(d);
    for (let i = 0; i < PAGE.rows; i++) d.carriageReturn();
    expect(root.querySelectorAll(".sheet")).toHaveLength(2);
  });

  it("exposes a per-page skew variable and separate paper/text layers", () => {
    const d = new Doc(1, "courier");
    new Renderer(root).attach(d);
    const sheet = root.querySelector<HTMLElement>(".sheet")!;
    // The angle lives in a CSS variable; the stylesheet rotates the paper on screen
    // and the type in print. No inline rotation is set in JS.
    expect(sheet.style.getPropertyValue("--skew")).toMatch(/^-?\d.*deg$/);
    expect(sheet.querySelector(".paper")).not.toBeNull();
    expect(sheet.querySelector(".platen")).not.toBeNull();
  });

  it("puts glyphs in the text layer, not directly on the paper", () => {
    const d = new Doc(1, "courier");
    new Renderer(root).attach(d);
    d.strike("a");
    expect(root.querySelector(".platen .glyph")).not.toBeNull();
    expect(root.querySelector(".paper .glyph")).toBeNull();
  });
});

describe("Renderer white-out", () => {
  let root: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '<div id="feed"></div>';
    root = document.getElementById("feed")!;
  });

  it("draws a white patch on a whiteout event", () => {
    const d = new Doc(1, "courier", () => 0);
    new Renderer(root).attach(d);
    d.applyWhiteout(0, 0, 0);
    expect(root.querySelectorAll(".whiteout")).toHaveLength(1);
  });

  it("covers a glyph struck before the patch (live)", () => {
    const d = new Doc(1, "courier", () => 0);
    new Renderer(root).attach(d);
    d.strike("x");        // glyph in cell 0,0,0
    d.carriageBack();     // back onto that cell
    d.applyWhiteout(0, 0, 0);
    const glyph = root.querySelector<HTMLElement>('.glyph[data-cell="0,0,0"]')!;
    expect(glyph.classList.contains("covered")).toBe(true);
  });

  it("marks a strike on a wet cell with the smudge class", () => {
    // appliedAt === 0 is treated as dry by the model, so freeze the clock at a
    // nonzero instant: the patch is applied wet and the strike lands within DRY_MS.
    const d = new Doc(1, "courier", () => 1);
    new Renderer(root).attach(d);
    d.applyWhiteout(0, 0, 0); // wet at t=1
    d.strike("x");            // struck wet
    expect(root.querySelector(".glyph.smudge")).not.toBeNull();
  });

  it("rebuilds covered state from saved whiteout on renderAll", () => {
    const d = new Doc(1, "courier", () => 0);
    d.strike("x");            // index 0, cell 0,0,0
    d.applyWhiteout(0, 0, 0); // coversBefore 1 -> hides index 0
    new Renderer(root).attach(d); // attach => renderAll from state
    const glyph = root.querySelector<HTMLElement>('.glyph[data-cell="0,0,0"]')!;
    expect(glyph.classList.contains("covered")).toBe(true);
    expect(root.querySelectorAll(".whiteout")).toHaveLength(1);
  });

  it("keeps a strike landing after the patch visible", () => {
    const d = new Doc(1, "courier", () => 0);
    new Renderer(root).attach(d);
    d.applyWhiteout(0, 0, 0); // coversBefore 0 (no strikes yet)
    d.strike("x");            // index 0 in cell 0,0,0 — lands after the patch
    const glyph = root.querySelector<HTMLElement>('.glyph[data-cell="0,0,0"]')!;
    expect(glyph.classList.contains("covered")).toBe(false);
  });
});
