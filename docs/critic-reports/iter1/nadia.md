# NADIA — Flow & Pacing critique (iter1)

**Lens:** the idle states, transitions, the emotional arc. Team **Fleet Ops**, code **VN2E**, live 7-agent run.
**Coverage:** lobby idle (60s observed) · Surface speed-run (94s to a near-green gate) · gate idle (~3 min) · swap reveal · Rebuild entry · Share double-reveal · Closed. Two driver runs (driver1 died at the Rebuild agent-drop — see WTF #1 / owned below; driver2 rejoined for Share + Closed).
Evidence shots: `qa-critic/nadia/00..27-*.png`.

---

## Problems

### 1. The lobby's productive-wait scratchpad is hidden behind a "Let's ride →" click — most people will never see it. (severity: HIGH — flow)
The brief promised a warm-up scratchpad ("jot 'trucks idle while paperwork clears'"). It does not exist in the lobby you land on. The scratchpad ("While you wait — what's broken about it?") only renders **after** you click `Let's ride →`, which sets `me.saddled=true` (index.html:1350-1377). Until you click it, the right pane is a static "Meet your Coach" + 4 vignettes + a CTA — and nothing tells you that clicking it unlocks a cycling warm-up + the frustration pad.
- Evidence: `03/04/05-lobby-idle-0s/30s/60s.png` — across a full 60s of idle I never saw the scratchpad, because nothing prompted the saddle-up click. The pad is gated behind a commitment most participants won't realise is a gate.
- Consequence: the one genuinely productive idle affordance (park frustrations now → they land in the Surface parking lot) is invisible to anyone who waits passively. The "dead room" feeling in the lobby is self-inflicted: the cure is one click away and unsignposted.

### 2. No "how long will I wait?" signal anywhere in an idle state. (severity: HIGH — pacing)
Across both idle moments — lobby and gate-finished Surface — nothing tells a participant how long the wait is or what they're waiting for.
- The participant topbar timer (`#timerlive`, index.html:1007) only renders when the Farrier has **loaded AND started** a clock. In my run a timer did show in Surface ("4:27", `08/09/11-*.png`) — but it's the *work* timer for the current phase, not a "next phase in N min" signal, and pre-start it's simply absent. A team that finishes early stares at a countdown that's about the work they've already finished.
- The lobby shows "waiting for your team to saddle up…" / "the Farrier starts the ride" (index.html:1370) — honest, but open-ended. No ETA, no progress, no "2 of 3 stables ready" (the spec deliberately hides the count fraction).
- Net: the emotional arc has no "almost there" beat. You're done, and the app gives you no horizon.

### 3. Gate-green "polish chips" are thin, and I couldn't even reach them — but on inspection they're busywork, not value. (severity: MEDIUM — flow)
The "polish while the room catches up" affordance is exactly **3 chips** (index.html:1949-1959): two prefill a Coach prompt ("Push me harder on the WHY", "What would trip a newcomer?") and one highlights the parking tray ("Anything still parked?"). They only appear when the gate is green.
- They are pure make-work: re-litigating a map you've already declared done. None of them advances the workshop, surfaces what's next, or tells you how long you'll wait (see #2). For a fast team this is "keep yourself busy", not "use the slack well".
- I never saw them live because my gate stayed RED at "2 to fix" (see WTF #1) — so for my whole ~3-min Surface idle the bottom bar offered only the generic Coach buttons ("What's thin?", "Run the Newcomer check") and the gate chip. Honest boredom curve: minute 1 = re-reading my own map; minute 2 = clicking Coach buttons out of restlessness; minute 3 = waiting, watching a timer about work I'd finished. Genuinely flat.

### 4. The Rebuild canvas is unstable/animating for a window after the reveal — interaction during the assembly stagger is janky. (severity: MEDIUM — transition)
Right after `#reveal-go`, the locked teardown cards re-enter with a left→right "map-build stagger" (index.html:2397-2399, `delete seenBlocks['rebuild-canvas']`). During that window the canvas DOM is churning. My driver's first interaction (drop an Agent block) failed hard: Playwright retried for 30s with "element is not stable / element was detached from the DOM" before timing out (`run.log` FATAL). A human won't crash, but they'll mis-click into a moving target — the very first thing you're asked to do (drop an Agent block) lands on an unsettled stage.
- This is partly my driver's fault (no settle-wait — owned below), but the underlying fact is real: the entrance choreography and first-interaction window overlap.

### 5. Race-card rider line double-escapes the ampersand with 3+ riders ("&amp;"). (severity: MINOR — cosmetic, verified)
`joinNames()` builds "A, B & C" with a literal "&" (index.html:2283), then the race card wraps the whole string in `esc()` (index.html:2299), turning "&" → "&amp;". `el()` appends string children as text nodes (index.html:808), so the keepsake renders the literal characters **"&amp;"** between the last two riders. The fix is to not `esc()` the already-display `riders` string (or to join with an esc-safe separator).
- Evidence: race-card `textContent` = "ridden by Restless Sergeant, Lucky Sundae **&amp;** Lucky Nutmeg" (`run2.log`). Only bites teams with 3+ riders; it's on the one artifact people screenshot and keep.

### 6. The Surface canvas is cramped with the Coach rail open — a 7-block brain-dump overlaps and truncates, with no untangle. (severity: MEDIUM — flow)
In Surface the rail is open by default and the map shares the width. A fast 7-block capture rendered overlapping blocks and a clipped label ("trip card lb…" for "trip sheet"), with the intent block lost entirely (`06/08-*.png`). There's no auto-layout / tidy / fit-to-content to recover from a rushed dump — the thing the product explicitly invites ("brain-dump becomes a living map"). The faster you go, the messier the result, with no cleanup lever.

---

## What's genuinely good

- **The reveal is the strongest moment in the app, and the wait earns it.** Hard cut from a calm cream paper canvas to a full-bleed dark scrim + a red "REDESIGN / DON'T RETROFIT" rubber-stamp slam (`12-reveal-stamp.png`), then the staged twist naming the source team — "you now hold **Ops Crew's** workflow … **nothing to retrofit**" (`13-reveal-twist.png`, index.html:2392-2400). After ~3 minutes of flat gate-idle, the tonal whiplash is exactly right: boredom → jolt. The CSS choreography (scrim 0.24s → stamp slam +0.33s → twist +0.9s → CTA +1.5s) is well-timed; the CTA is held back so you can't skip the beat.
- **The race card feels earned and survives the close.** "ridden by [steeds] · What it was: their real process, warts and all · What it became: 1 AI agent acting, 1 role transformed · 1 people landed · ran at VN2E" + Save card (`24-race-card.png`). It's specific, personal, and persists into the closed view (index.html:1462-1468) so the ending hands you something instead of a dead-end.
- **Presence keeps the lobby from being fully dead.** Between 30s and 60s idle, teammates' steeds cantered onto the fence in real time (`04` vs `05`). The cantering is the only live motion, but it's enough to signal "the room is filling".
- **The reveal copy obeys the secrecy rule and still surprises.** Pre-reveal surfaces ("Newcomer check", "saddle-ready", the lobby copy) never leak swap/rebuild; the surprise is preserved and the twist still lands.

---

## WTF moments

1. **My gate refused to go green on "Intent is a decision, not an artifact" — for an intent literally beginning "decide:".** Gate read "Newcomer check — 2 to fix": `✕ Every phase has moments` and `✕ Intent is a decision, not an artifact` (`run.log`, `08-gate-state.png`). The rule (server.js:162) only fails on artifact-words or <3 words — "decide: investigate or release the truck" passes both. **The real cause: the intent block never committed** (it's absent from the canvas, `06/08-*.png`), and the moment never nested in the phase — both casualties of dropping blocks at x=720 with the Coach rail eating the canvas width. So the gate logic is correct; the surprise is how *easily a fast, rail-cramped capture silently loses a block* and leaves you staring at a red gate you can't explain. A "decide:"-prefixed intent showing as missing is a confusing dead-end for a real user.
2. **The Share staging is invisible if the Farrier advances quickly.** The whole double-reveal exists in one render; only CSS `animation-delay` (sec×0.9s, index.html:2195) reveals sections. In my run the Farrier moved share→closed within ~1s of my rejoin, so I caught the full before/after once (`22-share-reentry.png`) and then the room was closed. The staged ledger-flip / diff-stagger pacing is real in the CSS but utterly at the mercy of the Farrier's timer — a fast facilitator erases the entire emotional payoff of the share-out.

---

## Owned (my driver's bugs)

- **driver1 crashed at the Rebuild agent-drop** because I clicked into the canvas during the post-reveal stagger without a settle-wait (problem #4 is the underlying app behaviour; the crash is mine). I lost first-hand capture of the Rebuild build, the people-landing flow, and the "Build complete" idle nudge. From source I can confirm the nudge exists: all-landed fires a system chat post ~600ms later ("Everyone's landed — solid. While the other stables finish: log another guess…", index.html:2134-2138) and the pill flips to "Build complete — ready for the share-out ✓" — but I did not verify it on screen.
- **My Surface speed-run lost the intent block and the phase-nested moment** (drop coords at x=720 with the rail open). That's why the gate stayed red and I never reached the live polish-chip idle state — I judged the chips from source instead. The 94s speed-run was also slow only because of my 5s inspector waits, not the app.
- **The scratchpad→parking-lot flow (step 2) wasn't exercised end-to-end** — because I never clicked "Let's ride" (which is itself the finding in #1), my `me.scratch` stayed empty, so the parking lot was correctly empty (`07-parking-lot.png` shows "0 not yet mapped"). I verified the wiring from source (`flushScratch`, index.html:1841-1847 / 1869).

---

## Verdict

The emotional arc has **one great beat and a lot of flat air around it.** The swap reveal is genuinely excellent and the ~3-minute idle before it actually sharpens the jolt — but that's the only place the app uses waiting *for* you rather than leaving you *in* it. Everywhere else the idle design under-delivers: the productive-wait scratchpad is hidden behind an unsignposted click (#1), no idle state ever tells you how long you'll wait or what for (#2), and the "polish chips" reward finishing early with make-work, not momentum (#3) — and they're gated behind a green gate that a fast, rail-cramped capture loses a block trying to reach (WTF #1). The transitions are strong where motion is intentional (reveal) and fragile where it isn't (Rebuild entry instability #4, Share staging that a quick Farrier erases entirely, WTF #2). The ending is quiet-but-kind: the race card persists and feels earned (minor escape bug aside, #5). **For a "redesign, don't retrofit" workshop the high is high — but a finish-fast team will spend most of the session bored with nothing the app actively hands them to do, and that's a pacing problem the product can fix without touching the methodology.**
