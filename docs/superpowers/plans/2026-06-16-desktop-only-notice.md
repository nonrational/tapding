# Desktop-Only Notice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show touch-device visitors a "best on desktop" interstitial instead of the un-typeable app, until mobile v2 lands.

**Architecture:** Pure HTML + CSS. A static notice element in `index.html`; a `(pointer: coarse) and (hover: none)` media query hides `#app` and shows the notice. No TypeScript, model, or build change.

**Tech Stack:** HTML, CSS.

---

## File Structure

| File | Change |
| --- | --- |
| `index.html` | Add the `.desktop-only` notice element. |
| `styles/app.css` | Hide it by default; swap app↔notice in the touch-device media query. |

---

## Task 1: Add the notice markup

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Add the notice element**

In `index.html`, add a sibling after `<div id="app"></div>`:

```html
    <div id="app"></div>
    <div class="desktop-only">
      <div class="desktop-only-card">
        <img class="desktop-only-mark" src="/favicon.svg" alt="" width="48" height="48" />
        <h1>tapding is a desktop typewriter.</h1>
        <p>It runs on a real keyboard — no delete, just keys, ink, and the carriage return. Come back on a laptop or desktop to start typing.</p>
      </div>
    </div>
```

- [ ] **Step 2: Verify the page still builds**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "Add desktop-only notice markup"
```

---

## Task 2: Style and gate the notice

**Files:**
- Modify: `styles/app.css`

- [ ] **Step 1: Add styles at the end of `styles/app.css`**

```css
.desktop-only {
  display: none;
}

@media (pointer: coarse) and (hover: none) {
  #app {
    display: none;
  }

  .desktop-only {
    display: flex;
    min-height: 100vh;
    align-items: center;
    justify-content: center;
    padding: 32px;
  }
}

.desktop-only-card {
  max-width: 22rem;
  text-align: center;
  color: var(--ink);
  font-family: 'Courier New', monospace;
}

.desktop-only-mark {
  margin-bottom: 16px;
  opacity: 0.8;
}

.desktop-only-card h1 {
  font-size: 20px;
  margin: 0 0 12px;
}

.desktop-only-card p {
  font-size: 14px;
  line-height: 1.5;
  margin: 0;
  opacity: 0.85;
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add styles/app.css
git commit -m "Style desktop-only notice and gate it to touch devices"
```

---

## Task 3: Verification

**Files:** none (verification only)

- [ ] **Step 1: Tests + build still green**

Run: `npm test && npm run build`
Expected: tests pass, build succeeds (no regressions — this change is HTML/CSS only).

- [ ] **Step 2: Manual check**

Run: `npm run dev`, then:
- Desktop browser → app renders as before; notice hidden.
- DevTools device emulation (e.g. iPhone) or any `(pointer: coarse) and (hover: none)` device → only the notice shows.
- Shrink the desktop window narrow → app still shows (notice does NOT appear; that's intended).
- Cmd-P on desktop → print preview unchanged.

---

## Self-Review Notes

- **Spec coverage:** touch-device detection (Task 2 media query), notice copy (Task 1), pure HTML/CSS no-JS (both tasks), print untouched (no print.css change), narrow-desktop-not-blocked (pointer/hover query, verified in Task 3). All covered.
- **No placeholders:** full markup and CSS shown; exact commands given.
- **No regressions:** no TS/model/test changes; Task 3 confirms the suite and build stay green.
