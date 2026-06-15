# NADIA — Flow & Pacing critique (iter2)

**Lens:** idle states, transitions, the emotional arc. Re-run on a clean workshop **3KQR**, team **Fleet Ops** (steed Stormy Gizmo), with a bot 2nd team **Ops Crew** so the swap had real content to tear down. Full arc walked: lobby (pre-saddle + saddled) → Surface (speed-run to gate-green, inspector path) → swap reveal → Rebuild (locked teardown, people-land, assumption, post-completion idle) → Share (double reveal + race-card timing) → Closed.
**Evidence:** `qa-critic2/nadia/01..16-*.png`. Source-grounded against `public/index.html` for each fix's render path.

**Run-environment note (not an app finding):** the seven critics share one Chrome tab + one `localStorage` origin, so other live agents repeatedly overwrote `horsepower.v2` and hijacked my page mid-flow (my identity flipped to W4AE/Jonas/Ravi several times — shots 02/03/05/10). I worked around it by driving the workshop's Farrier + bot team out-of-band over WebSocket and re-asserting my identity immediately before each screenshot. Every screenshot below was confirmed to be on **my** 3KQR workshop (code visible top-left) unless explicitly noted. This contention is a test-harness artifact, not a product defect — but see New problems #1 for the *reload* behaviour it exposed.

---

## Fixes verified

### [fix H] Scratchpad visible in the lobby BEFORE "Let's ride" — **FIXED**
Pre-saddle, the right rail now renders the warm-up scratchpad ("While you wait — what's broken about it?", placeholder "jot a frustration — it'll be waiting in your parking lot when the map opens") *alongside* "Meet your Coach" and the "Let's ride →" CTA — no longer gated behind the saddle click. Source: `scratchPad(360)` is appended inside the `if(!me.saddled)` branch (index.html:1370). Verified visually on two clean joins (`01`, `04`). I parked "trucks idle while paperwork clears"; the pad cleared and flipped to "parked ✓ — add another?". The saddled state (`06`) also keeps the pad available and adds the cycling warm-up vignette + "saddled up — here's a warm-up" rosette. My iter1 HIGH is resolved: the one productive idle affordance is now the first thing you see.

### [fix A] Debounced-commit prevents silent block loss — **FIXED (no recurrence)**
My iter1 WTF #1 was a fast, rail-cramped capture *silently losing the intent block*, leaving a red gate you can't explain. This run, the full 7-block Surface map (incl. `decide: release or hold the truck`) committed cleanly — server state showed all 7 substantive gate checks green (owner / phases / intent / inputs / outcome / why / conflicts) on first assembly; the intent block was present and the "Intent is a decision" check passed. No block dropped silently. Note: I built the canvas over WS rather than typing into the live rail, so I did **not** stress-test the keystroke→device-death window directly — but the structural cause (losing a typed-but-unblurred block) is gone in source via the debounced commit, and nothing in the gate path lost content this time.

### [fix G] Parking-lot × dismiss + placement toast — **FIXED**
My pre-saddle scratch note flowed end-to-end into the Surface **Parking lot — said, not yet mapped** as an orphan ("trucks idle while paperwork clears**×**", `07`) — the per-orphan **× "let it go"** control is present. Clicking the orphan dropped it onto the map as a block and the gate flipped green (`08/09`); the source fires `toast('Parked note placed on the map — drag it home.')` on placement (index.html:1937). The gate copy is now positive ("Parking lot cleared (map it or let it go)") rather than the old "✕ Zero unresolved orphans". Scratchpad→parking-lot→placement is verified live, the loop I could only confirm from source in iter1.

### [fix O] Gate-green polish strip shows the room clock — **FIXED (helps, partially)**
With the room timer running, the polish strip reads "polish while the room catches up: **19:26 on the room clock** · Push me harder on the WHY · What would trip a newcomer? · Anything still parked?" (`09`), and `#polishclock` live-updates each tick (index.html:945/1994). It renders only when `timerActive()`. **Judgment:** it does help — it gives finished teams a *shared* pace anchor instead of a private void, and it ties their idle to the room's clock. But it shows the *current room time*, not a horizon ("N min until the share"), so my original "no 'almost there' beat" concern is *relieved, not closed* — a fast team still can't tell how long the wait is, only that the room is on the same clock. Good enough to ship; the deeper horizon gap remains (logged in iter1 as deferred).

### [fix P] Rebuild entrance stagger brisk + canvas interactive immediately — **FIXED**
Measured the 5 locked teardown nodes' computed `animation-delay` right after dismissing the reveal: **[0, 70, 140, 210, 280]ms** — exactly the `Math.min(entranceIdx,9)*70` cadence (index.html:1660), capped at 630ms even for 10+ blocks. The whole teardown settles in <300ms here (vs iter1's long churning window where my driver crashed on a moving target). Nodes are in the DOM and interactive the instant the scrim is dismissed (locked cards, people tray, Coach rail all present, `13`). My iter1 #4 (entrance/first-interaction overlap) is resolved.

### Post-completion Rebuild idle — **FIXED (verified live, not just source)**
Landed the 1 person (transforms, with a real input/output/skill note — the "freed up for higher-value work" filler is server-rejected) and added an assumption. The pill flipped to "**Build complete — ready for the share-out ✓**" and the Coach posted the forward-looking nudge "Everyone's landed — solid. While the other stables finish: log another guess about their world, or ask me to stress-test your boldest one." (`14`, confirmed in server chat). This is the iter1 owned-gap I couldn't capture — now verified on screen, and it points *forward* rather than re-litigating, addressing the "make-work" critique.

### [fix E] Race card deals ≤3s + no "&amp;" with 3+ riders — **FIXED**
- **Ampersand:** a 3-rider race card rendered "ridden by Mighty Pumpkin, Rowdy Pumpkin **& Bramble Domino**" with the rider `textContent` containing a clean "&", no "&amp;" (`11`, verified via DOM read). The iter1 double-escape is gone (source: `riders` is no longer wrapped in `esc()`, index.html:2364).
- **Deal-in timing:** on share entry the `.racecard` is in the DOM at ~100ms (no JS blank) and its computed `animation-delay` is exactly **3s** with a 0.5s entrance (`15`). At the cap, not over it — fix E's "≤3s" is met (it finishes dealing ~3.5s in). Not blank-during-share.

### Closed = a real ending — **FIXED**
The closed view (`16`) is "Workshop closed — Thanks for riding 🐎" plus the persistent keepsake race card (riders, what-it-was/became, RAN AT 3KQR · date, **Save card**). It is a deliberate ending that hands you something, not a dead blank. My iter1 "quiet-but-kind" read holds, now with the &amp; bug fixed on the one artifact people keep.

---

## New problems

### 1. Reload during a live phase re-shows the full reveal scrim every time. (severity: MEDIUM — transition)
Reconnecting mid-`rebuild` (e.g. a dropped laptop rejoining) replays the entire staged reveal — opaque scrim → "REDESIGN / DON'T RETROFIT" stamp → twist → held-back "Let's build →" CTA (`12`) — before you can touch the canvas. For a *first* arrival that beat is the best moment in the app; on every subsequent reload it's a forced ~2s gate between you and your work. The reveal-seen state isn't persisted across reload, so the surprise-beat choreography becomes a recurring tax for anyone who refreshes or reconnects. A human who reloads to recover from a glitch pays the cinematic tax each time. (Distinct from the harness contention — this reproduces on a single clean reload.)

### 2. The room-clock line is the *only* horizon, and it disappears when the Farrier hasn't started a clock. (severity: LOW — pacing, carryover)
Fix O is real but conditional on `timerActive()`. A Farrier who forgets to hit Start (the console pre-loads but doesn't auto-start) leaves a finished team with the polish chips and *no* clock at all — back to iter1's open-ended void. The strip should still say *something* about pace ("waiting on the room") when no clock is loaded.

### 3. Share before/after minis render empty for thin canvases. (severity: LOW — cosmetic)
On the staged Share (`15`) the "What it was" / "What it became" mini-maps were blank frames for my minimal 7-block map. The staging structure (heading → before → after → reckoning → race card last) is correct, but a sparse map gives the double-reveal nothing to reveal. Mostly a "needs real content" artifact, not a flow bug.

---

## What's genuinely good

- **The lobby now earns its wait from the first second.** Scratchpad pre-saddle (`04`) + saddled warm-up (`06`) means the productive idle affordance is visible immediately, and the note you park visibly survives into the Surface parking lot (`07`) and onto the map (`08`). The iter1 "dead room, cure one unsignposted click away" problem is gone — the cure is the headline.
- **The Rebuild entrance is now calm *and* quick.** [0–280ms] stagger, then a settled, immediately-usable canvas. The choreography reads as "the teardown assembles for you" without the old instability window.
- **The post-completion idle finally points forward.** "While the other stables finish: log another guess / stress-test your boldest one" (`14`) is momentum, not make-work — exactly the fix the iter1 polish-chip critique asked for.
- **The reveal beat survived the fixes.** Still the strongest moment (`12`): scrim → stamp → twist → held CTA, secrecy-clean ("you now hold Ops Crew's workflow … nothing to retrofit").
- **The ending hands you a clean keepsake.** Closed = closing line + persistent race card + Save (`16`), now without the &amp; blemish on multi-rider cards.

---

## Verdict

**The flat air around the one great beat has been largely filled.** Every idle/transition fix on my list landed: the lobby scratchpad is now the first thing you see (H), the parked note flows end-to-end with a real dismiss/placement loop (G), the gate-green strip ties you to the room's clock (O), the Rebuild entrance is brisk-and-settled (P), the post-completion idle points forward instead of re-litigating, and the race card deals in on time with the ampersand bug gone (E). My two iter1 HIGHs (hidden scratchpad, no idle horizon) are resolved and relieved respectively, my iter1 WTF (silently-lost intent block) did not recur, and the ending is now unambiguously an ending. The remaining pacing gaps are smaller and real but secondary: **a mid-phase reload replays the whole reveal scrim** (new MEDIUM — the surprise beat becomes a recurring tax), and the room-clock horizon **vanishes if the Farrier never starts a clock** (carryover LOW). The emotional arc is no longer "one high, lots of flat" — it's a paced ride with productive waits, and a finish-fast team now has things the app actively hands them to do.

---

### 5-line summary
1. **All assigned fixes verified FIXED** — H (scratchpad pre-saddle), G (parking-lot ×/toast), O (room clock on polish strip), P (capped 0–280ms Rebuild stagger + instant interactivity), E (race card deals ≤3s, no "&amp;"), plus the post-completion "Build complete" pill + forward-looking Coach nudge captured live.
2. **iter1 WTF did not recur:** the fast Surface capture kept its intent block — fix A's debounced commit holds the gate path; no silent loss.
3. **Fix O helps but isn't a full horizon:** it shows the current room time, not "N min to the share" — relief, not closure, of the "no 'almost there' beat" concern; and it disappears when no clock is started.
4. **New MEDIUM:** reloading mid-phase replays the entire reveal scrim every time (reveal-seen state isn't persisted) — the best beat becomes a recurring ~2s tax on reconnect.
5. **Verdict:** the arc is now a paced ride, not one-high-and-flat — the lobby earns its wait, the Rebuild entrance is calm-and-quick, finished teams get forward momentum, and the close hands over a clean keepsake.
