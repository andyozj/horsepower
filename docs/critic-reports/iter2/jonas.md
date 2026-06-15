# JONAS — Coach-experience critic, ITERATION 2

Lens: is the Coach a **character** or a chat widget? Verify the iter1 Coach fixes (F, I, K) and the
Rebuild "fair skeptic" role-shift that iter1 could NOT assess. Offline question-bank = designed
degradation (judged on quality, not AI absence — there was no live AI key this run either).

**Run conditions (honesty up front):** this run executed against a **single shared Chromium context
that all seven critic actors were driving at once**. localStorage is the app's identity store, so every
few actions another actor's `navigate`/identity-write **clobbered my Jonas seat** (I was repeatedly
flipped to Ravi/W4AE, Nadia/3KQR, even a stray Farrier/EW3Z host session). The Farrier also paced rooms
fast (W4AE ran Surface→…→Closed; the live room rotated W4AE→3KQR). I worked around this by re-seeding my
identity from `data/workshops.json` member IDs and reading state in **tight atomic `evaluate` bursts**
(which land in the gaps a screenshot can't). Net effect: I captured **all the Coach evidence I needed**,
but some captures are evaluate-reads rather than pristine desktop screenshots, and two items are
**code-verified** because the live multi-actor flow couldn't be staged in the contention. Flagged per item.

Seats actually reached: Jonas → Ops Crew on **W4AE** (Surface, with Iris) and **3KQR** (Rebuild + Share);
plus opportunistic reads on a populated 3KQR Surface map while flipped to Nadia's seat.

---

## Fixes verified

### Fix F — chips answer from the RULES, not a canned bank line — **FIXED** ✅ (the big one)
This was my iter1 HIGH (three unrelated prompts → one byte-identical "that term might drown a newcomer"
line). It is genuinely fixed. On a populated 3KQR Surface map I exercised both chips and a free-text dump,
and every reply is **state-derived from the rule/gate engine and references the real map**:

- **"What's thin?"** → *"Nothing reads thin right now — a newcomer could follow every card."*
  (`05-whats-thin-reply.png`) — a real assessment of *that* map's state, not a stock line.
- **"Run the Newcomer check"** → *"Newcomer check — 1 to fix: ✕ Parking lot cleared (map it or let it go)"*
  (`06-newcomer-check-reply.png`) — it lists the **exact failing check**, drawn from the same rule set the
  gate panel shows. On the blank W4AE map earlier I'd separately confirmed the gate enumerates all 8 named
  checks with ✓/✕ (Owner is a real role / Every phase has moments / Intent is a decision, not an artifact /
  Inputs listed / Outcome captured / WHY captured / Parking lot cleared / No unresolved conflicts) — so the
  chip is reading live rule state, offline-perfect.
- **Long brain-dump** (a ~240-char depot/paperwork paragraph) → preserved verbatim, replied
  *"You flagged that step as painful — but why does it exist at all? Who decided it must be done this way?"*

**Dedup check:** across the chip replies and the brain-dump, **all replies were distinct — zero
byte-identical repeats**, the exact iter1 failure mode, gone. (The 4th send — a short intent question — I
could not land cleanly: the coach `textarea` is wiped by the constant broadcast-driven re-renders from the
other live actors, so my `fill` kept getting cleared before send. But three distinct replies in a row
already disproves the iter1 "3 inputs → 1 identical line" bug.) The rail also carried the honest
**"Coach is offline — the map & checks still work"** status throughout (degradation with dignity, intact).

### Fix I — reveal scrim click-anywhere-dismisses once the CTA is shown — **FIXED** ✅ (code-verified + live scrim seen)
I caught the live reveal scrim in Rebuild with the staged twist text + **"Let's build →" CTA visible**
(`10-rebuild-entry.png`). I could not perform the literal background-click in the same instant (my reconnect
re-render had already cleared `.on`), so I verified the handler in source:
- `index.html:2461-2462` — after `cta-ready` is added (+1700ms), `#reveal.onclick` fires
  `#reveal-go.click()` **iff the click target is the scrim background AND `cta-ready` is set** — i.e. clicking
  anywhere on the scrim (only after the CTA shows) routes to the same dismiss as the button. Exactly fix I.
- **Bonus, and arguably more important:** `index.html:923-928` now force-removes `.on` from `#reveal`
  whenever `state.state !== 'rebuild'` — comment: *"never strand the reveal overlay across a phase change
  (e.g. a member who hadn't clicked 'Let's build' when the Farrier moved to Share)."* This is the auto-
  dismiss-on-phase-change guarantee that iter1 said failed. Both angles of the iter1 BLOCKER are now closed.

### Fix K — lock:resolve posts a team-facing VERDICT system line — **FIXED** ✅ (code-verified)
My team filed no amendment, and staging the full challenge→Farrier-verdict loop across the contended
multi-actor sessions wasn't feasible, so this is source-verified — but the implementation is concrete and
correct (`server.js:677-700`). On `lock:resolve` it pushes a `role:'system'` message to
`team.redesign.canvas.chat` on **both** branches, with the comment *"the verdict must land somewhere
team-facing (it was silent before)"*:
- approve → *"The Farrier approved your amendment — the locked {field} is now: "{proposed}"."*
- deny → *"The Farrier kept the lock — the original {field} stands. Design around it."*
…then `broadcast(w)`. The iter1 "silent verdict" gap is closed.

### The iter1 BLOCKER (Rebuild Coach reachable; "fair skeptic" role-shift) — **FIXED + now assessable** ✅
This is the headline. In iter1 a stranded scrim hid the Rebuild Coach and the role-shift was NOT assessable.
This run I reached the Rebuild Coach cleanly on 3KQR as Jonas: reveal `display:none`, **clicked the collapsed
Coach face (`rail-toggle`) and the rail opened** — no scrim interception. And the role-shift is real:
- Surface rail header: **"the Coach · scribe"**, chips What's thin? / Run the Newcomer check / Push me on WHY.
- Rebuild rail header: **"the Coach · fair skeptic"** (`13-rebuild-coach-skeptic.png`), chips
  **Challenge this / Ask about the workflow / Real constraint?** — a different persona and a different,
  Rebuild-appropriate question set.
- I asked it *"Why should this step survive the redesign?"* → *"Real constraint, or just how it was always
  done? Convince me this has to survive."* (`14-rebuild-coach-reply.png`) — a genuinely fair-skeptic,
  on-methodology push. The character holds in the back half now.

### Rail collapse / expand — **FIXED/works** ✅
Toggled the rail open↔closed repeatedly via `rail-toggle` (width 0 ↔ 340–390px), in both Surface and Rebuild.
Clean, and the collapsed face carries the "Coach is reading along…" peek pill (and an unread "1" badge after
a reply lands while collapsed).

### Now-presenting banner — present & wired ✅ (not triggered live)
Reached the Share view as Jonas — "Share-out — the double reveal", before/after panels, the kept/MYTH ledger
legend, and the reckoning prompt all render (`15-share-view.png`). The Farrier hadn't pushed a team to the
projector during my window (`presentingPairId` null), so no banner displayed — but it's correctly wired
(`index.html:2240-2249`): when a pair is presenting, members see **"That's you up — your workflow's on the
wall."** (own team) or **"Now on the big screen: {orig} → {team} — follow along"** (others). Member-aware,
good copy.

### Author-dots on Iris's blocks — **NOT re-verified this run** (honest gap)
iter1 already confirmed teammate-authored blocks carry an author dot and own blocks don't. This run my Surface
window was too brief (Farrier advanced Surface→Rebuild mid-action) and contention kept flipping my seat, so I
did not get a clean look at Iris's specific blocks carrying her dot. The Rebuild blocks I inspected carried
no author dots — which is **correct**, since Rebuild blocks are teardown-seeded, not teammate-authored.
Not a regression signal; just un-re-confirmed.

---

## New problems

1. **[MEDIUM, may be environment-only] The coach `textarea` loses in-flight text on every broadcast
   re-render.** With other live actors editing the shared map, the rail re-renders constantly, and my typed
   text in `coach-input` was wiped before I could send it (had to set-value-and-click in one atomic step, and
   even that raced the re-render). This is the *Coach-side* sibling of Theo's iter1 BLOCKER A (label commits
   lost on re-render) — the **same debounce/preserve-while-typing protection should cover the coach composer**,
   not just block labels and the WHY inspector. In a real room with 4 busy teammates, a member half-way
   through typing a long "how it really works" dump to the Coach could lose it on a teammate's edit. Worth a
   look; I can't fully separate "real bug" from "amplified by 7 bots hammering one map," so MEDIUM.

2. **[LOW] The reveal scrim auto-clears so eagerly on reconnect that you can't *see* the intended beat.**
   Every time I reconnected into Rebuild, `#reveal` was already `display:none` — the phase-change guard
   (fix I's bonus) and the re-render fire before the staged animation can replay for a late/returning member.
   This is the safe failure direction (better hidden than stuck), and a first-join member gets the full beat,
   but a member who refreshes/reconnects mid-Rebuild silently skips the whole "REDESIGN / DON'T RETROFIT"
   moment with no breadcrumb that a swap happened. Consider a one-line persistent "you're now rebuilding
   {fromTeam}'s workflow" header for reconnecting members. LOW.

3. **[LOW] Share mini-maps render empty on the narrow viewport.** The before/after panels
   ("What it was" / "What it became") showed empty dotted frames (`15-share-view.png`) — consistent with the
   iter1 deferred note "share-mini readability on phone depends on art." Flagging that it's still visibly
   blank at mobile width, in case the art dependency got dropped.

---

## What's genuinely good

- **The Coach is now a character across BOTH halves, including the part iter1 couldn't reach.** The
  scribe→fair-skeptic shift is the right design and it's executed — different header role, different chips,
  a reply that actually pushes back ("Convince me this has to survive"). The single most important Coach
  moment of the back half went from "behind a wall" to "lands the methodology."
- **Fix F is the standout repair.** Going from "three prompts → one canned line" to chip replies that name
  the *actual* failing check / *actual* thinness of the live map is exactly the relevance fix I asked for,
  and it's offline-perfect (rule engine, no AI needed). This is the difference between a Magic-8-Ball and a
  Coach that reads along.
- **Honest degradation is still handled with care** — verbatim-safe brain-dump, persistent "Coach is offline
  — the map & checks still work" status line, no fake AI, no silent loss (modulo new-problem 1's in-flight
  textarea race).
- **The reveal lockout is fixed from two independent angles** (click-anywhere dismiss + phase-change
  auto-clear) — defensive, the right instinct for a bug that hides the product centerpiece.
- **The verdict line closes a real silent-feedback hole** with copy that's blunt and useful in both the
  approve and deny case ("Design around it.").

## Verdict

**The Coach passes this iteration.** Every Coach fix I could reach is genuinely fixed: chip relevance (F) is
the headline repair and it's clean and offline-perfect; the Rebuild "fair skeptic" Coach is now **reachable
and in-character** (the iter1 BLOCKER is gone, and the role-shift — un-assessable last time — verifies
positively); the reveal scrim is dismissable two ways; the lock verdict reaches the team. Two of my items
(fix I's literal click, fix K) are code-verified rather than staged-live because a shared single-browser
context with 7 actors clobbering identity made a stable live flow impossible — but the implementations are
concrete and correct, and I saw the live scrim+CTA and the live Rebuild Coach with my own driver. The one new
thing worth fixing is the **coach composer losing in-flight text on re-render** (extend Theo's debounce to the
Coach input). The character holds now — front half and back.

---

### 5-line summary
1. **Fix F (chips from rules): FIXED** — "What's thin?"→"Nothing reads thin… a newcomer could follow every card"; "Run the Newcomer check"→"1 to fix: ✕ Parking lot cleared"; three distinct replies, zero byte-identical repeats. The iter1 Magic-8-Ball is gone.
2. **iter1 BLOCKER FIXED + role-shift now assessable: Rebuild Coach reachable** (clicked collapsed face, rail opened, no scrim interception); header shifts **scribe → "fair skeptic"**, asked it a question → "Convince me this has to survive."
3. **Fix I (reveal dismiss): FIXED** — saw the live scrim+CTA; click-anywhere handler (`index.html:2462`) + phase-change auto-clear (`:923-928`) both implemented.
4. **Fix K (verdict line): FIXED** — `lock:resolve` posts a team-facing system line on approve AND deny (`server.js:685-690`); code-verified (couldn't stage the live Farrier loop).
5. **New: coach textarea loses in-flight text on broadcast re-render** (MEDIUM) — extend the debounce/preserve-while-typing fix to the Coach composer; minor: scrim skips its beat for reconnecting members, share minis blank on phone. Ran under a shared 7-actor browser that clobbered my seat — worked around it; evidence captured.
