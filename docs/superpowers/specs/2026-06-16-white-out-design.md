# tapding — White-Out Correction Fluid Design

**Date:** 2026-06-16\
**Status:** Approved (brainstorming session; behavior locked in issue #8)\
**Author:** Alan Norton (with Claude)\
**Issue:** #8 (part of realism backlog #5)

## Summary

Add **correction fluid** — the only correction path that respects "ink is on the
paper." The typist paints whole grid cells white with the mouse (click, or
click-drag as a freeform brush). A patch dries in ~4s. A **dry** cell accepts a
clean retype — the new strike lands crisp over the covered mistake. Typing on a
**wet** cell smears fresh ink into wet fluid, producing a permanent, semi-legible
smudge; you must white out again and wait. No deletion, ever — white-out is a mark
you add, not a character you remove.

## Decisions (locked)

| Area | Decision |
| --- | --- |
| Apply gesture | Mouse **click** paints one cell; **click-drag** is a freeform brush — every grid cell the cursor enters is painted (a per-gesture set dedupes). Snaps to the 10cpi/6lpi grid. |
| Dry time | `DRY_MS = 4000` ms *(tunable)*, in `geometry.ts` with the other grid constants. |
| Wet retype | A strike on a covered **wet** cell is recorded but `smudged: true` — rendered as a smeared, semi-legible glyph (slight blur + spread). The carriage still advances; a key was struck. |
| Dry retype | A strike on a covered **dry** cell (or any uncovered cell) is `smudged: false` — a crisp glyph that lands on top of the patch. |
| Clock | `Doc` takes an injected `now: () => number = Date.now`. `applyWhiteout` stamps `appliedAt = this.now()`; `wetAt`/`strike` read `this.now()`. Model stays deterministic; `strike()`'s public signature is unchanged. |
| Layering | Each whiteout records `coversBefore = strikes.length` at apply time. A strike at array index `i` in a cell is **hidden** iff `i < max(coversBefore)` of that cell's whiteouts. Hidden strikes sit beneath an opaque patch, so render skips them. |
| Persistence | `whiteout: Whiteout[]` and `Strike.smudged` saved on `DocState`. On reload, every loaded whiteout is **treated as dry** (`appliedAt = 0`). `coversBefore` is preserved — the strikes array is identical, indices line up. |
| Apply sound | **Silent**, consistent with the silent ribbon lever, and no asset exists. |
| Out of scope | No undo; no brush sizes / partial-cell coverage; no bottle-runs-dry; no animated wet→dry sheen; no per-character ink runs. |

### Why an injected clock

The `Doc` model is otherwise pure and deterministic — the same inputs always
produce the same page, which is what makes `tests/doc.test.ts` the testable core.
Dry timing is the first time the model needs wall-clock time. Injecting a single
`now: () => number` (default `Date.now`) keeps that property: tests pass a
controllable clock and step it past `DRY_MS` to assert wet→dry transitions.
`strike()` reads `this.now()` internally, so callers are untouched.

### Why `coversBefore` instead of per-strike timestamps

Layering needs a z-order that survives a full re-render (font change, reload), not
just live DOM append order. Rather than stamp a timestamp on every strike, we use
the fact that `strikes[]` is append-only: a strike's array index is already a stable
global order. A whiteout captures `coversBefore = strikes.length` at apply time, and
the hidden-iff-`i < max(coversBefore)` rule reconstructs the exact z-order from
saved state with no new per-strike field beyond `smudged`.

## Architecture

The change rides the existing one-way data flow — `input → doc → render` — and adds
mouse as a second input source plus one new `Doc` event:

```
key strike       ─▶ doc.strike()        ─▶ stamps smudged (wet?) ─▶ render glyph (smear if smudged)
mouse click/drag ─▶ doc.applyWhiteout() ─▶ emit "whiteout"        ─▶ render white patch
```

### The layering rule (the crux)

`coversBefore` is `strikes.length` at the moment a cell is whited. Because
`strikes[]` is only ever appended to, a strike's index `i` is a stable global order.

> A strike at index `i` in a cell is **hidden** iff `i < max(coversBefore)` among
> that cell's whiteouts.

Render paints, per covered cell: the opaque white patch, with only the *visible*
strikes (`i ≥ maxCovers`) on top. Hidden strikes sit under an opaque patch, so
render simply skips them. Walking every case:

| Action | Result |
| --- | --- |
| type mistake, white it out | patch covers the mistake (mistake index < `coversBefore`) |
| backspace there, retype **dry** | clean glyph, index ≥ `coversBefore` → on top of patch |
| backspace there, retype **wet** | smudged glyph, on top of patch (visible smear) |
| re-white over the smudge | new patch, higher `coversBefore` → smudge now hidden |
| retype **dry** again | clean glyph on top |

Live rendering needs no special ordering — DOM append order already produces
strike → patch → strike. Only a full re-render replays from state, and the rule
above reconstructs the z-order exactly.

### `doc.ts` (model)

- New `interface Whiteout { page: number; row: number; col: number; appliedAt: number; coversBefore: number }`.
- `Doc` gains `whiteout: Whiteout[] = []` and `now: () => number` (constructor param, default `Date.now`).
- `Strike` gains `smudged: boolean`.
- `applyWhiteout(page, row, col)`: pushes a `Whiteout` with `appliedAt: this.now()`
  and `coversBefore: this.strikes.length`; emits `"whiteout"`. Appending another
  entry for an already-covered cell is how re-whiting over a smudge works.
- `wetAt(page, row, col): boolean`: among whiteouts at that cell, takes the most
  recent (max `appliedAt`); returns `this.now() - appliedAt < DRY_MS`. No whiteout
  at the cell → `false`.
- `strike(char)`: unchanged flow; stamps `smudged: this.wetAt(targetCell)` onto the
  new strike. The carriage advances as today.
- `DocState` gains `whiteout`; `Strike.smudged` round-trips. `toState` includes
  `[...this.whiteout]`. `fromState` loads `whiteout`, sets each entry's
  `appliedAt = 0` (treat as dry), and defaults a missing `smudged → false` on each
  strike. Missing `whiteout` on old saves → `[]` (no migration).
- `DocEvent` union gains `"whiteout"`.

### `geometry.ts`

- `export const DRY_MS = 4000;` alongside `PAGE`, tunable.

### `render.ts`

- New `cellAt(clientX, clientY): { page, row, col } | null` — hit-tests each
  platen's `getBoundingClientRect()` and maps to the grid (clamped). The platen is
  not transformed on screen (only `.paper` carries the skew), so the mapping is a
  plain axis-aligned subtract-and-divide; skew never enters the math.
- `renderAll`: draw a `.whiteout` patch for every covered cell, then draw every
  non-hidden strike. A `smudged` strike gets the `.smudge` class.
- The doc-event handler gains `"whiteout"` → append a `.whiteout` patch for the last
  whiteout (`doc.whiteout[len-1]`), mirroring how `"strike"` reads the last strike.
- Patches and glyphs are `pointer-events: none`; the sheet/feed catches pointer
  events.

### `whiteout.ts` (new) — mouse handler

- `attachWhiteout({ doc, renderer, onActivity }): () => void`, mirroring
  `attachInput`. Listens on the feed for `pointerdown` / `pointermove` /
  `pointerup`.
  - `pointerdown` → paint the cell under the cursor.
  - `pointermove` while pressed → paint each newly entered cell; a per-gesture `Set`
    dedupes so one pass over a cell stamps it once.
  - Each painted cell calls `doc.applyWhiteout(...)` then `onActivity()`.
- Returns a detach function (so `main.ts` can re-wire on "new page", like input).

### `main.ts` (wiring)

- `attachWhiteout(...)` is wired alongside `attachInput(...)`, and re-wired on the
  "new page" reset path.
- Autosave already fires on every doc event, so the new `"whiteout"` event persists
  for free.

### Styles

- `app.css`: `--whiteout: #fffdf7` (a touch brighter/matte than `--paper`, so a
  correction reads as a correction) with a faint edge. `.whiteout` is an absolutely
  positioned patch sized to one cell (`PAGE.colWidth × PAGE.rowHeight`). `.smudge`
  applies `filter: blur(~0.7px)` plus slight spread, kept semi-legible. `.sheet`
  gets `cursor: cell` to signal the paper is paintable.
- `print.css`: patches print near-paper-white; hidden strikes are already skipped so
  nothing leaks; smudges print smeared.

## Testing

Unit tests in `tests/doc.test.ts` (the model is the testable core), using an
injected clock:

- `applyWhiteout` records `appliedAt = now()` and `coversBefore = strikes.length`.
- `wetAt` is `true` before `DRY_MS` and `false` at/after (step the injected clock).
- `strike` on a wet covered cell → `smudged: true`; on a dry covered cell →
  `false`; on an uncovered cell → `false` (existing behavior intact).
- The most-recent whiteout governs wetness (re-whiting a cell resets dryness).
- `toState`/`fromState` round-trip `whiteout` and `smudged`; `fromState` forces dry
  (loaded cells read dry) and defaults a missing `smudged → false`.

Render coloring, the mouse handler, and `cellAt` mapping are thin DOM glue, verified
manually: click and freeform-drag to paint; retype while wet → smudge; wait → clean
retype; reload stays dry; font change replays layering correctly; print preview.

## Success Criteria

1. Click and freeform-drag paint whole grid cells white, snapped to the grid.
2. A cell dries after ~4s; retyping a dry cell lands a crisp glyph over the cover,
   and the original mistake stays hidden beneath.
3. Typing a wet cell yields a smeared, semi-legible glyph; re-whiting and
   retyping-after-dry fixes it.
4. Reload restores covered cells (treated as dry) and smudges; a font change
   re-renders the layering correctly.
5. `npm test` passes; `npm run build` succeeds.
