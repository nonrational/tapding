# tapding — Red Ribbon Design

**Date:** 2026-06-16\
**Status:** Approved (autonomous /remote-control run; behavior locked in issue #9)\
**Author:** Agent Norton (with Claude)\
**Issue:** #9 (part of realism backlog #5)

## Summary

Add a **two-color ribbon**: the typist can flip between black and red ink. Each
strike records the ink color it was typed in, so the page is a faithful record of
which letters were red and which were black — consistent with the no-delete conceit.

## Decisions (locked)

| Area | Decision |
| --- | --- |
| Toggle | `Escape` key flips ribbon black ↔ red. *(non-printing, never used for typing; tunable.)* |
| Indicator | A control-cluster button doubles as the indicator **and** a mouse toggle. Shows current color via a swatch + label. |
| Persistence | Ink color stored **per strike** (`Strike.ribbon`). Current ribbon selection also persisted on `DocState`. Missing field on old saves → `"black"` (no migration). |
| Red shade | `--ink-red: #b3261e` (CSS variable, tunable). |
| Print | Red strikes **print red**; black strikes print black. The two-color ribbon is a deliberate mark, not screen-only chrome. |
| Out of scope | Per-character mid-word color runs beyond the toggle, ribbon "wear"/fade, more than two colors. |

### Why `Escape` for the toggle

`input.ts` passes every `meta`/`ctrl`/`alt` chord straight through to the browser
(line 14), and every printable key produces a strike. That leaves the non-printing
keys. `Escape` is universal across keyboards, is never used while typing, and a
single press is an unambiguous toggle. The on-screen button is the discoverable
path; `Escape` is the fast path. The key is documented as tunable.

## Architecture

The change rides the existing one-way data flow — `input → doc → render` — and adds
one new `Doc` event so the UI indicator can react:

```
Escape / button click ─▶ doc.toggleRibbon() ─▶ emit "ribbon" ─▶ ui indicator updates
key strike            ─▶ doc.strike()       ─▶ records strike.ribbon ─▶ render colors glyph
```

### `doc.ts` (model)

- `Strike` gains `ribbon: Ribbon` where `type Ribbon = "black" | "red"`.
- `Doc` gains `ribbon: Ribbon = "black"` (the currently-selected color).
- `strike()` stamps `ribbon: this.ribbon` onto each new strike.
- New `toggleRibbon(): Ribbon` flips the color, emits a new `"ribbon"` event, returns
  the new color.
- `DocState` gains `ribbon`; `toState`/`fromState` round-trip it. `fromState` defaults
  a missing `ribbon` (on the doc and on each strike) to `"black"` for back-compat.
- `DocEvent` union gains `"ribbon"`.

### `render.ts`

- `appendStrike` adds the class `ink-red` to the glyph element when `s.ribbon === "red"`.
  Black strikes are unchanged (inherit `var(--ink)`).
- Using a class (not an inline color) lets the print stylesheet keep red red via
  selector specificity rather than `!important`.

### `input.ts`

- Before the printable-key branch, handle `Escape`: `preventDefault`, `doc.toggleRibbon()`,
  `onActivity()`. No audio (a ribbon-color lever is silent).

### `ui.ts`

- Add an `inkBtn` to the control cluster: a button containing a color swatch and a
  text label. `buildUI` returns it. A small `setRibbon(color)` helper (or direct DOM
  update in `main.ts`) reflects `doc.ribbon`.

### `main.ts` (wiring)

- On the `"ribbon"` doc event, update the indicator and trigger autosave.
- `inkBtn.onclick = () => { doc.toggleRibbon(); onActivity(); }`.
- Initialize the indicator from `doc.ribbon` after load.

### Styles

- `app.css`: define `--ink-red`; add `.glyph.ink-red { color: var(--ink-red); }`; style
  the indicator swatch.
- `print.css`: add `.glyph.ink-red { color: var(--ink-red); }` so red survives the
  `.glyph { color:#000 }` rule (`.glyph.ink-red` is more specific).

## Testing

Unit tests in `tests/doc.test.ts` (the model is the testable core):

- A strike defaults to `ribbon: "black"`.
- After `toggleRibbon()`, new strikes record `ribbon: "red"`; toggling again returns to black.
- `toggleRibbon()` returns the new color and emits a `"ribbon"` event.
- `toState`/`fromState` round-trip `ribbon` on the doc and on strikes.
- `fromState` with strikes/doc lacking `ribbon` defaults them to `"black"`.

Render coloring and the indicator are thin DOM glue, verified manually (type, toggle,
overstrike in both colors, reload, print preview).

## Success Criteria

1. `Escape` and the on-screen button both flip the ribbon; the indicator always shows
   the active color.
2. Letters typed while red render red on screen; black letters stay black; mixed pages
   are possible.
3. Reload restores both the per-strike colors and the selected ribbon.
4. Print preview shows red letters red and black letters black.
5. `npm test` passes; `npm run build` succeeds.
