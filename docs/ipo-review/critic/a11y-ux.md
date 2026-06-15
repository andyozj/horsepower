# Critic report — a11y · UX · visual coherence of the 7 new Batch1/2/3 surfaces

**Reviewer lane:** adversarial accessibility + UX + visual critic.
**Method:** self-hosted isolated server (`PORT=3403 DATA_DIR=/tmp/hp-crit-aux`), driven with my own
Playwright at `deviceScaleFactor:2`, axe-core 4 injected via CDN (`page.addScriptTag`). Every new
surface was exercised **end-to-end in a real browser** (not unit-pass), screenshotted at DSF2 into
`shots/`, and scanned with axe (critical/serious bar) + a contrast-on pass. Focus-survival (the B5
pattern) was probed on each new text/slider control by firing a teammate broadcast mid-typing.
Drivers: `drive.js` · `axecheck.js` · `contrast.js` · `focuscheck.js` · `probe.js` (all in this dir).

**Bar to clear:** axe 0 critical/serious on every view; keyboard operable; focus survives broadcast
re-render; new sliders have accessible names+values; new content rides the live region; flows work
end-to-end; cards/strips/bubbles consistent with the cream/ink paper idiom.

---

## Findings

| # | Surface | Issue | Sev | Evidence |
|---|---------|-------|-----|----------|
| F1 | **R3 sandbox button (landing)** | The "Practise running a room" sandbox button renders **raw SVG markup as literal text** — `<svg class="glyph" aria-hidden="true"><use href="#i-play"/></svg> Practise running a room` shows verbatim on the page. `glyph()` returns an HTML string but is passed as a **child** to `el()` (which wraps children in `createTextNode`) instead of via the `html:` attr. **This is on the public landing screen every participant + facilitator sees** — broken first impression. index.html:1369 (`glyph('i-play')+' Practise running a room'`). | **HIGH (visual/broken)** | `shots/r3-landing-host-with-sandbox.png` |
| F2 | **R3 sandbox console banner** | Same glyph-as-text bug in the dry-run banner: `<svg…#i-play/></svg> Dry-run room` renders as literal text at the top of the sandbox console (and persists on every advanced phase). index.html:3236 (`el('b',{}, glyph('i-play')+' Dry-run room')`). Farrier-private, never projected. | MED (visual) | `shots/r3-sandbox-console.png`, `shots/r3-sandbox-advanced.png` |
| F3 | **R10 gallery button (console present-picker)** | Same glyph-as-text bug: the "Gallery (show all)" present button renders `<svg…#g-flag/></svg> Gallery (show all)` as literal text. index.html:3335. Farrier-private. | MED (visual) | `shots/r10-console-6teams.png` |
| F4 | **R7 Farrier whisper-input** | **B5 focus/draft loss.** A half-typed whisper is **wiped** if any team in the room commits while the Farrier is composing: focus is restored to a *new empty* `whisper-input`, but the draft text is gone (`{kept:true, val:""}`). `whisper-input` is a bare `<input>` and is **not** in the `editingLock` focusin/focusout selector (index.html:1003-1004 covers `.inspector textarea/.sysin/.commitcard textarea/.pulsecard textarea` only). Same data-loss-while-typing class the critic loop fixed for other fields. | MED (a11y/UX) | `focuscheck.js` → `B5 whisper-input … {"kept":true,"val":""}` |
| F5 | **R4 baseline-strip inputs** | **B5 focus drop.** Typing in a baseline input and a teammate commits → the caret is **dumped out of the field** (`keptFocus:false`). The half-typed value *does* survive in the re-rendered input (debounce/value preserved, `liveInputVal:"40/m"`), so no data loss, but the cursor jump mid-typing is jarring. `.baselinestrip input` is absent from the `editingLock` selector. | MED (a11y/UX) | `focuscheck.js` → `{"keptFocus":false,"liveInputVal":"40/m"}` |
| F6 | **R4 baseline-strip inputs** | **No accessible name.** Both inputs have `aria-label:null` and `labels:0` — only a placeholder ("e.g. 40×/month") + inline text spans ("runs" / "· takes"). A SR user hears "runs [blank] · takes [blank]" with two unnamed edit fields. axe does *not* flag it (its label rule is satisfied by adjacent text), so the suite stays green, but it's a real name gap — and it's the **one** new text control that lacks the explicit `aria-label` the pulse sliders/commit/pulse fields all carry. index.html:2221. | MED (a11y) | `axecheck.js` → `baseline input accessible names: [{"ariaLabel":null,…},…]` |
| F7 | **Parking-lot tray heading** (hosts the R5 cluster button) | **Contrast fail 3.66:1.** "Parking lot — said, not yet mapped" h3 span = `#b3760b` on `#fffaf0` (needs 4.5:1). Uses `--thin` (#b3760b) for *text*; the design tribunal minted `--thin-text:#7a4f07` (AA) for exactly this but this h3 was missed. **Pre-existing** (not one of the 7 new surfaces) but it's the container the R5 "Group the parked notes" button now lives in. index.html:340 (`.orphantray h3{… color:var(--thin)}`). | MED (a11y, pre-existing) | `contrast.js` → `ratio 3.66 fg #b3760b bg #fffaf0 · h3 > span` |
| F8 | **R5 cluster-shelf · R5 live synth · R1b AI recap intro** | **Untestable without an AI key** (none in this env). The cluster *button* works and degrades to an honest toast offline (good — see Solid); but the `cluster-shelf` proposal UI, the live-AI 4-line synth, and the optional recap AI-intro only render on the live-AI path. Their a11y/visual quality is **unverified** — same gap the build notes flag. Not a fail, a coverage hole. | LOW (coverage) | `shots/r5-cluster-after-click.png` (toast-only offline) |
| F9 | **R4 inspector-system field** | Like the existing WHY field, the "which system / data?" label is a plain `<div>`/`.lbl` placed above the input, not a `<label for>` association (relies on placeholder + proximity). axe passes; consistent with the established (passing) inspector idiom, so **not a new regression** — noted for completeness. | LOW (a11y) | `shots/r4-inspector-system.png` |

---

## What's solid (genuinely well-done)

- **axe is clean on every new VIEW** at critical/serious with color-contrast off: Surface (with
  inspector-system + baseline-strip), member Share (commit + pulse cards), member Closed, Farrier
  console at closed (pulse-board), 6-team console, and the gallery room view — **all 0 critical/serious.**
  The single contrast-on serious (F7) is a pre-existing token slip, not a new surface.
- **R1b recap.html is a genuine giftable leave-behind**, not a debug dump (`shots/r1-recap-rendered.png`):
  cream paper, navy Fraunces headings, kept/myth pills with lock/scissors SVG glyphs, "ridden by",
  rule-ruled section dividers, footer with code+date. Downloads as a real self-contained file
  (2.8KB, has `<h1>`, **zero external refs** — survives the TTL offline). axe 0 on the artifact.
- **R2 pulse sliders are exemplary a11y**: each `<input type=range>` has an `aria-label`, live
  `aria-valuetext` ("7 out of 10"), min/max, a visible value badge, and **arrow-key + End work**
  (5→7, →10). The textareas don't hijack the canvas keydown (typing lands in the field).
- **R2 pulse-board (`shots/r2-pulse-board.png`)** reads beautifully in the console paper idiom:
  aggregate confidence shift ("5.0 → 9.0 / 10 (avg shift +4.0)"), gold-rule aha blockquotes,
  flag-glyph commitments with attribution. No inter-team scoring — just the Farrier's own room.
- **R7 whisper end-to-end works and is leak-safe**: clean whisper lands in the target team's rail
  as a **distinct `farrier-note` bubble** ("From the Farrier: …", lock-wash, flag glyph — clearly
  not a coach/system bubble), breathes the unread badge, badge clears on rail-open. Banned vocab
  ("redesign") is blocked **on type AND on send** with a red "That names the surprise" warning and
  **never reaches the team** (`shots/r7-whisper-banned.png`).
- **R5 synth** rule-based 4-line read-back renders cleanly in a red coach bubble with the avatar
  (`shots/r5-synth-bubble.png`); cluster button degrades to an honest toast offline (rule #8).
- **R3 sandbox drives the real production path**: advancing through Surface→swap→Rebuild→Share→closed
  shows two seeded teams (Field Service / Onboarding, 14 blocks each, 2/2 members) with the real
  teardown/gallery/pulse-board firing (`shots/r3-sandbox-advanced.png`). Leak-safe copy.
- **R10 gallery (`shots/r10-gallery-roomview.png`)**: all 6 before→after pairs as a contact sheet
  ("The whole room — before → after") with legible team-pair captions; the console table holds 6
  teams + header without overflow; Gallery button toggles `present:set teamId:null` correctly
  (`.roomview.gallery` with 6 `.gcell`). (Distance note: the mini-maps inside cells are illegible at
  projector range, but that's by-design — the overview beat; the Farrier features pairs to zoom.)
- **B5 focus survival holds on the Share member cards**: `commit-input` and `pulse-aha` both keep
  focus + caret-at-end through a teammate's broadcast (they ARE in the editingLock selector).
- No server crashes / console errors across every flow (server log clean through all phases).

---

## SIGN-OFF

**Verdict: NO — one HIGH visual defect blocks sign-off (F1).**

There are **zero HIGH a11y-fails and zero broken end-to-end flows** — every new surface works and the
new a11y idioms (sliders, live region, no-hijack textareas, distinct farrier bubble, focus restore on
the Share cards) are correctly applied. But **F1 is a HIGH visual-broken**: the sandbox button on the
**public landing page** prints raw `<svg…/>` markup as text — the front door looks broken. F2/F3 are
the same one-line bug (glyph passed as `el()` child instead of `html:`) on Farrier-private surfaces.

**Single highest-leverage fix** (clears F1+F2+F3 together): change the three call sites to use the
`html:` attribute, e.g. `el('b',{html: glyph('i-play')+' Dry-run room'})` — index.html **1369, 3236, 3335**.

Then close the B5 misses (F4/F5) and the baseline name gap (F6) by extending the `editingLock`
selector (index.html:1003-1004) to include `.baselinestrip input, .whisperbox input`, adding a draft
persist for the whisper input, and giving the two baseline inputs `aria-label`s. F7 is a one-token
swap (`--thin` → `--thin-text` on `.orphantray h3`). Re-scan after the fixes — nothing else stands
between these surfaces and the existing 33-check / 6-critic bar.
