# Farrier console — critic report (iter2)

**Run:** live room `R4QZ`, full facilitator arc host → lobby → Surface (6m clock) → swap (confirm modal) → Rebuild (amendment adjudicated) → Share (3 pairs presented) → Finish & close.
**Room context (disclosed up front):** no peer agents joined within 7.5 minutes (server disk + on-screen dashboard both showed 0 teams — verified against `data/workshops.json`, not just my DOM probe, per the iter1 lesson). I filled the room with **3 simulated teams / 6 members over raw WS** (e2e.js contract shapes), including realistic gate-green canvases, a parked orphan, rebuild work, and the lock challenge. Every *facilitator-side* surface I'm chartered to verify ran against real server state. The amendment was puppet-sent.
**Driver bugs owned:** my v1 driver wrote the code, then barreled into a disabled "Start Surface" without retrying and stalled the show. I recovered by reading the hostKey from `data/workshops.json` and **rejoining the same workshop as host** — which worked first try (see Good, below). Counts were cross-checked three ways (DOM probe / disk / screenshots) before being reported.
**Evidence:** `qa-critic2/farrier/01..31-*.png` + `90/91-probe-*.png`, `/tmp/hp-critic/farrier-run2.log`, probe transcripts inline below.
**Console/page errors:** zero across the entire run (`PAGE ERRORS (0)`, `farrier-errors.txt` empty).

---

## Fixes verified

**Fix J — amendment card reason unmissable: FIXED.** `20-amendment-card.png`. The card now reads *"AP Squad (sim) wants to amend **intent**"* over a two-column compare — **LOCKED NOW** "decide where to shift stock before we stock out" vs **THEY PROPOSE** "decide which suppliers we pay first each run" — and directly beneath, **`because: "the locked intent names a report, not the decision — we think the real call is which suppliers to pay first"`** at 14px, bolded label, on-screen without scrolling (DOM probe: `visible:true`). The iter1 "decidable on the what, blind on the why" gap is closed. The "Needs you" queue also pinged it: *"a lock amendment request waiting on your call"* (`20`, top strip). Approval round-trip verified server-side: `locked.intent` updated, `amendments:[{from,to,ts}]` logged on the brief, and (fix K, adjacent) a **team-facing system verdict line** landed in their chat — *"The Farrier approved your amendment — the locked intent is now: …"* (disk-verified).

**Fix J — roster surgery above the mirror, visible at 1440×900: FIXED.** `13-drill-roster-position.png`, measured DOM: Roster card y358–521, mirror starts at exactly y521 (now 46vh). Both members render with steed + name, **move-to… select and ✕ remove** controls, fully above the fold. Header keeps `← all teams` / `Preview brief (leak QA)` / `Regenerate` / `Remove`.

**Fix M — phase-aware stat cards in Share/Closed: FIXED.** Share (`23`): **"3 teams / 3 pairs to present / 3 reckonings open / 3 agent blocks built"**. Closed (`31`): same phase-aware set — **no stale "orphans blocking" anywhere** after Surface. The iter1 WTF ("a closed workshop reports 2 orphans blocking") is gone.

**Fix M — "clock loaded — Start when ready" nudge: FIXED.** Surface entry (`11`): nudge visible beside ▶ Start with the loaded 6:00 (DOM probe true). Share (`24`): re-loading a clock re-shows it (probe true). Phase entry auto-preloads the run-of-show default (20/30/10, server `PHASE_TIMER_MIN`), so the nudge appears on every phase entry by construction. Correctly absent at closed.

**Iter1 #4 — "← all teams" back-control: NOT A BUG (cleared by targeted retest).** Isolated probe (`qa-critic2-probe3.js`, throwaway room CVFC; `90/91-probe-*.png`): back-click returns to the dashboard on the **first attempt**, and still works while a member spams canvas updates every 150ms (continuous re-render storm). The iter1 failure was transient/driver-side.

**Iter1 #5 — drill-down bareness: PARTIAL.** Roster is now prominent (above). "Their Coach conversation (live)" renders with real content (`14-drill-coach-conversation.png` — member + coach lines) **but its top lands at y949 on a 900px viewport** — below the fold; a facilitator who doesn't scroll won't know it exists. Small, but it's the same "tools you can't see" genre fix J targeted.

**Iter1 #6 — "0 blocks" metric: not reproduced.** Counts tracked real content all run (`15`: "8 blocks"; rebuild: "1 built" = authored, locked seeds excluded). Not in the fix batch; no longer misleading in practice.

---

## New problems

1. **HIGH — Approving an amendment with an empty proposal blanks the locked constraint.** The client's challenge modal requires only a *reason* (`send-challenge` checks `reason.value.trim()`; `proposed` may be `''`), and server `lock:resolve` applies `locked[field] = req.proposed` unconditionally on approve. Live WS probe (throwaway room 5JTU, `qa-critic2-probe.js`): locked intent BEFORE `"decide which suppliers we pay first"` → request `{proposed:"", reason:"we just disagree"}` → Farrier approves → locked intent AFTER `""`, **and the locked block's on-canvas text is wiped to empty**. The card shows "they propose —", and one Approve click destroys a locked constraint — the single sanctioned rule-4 mutation path can erase the thing it guards. Fix: server-side, refuse approve when `proposed` is empty (or treat as deny-with-note); client-side, require a proposal to send.

2. **MEDIUM — `lock:resolve` is not idempotent (no pending-guard); a double-click corrupts the verdict.** Live WS probe (room XVNS, `qa-critic2-probe2.js`): rapid Approve→Deny on the same request leaves **the lock amended but the request status `denied`**, and the team receives **two contradictory system verdicts back-to-back** ("approved… is now X" then "kept the lock — the original stands. Design around it."). Two further approves appended **duplicate amendment-log entries (3 total) and 4 verdict chat lines**. The card stays clickable until the broadcast re-render (~hundreds of ms) — a trackpad double-tap is enough. Fix: `if (req.status !== 'pending') return;`.

3. **MINOR — the team table's Status/Flags columns are not phase-aware (the stat cards were fixed, the table wasn't).** In Share *and* on the closed room every row reads **"building"**, and the Flags column still carries the Surface-era orphan glyph (`23`, `31`). Harmless at share, but "building" + an orphan flag on a *closed* workshop is the residual cousin of the iter1 stale-stats bug. Suggest share/closed row status = presented/✓.

4. **MINOR — "3 pairs to present" on a closed room is the wrong tense.** Everything has been presented; the label should flip to "pairs presented" at `closed` (`31`). Cosmetic, but the closed screen is the facilitator's last read of the day.

---

## What's genuinely good

- **Host recovery is real, and it saved this run.** Farrier rejoin via persisted hostKey (localStorage seed → auto `join role:farrier`) dropped me back into the same lobby with full control, mid-workshop, zero ceremony (`08-rejoined-console.png`). A facilitator whose laptop dies mid-room genuinely gets their console back. Disk persistence + one-button rejoin = the resilience story works end-to-end.
- **The dashboard reacts live and triages correctly.** Parking one orphan flipped, within a single broadcast: stat card ("1 orphans blocking"), row status (blocked + flag), Coach whisper ("1 orphan(s) to chase"), and a "Needs you" queue entry (`16`). During Rebuild the queue switched to the amendment ping. The console points at the right team at the right moment, all rule-based, AI-free.
- **The swap modal states the consequence with names.** *"Onboard Posse (sim) not redesign-ready — their receiving team inherits a thin brief. [Cancel] [Swap now]"* (`18`) — exactly the right framing for "the timer rules the room" (rule 6 vs rule 3 trade-off, made explicit).
- **The amendment loop is now a complete adjudication instrument:** queue ping → compare card with the team's *why* → one-click verdict → lock + brief log + a team-facing narrated verdict. From "rubber-stamp risk" (iter1) to genuinely decidable. (The two new server guards above are what's left to make it *safe*.)
- **The presenting flow stays effortless:** "On the projector: S&OP Crew (sim) → AP Squad (sim)" banner, Next pair ›, dimmed already-shown chips, Clear projector (`25–28`).
- **Zero console/page errors, again, across a 14-minute multi-actor run** — including a deliberate 150ms-broadcast-storm probe.

---

## Verdict

Every iteration-1 fix in the facilitator's lane landed and is evidence-verified: the amendment card now carries the team's reason and the locked-vs-proposed compare; the roster surgery sits above the mirror and is usable at 1440×900; the Share/Closed stat cards speak the right phase's language; and the loaded-clock nudge removes the "frozen timer" trap — while the iter1 "← all teams" suspicion dissolves under targeted retest (works first-click, even under broadcast storm). The console remains the strongest facilitator surface I've reviewed in this product: recoverable after a host crash, honestly worded at every destructive gate, and triage-accurate in real time with zero errors. But the very mechanism this iteration strengthened — amendment adjudication — hides two unguarded server edges found by contract probing: **approving a proposal-less challenge silently blanks the locked constraint** (one click can erase what rule 4 exists to protect), and **`lock:resolve` accepts repeat verdicts**, letting a double-click amend the lock while telling the team it was denied. Both are two-line server guards. Ship those and the amendment path goes from "decidable" to "trustworthy" — at which point I'd hand this console to a first-time Farrier without a safety briefing.
