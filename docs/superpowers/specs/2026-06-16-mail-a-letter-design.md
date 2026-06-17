# tapding — Mail a Letter Design

**Date:** 2026-06-16\
**Status:** Drafted (brainstorm with Claude) — pending review\
**Author:** Alan Norton (with Claude)

## Summary

Let a typist **mail the letter they typed**. Click *Mail this*, fill in a
recipient and your own return address, commit a **$2** card hold, and the machine
reads the letter, decides whether it will carry it, and — if it passes — captures
the $2 and posts a physical letter via **Postgrid**. If it fails, the hold is
released and nothing is charged.

This is the logical endpoint of tapding's conceit. The typewriter already won't
let you delete; mailing is the irreversible act made total — a letter you signed
your name to that you cannot unsend. The moderation gate is part of the piece: the
machine declines to be your instrument for a letter that crosses the line.

**Framing:** art piece / provocation. Abuse and legal scaffolding stay light; the
experience leads. This is not a margin business (see Payment).

## Decisions (locked)

| Area | Decision |
| --- | --- |
| Ambition | Working art piece. Real letters get mailed; minimal abuse/legal machinery. US-only first. |
| Addressing | **Plain modal form** — structured recipient + sender fields. No on-sheet address parsing. |
| Sequence | **Authorize → Moderate → Capture/Void.** Stripe PaymentIntent with `capture_method: manual`. Capture on pass; cancel the hold on fail. |
| Return address | **Sender's own name + return address**, required in the modal, printed as the `from`. Max accountability, no PO box to operate. |
| Moderation bar | **Cautious middle.** Refuse credible threats, targeted harassment/intimidation, obscenity, and clearly illegal content; allow raw emotional letters (grief, anger, breakups, confessions). |
| Moderator | One Claude call, `claude-opus-4-8`, structured-output verdict `{decision, category, reason}`. |
| Mailed artifact | **We render the page to PDF ourselves** (Cloudflare Browser Rendering, reusing the real renderer + `print.css` + fonts) so the mailed page matches the screen exactly. Postgrid prints our PDF. |
| Refusal UX | **In-world voice + the reason.** "The machine won't carry this," plus the specific moderation reason so the sender can revise. |
| Backend | **Cloudflare Pages Functions** (Workers runtime, same platform). Holds all three secrets; runs the moderate→capture→send sequence server-side. |
| Record store | **Cloudflare KV** — one append-only record per letter (accountability trail). No accounts, no login. |
| Out of scope | Accounts, saved addresses, letter-history UI, international mail, refund flow beyond automatic hold-release, multi-color envelope, address autocomplete. |

## Architecture

Today tapding is a 100% static client app. This adds a thin backend for the first
time. The browser never sees the Stripe secret, Postgrid, or Anthropic keys, and
cannot skip a step in the sequence — everything from "authorize" onward runs in one
server orchestration.

```
 client (browser)                         Cloudflare Pages Functions          third parties
 ────────────────                         ──────────────────────────          ─────────────
 Type letter (existing)
 "Mail this" → modal
   collect to/from/email
 POST /api/intent            ───────────▶ create PaymentIntent
                                            (manual capture, $2) ─────────────▶ Stripe (returns client_secret)
 Stripe.js: confirm $2 hold  ───────────▶ (publishable key + client_secret) ─▶ Stripe (authorize)
 POST /api/mail {docState,
       to, from, email,
       paymentIntentId}      ───────────▶ POST /api/mail:
                                            1. store DocState + record in KV
                                            2. render PDF  ───────────────────▶ Browser Rendering
                                                 (navigates /print/:id)
                                            3. extract text → moderate ───────▶ Claude (verdict)
                                            ├─ pass: capture ─────────────────▶ Stripe (capture $2)
                                            │        send letter ─────────────▶ Postgrid (create letter)
                                            │        → 200 {status:"sent", tracking}
                                            └─ fail: cancel hold ─────────────▶ Stripe (cancel)
                                                     → 200 {status:"refused", reason}
 Render "It's gone" / refusal
```

### New backend (`functions/`)

Cloudflare Pages Functions live under `functions/` and deploy with the static
bundle. Routes:

- **`POST /api/mail`** — the orchestration. Input: serialized `DocState`, recipient
  address, sender name + return address, email, and the client-confirmed
  `paymentIntentId`. Steps, in order, server-side:
  1. Persist `DocState` + an initial record to KV under a fresh `letterId`.
  2. **Render PDF** via Cloudflare Browser Rendering: open `/print/:letterId`,
     wait for fonts + glyphs, print to PDF.
  3. **Extract text** from the strikes (below) and **moderate** via Claude.
  4. **Pass** → capture the PaymentIntent → create the Postgrid letter with our PDF
     → write `sent` + Postgrid id + tracking to the record → return `{status:"sent"}`.
     **Fail** → cancel the PaymentIntent → write `refused` + reason → return
     `{status:"refused", reason, category}`.
- **`GET /print/:letterId`** — a standalone, controls-free render of the stored
  `DocState` (same renderer, `app.css` glyph styles + `print.css`, fonts inlined).
  Browser Rendering navigates here to produce the PDF. Because jitter is a pure
  function of `(seed, page, row, col)`, the PDF is byte-for-byte the same layout as
  the on-screen page.

Secrets (Pages project env): `STRIPE_SECRET_KEY`, `POSTGRID_API_KEY`,
`ANTHROPIC_API_KEY`. Client build gets `STRIPE_PUBLISHABLE_KEY` only. KV binding
`LETTERS`. Browser Rendering binding `BROWSER`.

### Reconstructing text for moderation (shared module)

The moderator needs the readable letter, not the strike array. A small pure helper
(shared by client and function, no DOM) folds `Strike[]` into text: for each
`(page, row)`, place chars by `col` with last-write-wins on overstrikes, trim
trailing blanks, join rows with `\n` and pages with a separator. This lives next to
`doc.ts` so it has one definition and is unit-testable. The same module's geometry
already drives `/print/:letterId`, keeping render and moderation reading the *same*
document.

### Frontend changes

- **`ui.ts`** — add a `mailBtn` to the control cluster (returned from `buildUI`),
  alongside `printBtn`.
- **New `mail.ts`** — owns the modal (recipient + sender + email fields), Stripe.js
  setup, the `POST /api/mail` call, and the in-world result screens (sent / refused).
  Kept out of `main.ts`; `main.ts` only wires `mailBtn.onclick → mail.open(doc)`.
- **`main.ts`** — one wire-up line, mirroring the existing `printBtn` handler.
- The modal and result screens are plain DOM styled to sit inside the typewriter
  world (monospace, paper tones); the refusal screen shows the machine's voice plus
  the moderation `reason`.

### Moderation call

Single `client.messages.create` (or `.parse`) against `claude-opus-4-8` with
adaptive thinking and a structured-output schema:

```
{ decision: "carry" | "refuse", category: string, reason: string }
```

System prompt encodes the cautious-middle policy. `reason` is written to be shown to
the sender verbatim on refusal. (Haiku 4.5 is a cheaper/faster alternative if we
later decide the latency of the "deliberation" beat should be shorter — Opus is the
default per house guidance; not downgrading without an explicit call.)

### Payment

Stripe PaymentIntent, `capture_method: "manual"`, amount `200` (USD cents), created
client-side via Stripe.js so the card never touches our server. Server captures on
pass, cancels on fail. Manual-capture holds last ~7 days — far longer than our
synchronous flow needs.

**Economics, stated honestly:** at $2, Postgrid postage (~$1+) plus Stripe's fee
(~$0.30 + 2.9%) means each mailed letter roughly breaks even or loses a few cents.
Acceptable for an art piece; flagged so it's a known choice, not an accident.

### Mailing (Postgrid)

Create a letter with structured `to` (recipient) and `from` (sender's own name +
return address), `addressPlacement: "insert_blank_page"` so Postgrid's address block
goes on its own page and the typed sheet stays pure, and our rendered PDF as the
content. Multi-page documents (new sheets roll in as you type past the bottom) mail
as multiple pages. Lean on Postgrid's address verification; surface verification
errors back into the modal rather than pre-validating ourselves.

## Order-of-operations guarantees

- **Render before capture.** We produce and moderate the exact PDF we will mail, so
  a pass can't be gamed by changing content after approval.
- **Capture before send.** Money is secured before Postgrid is called. If Postgrid
  fails *after* capture (rare for a verified address), the record is marked
  `send_failed` for manual retry/refund — logged, not silently dropped.
- **One hold per attempt.** A refusal cancels its hold immediately; the sender can
  revise and start a fresh attempt (new hold).

## Records (KV)

One JSON record per `letterId`: sender name + return address, recipient, email,
content hash, moderation `{decision, category, reason}`, PaymentIntent id, Postgrid
id + tracking, status (`refused` | `sent` | `send_failed`), timestamps. This is the
accountability trail and the audit log for the (rare) post-capture failure path.

## Error handling & edge cases

- **Moderation refuse** → cancel hold, return reason, in-world refusal screen.
- **Capture fails** (card declined at capture) → do not send; surface a plain retry.
- **Postgrid fails after capture** → mark `send_failed`, alert via the record;
  out-of-band refund/retry (no automated refund UI in v1).
- **Browser Rendering / render error** → cancel hold, generic "couldn't prepare your
  letter" retry; nothing charged.
- **Empty or whitespace-only letter** → block client-side before authorizing.
- **Address invalid** (Postgrid verification) → cancel hold, return field errors to
  the modal.
- **Double submit** → disable the modal's send control during the request; the
  `letterId` makes the server record idempotent.

## Testing

Pure logic gets unit tests; the integrations get manual verification against test
keys.

- **`tests/` — text reconstruction:** strikes fold to expected text; overstrikes are
  last-write-wins; trailing blank cols/rows trimmed; multi-page separator correct.
- **Moderation policy:** table of sample letters (raw-but-allowed vs over-the-line)
  asserted against the schema decision, run against the live model behind a flag (not
  in the default `npm test` path) — or a stubbed verdict for the wiring tests.
- **`POST /api/mail` orchestration:** with Stripe/Postgrid/Claude stubbed, assert the
  pass path captures-then-sends and the fail path cancels-then-stops; assert capture
  never precedes a successful moderation pass.
- **Manual:** end-to-end with Stripe + Postgrid test modes — type, mail, confirm the
  $2 hold, watch the deliberation beat, see a real test letter in Postgrid's
  dashboard whose PDF matches the screen; then a refusal path confirming no charge.

## Success Criteria

1. A *Mail this* control opens a modal collecting recipient + sender + email; an
   empty letter can't be mailed.
2. Confirming places a $2 authorization hold (not a charge).
3. The machine moderates the exact rendered letter; a pass captures $2 and creates a
   Postgrid letter, a fail cancels the hold and charges nothing.
4. The mailed PDF reproduces the on-screen page — face, jitter, overstrikes,
   multi-page — with the address on a separate inserted page.
5. Refusal shows the in-world voice plus the specific reason; success shows "it's
   gone" with tracking.
6. All three secrets stay server-side; the client holds only the Stripe publishable
   key.
7. `npm test` passes; `npm run build` succeeds; the Pages Functions deploy alongside
   the static bundle.
