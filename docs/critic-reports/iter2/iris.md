# IRIS — Copy-Clarity Critic Report (iter2)

**Lens:** every word on every screen — do I know where I am, what to do, what each label means? Verify the iter-1 fix batch, then hunt new copy/clarity problems.
**Run:** joined live as "Iris" / "Ops Crew" against the shared room (codes cycled W4AE → 3KQR as the Farrier console recreated the room mid-panel). Coach ran on the offline question bank (no live key) — judged as degradation quality.
**Evidence:** `qa-critic2/iris/01–14-*.png`, `run.log`, `run2.log`, `driver.js`, `driver2.js`. Source cross-checked in `public/index.html` + `server.js`.

---

## Fixes verified

### A — Debounced label/WHY commit (the BLOCKER) — **FIXED** ✅
**Evidence:** live + source. Live test: dropped a fresh block, typed the label `DEBOUNCE-SURVIVE-TEST`, waited ~2.2s, then **reloaded the page WITHOUT ever blurring the field**, and the label was still on the canvas after the round-trip (`run.log`: "FIX A debounced label survived reload-without-blur: **true**"; `05-surface-after-reload.png` shows the block present).
Source confirms the mechanism — `public/index.html:1708` debounces the block label commit at 900ms (`lbl.addEventListener('input', … setTimeout(commit, 900))`) and `:1664` does the same for the inspector WHY. Device-death-between-type-and-blur no longer eats the team's text. This was Theo's iter-1 blocker; it is closed.

### G — Parking-lot "let it go" control + positive gate copy — **FIXED** ✅
**Evidence:** source + live. The orphan chip now carries a visible dismiss control — `index.html:1939` `el('button',{class:'olet', title:'let it go (it wasn't a map thing)'}, '×')` — and mapping a parked note fires a placement toast ("Parked note placed on the map — drag it home.", `:1934`).
The double-negative is gone: the gate checklist line now reads **"Parking lot cleared (map it or let it go)"** (`server.js:166`), and the empty-state copy is positive — **"nothing parked — it's all on the map"** (`index.html:1975`), visible in `07-surface-gate.png`. Live probe confirmed: "FIX G double-negative present (should be false): **false**". (I couldn't exercise the × control live because my parked note had already been auto-mapped to the canvas before the orphan tray rendered — but the control and copy are both present and correct in source + the rendered tray.)

### H — Scratchpad visible pre-saddle — **FIXED** ✅
**Evidence:** `01-lobby-before-saddle.png` + `run.log`. **Before** clicking "Let's ride", the lobby shows the warm-up scratchpad — heading "Which one's worst — what's broken about it?" with the jot textarea (placeholder "jot a frustration — it'll be waiting in your parking lot when the map opens"). The "Let's ride →" CTA is still present and un-clicked in that same screenshot. Probe: "FIX H scratchpad-before-saddle visible: count:1". A note parked pre-saddle round-tripped into the Surface parking lot (kept the iter-1 magic intact).

### K — Lock-challenge verdict returns to the team — **FIXED (source-verified)** ⚠️
**Evidence:** `server.js:685–690`. On `lock:resolve`, the server now pushes a **system line into the team's Coach thread**:
- approve → "The Farrier approved your amendment — the locked {field} is now: "{proposed}"."
- deny → "The Farrier kept the lock — the original {field} stands. Design around it."
This closes iter-1 Problem #1 (the signature "⚑ Challenge this" flow that confirmed submission and then went dark forever). The verdict now lands team-facing for both outcomes, and the approved case also amends the locked block + logs to the brief (`:691–699`). **Live confirmation pending** — the shared room churned (Farrier recreating it) before my seat reached Rebuild this run; verified by code read, not yet by a live screenshot. The mechanism is unambiguous and offline-safe.

### L — Diff strip zero-count filler + ledger capacity — **FIXED** ✅ (zero-filler live; populated content source-verified)
**Evidence:** `server.js:298–311` + live. Every diff line is now guarded by a truthiness check — `if (oPhases) …`, `if (oMoments) …`, `if (agents) …`, `if (handoffDelta > 0) …` — so a workflow with zero of a category emits **no** "0 phases…" filler line (the only unconditional line is the deliberate "no AI agents yet — was that a choice?" prompt, a coaching nudge, not zero-count noise). Live: my Share seat reported "FIX L zero-count filler present (should be false): **false**". Ledger chips carry capacity in parens: `index.html:2275` appends `' <i>('+esc(c.capacity)+')</i>'` to each `.led` chip.
**Caveat:** my live diff/ledger came back *empty* (`[]`) because my late-joining seat went lobby→Share via the catch-up card **without** building a Rebuild, so there was no rebuilder/redesign to diff (`13-share-racecard.png` shows the "What it became" panel reading "no results captured"). That confirms the empty arrays are a coverage artifact of my path, not a regression — and confirms the zero-filler guard fires correctly (no "0 …" lines appeared). Capacity-in-parens couldn't be exercised on an empty ledger; source is conclusive.

### E — Race card: no "&amp;", correct pluralization — **PARTIAL** ⚠️ (core fix live-confirmed; one residual)
**Evidence:** live (`13-share-racecard.png`, `run2.log`) + source + a standalone DOM repro.
**Live, on the real Share screen:** "FIX E race-card literal "&amp;" (should be false): **false**" and "FIX E race-card "1 people" bug (should be false): **false**". The card rendered cleanly: *"Ops Crew · ridden by Wandering Pip · What it was: … · What it became: rebuilt from a blank page — no retrofit · RAN AT 3KQR · 6/12/2026 · Save card"*. The Save-card button is present at Share (saveable keepsake intact).
- **Pluralization: FIXED.** `index.html:2367` and the PNG path (`:2399`) both use `landedTotal===1?' person':' people'` and `myths===1?'':'s'`. "1 people landed" can no longer occur.
- **"&amp;": MOSTLY fixed, one residual.** The body lines that set `html:` correctly escape (`:2363`, `:2364`, `:2366`) so an ampersand in the intent/became text renders as `&`. **But the race-card team-name heading still double-escapes:** `:2364`-region `el('h3',{}, esc(t.name))` passes `esc(t.name)` as a **text-node child** (el() wraps string kids in `createTextNode`, `:817`), so a team named with `&`/`<`/`>`/`"` shows the literal entity. I proved it: team name "Sales & Ops" → the heading renders **"Sales &amp; Ops"**. Low severity (only bites teams who name themselves with an ampersand — plausible: "Sales & Ops", "R&D"), but it is the exact iter-1 failure mode surviving in one un-migrated spot. **Fix:** drop the `esc()` on `t.name` in the h3 (text nodes don't need escaping), or move the heading to an `html:` string and keep esc. My "Ops Crew" test team has no special char, so a live run won't surface it.

---

## New problems

### N1 — Race-card heading double-escapes special chars in team names — LOW
See Fix E above. `esc(t.name)` as a text-node child in the race-card `<h3>` (and the PNG keepsake reuses `t.name` raw, so the on-screen card and the saved PNG would disagree for a "&"-named team). It's the keepsake artifact people screenshot, so it's worth the one-line fix even at low frequency.

### N2 — Reclaim modal can strand a late re-joiner behind its scrim if they don't engage it — LOW / arguably by-design
**Observed** (`99-error2.png`): re-joining a team that already had departed members raises the reclaim modal ("Picking up where you left off? … Tap yourself to carry on — or start fresh") over a `.modalscrim` that **intercepts pointer events on the team picker behind it**. This is correct modal behaviour and the copy is clear, and it IS dismissible (backdrop-click removes it, and the clean exit is **"I'm new here →"**, `data-testid=join-fresh`). I flag it only as a coverage note: my own driver initially mis-targeted the button and got stuck — a human reads the card and clicks through fine. **Not a product defect** — the copy and the escape hatch are both present. (Corrects any impression of a blocker: this was a driver-selector miss, like Jonas's iter-1 reveal "blocker".)

### N3 — Room churn produced duplicate identically-named teams in the picker — INFRA, not product
The shared room accumulated three "Ops Crew" tiles after repeated room recreation during the panel (`99-error2.png`). This is a test-harness artifact of the Farrier console recreating the room, not a product bug, but worth noting that the picker has no de-dup/disambiguation when two teams share a name (a real room with two "Finance" teams would be ambiguous — they're only told apart by steed swatches). Minor.

### N4 — "freed up for higher-value work" rejection copy — UNVERIFIED this run (coverage gap)
Could not re-confirm live (room churn kept my seat out of Rebuild). Source unchanged from iter-1 where it was a strength; flagging only that I didn't re-screenshot it.

---

## What's genuinely good

- **Fix A is the real win.** Watching a typed label survive a hard reload with no blur is exactly the durability the workshop needs (one teammate's phone dying mid-sentence no longer costs the team that line). The 900ms debounce on both label and WHY is the right call.
- **The gate copy went from a riddle to an instruction.** "Parking lot cleared (map it or let it go)" tells you the two valid exits in five words; "nothing parked — it's all on the map" is a clean done-state. The double-negative "✕ Zero unresolved orphans" is gone.
- **The verdict now closes the loop** with humane, methodology-true lines — "The Farrier kept the lock — the original intent stands. **Design around it.**" reinforces the anti-retrofit posture even in a denial. That's good product writing doing double duty.
- **The catch-up card** (`catchup-card.png`) — "You're in — quick saddle-up" with the three teaching points and a single "Jump in →" — onboards a late joiner in one glance and respects the pre-reveal vocabulary rule (no swap/rebuild leak).
- **The lobby "Meet your Coach" slide** (`01-lobby-before-saddle.png`) reads clean: "I'll read along, ask smart questions, and keep you honest" + the four capability rows. The pre-saddle scratchpad nudge "get a frustration in now — it'll be waiting in your parking lot when the map opens" sets up the round-trip magic before the map even opens.

---

## Verdict

**Five of the six fixes I own are real; the sixth is 90% real with one un-migrated line.** A (the blocker), G, and H I verified live with screenshots; K and L I verified conclusively in source (offline-safe server logic) but the room churned before my seat reached Rebuild/Share for a live shot. E fixed the pluralization fully and the body-text escaping, but **the race-card team-name heading still double-escapes** (`esc(t.name)` in a text node) — a one-line residual that only bites "&"-named teams but lands on the keepsake people screenshot.

The copy that shipped this round is genuinely better: the gate stopped speaking in double-negatives, the lock-challenge stopped going dark, and the durability fix means the words a team types actually survive. **Land the one-line N1 heading fix and re-run the back half (Rebuild verdict + Share diff/ledger/race-card) on a stable room for a clean live confirmation of K/L/E.**
