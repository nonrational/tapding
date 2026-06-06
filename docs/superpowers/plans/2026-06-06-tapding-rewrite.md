# tapding Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the tapding browser typewriter as a Vite + TypeScript app with an append-only document model, DOM-glyph rendering, true US-Letter pages, vector-PDF printing, and the no-delete conceit enforced.

**Architecture:** One-way data flow — `input` → `doc` (append-only model) → `render` (positioned DOM glyphs). `doc` is pure/deterministic (jitter seeded by cell + document seed and stored on each strike), so screen and print render identically. Support modules: `geometry` (page/jitter math), `fonts`, `audio`, `storage`, `ui`.

**Tech Stack:** Vite, TypeScript (strict), Vitest (+ jsdom for the renderer smoke test), vanilla DOM, browser-native `window.print()`.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `index.html` | Vite entry; mounts `#app`, loads `/src/main.ts`. |
| `package.json`, `tsconfig.json`, `vite.config.ts` | Tooling. |
| `src/geometry.ts` | Page constants, seeded PRNG, `computeJitter`. |
| `src/doc.ts` | Append-only `Doc` model + carriage + events. |
| `src/fonts.ts` | Curated font list (id/label/family/sizePx). |
| `src/render.ts` | `Renderer`: draws sheets, glyphs, cursor from a `Doc`. |
| `src/audio.ts` | Pooled sfx playback + mute. |
| `src/storage.ts` | Debounced localStorage save / load / clear. |
| `src/input.ts` | Keyboard → `Doc` ops; enforces no-delete. |
| `src/ui.ts` | Desk chrome, control cluster, fade-on-type. |
| `src/main.ts` | Bootstrap + wiring. |
| `styles/app.css` | Desk, sheet, glyph, cursor, controls. |
| `styles/print.css` | `@page` letter, page breaks, hide chrome. |
| `public/fonts/*.ttf` | Curated typewriter faces. |
| `public/sfx/*.mp3` | Curated sounds. |
| `tests/geometry.test.ts`, `tests/doc.test.ts`, `tests/render.test.ts`, `tests/storage.test.ts` | Unit tests. |

---

## Task 1: Scaffold project, clean repo, curate assets

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore` (append)
- Create dirs: `public/fonts/`, `public/sfx/`
- Delete: `js/`, `css/`, `.htaccess`, `serve`, `.ruby-version`, old `index.html`

- [ ] **Step 1: Append build artifacts to `.gitignore`**

Append these lines to the existing `.gitignore`:

```
node_modules/
dist/
*.local
```

- [ ] **Step 2: Write `package.json`**

```json
{
  "name": "tapding",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "jsdom": "^24.1.0",
    "typescript": "^5.4.5",
    "vite": "^5.2.11",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 3: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 4: Write `vite.config.ts`**

```ts
import { defineConfig } from "vite";

export default defineConfig({
  test: {
    environment: "node",
  },
});
```

- [ ] **Step 5: Replace `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>tapding</title>
    <link rel="stylesheet" href="/styles/app.css" />
    <link rel="stylesheet" href="/styles/print.css" media="print" />
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 6: Curate fonts and sounds into `public/`**

```bash
mkdir -p public/fonts public/sfx
cp fonts/MyUnderwood.ttf fonts/AnotherTypewriter.ttf fonts/Hermes.ttf fonts/TravelingTypewriter.ttf fonts/ErikaOrmig.ttf public/fonts/
cp sfx/noisy-typer/key-new-01.mp3 sfx/noisy-typer/key-new-02.mp3 sfx/noisy-typer/key-new-03.mp3 sfx/noisy-typer/key-new-04.mp3 sfx/noisy-typer/key-new-05.mp3 public/sfx/
cp sfx/noisy-typer/return.mp3 sfx/noisy-typer/space.mp3 sfx/noisy-typer/backspace.mp3 public/sfx/
```

- [ ] **Step 7: Remove the legacy implementation**

```bash
git rm -r js css .htaccess serve .ruby-version
rm -rf fonts sfx
```

(The original `fonts/` and `sfx/` are untracked-after-copy duplicates of what now lives in `public/`; only the curated copies are kept.)

- [ ] **Step 8: Install dependencies**

Run: `npm install`
Expected: `node_modules/` created, no errors.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "Scaffold Vite + TS project and remove legacy implementation"
```

---

## Task 2: Geometry — page constants, seeded PRNG, jitter

**Files:**
- Create: `src/geometry.ts`
- Test: `tests/geometry.test.ts`

- [ ] **Step 1: Write the failing tests**

`tests/geometry.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/geometry.test.ts`
Expected: FAIL — `Cannot find module '../src/geometry'`.

- [ ] **Step 3: Write `src/geometry.ts`**

```ts
// US Letter at a 10 cpi / 6 lpi typewriter grid, rendered at 96dpi.
// 8.5in x 11in => 816 x 1056 px. 816/85 = 9.6, 1056/66 = 16.
export const PAGE = {
  cols: 85,
  rows: 66,
  colWidth: 9.6,
  rowHeight: 16,
  bellCol: 78,
} as const;

export const SHEET_W = PAGE.cols * PAGE.colWidth;
export const SHEET_H = PAGE.rows * PAGE.rowHeight;

export interface Jitter {
  dx: number;
  dy: number;
  rot: number;
  ink: number;
}

// mulberry32
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(...nums: number[]): number {
  let h = 2166136261 >>> 0;
  for (const n of nums) {
    h ^= n >>> 0;
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

// Subtle "Level B" mechanical variation, stable per cell.
export function computeJitter(seed: number, page: number, row: number, col: number): Jitter {
  const r = seededRandom(hash(seed, page, row, col));
  return {
    dx: (r() - 0.5) * 1.6,
    dy: (r() - 0.5) * 2.2,
    rot: (r() - 0.5) * 2.4,
    ink: 0.78 + r() * 0.22,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/geometry.test.ts`
Expected: PASS (all describe blocks green).

- [ ] **Step 5: Commit**

```bash
git add src/geometry.ts tests/geometry.test.ts
git commit -m "Add page geometry, seeded PRNG, and per-cell jitter"
```

---

## Task 3: Document model (`Doc`)

**Files:**
- Create: `src/doc.ts`
- Test: `tests/doc.test.ts`

The model is append-only. `strike` records a glyph at the carriage and advances. `carriageBack` moves left **without removing** anything. `carriageReturn` wraps and paginates. The bell fires when the carriage reaches `bellCol`. Overstrike is automatic: striking a cell that already holds a glyph appends a second strike at the same coordinates.

- [ ] **Step 1: Write the failing tests**

`tests/doc.test.ts`:

```ts
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

  it("never moves past the left margin", () => {
    const d = newDoc();
    d.carriageBack();
    expect(d.carriage.col).toBe(0);
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

  it("locks at the last column instead of overflowing", () => {
    const d = newDoc();
    for (let i = 0; i < PAGE.cols + 10; i++) d.strike("x");
    expect(d.carriage.col).toBe(PAGE.cols - 1);
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/doc.test.ts`
Expected: FAIL — `Cannot find module '../src/doc'`.

- [ ] **Step 3: Write `src/doc.ts`**

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/doc.test.ts`
Expected: PASS (every describe block green).

- [ ] **Step 5: Commit**

```bash
git add src/doc.ts tests/doc.test.ts
git commit -m "Add append-only document model with carriage, pagination, and bell"
```

---

## Task 4: Fonts

**Files:**
- Create: `src/fonts.ts`
- Create: `styles/fonts.css`
- Modify: `index.html` (link `fonts.css`)

- [ ] **Step 1: Write `src/fonts.ts`**

```ts
export interface FontDef {
  id: string;
  label: string;
  family: string;
  sizePx: number;
}

export const FONTS: FontDef[] = [
  { id: "courier", label: "Courier", family: "'Courier New', Courier, monospace", sizePx: 14 },
  { id: "underwood", label: "My Underwood", family: "'My Underwood'", sizePx: 16 },
  { id: "atype", label: "Another Typewriter", family: "'Another Typewriter'", sizePx: 15 },
  { id: "hermes", label: "Hermes", family: "'Hermes'", sizePx: 15 },
  { id: "travel", label: "Traveling Typewriter", family: "'Traveling Typewriter'", sizePx: 15 },
  { id: "erika", label: "Erika Ormig", family: "'Erika Ormig'", sizePx: 15 },
];

export const DEFAULT_FONT = "courier";

export function fontById(id: string): FontDef {
  return FONTS.find((f) => f.id === id) ?? FONTS[0];
}
```

- [ ] **Step 2: Write `styles/fonts.css`**

```css
@font-face { font-family: 'My Underwood'; src: url('/fonts/MyUnderwood.ttf'); font-display: swap; }
@font-face { font-family: 'Another Typewriter'; src: url('/fonts/AnotherTypewriter.ttf'); font-display: swap; }
@font-face { font-family: 'Hermes'; src: url('/fonts/Hermes.ttf'); font-display: swap; }
@font-face { font-family: 'Traveling Typewriter'; src: url('/fonts/TravelingTypewriter.ttf'); font-display: swap; }
@font-face { font-family: 'Erika Ormig'; src: url('/fonts/ErikaOrmig.ttf'); font-display: swap; }
```

- [ ] **Step 3: Link `fonts.css` in `index.html`**

Add inside `<head>`, before `app.css`:

```html
    <link rel="stylesheet" href="/styles/fonts.css" />
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: PASS (no errors).

- [ ] **Step 5: Commit**

```bash
git add src/fonts.ts styles/fonts.css index.html
git commit -m "Add curated font definitions and @font-face declarations"
```

---

## Task 5: Renderer

**Files:**
- Create: `src/render.ts`
- Test: `tests/render.test.ts`

The renderer owns the DOM under `#feed`. It builds one `.sheet` per page, appends one `.glyph` per strike (absolutely positioned on the grid, with stored jitter as inline transform/opacity), and keeps a `.cursor` element at the carriage. It listens to `Doc` events for incremental updates and exposes `renderAll()` for full rebuilds (font change / restore).

- [ ] **Step 1: Write the failing smoke test**

`tests/render.test.ts`:

```ts
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
    expect(second.style.left).toBe(`${1 * PAGE.colWidth}px`);
  });

  it("adds a second sheet after pagination", () => {
    const d = new Doc(1, "courier");
    new Renderer(root).attach(d);
    for (let i = 0; i < PAGE.rows; i++) d.carriageReturn();
    expect(root.querySelectorAll(".sheet")).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/render.test.ts`
Expected: FAIL — `Cannot find module '../src/render'`.

- [ ] **Step 3: Write `src/render.ts`**

```ts
import type { Doc, Strike } from "./doc";
import { PAGE, SHEET_W, SHEET_H } from "./geometry";
import { fontById } from "./fonts";

export class Renderer {
  private root: HTMLElement;
  private cursor: HTMLElement;
  private sheets: HTMLElement[] = [];
  private doc!: Doc;

  constructor(root: HTMLElement) {
    this.root = root;
    this.cursor = document.createElement("div");
    this.cursor.className = "cursor";
  }

  attach(doc: Doc): void {
    this.doc = doc;
    this.renderAll();
    doc.on((e) => {
      if (e === "strike") this.appendStrike(this.doc.strikes[this.doc.strikes.length - 1]);
      else if (e === "newpage") this.ensureSheets();
      this.positionCursor();
    });
  }

  renderAll(): void {
    this.root.innerHTML = "";
    this.sheets = [];
    const font = fontById(this.doc.font);
    this.root.style.setProperty("--type-family", font.family);
    this.root.style.setProperty("--type-size", `${font.sizePx}px`);
    this.ensureSheets();
    for (const s of this.doc.strikes) this.appendStrike(s);
    this.positionCursor();
  }

  private ensureSheets(): void {
    const want = Math.max(this.doc.pageCount(), this.sheets.length);
    while (this.sheets.length < want) this.addSheet();
  }

  private addSheet(): void {
    const sheet = document.createElement("div");
    sheet.className = "sheet";
    sheet.style.width = `${SHEET_W}px`;
    sheet.style.height = `${SHEET_H}px`;
    this.root.appendChild(sheet);
    this.sheets.push(sheet);
  }

  private appendStrike(s: Strike): void {
    while (this.sheets.length <= s.page) this.addSheet();
    const el = document.createElement("span");
    el.className = "glyph";
    el.textContent = s.char;
    el.style.left = `${s.col * PAGE.colWidth}px`;
    el.style.top = `${s.row * PAGE.rowHeight}px`;
    el.style.opacity = String(s.jitter.ink);
    el.style.transform = `translate(${s.jitter.dx}px, ${s.jitter.dy}px) rotate(${s.jitter.rot}deg)`;
    this.sheets[s.page].appendChild(el);
  }

  private positionCursor(): void {
    const c = this.doc.carriage;
    while (this.sheets.length <= c.page) this.addSheet();
    this.sheets[c.page].appendChild(this.cursor);
    this.cursor.style.left = `${c.col * PAGE.colWidth}px`;
    this.cursor.style.top = `${c.row * PAGE.rowHeight}px`;
    this.cursor.style.width = `${PAGE.colWidth}px`;
    this.cursor.style.height = `${PAGE.rowHeight}px`;
    this.cursor.scrollIntoView({ block: "nearest" });
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/render.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/render.ts tests/render.test.ts
git commit -m "Add DOM glyph renderer with per-page sheets and cursor"
```

---

## Task 6: Storage

**Files:**
- Create: `src/storage.ts`
- Test: `tests/storage.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/storage.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { Doc } from "../src/doc";
import { saveDoc, loadDoc, clearDoc } from "../src/storage";

describe("storage", () => {
  beforeEach(() => localStorage.clear());

  it("returns null when nothing is stored", () => {
    expect(loadDoc()).toBeNull();
  });

  it("saves and restores a document state", () => {
    const d = new Doc(7, "underwood");
    d.strike("h");
    d.strike("i");
    saveDoc(d, 0); // 0 = no debounce delay
    const restored = loadDoc();
    expect(restored).not.toBeNull();
    expect(restored!.seed).toBe(7);
    expect(restored!.font).toBe("underwood");
    expect(restored!.strikes).toHaveLength(2);
  });

  it("clears stored state", () => {
    const d = new Doc(7, "courier");
    saveDoc(d, 0);
    clearDoc();
    expect(loadDoc()).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/storage.test.ts`
Expected: FAIL — `Cannot find module '../src/storage'`.

- [ ] **Step 3: Write `src/storage.ts`**

```ts
import type { Doc, DocState } from "./doc";

const KEY = "tapding:doc";
let timer: ReturnType<typeof setTimeout> | undefined;

export function saveDoc(doc: Doc, delay = 400): void {
  if (timer) clearTimeout(timer);
  const write = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(doc.toState()));
    } catch {
      // quota or unavailable — autosave silently disabled
    }
  };
  if (delay <= 0) write();
  else timer = setTimeout(write, delay);
}

export function loadDoc(): DocState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DocState;
  } catch {
    return null;
  }
}

export function clearDoc(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/storage.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/storage.ts tests/storage.test.ts
git commit -m "Add debounced localStorage persistence"
```

---

## Task 7: Audio

**Files:**
- Create: `src/audio.ts`

No automated test (browser audio); verified manually in Task 11.

- [ ] **Step 1: Write `src/audio.ts`**

```ts
const KEY_SOUNDS = [
  "/sfx/key-new-01.mp3",
  "/sfx/key-new-02.mp3",
  "/sfx/key-new-03.mp3",
  "/sfx/key-new-04.mp3",
  "/sfx/key-new-05.mp3",
];

export class Audio_ {
  private keys: HTMLAudioElement[][] = [];
  private bellEl: HTMLAudioElement;
  private returnEl: HTMLAudioElement;
  private spaceEl: HTMLAudioElement;
  private backEl: HTMLAudioElement;
  private poolIdx = 0;
  muted = false;

  constructor() {
    const make = (src: string) => {
      const a = new Audio(src);
      a.preload = "auto";
      return a;
    };
    this.keys = KEY_SOUNDS.map((src) => [make(src), make(src), make(src)]);
    this.bellEl = make("/sfx/return.mp3");
    this.returnEl = make("/sfx/return.mp3");
    this.spaceEl = make("/sfx/space.mp3");
    this.backEl = make("/sfx/backspace.mp3");
  }

  private play(el: HTMLAudioElement): void {
    if (this.muted) return;
    el.currentTime = 0;
    void el.play().catch(() => {});
  }

  key(): void {
    if (this.muted) return;
    const set = this.keys[Math.floor(Math.random() * this.keys.length)];
    const el = set[this.poolIdx % set.length];
    this.poolIdx++;
    this.play(el);
  }

  space(): void {
    this.play(this.spaceEl);
  }

  back(): void {
    this.play(this.backEl);
  }

  ret(): void {
    this.play(this.returnEl);
  }

  bell(): void {
    this.play(this.bellEl);
  }

  setMuted(m: boolean): void {
    this.muted = m;
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/audio.ts
git commit -m "Add pooled sound effects with mute"
```

---

## Task 8: Input controller

**Files:**
- Create: `src/input.ts`

Enforces the conceit: Backspace moves the carriage only; Delete is ignored. Printable single characters strike; Enter returns; Tab tabs; Space advances.

- [ ] **Step 1: Write `src/input.ts`**

```ts
import type { Doc } from "./doc";
import type { Audio_ } from "./audio";

export interface InputDeps {
  doc: Doc;
  audio: Audio_;
  onActivity: () => void;
}

export function attachInput(deps: InputDeps): () => void {
  const { doc, audio, onActivity } = deps;

  const handler = (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return; // let browser shortcuts through

    if (e.key === "Backspace") {
      e.preventDefault();
      doc.carriageBack();
      audio.back();
      onActivity();
      return;
    }
    if (e.key === "Delete") {
      e.preventDefault(); // no deletion, ever
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      doc.carriageReturn();
      audio.ret();
      onActivity();
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      doc.tab();
      audio.key();
      onActivity();
      return;
    }
    if (e.key === " ") {
      e.preventDefault();
      doc.space();
      audio.space();
      onActivity();
      return;
    }
    if (e.key.length === 1) {
      e.preventDefault();
      doc.strike(e.key);
      audio.key();
      onActivity();
    }
  };

  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/input.ts
git commit -m "Add keyboard input controller enforcing the no-delete conceit"
```

---

## Task 9: UI chrome

**Files:**
- Create: `src/ui.ts`

Builds the desk, the `#feed` sheet container, and the fading control cluster (font picker, mute, clear, print). Returns handles `main.ts` wires up.

- [ ] **Step 1: Write `src/ui.ts`**

```ts
import { FONTS } from "./fonts";

export interface UI {
  feed: HTMLElement;
  fontSelect: HTMLSelectElement;
  muteBtn: HTMLButtonElement;
  clearBtn: HTMLButtonElement;
  printBtn: HTMLButtonElement;
  flashActivity: () => void;
}

export function buildUI(mount: HTMLElement): UI {
  mount.innerHTML = "";
  mount.className = "desk";

  const feed = document.createElement("div");
  feed.id = "feed";

  const controls = document.createElement("div");
  controls.className = "controls";

  const fontSelect = document.createElement("select");
  fontSelect.className = "font-select";
  for (const f of FONTS) {
    const opt = document.createElement("option");
    opt.value = f.id;
    opt.textContent = f.label;
    fontSelect.appendChild(opt);
  }

  const muteBtn = button("mute", "sound");
  const clearBtn = button("clear", "clear");
  const printBtn = button("print", "print");

  controls.append(fontSelect, muteBtn, clearBtn, printBtn);
  mount.append(feed, controls);

  let idle: ReturnType<typeof setTimeout> | undefined;
  const flashActivity = () => {
    mount.classList.add("typing");
    if (idle) clearTimeout(idle);
    idle = setTimeout(() => mount.classList.remove("typing"), 1500);
  };

  return { feed, fontSelect, muteBtn, clearBtn, printBtn, flashActivity };
}

function button(cls: string, label: string): HTMLButtonElement {
  const b = document.createElement("button");
  b.className = `ctl ctl-${cls}`;
  b.type = "button";
  b.textContent = label;
  return b;
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/ui.ts
git commit -m "Add desk chrome and fading control cluster"
```

---

## Task 10: Styles

**Files:**
- Create: `styles/app.css`
- Create: `styles/print.css`

- [ ] **Step 1: Write `styles/app.css`**

```css
:root {
  --paper: #f4f0e3;
  --ink: #1a1714;
  --desk-1: #efe9dc;
  --desk-2: #ddd5c4;
}

* { box-sizing: border-box; }

html, body {
  margin: 0;
  height: 100%;
}

body {
  background: radial-gradient(circle at 50% 0%, var(--desk-1), var(--desk-2));
  font-family: 'Courier New', monospace;
  color: var(--ink);
}

.desk {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 0 120px;
}

#feed {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 28px;
}

.sheet {
  position: relative;
  background: var(--paper);
  background-image: radial-gradient(rgba(120, 110, 90, 0.05) 1px, transparent 1px);
  background-size: 3px 3px;
  box-shadow: inset 0 0 40px rgba(120, 110, 80, 0.12), 0 6px 24px rgba(0, 0, 0, 0.18);
  border-radius: 2px;
  padding: 0;
}

.glyph {
  position: absolute;
  display: inline-block;
  font-family: var(--type-family, 'Courier New', monospace);
  font-size: var(--type-size, 14px);
  line-height: 1;
  color: var(--ink);
  white-space: pre;
  pointer-events: none;
}

.cursor {
  position: absolute;
  border-bottom: 1.5px solid var(--ink);
  animation: blink 1s steps(2, start) infinite;
  pointer-events: none;
}

@keyframes blink { 50% { opacity: 0; } }

.controls {
  position: fixed;
  bottom: 22px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 14px;
  align-items: center;
  padding: 8px 14px;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 999px;
  backdrop-filter: blur(6px);
  transition: opacity 0.4s;
}

.desk.typing .controls { opacity: 0.15; }
.controls:hover { opacity: 1 !important; }

.ctl, .font-select {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  background: transparent;
  border: none;
  color: var(--ink);
  cursor: pointer;
  padding: 4px 6px;
}

.ctl:hover { text-decoration: underline; }
```

- [ ] **Step 2: Write `styles/print.css`**

```css
@page {
  size: letter;
  margin: 0;
}

@media print {
  body {
    background: #fff;
  }

  .controls,
  .cursor {
    display: none !important;
  }

  .desk {
    padding: 0;
    display: block;
  }

  #feed {
    display: block;
    gap: 0;
  }

  .sheet {
    background: #fff;
    background-image: none;
    box-shadow: none;
    border-radius: 0;
    page-break-after: always;
    break-after: page;
  }

  .glyph {
    color: #000;
    opacity: 1 !important;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add styles/app.css styles/print.css
git commit -m "Add screen and print styles"
```

---

## Task 11: Bootstrap, wire-up, and manual verification

**Files:**
- Create: `src/main.ts`

- [ ] **Step 1: Write `src/main.ts`**

```ts
import { Doc } from "./doc";
import { Renderer } from "./render";
import { Audio_ } from "./audio";
import { attachInput } from "./input";
import { buildUI } from "./ui";
import { DEFAULT_FONT } from "./fonts";
import { saveDoc, loadDoc, clearDoc } from "./storage";

function newSeed(): number {
  return Math.floor(Math.random() * 0x7fffffff);
}

function makeDoc(): Doc {
  const saved = loadDoc();
  return saved ? Doc.fromState(saved) : new Doc(newSeed(), DEFAULT_FONT);
}

function boot(): void {
  const mount = document.getElementById("app")!;
  const ui = buildUI(mount);
  const audio = new Audio_();
  const renderer = new Renderer(ui.feed);

  let doc = makeDoc();
  ui.fontSelect.value = doc.font;
  renderer.attach(doc);

  const wireDoc = (d: Doc) => {
    d.on((e) => {
      if (e === "bell") audio.bell();
      saveDoc(d);
    });
  };
  wireDoc(doc);

  attachInput({ doc, audio, onActivity: ui.flashActivity });

  ui.fontSelect.addEventListener("change", () => {
    doc.font = ui.fontSelect.value;
    renderer.renderAll();
    saveDoc(doc, 0);
  });

  ui.muteBtn.addEventListener("click", () => {
    audio.setMuted(!audio.muted);
    ui.muteBtn.textContent = audio.muted ? "muted" : "sound";
  });

  ui.clearBtn.addEventListener("click", () => {
    clearDoc();
    doc = new Doc(newSeed(), doc.font);
    wireDoc(doc);
    renderer.attach(doc);
    attachInput({ doc, audio, onActivity: ui.flashActivity });
  });

  ui.printBtn.addEventListener("click", () => window.print());
}

boot();
```

> **Note on `clear`:** re-calling `attachInput` adds a second listener bound to the new `doc`; the stale listener still targets the old `doc`, which is no longer rendered, so its key events are harmless but wasteful. If this matters, capture the detach function returned by `attachInput` and call it before re-attaching. Left simple here intentionally.

- [ ] **Step 2: Fix the clear-handler listener leak**

Replace the `boot` body's input handling so the old listener is detached on clear:

```ts
  let detach = attachInput({ doc, audio, onActivity: ui.flashActivity });

  ui.clearBtn.addEventListener("click", () => {
    clearDoc();
    detach();
    doc = new Doc(newSeed(), doc.font);
    wireDoc(doc);
    renderer.attach(doc);
    detach = attachInput({ doc, audio, onActivity: ui.flashActivity });
  });
```

(Remove the earlier standalone `attachInput(...)` call and the old `clearBtn` handler so only this version remains.)

- [ ] **Step 3: Typecheck and run all tests**

Run: `npm run typecheck && npm test`
Expected: typecheck clean; all test files PASS.

- [ ] **Step 4: Manual verification in the browser**

Run: `npm run dev`, open the printed localhost URL, then verify:
- Typing places glyphs left-to-right with subtle per-letter jitter; key sounds play.
- **Backspace moves the cursor left but does NOT erase**; typing over a glyph overstrikes (both visible).
- Enter returns the carriage; the bell rings a few columns before the right edge; the carriage locks at the right edge.
- Filling a page rolls in a second sheet.
- Font picker swaps the face and re-renders existing text in place.
- Mute toggles sound; clear rolls in a blank sheet; a refresh restores your text (autosave).
- **Cmd-P** shows one US-Letter page per sheet, no chrome, black ink on white — "Save as PDF" produces a clean printable file.

- [ ] **Step 5: Commit**

```bash
git add src/main.ts
git commit -m "Wire up bootstrap, controls, autosave, and printing"
```

---

## Self-Review Notes

- **Spec coverage:** conceit/no-delete (Task 3 `carriageBack`, Task 8), overstrike (Task 3), model/renderer split (Tasks 3/5), Vite+TS (Task 1), Direction A chrome (Tasks 9/10), true US-Letter pages + bell + pagination (Tasks 2/3), `window.print()` vector PDF clean-white default (Tasks 10/11), realism Level B jitter + custom fonts (Tasks 2/4/5), sound+mute (Tasks 7/11), autosave/restore (Tasks 6/11), font picker (Tasks 4/9/11), repo cleanup (Task 1), Vitest TDD on the model + renderer smoke test (Tasks 2/3/5/6). Mobile and the skeuomorphic skin are intentionally absent (deferred in spec).
- **Type consistency:** `Doc`, `Strike`, `Carriage`, `DocState`, `DocEvent`, `Jitter{dx,dy,rot,ink}`, `PAGE`, `computeJitter`, `fontById`, `FONTS`, `Audio_`, `attachInput`, `buildUI` names are used consistently across tasks.
- **Print appearance:** clean white / black ink default is implemented purely in `print.css` (Task 10), matching the spec default.
