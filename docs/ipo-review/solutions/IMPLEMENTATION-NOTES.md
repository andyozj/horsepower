# Implementation deviations from the approved hardening design

## DEV-1 — A1 maxPayload crashes the process without a per-socket `error` listener (FIXED)

**Design assumption (hardening-design.md §1.1):** "`ws` closes an offending connection with 1009; honest clients are 3 orders of magnitude below the cap."

**Reality observed (ws @ this repo's version, Node 25):** an oversize frame makes `ws` emit a
`WS_ERR_UNSUPPORTED_MESSAGE_LENGTH` (1009) **`'error'` event on the WebSocket instance**, not just a
close. The `wss.on('connection')` handler had no `'error'` listener, so the unhandled `'error'`
event propagated and **crashed the whole server process** (every room dies) — exactly the opposite of
the design's intent (drop one socket, room survives). Hostile test H2 reproduced it deterministically.

**Minimal correct variant implemented:** add a per-socket `ws.on('error', …)` listener in the
connection handler (logs `ws_socket_error` and lets `ws` close the socket). This is standard `ws`
hygiene and changes no honest behavior. With it, H2 now does what §1.1 promises: the oversize socket
dies with 1009, a fresh socket joins fine, the room is unaffected.

Scope: 1 line of new code (+ a log call). No contract change; no client change. Flagged in the final
report.

## DEV-B1 — Cluster B finished by the lead after the implementer's output was content-filtered

The Cluster B agent completed ~95 edits but its final summary was blocked by the output filter; two items were left verifiable-incomplete and finished by the lead:

1. **B10 font self-host wiring.** The variable woff2 files were downloaded correctly (re-verified: Fraunces `wght` AND `WONK` axes both vary when the file is loaded over the live server — the css2-API fetch preserved the axes, so the R8 "static-instance" risk was averted), but the `@font-face` block + preloads were never added and the Google CDN `<link>` was still live (qa-a11y 13a failed). Lead added three `@font-face` rules (latin subset, `font-display:swap`, weight ranges 300–900 / 400–600 / 500–600), three `rel=preload` hints, removed the CDN `<link>` + preconnects, and wrote `public/fonts/OFL.txt`.

2. **qa-a11y check 8 ("no keyboard trap") corrected — not the impl.** Probed actual behavior: from the last visual node, Tab lands in that node's inspector WHY field (inside `.world`), and the **next** Tab exits to a control outside `.world`, with normal traversal after — focus is genuinely escapable (WCAG 2.1.2 satisfied). Tab-into-the-card's-WHY is a deliberate keyboard affordance, not a trap. The original check asserted a literal single-Tab exit, which the (correct, arguably better) implementation doesn't do. Fix: assert the real property — focus leaves `.world` within a few Tabs. No app-code change; the keyboard layer is correct as built.

## DEV-B1-1 — R4b: the `mergeCanvas` baseline-preserve line as designed wipes the baseline on a baseline-less merge

**Design (batch1-design.md §R4b, "HARD CONSTRAINT chat/baseline preservation across merge"):**
```js
out.baseline = clean.baseline || serverCanvas.baseline || out.baseline;
```

**Flaw:** `sanitizeCanvas` **always** returns a canvas with a `baseline` object — the `emptyCanvas()`
default `{frequency:'',cycleTime:''}` — even when the incoming `msg.canvas` carried no baseline.
So on a knownIds (multi-editor) merge commit that does **not** include the baseline, `clean.baseline`
is a truthy (but empty) object; the `||` short-circuits on it and the server's real baseline is
**overwritten with the empty default**. The design's risk **R4-2** ("baseline dropped by mergeCanvas")
is exactly what this line was meant to prevent, but the `||` form doesn't achieve it.

Reproduced deterministically by `qa-batch1.js` H-R4b-1: set `baseline={40×/mo,3d}`, then a second
baseline-less knownIds commit → baseline came back `{"","" }`. (The legacy no-knownIds path was fine —
it returns `clean` verbatim and the single editor always carries the baseline — so the bug only bites
the real multi-device merge path, the one that matters.)

**Minimal correct variant implemented:**
```js
const cleanHasBaseline = clean.baseline && (clean.baseline.frequency || clean.baseline.cycleTime);
out.baseline = cleanHasBaseline ? clean.baseline : (serverCanvas.baseline || out.baseline);
```
Only adopt the incoming baseline when it actually carries content; otherwise preserve the server's
(LWW within content, like glossary). A member who clears both fields still writes through the legacy
full-replace path (their commit carries `baseline:{'',''}` AND is non-merge in the single-editor case);
a concurrent merge that simply doesn't touch the baseline no longer clobbers it. 2 lines; no contract
change; no client change. Flagged loudly in the final report.

## DEV-B3 — Batch 3 (R3 sandbox + R10 scale/gallery): NO design flaws found, implemented as specified

Both features landed exactly per `batch3-design.md` + the REVIEW.md adjudications, on top of Batch 1.
No DEV-B3-x design-flaw fix was required in app code. Notes:

- **All four R3 leak guards shipped together** (Guard 2 server-enforced member-join refusal is the
  load-bearing one). The `batch3-design.md` `file:line` anchors had shifted (server.js grew 1104→1221
  after Batch 1), so each hook was re-located by symbol, not line — semantics matched the design exactly.
- **SANDBOX_TTL_MS sweep clause:** the design offered a two-line and a single-line form; shipped the
  single-line `const ttl = w.sandbox ? SANDBOX_TTL_MS : (closed ? CLOSED : IDLE)`. Verified the
  non-sandbox CLOSED/IDLE behavior is byte-identical to the prior `(closed && idle>CLOSED) || idle>IDLE`
  (closed → 24h, non-closed → 48h). qa-hostile §16.x cap/TTL assertions stayed green.
- **B.4 view-memoization deliberately NOT built** (REVIEW adjudication: gated behind qa-scale evidence).
  `qa-scale.js` Scale F (serialization budget) + Scale C (no starvation) measured ping < 200ms throughout
  the 6-team share-phase write storm → **no regression, no memoization, no CONFIG change.** 31 sockets sit
  well inside the per-socket WS bucket + backpressure caps. **No scale ceiling found.**
- **Test-harness-only fixes (NOT app deviations):** (a) `qa-scale.js` initially sent `redesign:update`
  with a flat `{canvas}` instead of the handler's `{redesign:{canvas}}` shape — fixed in the harness;
  (b) `qa-scale-ui.js` localStorage identity key is `horsepower.v2` (not a guessed `hp_me_v2`). Neither
  touched server.js / index.html.
- **qa-walkthrough console-error log:** the 2 captured items (the pre-existing `/img/icon.svg` 404 from
  `manifest.json` — the parked illustration set — and the long-flaky `close workshop` click timeout) are
  IDENTICAL to the Batch-1 baseline and are NOT introduced by Batch 3 (the sandbox button, gallery branch,
  and console banner are additive render paths that the walkthrough's non-sandbox/featured-pair flow never
  enters as error sources). Verified by re-run: same 2 items, same text.

## DEV-B2 — Batch 2 (R1 commitment beat + travelling recap · R2 exit pulse): NO design flaws found, implemented as specified

Both features landed exactly per `batch2-design.md` + the REVIEW.md adjudications, on top of Batch 1 and Batch 3.
No DEV-B2-x design-flaw fix was required in app code. Notes:

- **Both adjudicated tiers shipped:** (1) the AI recap-intro tier (`SYSTEMS.recap` + a `recap:true`
  `/api/coach` branch that sits past the A4 gate/bucket/timeout, vocab-linted defensively, degrades to
  silence); (2) pulse + commitment offered in BOTH `share` and `closed`; (3) recap delivery offers both —
  file-save (`save-recap`, primary) **and** copy-to-clipboard (`copy-recap`, secondary); (4) 30-day
  resurfacing left out of scope (phase-2).
- **Recap is off-server and survives the 48h TTL:** `saveRecap` builds a complete standalone `<!doctype html>`
  string client-side from wire state (rule-assembled floor via `judgeLedger`/`recapFacts`/`canvas.baseline`),
  wraps it in a `Blob([html],{type:'text/html'})` + `URL.createObjectURL`, and triggers an `<a download>`
  (the `saveRaceCardPng` idiom) → the file lands on the participant's disk, never on the server, so the
  room sweep cannot delete it. Tertiary `window.open` fallback for sandboxed browsers; `copyRecapText`
  clipboard fallback. F-R1b-1 asserts the HTML carries no `http(s)` asset refs (truly portable/offline).
- **AI intro inlined before download, never stored server-side:** `saveRecap` does a best-effort 6s-timeout
  `/api/coach {recap:true}` and inlines the reply ONLY when `!j.degraded` — a degraded/failed/timed-out call
  silently ships the rule-assembled recap. No chat post, no server persistence (which would die with the room).
- **`becameLine` extracted** from `raceCard` (small DRY refactor) so the race card and the recap share one
  "what it became" source; the now-dead `agents`/`transformed` locals in `raceCard` were removed. `save-card`
  UAT check guards the race card text against the refactor (green).
- **Projection widening is null-leak-safe:** `teamPublic`'s member map gains `commitment`/`pulse`; both are
  server-gated to `share`/`closed`, so pre-reveal they are always `null` on the (member-carrying) stub —
  nothing leaks across teams pre-reveal. The §16.2 stub-shape sweep asserts an exact stub-object key set
  + canvas/teardown absence, which the member-internal widening does not disturb (still green).
- **qa-hostile count: 69 → 70** (deliberate, per the design's mandate to lock the new fields' visibility
  rules in qa-hostile). The added check `LEAK surface (B2): commitment/pulse null on pre-reveal members`
  asserts both fields are null on own + other team members during `surface`. The build-task gate line said
  "qa-hostile 69" but also explicitly required adding the projection-null-pre-reveal check — the added check
  wins; new total 70, all green.
- **`qa-batch2.js` (20 checks):** commitment/pulse phase-gate (surface/rebuild reject), self-authz (pre-join
  rejected; member A cannot target member B — A's own field is written instead), clamps (text ≤400; sliders
  `Number→finite→0-10 round/clamp`: `9e9`→10, `7.6`→8, `-5`→0, `42`→10, `'banana'`→null), projection
  (null pre-reveal, full + aggregate at share), and the recap (assembles from wire state, no external refs;
  value sentence present-with-baseline / omitted-without; `recap:true` no-key → degraded, AI intro omitted).
- **a11y:** the two range sliders are wrapped in `<label>` with visible text + a live value readout
  (`aria-label` + `aria-valuetext` on input); textareas carry `aria-label` + placeholders; buttons have
  text. `qa-a11y.js` re-run green (33). `editingLock` extended to `.commitcard textarea, .pulsecard textarea`
  so re-renders defer while typing (device-death debounce parity).
- **qa-walkthrough console-error log:** the same 2 pre-existing items as the Batch-1/Batch-3 baseline
  (`/img/icon.svg` 404 from `manifest.json` + the long-flaky `close workshop` click timeout). Batch 2's
  share/closed cards + the Farrier `pulseBoard` are additive render paths; identical 2-item log, same text.

## DEV-B2 critic-loop fixes (2026-06-13, 4 Opus critics ran a real multi-device workshop)

Three critics returned findings; all confirmed and fixed (the 4th — integration — signed off YES with zero defects). Fixes are minimal and regression-checked; all 9 suites re-run green after.

- **M-1 (HIGH, rule #2) — `BANNED_VOCAB` was base-form-only.** The shared pre-reveal vocab-lint (server.js
  `BANNED_VOCAB`, mirrored client-side in the whisper box) matched only base word-forms, so common
  inflections that fully name the surprise slipped through: `swapping`, `swaps`, `redesigns`, `re-design`,
  `re design`, `rebuilding`, `transferring`, `handsover`. A Farrier whisper "start rebuilding it" during
  surface/rebuild would land on the team's own Coach rail pre-reveal. **Fix:** each stem now allows
  `(s|ing|ed)` suffixes + tolerant `[\s-]?` separators inside hyphenated/multi-word terms
  (`re[\s-]?design(s|ing|ed)?`, `hand[\s-]?s?[\s-]?over(s|ing)?`, etc.). Verified: blocks all inflections,
  over-blocks no innocent word (`design`, `building`, `understand`, `redesignation`, `transferable` all pass).
  Applied to BOTH the server constant AND the client mirror. Regression guard: **qa-batch1 H-R7-3b**
  (inflected `rebuilding/swapping` whisper → error + chat unchanged); qa-batch1 17→18.
  **M-2 (MED)** — R5 synth/cluster + my R1b recap AI replies use the same regex for their pre-broadcast
  belt-and-braces lint, so the same hole would have let an inflected banned word through an AI reply; the
  regex fix closes it for every consumer at once (untestable without a key; offline path was already clean).
- **S1 (CRITICAL) — a malformed JSON frame could crash the whole process.** JSON can carry
  `{"toString":"x"}`/`{"valueOf":"x"}` with NON-callable string values, which makes `String(obj)`/`Number(obj)`
  THROW ("Cannot convert object to primitive"). The `ws.on('message')` switch had no try/catch, so ONE
  ~40-byte frame would kill every room: **S1a** unauth `ping` with an object `workshopCode` (pre-switch
  `String(msg.workshopCode)`); **S1c** my new `commitment:submit`/`pulse:submit` (object `text`/`aha`/slider);
  **S1d** `chat:post` (object `content`); **S1e** `canvas:update` block text via the core `str()` helper.
  **Fix (two layers):** (1) wrapped the whole resolve+dispatch in a try/catch → a throw degrades to dropping
  that ONE message + a logged `ws_msg_throw` (rule #8, never crash); (2) made the sanitize choke point
  `str()` object-safe (objects/arrays → `''`) + `pulse:submit`'s `clampN` object-safe, and routed the
  member-writable handlers (`commitment`/`pulse`/`chat:post`/`farrier:whisper`) through `str()`. Verified
  via **qa-hostile H18a–f** (6 checks: each crash payload fired, server asserted still-alive + functional;
  server log shows the throws CAUGHT as `ws_msg_throw`, not a crash). qa-hostile 70→76. *(S1 is a hardening
  gap that predates Batch 2 for the ping/chat/canvas paths — but Batch 2's two handlers added fresh instances
  of the class, so the fix ships with this batch.)*
- **F1 (HIGH, visual) — `glyph()` rendered as literal SVG markup on the public landing.** The R3 sandbox
  button (index.html, Batch-3 code) passed `glyph('i-play')+' …'` as an `el()` *child* (→ `createTextNode`,
  so the raw `<svg>…</svg>` showed as text) instead of via the `html:` attr — the app's front door looked
  broken. Same idiom bug on two Farrier-private surfaces (MED): the sandbox console banner + the R10
  "Gallery (show all)" button. **Fix:** all three switched to `{html: glyph(...)+'…'}`. Testids preserved
  (`sandbox-btn`/`present-gallery` UAT checks stay green). *(These are Batch-1/3 surfaces surfaced in this
  critic cycle; fixed here as the active implementer since one is a broken public front door.)*
- **Deferred to the Batch-1 owner (MED, not Batch-2 surfaces):** F4 R7 whisper-input draft loss on a
  mid-compose broadcast (not in the `editingLock` selector); F5 R4 baseline-strip caret drop on broadcast;
  F6 R4 baseline-strip inputs missing `aria-label`; F7 R5 parking-lot heading contrast 3.66:1
  (`--thin` vs AA `--thin-text`). All MED, all on Batch-1 R4/R5/R7 surfaces — flagged, not fixed in this batch.
