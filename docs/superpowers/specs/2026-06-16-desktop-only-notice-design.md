# tapding — Desktop-Only Notice Design

**Date:** 2026-06-16\
**Status:** Approved (interim step ahead of mobile v2)\
**Author:** Agent Norton (with Claude)

## Summary

tapding is keyboard-only and desktop-first; there is no touch input yet. Until mobile
support lands (v2), show touch-device visitors a short interstitial telling them to open
tapding on a desktop, instead of a broken, un-typeable page.

## Decisions (locked)

| Area | Decision |
| --- | --- |
| Detection | `@media (pointer: coarse) and (hover: none)` — the canonical "touch-primary device" signal. Catches phones/tablets; does **not** block a desktop user with a narrow window (a width rule would, and "open on desktop" would be wrong for them). |
| Mechanism | Pure HTML + CSS. A static `.desktop-only` element in `index.html`; the media query hides `#app` and shows the notice. No JS, so it works even if the module fails to load. |
| Copy | Brand voice (echoes the README): it's a desktop typewriter that needs a real keyboard. |
| Print | Unaffected — print styles are separate and the notice is screen-only. |
| Out of scope | Any actual touch typing, responsive scaling of the sheet, UA sniffing. All deferred to mobile v2. |

## Architecture

No TypeScript, model, or build change. `index.html` gains a sibling of `#app`:

```
<div class="desktop-only"> … notice … </div>
```

`buildUI` only ever touches `#app` (`mount.innerHTML = ""`), so the notice is independent
of the app's DOM. `styles/app.css` hides `.desktop-only` by default and, inside the
touch-device media query, hides `#app` and shows the notice full-screen.

## Copy

> **tapding is a desktop typewriter.**
>
> It runs on a real keyboard — no delete, just keys, ink, and the carriage return.
> Come back on a laptop or desktop to start typing.

(Favicon typewriter mark above the heading for a little warmth.)

## Testing

Pure presentation, no unit-test surface (the suite is TS logic; there is no CSS/visual
harness). Verified manually:
- Desktop / fine pointer → app renders as today, notice hidden.
- Device emulation (phone, `pointer: coarse` + `hover: none`) → only the notice shows.
- `npm test` and `npm run build` still pass (no regressions).
- Print preview on desktop is unchanged.

## Success Criteria

1. Touch-primary devices see the notice and not the broken app.
2. Desktop (including a narrow window) sees the app exactly as before.
3. No JS/model/build changes; existing tests and build stay green.
