# tapding — Control Pill Glyphs Design

**Date:** 2026-06-16\
**Status:** Approved\
**Author:** Agent Norton (with Claude)\
**Branch:** `source-link-glyph`

## Summary

Turn the floating control pill from words into **icon-only glyphs**. Today the pill
mixes a color swatch, a `<select>`, three text buttons (`sound`, `clear`, `print`) and
one glyph (the GitHub source mark). The text controls become inline SVG glyphs that
match the source mark already there — monochrome, `currentColor`, 16×16, with a
`title` + `aria-label` for the tooltip and screen readers. The result is a quieter,
more consistent pill.

## Decisions (locked)

| Area | Decision |
| --- | --- |
| Icon format | Inline SVG, `fill="currentColor"`, 16×16, `aria-hidden` on the `<svg>`; the control carries `title` + `aria-label`. Mirrors the existing GitHub source mark. No icon font, no emoji. |
| Labels | **Icon-only.** No text beside any glyph. The tooltip + `aria-label` carry the meaning. |
| Ink | Keep the existing color swatch (it shows the live ribbon color); drop the "black"/"red" word. `aria-label`/`title` reflects the current color. |
| Font picker | Keep the native `<select>` (font names stay visible/selectable); prefix it with an **"Aa"** type-mark inside a `.font-picker` wrapper. `title` = "Typeface". |
| Sound | Speaker glyph with two states: speaker-with-waves (on) ↔ speaker-with-slash (muted). Icon + tooltip swap on toggle. |
| Clear | A **"new page"** glyph (sheet with a `+`). `title`/`aria-label` = "New page". |
| Print | Printer glyph. `title` = "Print". |
| Source | Unchanged. |
| Out of scope | Rendering the select's text in the live font, animating icon swaps, persisting mute state. |

### Why icon-only

The GitHub source mark added in the last commit already set the pattern: a glyph at
0.55 opacity that brightens on hover, tooltip on the `title`. Extending it to the rest
of the pill removes the visual mismatch of text-next-to-icon and keeps the chrome out
of the way of the page. Meaning lives in the tooltip + `aria-label`, so the controls
stay discoverable and accessible.

## Architecture

No data-flow change — this is presentational. The wiring in `main.ts` already owns the
click handlers; the only behavioral shift is that mute now swaps a glyph instead of
text, so its visual state moves behind a small `ui.setMuted()` helper (mirroring the
existing `ui.setRibbon()`).

### `ui.ts`

- Replace the text `button(cls, label)` helper with a glyph helper:
  `glyphButton(cls, svg, label)` that sets `innerHTML = svg`, `title = label`, and
  `aria-label = label`, and keeps `type="button"`.
- Add four inline SVGs: speaker-on, speaker-muted, new-page, printer.
- `muteBtn` starts in the speaker-on state.
- Add `setMuted(muted: boolean)` to the `UI` interface: swaps the speaker glyph and
  updates `title`/`aria-label` ("Mute" ↔ "Unmute" / "Muted").
- `setRibbon(color)` keeps setting the swatch color; stops writing the word. Update the
  ink button's `title`/`aria-label` to the current color.
- Wrap `fontSelect` in a `.font-picker` element with an "Aa" type-mark span before it;
  give the wrapper `title="Typeface"`.

### `main.ts`

- Mute click handler calls `ui.setMuted(audio.muted)` after toggling, instead of setting
  `textContent`.
- Call `ui.setMuted(audio.muted)` once during boot so the glyph matches initial state.

### Styles (`app.css`)

- Glyph controls become `display: inline-flex; align-items: center;` and size the SVG.
- Unify hover to the source mark's treatment: base `opacity: 0.55`, `:hover { opacity: 1 }`.
  Remove the now-pointless `.ctl:hover { text-decoration: underline }`.
- Style `.font-picker` (inline-flex, gap) and the "Aa" type mark.
- `.ink-swatch` is unchanged.

## Testing

Presentational change. The existing tests (`doc`, `geometry`, `render`, `storage`) are
logic-only and don't touch these buttons. Verify with `npm run build` (typecheck) and a
manual pass: hover each glyph for its tooltip, toggle mute (icon + tooltip flip), change
font, clear, print preview, toggle ribbon (swatch color + tooltip).

## Success Criteria

1. Every control in the pill is a glyph; no stray text except the font name in the
   dropdown and the "Aa" type mark.
2. Hovering any glyph shows a tooltip; each has an `aria-label`.
3. Mute toggles both the speaker glyph and its tooltip; state is correct at boot.
4. Ink swatch still tracks the live ribbon color; its tooltip names the color.
5. `npm test` passes; `npm run build` succeeds.
