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

  it("rotates each sheet by a fixed skew angle", () => {
    const d = new Doc(1, "courier");
    new Renderer(root).attach(d);
    const sheet = root.querySelector<HTMLElement>(".sheet")!;
    expect(sheet.style.transform).toMatch(/^rotate\(-?\d/);
  });
});
