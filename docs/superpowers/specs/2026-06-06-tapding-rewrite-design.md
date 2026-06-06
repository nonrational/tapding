# tapding — Rewrite Design

**Date:** 2026-06-06\
**Status:** Approved, ready for implementation planning\
**Author:** Alan Norton (with Claude)

## Summary

tapding is a browser typewriter toy. Its central conceit: **there is no delete.**
Every struck letter is indelible. Backspace moves the carriage but never erases.

This is a complete rewrite of the original jQuery/absolute-span implementation. The
goals: modern tooling, a facelift, more authentic typewriter feel, and real printable
output (Cmd-P → vector PDF that also prints on paper).

The defining architectural change is separating **what was typed** (an append-only
document model) from **how it's drawn** (a DOM renderer) — fixing the durability concern
with the old "XY coordinates inside a div" approach.

## Decisions (locked during brainstorming)

| Area | Decision |
| --- | --- |
| Conceit | No deletion, ever. Backspace = carriage move only. Overstriking a cell shows both inks. |
| North star | The live typing experience **and** the printable artifact, weighted equally. |
| Realism | Level B — subtle per-glyph jitter + ink-weight variation, carried mostly by the real `.ttf` faces. |
| Aesthetic | Direction A — a minimal sheet on a warm desk; controls fade while typing. |
| Stack | Vite + TypeScript, no UI framework, builds to static files. |
| Pages | True US Letter sheets, margin bell, fresh sheet on overflow, one PDF page per sheet. |
| Print | `window.print()` + `@page`/print CSS → vector PDF. Default: clean white page, black ink, jitter preserved. |
| Extras in scope | Sound + mute toggle, autosave/restore (localStorage), overstrike ink, font picker. |
| Out of scope | Mobile/touch typing (desktop-first). Skeuomorphic machine skin (deferred to v2). |

## Architecture

One-way data flow, three core layers plus support modules:

```
keydown ─▶ input.ts ─▶ doc.ts (append-only model) ─▶ render.ts (DOM glyphs)
                                  │                         └─▶ cursor
                                  ├─▶ audio.ts (clack / bell / return)
                                  └─▶ storage.ts (debounced localStorage)
```

### Modules

- **`doc.ts` — the document model (the heart).**
  Append-only. The model never removes a strike.
  - `Strike { char, page, row, col, jitterX, jitterY, rot, ink }`
  - Carriage state `{ page, row, col }` kept separate from strikes.
  - Jitter and ink weight are computed **once at strike time**, seeded deterministically
    by `(page,row,col)` plus a document seed, and stored on the strike. This guarantees
    the screen and the PDF render identically, and that re-renders are stable.
  - Operations: `strike(char)`, `space()`, `tab()`, `carriageReturn()`,
    `carriageBack()` (no delete), `home()`/margin handling as needed.
  - Pagination: on row overflow past the page's last line, advance to a new page.
  - Bell: emits an event when the carriage crosses the right-margin threshold.
  - Pure and deterministic → directly unit-testable.

- **`render.ts` — DOM renderer.**
  Given the model + carriage, draws each sheet as a US-Letter-proportioned `.sheet`
  element. One absolutely-positioned `<span class="glyph">` per strike, in the active
  font; jitter applied via CSS `transform`. Incremental append on each strike; full
  rebuild only on font change or restore. A separate cursor element (underline) tracks
  the carriage position.

- **`input.ts` — keyboard controller.**
  Maps key events to model operations and enforces the conceit:
  - Printable char → `strike`
  - Space → `space`, Tab → `tab`, Enter → `carriageReturn`
  - **Backspace → `carriageBack` (never deletes)**; Delete → ignored
  - Triggers the matching sound on each action.

### Support modules

- **`geometry.ts`** — per-font column width, line height, and page metrics
  (lines/cols per US Letter sheet at 6 lpi / 10 cpi baseline).
- **`fonts.ts`** — `@font-face` registration + metrics for a curated set of the
  bundled typewriter faces. Font picker updates the model's active font and triggers a
  rebuild.
- **`audio.ts`** — pooled mp3 playback (rapid key reuse), bell + carriage-return sounds,
  mute toggle. Unlocks on first interaction to satisfy autoplay policies.
- **`storage.ts`** — debounced serialize of `{ strikes, carriage, font, seed }` to
  localStorage; restore on load; `clear()` for a blank sheet.
- **`ui.ts`** — Direction A chrome: warm desk background, centered sheet stack, and a
  control cluster (font picker · print · clear · mute) that fades while typing.

## Pages & printing

- True **US Letter** sheets: ~66 lines × 85 cols (6 lpi / 10 cpi baseline; exact values
  derived from the active font's metrics in `geometry.ts`).
- A margin **bell** rings near the right edge; bottom overflow rolls in a fresh sheet
  (page 2, 3, …).
- **Print path:** `window.print()` with a dedicated print stylesheet —
  `@page { size: letter; margin: 0 }`, each `.sheet` laid out as one physical page via
  `page-break-after`, all chrome hidden, desk background removed.
- **Print appearance default:** clean white page, black ink, glyph jitter preserved.
  (The faint cream paper tint is screen-only. Revisit if a tinted print is wanted.)
- Result: a real vector PDF through Cmd-P → "Save as PDF," and a faithful print on paper.

## Error handling

Boundaries only — this is a toy, no defensive noise internally.

- localStorage missing or over quota → catch, silently disable autosave, keep typing.
- Font fails to load → fall back to Courier.
- Audio blocked by autoplay policy → unlock on first keypress; otherwise best-effort/silent.

## Testing

- **Vitest unit tests on `doc.ts`** (TDD), covering:
  - striking advances the carriage by one column;
  - backspace moves the carriage **without** removing any strike;
  - carriage return wraps to the next line and paginates at page bottom;
  - the bell event fires at the right-margin threshold;
  - overstriking a cell produces two strikes at the same `(page,row,col)`;
  - serialize → restore round-trips losslessly (including the seed, so jitter is stable).
- **Renderer** gets a light smoke test (N strikes → N glyph nodes at expected positions).
  Look-and-feel is verified manually in the browser.

## Project structure

```
index.html
vite.config.ts
package.json
tsconfig.json
src/
  main.ts
  doc.ts          # append-only document model
  render.ts       # DOM glyph renderer
  input.ts        # keyboard controller
  geometry.ts     # page / font metrics
  fonts.ts        # @font-face + metrics
  audio.ts        # pooled sfx + mute
  storage.ts      # localStorage persistence
  ui.ts           # desk, sheet stack, fading controls
styles/
  app.css
  print.css
fonts/            # curated .ttf + @font-face
sfx/              # curated .mp3
tests/
  doc.test.ts
```

## Repo cleanup

Remove: jQuery, `html2canvas`, `audio-fx.min.js`, old `js/tapding.js`, `css/tapding.css`,
Google Analytics snippet, `.htaccess`, Ruby `serve` + `.ruby-version`.

Keep (curated): the `.ttf` typewriter fonts and the `.mp3` sound effects.

Add: Vite + TypeScript scaffolding.

## Deployment

`vite build` → static `dist/`, deployed to wherever tapding.com is hosted. Hosting
choice left to the user; the build output is plain static files.

## Future (explicitly deferred)

- **Skeuomorphic machine skin** (brainstorm Direction B): a visible platen/key-bank
  presentation layered over the same mechanics.
- Optional flourishes: key jam on fast typing, two-color (red/black) ribbon, ribbon fade
  over a long session.
- Mobile / touch typing support.
