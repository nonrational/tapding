# Red Ribbon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a two-color ribbon (black/red) toggled by `Escape` or an on-screen button, with each strike's ink color recorded, rendered, persisted, and printed.

**Architecture:** Extend the existing one-way flow `input → doc → render`. `Doc` holds the current ribbon color and stamps it onto each strike; a new `"ribbon"` event lets the UI indicator react. Render colors red glyphs via a CSS class so the print stylesheet can keep them red by specificity.

**Tech Stack:** Vite, TypeScript (strict), Vitest, vanilla DOM, CSS.

---

## File Structure

| File | Change |
| --- | --- |
| `src/doc.ts` | `Ribbon` type; `Strike.ribbon`; `Doc.ribbon`; `toggleRibbon()`; `"ribbon"` event; state round-trip + back-compat defaults. |
| `src/render.ts` | Add `ink-red` class to red glyphs. |
| `src/input.ts` | `Escape` → `doc.toggleRibbon()`. |
| `src/ui.ts` | Add `inkBtn` indicator/toggle to the control cluster. |
| `src/main.ts` | Wire button click + `"ribbon"` event → indicator update + autosave. |
| `styles/app.css` | `--ink-red`, `.glyph.ink-red`, indicator swatch styling. |
| `styles/print.css` | `.glyph.ink-red` keeps red in print. |
| `tests/doc.test.ts` | Tests for ribbon behavior + persistence. |

---

## Task 1: Model the ribbon in `doc.ts` (TDD)

**Files:**
- Modify: `src/doc.ts`
- Test: `tests/doc.test.ts`

- [ ] **Step 1: Write failing tests**

Append to `tests/doc.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npm test -- doc`
Expected: FAIL (`ribbon` does not exist on `Strike`/`Doc`, `toggleRibbon` undefined).

- [ ] **Step 3: Implement in `src/doc.ts`**

Add the type and field to `Strike`:

```typescript
export type Ribbon = "black" | "red";

export interface Strike {
  char: string;
  page: number;
  row: number;
  col: number;
  jitter: Jitter;
  ribbon: Ribbon;
}
```

Add `ribbon` to `DocState`:

```typescript
export interface DocState {
  seed: number;
  font: string;
  ribbon: Ribbon;
  strikes: Strike[];
  carriage: Carriage;
}
```

Add `"ribbon"` to the event union:

```typescript
export type DocEvent = "strike" | "move" | "bell" | "return" | "newpage" | "ribbon";
```

In the `Doc` class, add the field (next to `font`):

```typescript
  ribbon: Ribbon = "black";
```

Stamp it in `strike()` — change the push to include `ribbon`:

```typescript
    this.strikes.push({ char, page, row, col, jitter, ribbon: this.ribbon });
```

Add the toggle method (e.g. after `space()`):

```typescript
  toggleRibbon(): Ribbon {
    this.ribbon = this.ribbon === "black" ? "red" : "black";
    this.emit("ribbon");
    return this.ribbon;
  }
```

Persist it in `toState()`:

```typescript
  toState(): DocState {
    return {
      seed: this.seed,
      font: this.font,
      ribbon: this.ribbon,
      strikes: [...this.strikes],
      carriage: this.carriage,
    };
  }
```

Restore with back-compat defaults in `fromState()`:

```typescript
  static fromState(s: DocState): Doc {
    const d = new Doc(s.seed, s.font);
    d.ribbon = s.ribbon ?? "black";
    d.strikes = s.strikes.map((st) => ({ ...st, ribbon: st.ribbon ?? "black" }));
    d.carriage = { ...s.carriage };
    return d;
  }
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npm test -- doc`
Expected: PASS (all ribbon tests plus existing ones).

- [ ] **Step 5: Commit**

```bash
git add src/doc.ts tests/doc.test.ts
git commit -m "Model red/black ribbon on the document"
```

---

## Task 2: Render red glyphs in `render.ts`

**Files:**
- Modify: `src/render.ts`

- [ ] **Step 1: Add the class in `appendStrike`**

After the line that sets `el.className = "glyph";`, add:

```typescript
    if (s.ribbon === "red") el.classList.add("ink-red");
```

- [ ] **Step 2: Verify build/types**

Run: `npm run build`
Expected: build succeeds (no type errors).

- [ ] **Step 3: Commit**

```bash
git add src/render.ts
git commit -m "Color red-ribbon glyphs in the renderer"
```

---

## Task 3: Style red ink (screen + print)

**Files:**
- Modify: `styles/app.css`, `styles/print.css`

- [ ] **Step 1: Add red ink variable + glyph rule to `styles/app.css`**

Add `--ink-red` next to the existing `--ink: #1a1714;` declaration (same selector, around line 3):

```css
  --ink-red: #b3261e;
```

Add a glyph color rule near the `.glyph` block (around line 47):

```css
.glyph.ink-red {
  color: var(--ink-red);
}
```

- [ ] **Step 2: Keep red in print — add to `styles/print.css`**

Inside the `@media print` block, after the `.glyph { color: #000; ... }` rule, add:

```css
  .glyph.ink-red {
    color: var(--ink-red);
  }
```

(`.glyph.ink-red` is more specific than `.glyph`, so red wins without `!important`.)

- [ ] **Step 3: Commit**

```bash
git add styles/app.css styles/print.css
git commit -m "Style red ribbon ink on screen and in print"
```

---

## Task 4: Toggle key in `input.ts`

**Files:**
- Modify: `src/input.ts`

- [ ] **Step 1: Handle `Escape`**

After the modifier guard (`if (e.metaKey || e.ctrlKey || e.altKey) return;`) and before the `Backspace` branch, add:

```typescript
    if (e.key === "Escape") {
      e.preventDefault();
      doc.toggleRibbon();
      onActivity();
      return;
    }
```

- [ ] **Step 2: Verify build/types**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/input.ts
git commit -m "Toggle ribbon color with Escape"
```

---

## Task 5: Indicator button in `ui.ts`

**Files:**
- Modify: `src/ui.ts`

- [ ] **Step 1: Build the indicator button**

In `buildUI`, create the button before assembling `controls.append(...)`:

```typescript
  const inkBtn = document.createElement("button");
  inkBtn.className = "ctl ctl-ink";
  inkBtn.type = "button";
  const inkSwatch = document.createElement("span");
  inkSwatch.className = "ink-swatch";
  const inkLabel = document.createElement("span");
  inkLabel.textContent = "black";
  inkBtn.append(inkSwatch, inkLabel);

  const setRibbon = (color: "black" | "red") => {
    inkSwatch.dataset.color = color;
    inkLabel.textContent = color;
  };
  setRibbon("black");
```

- [ ] **Step 2: Add `inkBtn` to the cluster and return it**

Change the append line to include `inkBtn` (place it first so it sits with the other controls):

```typescript
  controls.append(inkBtn, fontSelect, muteBtn, clearBtn, printBtn);
```

Add `inkBtn` and `setRibbon` to the returned object and the `UI` interface:

```typescript
export interface UI {
  feed: HTMLElement;
  fontSelect: HTMLSelectElement;
  muteBtn: HTMLButtonElement;
  clearBtn: HTMLButtonElement;
  printBtn: HTMLButtonElement;
  inkBtn: HTMLButtonElement;
  setRibbon: (color: "black" | "red") => void;
  flashActivity: () => void;
}
```

```typescript
  return { feed, fontSelect, muteBtn, clearBtn, printBtn, inkBtn, setRibbon, flashActivity };
```

- [ ] **Step 3: Style the swatch in `styles/app.css`**

Add near the `.ctl` rules:

```css
.ctl-ink {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.ink-swatch {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid var(--ink);
  background: var(--ink);
}

.ink-swatch[data-color="red"] {
  background: var(--ink-red);
  border-color: var(--ink-red);
}
```

- [ ] **Step 4: Verify build/types**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/ui.ts styles/app.css
git commit -m "Add ribbon color indicator/toggle button"
```

---

## Task 6: Wire it together in `main.ts`

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: Read `main.ts`**

Run: `cat src/main.ts` — locate where `doc.on(...)` is subscribed, where `ui` is built, and the autosave call (`saveDoc`). The following uses the names `doc`, `ui`, and the existing activity/save helpers; adapt to the actual identifiers in the file.

- [ ] **Step 2: Reflect ribbon state on the indicator**

After `ui` is built and `doc` is loaded, initialize the indicator:

```typescript
ui.setRibbon(doc.ribbon);
```

In the `doc.on((e) => { ... })` handler, react to the new event (this also persists the selected color via the existing save call):

```typescript
  if (e === "ribbon") {
    ui.setRibbon(doc.ribbon);
    saveDoc(doc);
  }
```

(If the existing handler already calls `saveDoc(doc)` for every event, just add the `ui.setRibbon(doc.ribbon)` line.)

- [ ] **Step 3: Wire the button click**

Where other controls are wired (e.g. near `ui.muteBtn.onclick`), add:

```typescript
ui.inkBtn.onclick = () => {
  doc.toggleRibbon();
  ui.flashActivity();
};
```

- [ ] **Step 4: Verify build/types**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Run full test suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Manual verification**

Run: `npm run dev`, then in the browser:
- Type → black. Press `Escape` (or click the indicator) → indicator turns red, label "red".
- Type → red glyphs. Toggle back → black glyphs. Overstrike a black cell with red.
- Reload → colors and the selected ribbon persist.
- Cmd-P print preview → red letters are red, black letters are black, no controls/cursor.

- [ ] **Step 7: Commit**

```bash
git add src/main.ts
git commit -m "Wire ribbon toggle, indicator, and autosave"
```

---

## Self-Review Notes

- **Spec coverage:** keyboard toggle (Task 4), UI indicator (Task 5), per-strike color (Task 1), render (Task 2), persistence + back-compat (Task 1), print red (Task 3), success criteria exercised in Task 6 manual steps. All covered.
- **Type consistency:** `Ribbon`/`"black"|"red"`, `toggleRibbon()`, `setRibbon()`, `ink-red` class, `--ink-red` var, `"ribbon"` event used consistently across tasks.
- **No placeholders:** every code step shows the actual code; `main.ts` task is adapt-to-identifiers because wiring names are read at execution time.
