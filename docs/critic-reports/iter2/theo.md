# Theo — Orientation & Recovery critique (iter2)

**Lens:** the late arrival who loses a device mid-sentence. Verifying the iter1 BLOCKER fix
(debounced commit, batch A) and my iter1 #2 (catch-up team-state line, batch N), then
re-running the full death/reclaim/refresh gauntlet.

**Run:** the panel room rotated codes during setup (R4QZ → W4AE → **3KQR**, the live one).
Joined `3KQR` late onto **Ops Crew** (a real, 8-block team with an intent already mapped —
ideal latecomer conditions). Authored a block, killed my context mid-WHY without blurring,
rejoined fresh, reclaimed myself, then exercised refresh-resume in **both** Surface and
Rebuild and judged the Rebuild late-join catch-up. 14 shots in `qa-critic2/theo/`. **Zero
page/console errors across every context.**

---

## Fixes verified

### [fix A] Debounced commit — device-death between typing and blur — **FIXED** ✅
The iter1 BLOCKER is dead. I dropped a `phase` block, typed the label `theo-survive-A`,
opened the inspector, typed the WHY `"because device death must not eat this why"`, **made
no further click or blur**, paused ~2.2s, and closed the whole browser context (device
death). Evidence:
- **Pre-kill server truth** (read from a *separate* context, so the read didn't trigger a
  commit): `{"text":"theo-survive-A","why":"because device death must not eat this why"}` —
  the 900ms `input`-debounce on *both* the contenteditable label (index.html:1708) **and**
  the inspector textarea (index.html:1664) fired during the 2.2s pause, committing to the
  server *before* the kill.
- **After device-death + reclaim:** the block came back with its **label AND its WHY intact**
  — not the blank rectangle of iter1. Driver: `LABEL survived device death? true`. Inspector
  re-read after reclaim: `"because device death must not eat this why"`. Server post-reclaim:
  `{text:"theo-survive-A", type:"phase", why:"…must not eat this why", author:"Rowdy Marble"}`.
  Block count went 8→9 and stayed.
- **Evidence:** `07-why-typed-NO-blur.png` (the pre-death state, no blur) → `09-after-reclaim-surface.png`
  (block back on canvas, labelled) → `10-block-inspector-WHY-after-reclaim.png` (inspector
  open, full WHY text present).
- I deliberately gave the debounce its window (2.2s > 900ms). A death *inside* the 900ms
  window would still lose the last keystrokes — but that's a sub-second tail, not the
  blur-shaped hole iter1 found, and it's the right engineering trade for a no-CRDT app.

### [fix N] Catch-up card now briefs you on the *work*, not just the *product* — **FIXED** ✅
My iter1 #2. The card titled "You're in — quick saddle-up" now ends with a live team-state
line. Verified in **both** phases:
- **Surface:** *"Where your team is: 8 blocks mapped — intent so far: 'suppliers paid on time
  so credit terms hold'."* (`03-catchup-card-teamstate.png`)
- **Rebuild:** *"Where your team is: 5 blocks mapped — intent so far: 'decide: release or hold
  the truck'."* (`12-rebuild-catchup-latejoiner.png`)
- Source (index.html:1892-1895) reads the *right* canvas per phase (`redesign.canvas` in
  Rebuild) and degrades correctly: an empty team shows **no** line rather than "0 blocks"
  (confirmed against the empty dup-team). Pluralisation is handled.
- This is the single most valuable latecomer sentence and it's now there. Orientation moved
  from C+ to B+.

### Reclaim ghost-prevention — still **FIXED** (re-confirmed) ✅
After the full death→reclaim cycle the roster held **exactly one** Theo
(`Theo / Rowdy Marble`), never two (`08-rejoin-reclaim-modal.png` lists me as the lone
stranger; post-reclaim server roster `team 2 Theo members: ['Theo/Rowdy Marble/online:false']`).
No zombie member.

### Refresh-resume — still **FIXED** (re-confirmed, both phases) ✅
- **Surface:** reloaded mid-edit; `theo-survive-A` present before AND after
  (`11-after-refresh-resume-surface.png`).
- **Rebuild:** reloaded mid-teardown; all 5 nodes + locked cards + candidate constraint +
  people-landing inspector + assumptions strip + "0/1 landed" pill resumed intact, no reveal
  re-run blocking the canvas (`14-rebuild-after-refresh-resume.png`).

---

## New problems

### 1. [Low] A late joiner in Rebuild replays the full swap-reveal stamp
Joining `3KQR` mid-Rebuild as a brand-new rider ("Pip") fired the `#reveal` stamp
choreography ("Plot twist — you're *not* redesigning yours…") on top of the teardown before
the catch-up card. For a genuine latecomer this is arguably *correct* — they need the
surprise framing to understand why the map is alien — and Fix I makes the scrim dismissible
("Let's build →" / click-anywhere once CTA-ready). But it's worth a conscious decision: a
person who walks in 20 minutes into Rebuild gets the same theatrical reveal as someone who
lived the swap, which can read as "did I miss something?" rather than orientation. Not a
blocker; flag for intent.

### 2. [Low, carried] Catch-up card doesn't re-appear after a hard refresh
On reload `ui.caughtUp`/`ui.joinedMid` reset such that the catch-up card returned `null`
after a Surface refresh (`11`). Harmless — you've already been oriented once and your map is
right there — but the team-state line is genuinely useful and a returning rider mid-session
loses it. Minor.

### 3. [Cosmetic] Duplicate team name "Ops Crew" in the live room
Two distinct teams were both named "Ops Crew" in `3KQR` (a panel-setup artifact, not a
product bug per se) — but the picker offers no disambiguation (no member preview text, no
block count), so a real latecomer choosing between two identically-named stables would be
guessing. The picker rows could show "N riders · M blocks" to disambiguate.

---

## What's genuinely good

- **The blocker fix is real and verified at the data layer, not just the pixels.** I read
  server truth from an independent context before the kill and after the reclaim — the WHY
  round-trips. This was the most dangerous defect in iter1 and it's genuinely closed.
- **The catch-up team-state line is exactly the sentence I asked for**, and it correctly
  pulls from the redesign canvas in Rebuild — someone thought about the phase split.
- **Reclaim modal remains best-in-class** ("Picking up where you left off? … Tap yourself to
  carry on — or start fresh"), my steed shown as a tappable row, honest "I'm new here →".
- **Recovery plumbing is rock-solid end to end:** death→reclaim→refresh in both phases, zero
  errors, no ghosts, no lost geometry, no lost content. The cold-readable Rebuild teardown
  (locked cards / candidate / people tray / assumptions) survives a refresh untouched.

## Verdict

**Both of my iter1 findings are FIXED — the BLOCKER decisively so.** The debounced commit
closes the silent-content-loss hole (verified at the server, both label and WHY survive a
no-blur device death), and the catch-up card now orients a latecomer to *the team's work* in
both Surface and Rebuild. Ghost-prevention and refresh-resume regression-pass. Recovery &
orientation move from "A- plumbing / C+ content" to **A- across the board.** The only residual
items are Low/cosmetic: the late-Rebuild reveal replay (a design intent call, not a bug) and
two minor polish gaps. Ship-clean from my lens.

---

### 5-line summary
1. **[fix A] BLOCKER FIXED** — typed a label + WHY, killed my context with no blur, reclaimed: both survived (server: `why:"…must not eat this why"`; shots 07→09→10). The empty-rectangle data-loss is gone.
2. **[fix N] FIXED** — catch-up card now reads "Where your team is: N blocks mapped — intent so far: '…'" in **both** Surface (8 blocks) and Rebuild (5 blocks); empty teams correctly show no line.
3. **No ghost duplicate** — roster held exactly one Theo through the whole death/reclaim cycle; **refresh-resume** intact in both phases, zero page/console errors anywhere.
4. New issues are all Low: a late Rebuild joiner replays the swap-reveal stamp; the catch-up line doesn't survive a hard refresh; duplicate "Ops Crew" names aren't disambiguated in the picker.
5. **Verdict:** orientation & recovery now A- across the board — ship-clean from my lens.
