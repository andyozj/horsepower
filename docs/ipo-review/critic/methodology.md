# Methodology & Leak Critic — Horsepower IPO-review batch (R1·R2·R3·R4·R5·R7·R10)

**Critic:** adversarial methodology/leak lane. **Mandate:** find any way the 7 shipped features break a locked Product Rule (CLAUDE.md §1–9) or leak the swap surprise.
**Method:** isolated self-hosted server (`PORT=3401 DATA_DIR=/tmp/hp-crit-method`, AI **OFFLINE** — so every degradation path was exercised live). Drove real WS flows + a second "other-team"/"participant" context and inspected the actual wire state each role receives. 46 custom adversarial probes (probe.js/probe2.js/probe3.js) + the shipped dedicated suites re-run against this server.

**Suite re-run (this server, fresh):** `qa-batch1.js` 17/17 · `qa-batch2.js` 20/20 · `qa-sandbox.js` 12/12 · `qa-scale.js` 12/12. **Custom probes:** 46/46.

---

## Findings table

| # | Finding | Feature | Rule | Severity | Repro | Evidence |
|---|---------|---------|------|----------|-------|----------|
| M-1 | **`BANNED_VOCAB` regex misses common inflections that fully name the surprise** — `swapping`, `swaps`, `rebuilding`, `redesigns`, `re-design`, `re design`, `transferring`, `handsover` all PASS the lint. The single regex is the *named* guarantee of the R7 whisper (and the belt-and-braces lint on R5 synth/cluster). | R7 (+ R5 live path) | #2 pre-reveal vocabulary | **HIGH** | Farrier sends `farrier:whisper {text:"start rebuilding it now"}` during `surface`/`rebuild`; or `"we're swapping it"`. Lint (client **and** server share the same regex) does not trip → the note lands in the **target team's own Coach rail pre-reveal**, naming the swap. | `node /tmp/hp-crit-method/probe.js` row "vocab-lint bypass attempts" → LANDED past lint: `[re-design it, re design the flow, hand   over, swapping it, transferring, handsover, redesigns]`. Regex unit-check: `swapping it now`→PASS, `rebuilding it`→PASS, `redesigns the flow`→PASS, `re-design it`→PASS (while `swap`/`redesign`/`rebuild` base forms BLOCK). server.js:736. |
| M-2 | **R5 live-AI cluster/synth replies are only protected by the same holed regex + the `${SECRECY}` prompt** — an AI reply using an inflected banned word ("…handing it to the rebuilding team") would pass the pre-broadcast lint and reach a pre-reveal `surface` rail. | R5 | #2 | **MED** | No live key in this env, so untested on the live path; structurally the lint at server.js:911/925 uses `BANNED_VOCAB` (same misses as M-1). Offline path is rule-based and clean (verified). | server.js:911 (`!BANNED_VOCAB.test(reply)`), 925. Offline synth/cluster verified banned-word-free (probe2). |

*No CRITICAL findings.* Both findings are inflections of the **same** root cause (the regex word-list), confined to the Farrier-typed whisper and the live-AI Coach reply — never a cross-team or pre-reveal *structural* leak (those are all clean, below).

---

## What is genuinely solid (verified clean, with evidence)

**R7 Farrier whisper — cross-team isolation is structurally impossible.**
- Non-Farrier `farrier:whisper` rejected (`isFarrier(ws)` guard, server.js:1282). A member's whisper never lands. *(probe.js)*
- Clean whisper reaches **only** the target team (lands in `team.canvas.chat` / `team.redesign.canvas.chat`); team B's view of team A is a **stub** (`{id,name,members,gateGreen,hasTeardown}` — no `canvas`, no `chat`). An unseated socket likewise sees only stubs. **No cross-team leak path exists**, the projection (`teamStub`, server.js:631) carries no chat. *(probe.js: "team B cannot see whisper to A")*
- Base-form banned vocab (`swap/redesign/rebuild/handoff/stranger/transfer/...`) blocked server-side, chat unchanged; member `chat:post role:'farrier'` coerced to `'user'` (un-forgeable). *(qa-batch1 H-R7-3/6)*
- Length-clamped (240), rides the per-socket `ws.bucket` (metered). The whisper **never appears on the projected room view** — `viewRoom` (index.html:3428) renders only timer/code/roster/before-after/gallery; chat lives only in member rails + the (never-projected) console. **Console-never-projected rule holds.**

**R3 sandbox — all four leak guards verified live; a participant can never reach it.**
- Guard 2 (server, load-bearing): member `join` → `error` "That code isn't an open room."; `team:create`/`team:join` silently add nothing — even **mid-rebuild** (when teardown/locked cards are live, the worst-case spoiler). *(qa-sandbox 3–5, probe2 "join still refused mid-rebuild")*
- Guard 3: `GET /api/workshop/<sandbox>` → 404. Guard 4: client bounces a non-Farrier holding `state.sandbox` (index.html:1113).
- Refusal copy leaks nothing (no "demo/swap/sandbox/dry-run/rebuild"). Sandbox seeded with **2 gate-green teams + precomputed teardown**, runs the **real `performSwap`** (ring rotation, no self-receive), uses a **non-suite fixture** (Field Service / Onboarding — no AP/ETL collision in screenshots). Farrier-only via hostKey. *(qa-sandbox 1–12, probe2)*

**R4 systems + baseline — strictly optional, never gate-blocking, never a rebuild target.**
- Gate reaches GREEN with **no** baseline/system set (zero new `ok` conditions). *(probe2 F-R4, qa-batch1 F-R4-1)*
- `meta.system` and `canvas.baseline` persist through sanitize + a `knownIds` merge. *(qa-batch1 H-R4a/b)*
- **Baseline does NOT travel onto the rebuild map**: after swap, the rebuild canvas has no baseline blocks, no `canvas.baseline` target, and `meta.system` is not seeded onto locked blocks. The baseline reaches the rebuilding team **only inside `redesign.teardown.brief.baseline`**, framed as "today's numbers" — never an ROI/target anchor on the canvas. *(probe3: 4 explicit non-leak assertions PASS)*
- Neither value travels to another team pre-share (rides inside canvas/teardown, never the stub). *(stub shape verified)*

**R5 clustering/synthesis — never auto-applies, organizes-not-designs, degrades cleanly.**
- A cluster call **never mutates server team state** (no auto-apply; clusters are a response payload only — rule #9). Accept is human-clicked ("✓ make a phase") and creates an **empty phase block named after the theme** for the team to fill — it does not invent content (provoke-not-solve). *(probe3 R5a, index.html:2299)*
- Offline: cluster → honest absence (`degraded:true`, no clusters); synth → rule-based 4-line `synthLines` (non-empty, banned-word-free); both gated to `surface`. Synthesis/cluster live replies are vocab-linted before broadcast (holed per M-1/M-2, but present). *(probe2, qa-batch1 F-R5)*

**R1 commitment + R1b recap — post-reveal only, no pre-reveal reach.**
- `commitment:submit` ignored in `lobby/surface/rebuild` (member stays `commitment:null`); cards (`commitmentCard`/`pulseCard`) render **only** in `viewShare`/`viewClosed` — double-guarded (server gate + client routing). *(probe.js, qa-batch2 H-R1-1, index.html:1634/2704)*
- Recap is assembled **client-side from post-reveal wire state**, downloaded off-server (survives the 48h TTL); AI intro degrades to silence offline; no external asset refs. Pre-reveal, other teams' member `commitment` is `null` in the stub — nothing to leak. *(qa-batch2 F-R1b, probe.js)*

**R2 exit pulse — self-only, clamped, no inter-team scoring.**
- `pulse:submit` always writes `ws.memberId` — a forged payload targeting team B's id/member is ignored; B's members stay `pulse:null`. Confidence clamped 0–10 (`-50`→0, `999`→10); non-numeric → null. Phase-gated to share/closed. The Farrier `pulseBoard` aggregates **within the room** (quotes + a per-team confidence shift) — **no cross-team ranking anywhere**; it lives in the never-projected console. *(probe3 R2, qa-batch2 H-R2-1..5)*

**R10 share gallery — on-device fate guaranteed at N=6; gallery never projects pre-share.**
- The gallery render branch is gated `state.state==='share' && !presentingPairId` (index.html:3461) — in lobby/surface/rebuild `viewRoom` falls through to code+roster, so the whole-room before→after **cannot project before share**.
- At share, every one of 6 teams can compute its own fate on-device (its own `redesign` + the rebuilder-of-its-workflow's `redesign` are both in its FULL view). `present:set` only sets `presentingPairId` (Farrier-only); the contract is intact. *(probe3 R10, qa-scale Scale E + gallery pacing)*

**Offline degradation (rule #8) — every AI-touching new feature degrades, never blocks.**
- With AI OFFLINE: R5 cluster → honest absence; R5 synth → rule-based 4-line; R1b recap → rule-assembled floor (AI intro omitted). All return `200` (+`degraded:true`), none block a gate or stall the room. *(probe2, all green)*

---

## SIGN-OFF

**NO** — not clean for sign-off: **1 HIGH (M-1)** + 1 MED (M-2), same root cause.

**Precise violation to fix before sign-off:** the shared `BANNED_VOCAB` regex (server.js:736, mirrored client-side in the whisper box) only matches base word-forms. It must also catch the inflections that **fully name the swap surprise** — at minimum `swap(s|ping|ped)`, `redesign(s|ing|ed)` + hyphen/space (`re[\s-]?design`), `rebuild(s|ing)`/`rebuilt`, `transfer(s|ring|red)`, `hand[\s-]?s?[\s-]?over`. Suggested: make each stem allow a trailing `(s|ing|ed)?` and tolerate `[\s-]?` inside the multi-word/hyphenated terms. This closes M-1 (R7 whisper — a Farrier typing "start rebuilding" / "we're swapping it" pre-reveal would otherwise leak to that team's rail) and M-2 (the live-AI synth/cluster belt-and-braces lint). All other locked rules (#1–#9) and every cross-team / pre-reveal / projection leak vector verified **clean and structural**.
