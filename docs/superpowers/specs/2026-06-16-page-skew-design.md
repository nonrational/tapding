# tapding — Page Skew Design

**Date:** 2026-06-16\
**Status:** Approved (autonomous /remote-control run; behavior locked in issue #6)\
**Author:** Agent Norton (with Claude)\
**Issue:** #6 (part of realism backlog #5)

## Summary

Once in a while a page goes into the platen crooked, and the machine types level rows
regardless. That single physical fact reads two ways:

- **On screen (in the machine):** the **paper sits crooked** and the **typing is square** —
  the rows are level to the viewer while the sheet is tilted in the roller.
- **In print (the artifact):** there is no sheet — just the **ink on the page**, carrying the
  crooked angle it was struck at.

It's **rare**: roughly **1 page in 10** is crooked; the rest feed in straight. The angle is
seeded per page and stays put — no live drift while typing, the same angle across reloads
(the way per-cell jitter is stable), and baked into the printed artifact. You can't straighten
the typing after the fact — the same no-delete spirit as the rest of the machine.

## Decisions (locked)

| Area | Decision |
| --- | --- |
| Seeding | Angle seeded **per page** from the document seed (same PRNG as `computeJitter`), so it's stable across reloads. |
| Rarity | About **1 page in 10** is crooked; the rest are exactly straight (`0°`). Tunable via `SKEW_PROBABILITY` in `geometry.ts`. A page first rolls a gate, then (if crooked) an angle. |
| Magnitude | When crooked, `±1.5°` max — subtle. Tunable via `SKEW_MAX_DEG`. |
| Motion | None. The angle is set once when the sheet is added; no animation or drift while typing. |
| Layers | Each sheet has two sibling layers: a **`.paper`** (the visual sheet) and a **`.platen`** (the glyphs + cursor). They overlap; which one rotates depends on the medium. Pivot is the layer **center** (`transform-origin: center`). |
| On screen | Rotate **`.paper`** by `+skew`; `.platen` stays at 0. → crooked paper, square type. The tilted paper (with its shadow) shows its angled edges on the desk. |
| In print | **Hide `.paper` entirely** and rotate **`.platen`** by `-skew`. → no sheet background, shadow, or border — just the ink, carrying its angle. CSS transforms don't affect pagination, so the page break still lands on the un-rotated box (no blank pages). |
| Mechanism | The renderer writes the angle to a per-sheet CSS variable `--skew`; the stylesheet (screen vs `@media print`) decides which layer consumes it. JS sets no inline rotation. |
| Out of scope | Live "settling" animation, skew that responds to typing, per-page persisted angle values (the seed already makes it deterministic — nothing new to store). |

### Why no new persisted state

The angle is a pure function of `(seed, page)`. The document seed is already saved, so the
angle recomputes identically on reload. No `DocState`/`storage.ts` change is needed.

## Architecture

A new pure helper in `geometry.ts` produces the angle; the renderer writes it to a per-sheet
`--skew` CSS variable, and the stylesheet rotates the right layer for the medium. No change
to `doc.ts`, `input.ts`, or `storage.ts`.

```
render.addSheet(page) ─▶ pageSkew(doc.seed, page) ─▶ sheet.style.setProperty("--skew", "<deg>")
        screen CSS:  .paper  { transform: rotate(var(--skew)) }          (paper tilts, type square)
        print  CSS:  .paper  { display: none }                          (no sheet — just ink)
                     .platen { transform: rotate(calc(-1 * var(--skew))) }  (type tilts)
```

### `geometry.ts`

- Add `export const SKEW_MAX_DEG = 1.5;` and `export const SKEW_PROBABILITY = 0.1;`
- Add `export function pageSkew(seed: number, page: number): number` — deterministic per
  `(seed, page)` via `seededRandom(hash(seed, page))`. First draw gates on
  `SKEW_PROBABILITY`: most pages return `0`. A crooked page draws a signed angle in
  `[-SKEW_MAX_DEG, +SKEW_MAX_DEG]`. The single-argument-count difference from
  `computeJitter`'s `hash(seed, page, row, col)` keeps the streams uncorrelated.

### `render.ts`

- `addSheet` creates a `.sheet` wrapper, sets `--skew` on it, and appends two sibling
  layers: `.paper` (visual sheet) then `.platen` (text, on top).
- Glyphs (`appendStrike`) and the cursor (`positionCursor`) go into the page's `.platen`.
  The renderer tracks a `platens[]` array alongside `sheets[]`, kept in sync by `addSheet`.
- JS sets **no** rotation transform — only the `--skew` variable.

### `styles/app.css`

- `.sheet { position: relative; }` — just a positioning wrapper now.
- `.paper { position: absolute; inset: 0; …paper visuals…; transform: rotate(var(--skew, 0deg)); transform-origin: center; }`
  — the paper tilts on screen.
- `.platen { position: absolute; inset: 0; transform-origin: center; }` — square on screen;
  the positioning context for the absolutely-placed glyphs.

### `styles/print.css`

- `.paper { display: none; }` — the printed artifact carries **no** sheet background, shadow,
  or border; only the ink.
- `.platen { transform: rotate(calc(-1 * var(--skew, 0deg))); }` — the type takes the angle
  (negative of the on-screen paper skew, since the page is squared up). Edge glyphs can clip a
  few px against the page at ±1.5° — acceptable, on-theme.

## Testing

`tests/geometry.test.ts`:
- `pageSkew` is deterministic: same `(seed, page)` → identical angle.
- Bounded: `|pageSkew(seed, page)| <= SKEW_MAX_DEG` across many pages.
- Most pages are exactly straight (`0`); roughly 1 in 10 is crooked across a large sample;
  crooked pages take a varied angle.

`tests/render.test.ts`:
- Each sheet exposes a `--skew` CSS variable and has both a `.paper` and a `.platen` layer.
- Glyphs land in `.platen`, not on `.paper`.

(The actual rotation and the print `display: none` are CSS/media-driven — jsdom has no layout
or `@media` resolution, so the visual result is verified manually / by a headless print test,
not in unit tests.)

## Success Criteria

1. **On screen:** most pages sit straight; ~1 in 10 sits crooked, with the rows of type level.
2. **In print/PDF:** no sheet outline, shadow, or background — just the ink, crooked on the
   rare pages, straight on the rest.
3. The angle never exceeds `±1.5°`; reloading reproduces the same per-page angles.
4. No drift or animation while typing.
5. `npm test` passes; `npm run build` succeeds.
