# tapding — Page Skew Design

**Date:** 2026-06-16\
**Status:** Approved (autonomous /remote-control run; behavior locked in issue #6)\
**Author:** Agent Norton (with Claude)\
**Issue:** #6 (part of realism backlog #5)

## Summary

Each sheet rolls into the platen at a small, **fixed random angle** and stays put — no
live drift while typing. A page always sits at the same angle across reloads, the same
way per-cell jitter is stable. Printed output stays square.

## Decisions (locked)

| Area | Decision |
| --- | --- |
| Seeding | Angle seeded **per page** from the document seed (same PRNG as `computeJitter`), so it's stable across reloads. |
| Magnitude | `±1.5°` max — subtle. Tunable via a `SKEW_MAX_DEG` constant in `geometry.ts`. |
| Motion | None. The angle is set once when the sheet is added; no animation or drift while typing. |
| Pivot | Rotate about the sheet **center** (`transform-origin: center`). |
| Print | `print.css` zeroes the skew so printed sheets are square. |
| Out of scope | Live "settling" animation, skew that responds to typing, per-page persisted angle values (the seed already makes it deterministic — nothing new to store). |

### Why no new persisted state

The angle is a pure function of `(seed, page)`. The document seed is already saved, so the
angle recomputes identically on reload. No `DocState`/`storage.ts` change is needed.

## Architecture

A new pure helper in `geometry.ts` produces the angle; the renderer applies it as a CSS
transform when it creates a sheet. No change to `doc.ts`, `input.ts`, or `storage.ts`.

```
render.addSheet(page) ─▶ pageSkew(doc.seed, page) ─▶ sheet.style.transform = rotate(deg)
```

### `geometry.ts`

- Add `export const SKEW_MAX_DEG = 1.5;`
- Add `export function pageSkew(seed: number, page: number): number` — returns a signed
  angle in `[-SKEW_MAX_DEG, +SKEW_MAX_DEG]`, deterministic per `(seed, page)`, using the
  existing `seededRandom(hash(seed, page))`. The single-argument-count difference from
  `computeJitter`'s `hash(seed, page, row, col)` keeps the streams uncorrelated.

### `render.ts`

- In `addSheet`, the page index of the sheet being created is `this.sheets.length`
  (before the push). Set:
  - `sheet.style.transformOrigin = "center"`
  - `sheet.style.transform = \`rotate(${pageSkew(this.doc.seed, page)}deg)\``
- Rotating the sheet tilts its glyphs and cursor with it (they're children) — exactly the
  intended "crooked page" effect.

### `styles/print.css`

- Add `.sheet { transform: none !important; }` inside `@media print` so printed pages are
  square regardless of screen skew.

## Testing

`tests/geometry.test.ts`:
- `pageSkew` is deterministic: same `(seed, page)` → identical angle.
- Bounded: `|pageSkew(seed, page)| <= SKEW_MAX_DEG` across many pages.
- Varies by page: different pages of the same seed are not all identical.

`tests/render.test.ts`:
- A created sheet has a `rotate(...)` transform on its inline style.

## Success Criteria

1. Each sheet sits at a small fixed angle; reloading the page reproduces the same angles.
2. The angle never exceeds `±1.5°`, and pages differ from one another.
3. No drift or animation while typing.
4. Print preview shows square sheets.
5. `npm test` passes; `npm run build` succeeds.
