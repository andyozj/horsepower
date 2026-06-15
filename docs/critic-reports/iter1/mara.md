# Mara — Affordances & Discoverability critique (iter 1)

**Run:** live workshop `VN2E`, joined as Mara, created team **Credit Desk**, full journey lobby → Surface → swap (received **Fleet Ops**'s teardown) → Rebuild → Share (rebuilt by **Ops Crew**) → closed. Driver: `qa-critic/mara/driver.js`, screenshots `qa-critic/mara/01–24-*.png`, raw probe data `qa-critic/mara/notes.txt`. Zero page/console errors during the whole run. Source claims verified against `public/index.html` / `server.js` line numbers.

---

## Problems

### 1. The WHY behind a thin-flagged block is a native `title` tooltip — the least discoverable affordance on the web. **Severity: HIGH**
Evidence: `public/index.html:1659` — `n.classList.add('thin'); n.title=thin.why;`. The red squiggle (shot `10-thin-flag-hover.png`, notes: `squiggle elements = 1`) tells you *something* is wrong, but the *what to fix* ("set their capacity — operates / accountable / served / informed") lives only in the OS hover tooltip: ~1s hover delay, **never fires on touch (tablets)**, invisible on a projector, weak for screen readers on a `div`. The product's own ingredient cards solve this better — they print an explicit "hover — the why" hint label (`:1598`). The squiggle gets no hint at all. The gate-bar chip duplicates the same sin: `'~ N too thin for a newcomer'` carries the actual reasons only in `title=` (`:1943`). A first-timer sees red ink and a count, and has to *guess* that hovering is the move.

### 2. The gate checklist and assumptions ledger snap shut on every server broadcast — `<details>` open-state is not preserved across renders. **Severity: HIGH**
Evidence: shots `18-assumptions-open.png` (ledger open, explainer visible) → `19-assumption-logged.png` (one second later, **collapsed**, because logging the assumption triggered a broadcast → full re-render). Same for the gate: my driver clicked the gate summary (log `14:14:23 opened gate`), and the screenshot taken **one second later** (`09-gate-checklist-expanded.png`) shows it already closed — the checklist text was only recoverable via DOM `textContent` (notes line: `GATE TEXT: Newcomer check — 2 to fix ✓ Owner is a real role ✕ Every phase has moments …`). Cause: `el('details',{'data-testid':'gate'})` (`:1961`) and `el('details',{class:'assumefloat'})` (`:2144`) are recreated **without** `open` on every `render()`. In a real room — 7 teams, full-state broadcasts on every edit, presence ping, timer event — these widgets are effectively un-openable: they close *while you are reading them*. The two methodology widgets that most need reading (what's left to fix; what we're guessing) are the two that fight you.

### 3. Every broadcast tears down and rebuilds all canvas DOM — hover information is structurally unstable. **Severity: HIGH**
Evidence: notes line — `hover locked failed: locator.scrollIntoViewIfNeeded: Element is not attached to the DOM … element is not stable`. My driver could not even *hover a locked card* because the node was destroyed and recreated under the cursor mid-action (`:1585` — `world.querySelectorAll('.node, .ingcard, …').forEach(n=>n.remove())` on every render). For humans this means: locked-card tips (`.locktip`, `:270`) and ingredient-card WHYs (`:542`) — which are *only* reachable by hover (see #1) — get torn down mid-read whenever anyone in the room edits anything. Hover-gated information + DOM churn is a compounding failure: the info channel and the stability it requires are both missing.

### 4. The parking-lot drop is a silent teleport, and it left my room in a contradictory state. **Severity: MEDIUM-HIGH**
The interaction *does not explain itself*: clicking a parked orphan instantly creates a `moment` block at a **hardcoded (140,140)** (`:1900`) — no animation, no placement choice, no cue connecting the chip to where it landed (the spec'd orphan-fly FLIP motion is unbuilt; confirmed live). In shot `08-parking-lot-after-drop.png` the dropped block reads as a small near-empty box I never aimed anywhere. Worse, ~30s after the drop the gate still read `✕ Zero unresolved orphans` *and* `✕ Every phase has moments` had regressed from green (notes `GATE TEXT`), i.e. normal, sanctioned parking-lot use put the gate in a state I could not reconcile with what I'd just done. (Possible contributor I own: the orphan chip carries `animation:wiggle 3s infinite` (`:302`) — a perpetually **moving click target**, hostile to precise clicks and to tablets; my driver's click may have partially raced it. Either way, both halves are product problems.)

### 5. The rosette celebrates a transient gate-green, then vanishes without retraction. **Severity: MEDIUM**
Shot `07` captured the toast "Rosette earned — saddle-ready. A newcomer could ride with this" — fired the instant the gate computed green. Within the same minute the gate showed "Newcomer check — 2 to fix" and the rosette element was gone (notes: `ROSETTE present = 0`). The micro-win is granted on a volatile snapshot and **silently revoked**; nothing tells the team they lost saddle-ready status or why. A room running on a projector would carry a false "we're done" memory into the swap.

### 6. Share promises "the reckoning" and then renders nothing — no empty state, and no kept/MYTH ledger at all for my team. **Severity: MEDIUM**
The share intro literally says: *"Then the reckoning: confirm or bust what the rebuilders assumed about your world"* (shot `21-share-arrived.png`). Ops Crew logged zero assumptions, so the "Your turn — was it true?" section simply doesn't render (`:2219` — guarded on `assumptions.length`), with **no explanation**. Notes: `turnSeen? false`, `no confirm/bust controls present`, and `.led` count = **0** — the kept/MYTH constraint ledger never rendered on my page either (`LEDGER before/after: (none)`). The page sets up the methodology's payoff and then ghosts it. I could not evaluate ledger live-update on a bust (nothing to bust) — flagged as *not evaluated*, not as passing.

### 7. The banned-note rejection is a transient toast detached from the card it rejects. **Severity: MEDIUM**
Evidence: shot `16-people-reject-toast.png` — bottom-center toast: *"Freed up for higher-value work" is rejected — name input, output, and the skill.* The toast **teaches** (names exactly what to provide) — good. But it's ephemeral, renders far from the people card, and the card itself shows zero error state: the landing buttons just silently stay un-set (`landed-count` stayed `0/1`). On a tablet held at arm's length or in a noisy room you'd miss the toast entirely and conclude the button is broken. Inline, persistent rejection on the card is the correct affordance.

### 8. A phase flip silently discards in-flight edits. **Severity: LOW-MEDIUM**
My agent block "pre-underwriting screen agent" was dropped right as the Farrier flipped rebuild→share; the palette accepted the gesture, then the block evaporated (notes: `agent blocks on rebuild = 0`; shot `20` already shows the Share page). The server phase-gating is correct (the timer rules the room), but the *client gave no feedback* that the edit was rejected — no toast, nothing. I own that my driver's timing raced the flip; the silent-discard behaviour is still the product's.

### 9. Entire teardown card species can be absent, while the legend promises them. **Severity: LOW**
The rebuild arrival legend says "locked cards are law · gold cards are maybes · **red are worries**" — but Fleet Ops's teardown contained zero concern cards (notes: `CARD concern: NONE present`). The taxonomy lesson references a species that may not exist in your hand, with no "no worries flagged on this one" note. Minor, but to a first-timer the legend now reads as something they're failing to find.

### 10. Share/closed payoff content sits below the fold with no scroll cue. **Severity: LOW**
At 1440×900 the share page shows exactly the two before/after cards (shot `21`); the diff strip, ledger, "your guesses" section and race card all live below the fold with no affordance that more exists. The intro text references "the reckoning" that is (when present) invisible without an unprompted scroll.

---

## What's genuinely good

- **The Newcomer-check checklist wording is excellent** (`server.js:159-168`): "Owner is a real role", "Intent is a decision, not an artifact", "The WHY is captured behind key cards" — eight plain-language, rule-evaluable checks a first-timer can act on. The problem is keeping it *open* (#2), not the content.
- **The people tray is the best self-explaining widget in the app** (shot `15`): "everyone lands — that's the deal", per-option title hints, and — standout move — it **pre-warns the exact banned phrase** ("'freed up for higher-value work' won't pass") *before* you try it. The rejection toast then teaches rather than scolds. Teach-before, teach-on-failure: correct pattern.
- **The assumptions explainer earns its place**: "Couldn't know something about their world? Log the guess and keep building. At the share-out, the team who lived this process confirms ✓ or busts ✗ each one — busted guesses become the conversation." A first-timer understands *why* they're logging guesses. The "no guesses yet? suspicious…" nudge is a genuinely clever prompt.
- **The rebuild arrival teaches its taxonomy in one line** ("locked cards are law · gold cards are maybes · red are worries") and candidate cards carry a visible "hover — the why" hint label — the one place hover-info is explicitly signposted (and it worked: shot `14` shows the WHY revealed, card flattening on engage).
- **The inspector ("back of the card") self-explains on click** — per-type questions ("why does this role exist?") and a labelled capacity choice (shot `06`). No hover required: this is the affordance standard the rest should meet.
- **The reveal stamp is unmissable and on-message** (shot `12`), and the **race card keepsake survives the close** with a Save button (shot `24`) — clear, warm ending.
- Warm-up vignettes teach the Coach before you need it (shot `04`).

## WTF moments

1. Got "Rosette earned — saddle-ready" and ~30 seconds later the gate said **"2 to fix"** — no retraction, no explanation, the rosette just ceased to exist.
2. I clicked the gate to read the checklist and **it closed itself before I could read it** (a broadcast re-render). Same with the assumptions ledger, immediately after I used it.
3. Clicked a parked note and it **teleported** to a fixed spot on the map as a barely-legible box — and the gate *still* counted an unresolved orphan afterwards.
4. My hover on a locked card failed with "element is not stable" — the app rebuilds the entire canvas DOM under your cursor whenever anyone edits anything.
5. The share page announced "Then the reckoning: confirm or bust…" and then **no reckoning of any kind appeared**, and no ledger either. Closing line of the workshop methodology, silently absent.

## Driver bugs I own

- My bust attempt targeted `[data-testid=bust-assumption]`, which doesn't exist (the real button is text "✗ busted", no testid) — moot since no reckoning rendered, but my driver would have missed it.
- The agent-block drop raced the Farrier's share flip (my rebuild lens-work ran in the final seconds of the phase); the *silent* discard is the product's, the timing is mine.
- Native `title` tooltips don't render in headless screenshots, so shot `10` can't *show* the thin-flag tooltip either way — the title-only claim is grounded in source (`:1659`), not the pixel evidence.
- Shot `03-lobby.png` is near-blank — taken mid fade-in transition; not claimed as a product bug.
- The share-ledger live-update check came back vacuous (no assumptions to bust); reported as not-evaluated.

## Verdict

Horsepower's *explanatory copy* is top-decile — the checklist, the people tray, the assumptions explainer all teach the methodology in-place, and the one widget with an explicit "hover — the why" label proves the team knows how to signpost. But the *delivery mechanics* undermine the copy at every turn: the app's two core disclosure primitives (hover and `<details>`) are both broken by design — hover excludes tablets/projectors and is torn down by DOM churn; `<details>` state is erased by every broadcast. Add a celebration that silently revokes itself, a parking-lot teleport, and a share page that promises a reckoning it doesn't always have, and the result is a product that *says* all the right things and *shows* them only to a patient mouse-user in an empty room. Fix state-preserving renders + a non-hover WHY channel (tap/click-to-pin, or print the why on the card) and this jumps a full grade. **C+ on affordances today; the copy deserves an A.**
