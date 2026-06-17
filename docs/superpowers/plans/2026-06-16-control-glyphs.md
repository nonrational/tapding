# Control Pill Glyphs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the floating control pill's text controls (`sound`, `clear`, `print`), the ink label, and the bare font dropdown into icon-only glyphs matching the existing GitHub source mark.

**Architecture:** Presentational change to the UI layer only. `ui.ts` builds the pill and gains a glyph-button helper, four inline SVGs, and a `setMuted()` method (mirroring the existing `setRibbon()`); `main.ts` swaps a glyph instead of text on mute toggle; `app.css` styles the glyphs and the font-picker wrapper. No model/data-flow change.

**Tech Stack:** TypeScript, Vite, vitest, plain DOM, inline SVG.

## Global Constraints

- Icons are inline SVG, `viewBox="0 0 16 16"`, `width="16" height="16"`, `fill`/`stroke` = `currentColor`, `aria-hidden="true"` on the `<svg>`.
- Every interactive control carries a `title` + `aria-label`; no visible text labels except the font name in the dropdown and the "Aa" type mark.
- Match existing source-mark pattern; no icon font, no emoji.
- Verification is typecheck + existing test suite + manual visual pass — these buttons are DOM glue with no unit tests (consistent with the spec).
- Commit messages are plain descriptive (no Conventional Commit prefixes).

---

### Task 1: Convert pill markup to glyphs (`ui.ts` + `main.ts`)

**Files:**
- Modify: `src/ui.ts` (replace text `button()` helper, add icon SVGs + `setMuted`, drop ink word, wrap font select)
- Modify: `src/main.ts:46-49` (mute handler), `src/main.ts:25-26` (boot init)

**Interfaces:**
- Produces: `UI` interface gains `setMuted: (muted: boolean) => void`. `setRibbon` signature unchanged. `muteBtn`/`clearBtn`/`printBtn`/`inkBtn`/`fontSelect` all still exported with the same types.
- Consumes (in `main.ts`): `audio.muted: boolean`, `audio.setMuted(m)`.

- [ ] **Step 1: Replace `ui.ts` in full**

Replace the entire contents of `src/ui.ts` with:

```ts
import { FONTS } from "./fonts";

export interface UI {
  feed: HTMLElement;
  fontSelect: HTMLSelectElement;
  muteBtn: HTMLButtonElement;
  clearBtn: HTMLButtonElement;
  printBtn: HTMLButtonElement;
  inkBtn: HTMLButtonElement;
  setRibbon: (color: "black" | "red") => void;
  setMuted: (muted: boolean) => void;
  flashActivity: () => void;
}

const SPEAKER_ON =
  '<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true">' +
  '<path d="M9 3 5 6H2v4h3l4 3z"/>' +
  '<path d="M10.5 6a3 3 0 0 1 0 4" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>' +
  '<path d="M12 4.5a5 5 0 0 1 0 7" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>' +
  "</svg>";

const SPEAKER_MUTED =
  '<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true">' +
  '<path d="M9 3 5 6H2v4h3l4 3z"/>' +
  '<path d="M11 6 14 9M14 6 11 9" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>' +
  "</svg>";

const NEW_PAGE =
  '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M4 2h5l3 3v9H4z"/>' +
  '<path d="M9 2v3h3"/>' +
  '<path d="M8 8v3.5M6.25 9.75h3.5"/>' +
  "</svg>";

const PRINTER =
  '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M4 6V2h8v4"/>' +
  '<path d="M4 11.5H2.5A1.5 1.5 0 0 1 1 10V7.5A1.5 1.5 0 0 1 2.5 6h11A1.5 1.5 0 0 1 15 7.5V10a1.5 1.5 0 0 1-1.5 1.5H12"/>' +
  '<path d="M4 9.5h8V14H4z"/>' +
  "</svg>";

export function buildUI(mount: HTMLElement): UI {
  mount.innerHTML = "";
  mount.className = "desk";

  const feed = document.createElement("div");
  feed.id = "feed";

  const controls = document.createElement("div");
  controls.className = "controls";

  const fontSelect = document.createElement("select");
  fontSelect.className = "font-select";
  fontSelect.setAttribute("aria-label", "Typeface");
  for (const f of FONTS) {
    const opt = document.createElement("option");
    opt.value = f.id;
    opt.textContent = f.label;
    fontSelect.appendChild(opt);
  }

  const fontPicker = document.createElement("label");
  fontPicker.className = "font-picker";
  fontPicker.title = "Typeface";
  const typeMark = document.createElement("span");
  typeMark.className = "type-mark";
  typeMark.textContent = "Aa";
  typeMark.setAttribute("aria-hidden", "true");
  fontPicker.append(typeMark, fontSelect);

  const inkBtn = document.createElement("button");
  inkBtn.className = "ctl ctl-ink";
  inkBtn.type = "button";
  const inkSwatch = document.createElement("span");
  inkSwatch.className = "ink-swatch";
  inkBtn.append(inkSwatch);

  const setRibbon = (color: "black" | "red") => {
    inkSwatch.dataset.color = color;
    inkBtn.title = `Ribbon: ${color}`;
    inkBtn.setAttribute("aria-label", `Ribbon: ${color}`);
  };
  setRibbon("black");

  const muteBtn = glyphButton("mute", SPEAKER_ON, "Mute");
  const clearBtn = glyphButton("clear", NEW_PAGE, "New page");
  const printBtn = glyphButton("print", PRINTER, "Print");

  const setMuted = (muted: boolean) => {
    muteBtn.innerHTML = muted ? SPEAKER_MUTED : SPEAKER_ON;
    const label = muted ? "Unmute" : "Mute";
    muteBtn.title = label;
    muteBtn.setAttribute("aria-label", label);
  };

  const source = document.createElement("a");
  source.className = "ctl ctl-source";
  source.href = "https://github.com/nonrational/tapding";
  source.target = "_blank";
  source.rel = "noopener";
  source.title = "source";
  source.setAttribute("aria-label", "View source on GitHub");
  source.innerHTML =
    '<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true">' +
    '<path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38' +
    " 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53" +
    ".63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95" +
    " 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27" +
    "1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48" +
    " 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z\"/></svg>";

  controls.append(inkBtn, fontPicker, muteBtn, clearBtn, printBtn, source);
  mount.append(feed, controls);

  let idle: ReturnType<typeof setTimeout> | undefined;
  const flashActivity = () => {
    mount.classList.add("typing");
    if (idle) clearTimeout(idle);
    idle = setTimeout(() => mount.classList.remove("typing"), 1500);
  };

  return { feed, fontSelect, muteBtn, clearBtn, printBtn, inkBtn, setRibbon, setMuted, flashActivity };
}

function glyphButton(cls: string, svg: string, label: string): HTMLButtonElement {
  const b = document.createElement("button");
  b.className = `ctl ctl-${cls}`;
  b.type = "button";
  b.innerHTML = svg;
  b.title = label;
  b.setAttribute("aria-label", label);
  return b;
}
```

- [ ] **Step 2: Update the mute handler in `main.ts`**

Replace the mute handler (currently `src/main.ts:46-49`):

```ts
  ui.muteBtn.addEventListener("click", () => {
    audio.setMuted(!audio.muted);
    ui.muteBtn.textContent = audio.muted ? "muted" : "sound";
  });
```

with:

```ts
  ui.muteBtn.addEventListener("click", () => {
    audio.setMuted(!audio.muted);
    ui.setMuted(audio.muted);
  });
```

- [ ] **Step 3: Sync the mute glyph at boot in `main.ts`**

After the existing init lines (currently `src/main.ts:25-27`):

```ts
  ui.fontSelect.value = doc.font;
  ui.setRibbon(doc.ribbon);
  renderer.attach(doc);
```

insert `ui.setMuted(audio.muted);` so it reads:

```ts
  ui.fontSelect.value = doc.font;
  ui.setRibbon(doc.ribbon);
  ui.setMuted(audio.muted);
  renderer.attach(doc);
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: PASS, no errors. (Confirms the new `UI.setMuted` member, removed `inkLabel`, and `main.ts` calls all line up.)

- [ ] **Step 5: Run the existing test suite**

Run: `npm test`
Expected: PASS — all existing `doc`/`geometry`/`render`/`storage` tests still green (no behavior they cover changed).

- [ ] **Step 6: Commit**

```bash
git add src/ui.ts src/main.ts
git commit -m "Render pill controls as glyphs"
```

---

### Task 2: Style the glyphs (`app.css`)

**Files:**
- Modify: `styles/app.css:106-131` (the `.ctl` / `.font-select` / `.ctl-source` / `.ctl-ink` block)

**Interfaces:**
- Consumes: markup classes from Task 1 — `.ctl`, `.font-picker`, `.type-mark`, `.font-select`, `.ink-swatch` (unchanged).

- [ ] **Step 1: Replace the control style block**

In `styles/app.css`, replace this block (currently lines 106-131):

```css
.ctl, .font-select {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  background: transparent;
  border: none;
  color: var(--ink);
  cursor: pointer;
  padding: 4px 6px;
}

a.ctl { text-decoration: none; }
.ctl:hover { text-decoration: underline; }

.ctl-source {
  display: inline-flex;
  align-items: center;
  opacity: 0.55;
}

.ctl-source:hover { opacity: 1; }

.ctl-ink {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
```

with:

```css
.ctl, .font-select {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  background: transparent;
  border: none;
  color: var(--ink);
  cursor: pointer;
  padding: 4px 6px;
}

.ctl {
  display: inline-flex;
  align-items: center;
  opacity: 0.55;
  transition: opacity 0.2s;
}

a.ctl { text-decoration: none; }
.ctl:hover { opacity: 1; }
.ctl svg { display: block; }

.font-picker {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  opacity: 0.55;
  transition: opacity 0.2s;
}

.font-picker:hover { opacity: 1; }

.type-mark {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 13px;
  line-height: 1;
}

.font-select { padding: 4px 2px; }
```

(The `.ink-swatch` rules immediately below are unchanged. `.ctl-source` and `.ctl-ink` are removed because the shared `.ctl` rule now provides their inline-flex + opacity.)

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: PASS — `tsc` clean and `vite build` succeeds.

- [ ] **Step 3: Manual visual pass**

Run: `npm run dev`, open the app, and confirm:
- The pill shows: ink swatch, "Aa" + font dropdown, speaker, new-page, printer, GitHub mark — no stray words.
- Hovering any glyph brightens it (0.55 → 1) and shows a tooltip.
- Clicking the speaker flips it to the muted (speaker-with-X) glyph and the tooltip flips Mute ↔ Unmute; key sounds stop/resume.
- The font dropdown still opens and changes the typeface.
- The new-page glyph clears the page; the printer glyph opens the print dialog.
- Toggling ribbon (Escape or clicking the swatch) flips the swatch black ↔ red and updates its tooltip.

- [ ] **Step 4: Commit**

```bash
git add styles/app.css
git commit -m "Style the control pill glyphs"
```

---

## Self-Review

**Spec coverage:**
- Icon format / icon-only / source unchanged → Task 1 (SVG constants, `glyphButton`, source left intact). ✓
- Ink swatch kept, word dropped, tooltip names color → Task 1 (`setRibbon`). ✓
- Font picker "Aa" prefix + native select kept → Task 1 (`fontPicker`/`typeMark`) + Task 2 (`.font-picker`/`.type-mark`). ✓
- Sound two-state toggle → Task 1 (`SPEAKER_ON`/`SPEAKER_MUTED`, `setMuted`) + Task 1 `main.ts` wiring + boot sync. ✓
- Clear → "new page" glyph; Print → printer glyph → Task 1. ✓
- Hover unify 0.55→1, drop underline → Task 2. ✓
- Testing = typecheck + suite + manual → Task 1 steps 4-5, Task 2 steps 2-3. ✓

**Placeholder scan:** No TBD/TODO; every code step shows full code. ✓

**Type consistency:** `setMuted(muted: boolean)` defined in the `UI` interface and the returned object (Task 1) and called in `main.ts` (Task 1) — names/types match. `setRibbon` signature unchanged. ✓
