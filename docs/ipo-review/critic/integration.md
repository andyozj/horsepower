# Integration & Correctness Critic — Horsepower IPO-review (R1·R2·R3·R4·R5·R7·R10)

**Role:** adversarial integration/correctness critic. Focus: do the 7 features (3 batches) *compose*, does data flow end-to-end through the live full arc, does the offline coach degrade everywhere without stalling.
**Method:** self-hosted isolated server (`PORT=3404/3405 DATA_DIR=/tmp/hp-crit-int* node server.js`), driven with multi-actor Playwright (Farrier + 2 teams × 2 members) through the **full arc lobby → surface → swap → rebuild → share → closed**, plus WS-level probes and the batch contract suites. Every page watched with `page.on('pageerror')` + `page.on('console')`.

## Verdict summary

**Zero CRITICAL, zero HIGH, zero MED confirmed product defects.** Every cross-batch seam composes. **Zero console errors and zero page errors** across the entire full journey with all 7 features exercised. The three findings my browser driver first flagged were all proven to be **harness artifacts (false alarms)** by targeted follow-up probes — see the "Investigated & cleared" table. One environmental crash was observed on a **stale** server process and could not be reproduced against current source via the wire.

## What I drove / verified

- Full arc, 2 teams × 2 members + Farrier, all features used as real users would.
- Cross-feature seams: R4 baseline→R1 recap value sentence (+ survives swap), R4 systems→teardown, R4+R5, R2 pulse + R10 gallery + R1 commitment on the same share/closed screen, Farrier pulse-board + present-picker/gallery together, R3 sandbox→R10 gallery→real swap/reveal, R7 whisper during rebuild while R4 inspector / R5 synth in use.
- Concurrency: two members editing Surface, baseline + meta.system survive a teammate `knownIds` merge commit.
- Reconnect: member reload at share → commitment + pulse rehydrate.
- The recap artifact: triggered the real download, opened the generated HTML **standalone via `file://` with the server killed** — complete and self-contained.
- Offline coach (no key) degradation on every AI surface.

## Findings table

| # | Sev | Title | Status |
|---|-----|-------|--------|
| I-1 | HIGH→**CLEARED** | "R4a systems did not carry into rebuilding team teardown" | **False alarm** — driver read the wrong team's teardown (it read Alpha, which rebuilt Bravo's system-less workflow). Focused probe: the team that *received Alpha's* workflow correctly carries `teardown.systems=[Salesforce/input, SAP ERP/phase]`. |
| I-2 | HIGH→**CLEARED** | "R4b baseline did not carry into teardown brief" | **False alarm** — same wrong-team read. Probe: team rebuilding Alpha carries `teardown.brief.baseline={40x/month, 3 days}`. Pre-swap precompute + post-swap rebuild teardown both correct. |
| I-3 | MED→**CLEARED** | "R7 whisper not visible during rebuild" | **False alarm** — rail is collapsed-by-default in Rebuild (by design); driver's toggle selector failed to open it. Server lands the note in `redesign.canvas.chat` (role:farrier, no cross-team leak, unread badge breathes); forcing `railOpen=true` renders "From the Farrier: …" correctly. |
| I-4 | (env) | `TypeError: Cannot convert object to primitive value` @ server.js:1102 (`chat:post`) crashed a server process | **Not reproducible against current source via the wire.** JSON-over-WS can't carry a null-proto/poisoned object, so `String(msg.content||'')` never throws from a real client (verified: `{}`/array/nested/null all survive). The crash occurred on a **stale 3404 process being hammered by foreign traffic** (100+ identical whispers, codes EHSN/9E9W not from my driver — another process shared the port). `qa-hostile.js` (75 checks) passes and the server stays alive. Flagged for awareness only; if a non-wire internal caller ever passes an object as chat content this line is unguarded, but no such caller exists in the 7 features. |
| I-5 | (env) | batch1 H-R7-3b / H-R7-4 failed on the 3404 process | **Stale process.** The `BANNED_VOCAB` regex on current source (server.js:745) correctly matches inflected forms (`rebuilding`/`swapping`/`re-design`); against a **fresh** server `qa-batch1.js` passes 18/18. The 3404 process predated the M-1 inflection fix. |

## What composes cleanly (verified positively)

- **R4 systems + baseline → teardown (the methodology raw-material path).** Pre-swap `maybePrecomputeTeardown` and post-swap rebuild teardown both carry `systems` (flat, on input/phase/agent) and `brief.baseline`. Re-precomputes on each `canvas:update`, so late-captured systems/baseline still land.
- **R4 baseline → R1 recap value sentence (the whole reason R4b exists).** `buildRecapHTML(t)` for the team whose canvas holds the baseline emits `Today: this ran 40x/month, taking 3 days …` — verified in-DOM AND in the actually-downloaded `.html`. Survives the swap (recap reads original team's `canvas.baseline` from FULL share-state). Baseline absent → sentence omitted, no `undefined`.
- **R1b recap is genuinely server-kill-safe.** Downloaded blob is 2.8KB, **zero external `http(s)` refs**, opens standalone from `file://` with the server dead — baseline + commitment + ledger all render, 0 errors.
- **R2 pulse + R10 gallery + R1 commitment on one share/closed screen.** All three render together (commit-card, pulse-card, race-card, ba×2, save/copy-recap) with no layout collision; persist to member objects; available again at `closed` (timer-overrun path).
- **Farrier share console stacks R2 pulse-board AND R10 present-picker + Gallery button together**, pulse-board reflects submitted data, no collision.
- **R10 gallery.** Featuring `null` renders the contact-sheet wall (`.roomview.gallery .gcell` ≥2); featuring a pair still renders exactly 2 `.ba-card` (e2e contract intact); 6×5 scale suite green (12/12).
- **R3 sandbox → R10 gallery → real swap/reveal.** `sandbox-btn` mints 2 seeded gate-green teams w/ teardown; real `performSwap` rotates them (`sb-fs↔sb-ob`); gallery renders in the sandbox share; Guard 3 `GET /api/workshop/<sandbox>` → 404; **0 console/page errors**.
- **R7 whisper.** Reaches the targeted team's rail (surface + rebuild), invisible cross-team (stub has no chat), server vocab-lint blocks banned + inflected vocab, unread badge breathes, un-forgeable via `chat:post`.
- **R5 degrades cleanly offline:** synth → rule-based 4-line `synthLines` reading the real canvas (intent/accountable/pains/agents); cluster → honest absence (`degraded:true`, no fake clusters); recap AI intro → `degraded:true`, rule-assembled floor stands. Cluster reply is `${SECRECY}`-prompted AND `BANNED_VOCAB`-checked server-side before broadcast.
- **Concurrency (DEV-B1-1 class):** baseline `40x/month`/`3 days` and `meta.system` (Salesforce/SAP) **survive a teammate's `knownIds` merge commit** — the `mergeCanvas` baseline-preserve + sanitize allowlist hold.
- **Reconnect:** member reload at share rehydrates commitment + pulse from member-object projection.
- **No base-journey regression:** `e2e.js` 34/34, `qa-hostile.js` 75/75, `qa-batch1` 18/18, `qa-batch2` 20/20, `qa-sandbox` 12/12, `qa-scale` 12/12 — all green on a fresh server.

## Notes / watch-items (non-blocking)

- **server.js:1102** `String(msg.content||'')` in `chat:post` is unguarded. Unreachable from the JSON wire today, but if a future internal caller passes a non-stringifiable object it would crash the process (no try/catch around the WS message switch). Cheap hardening: wrap the coercion (`try{}catch` → drop the message) or the whole switch. Not introduced by these 7 features; out of scope but worth a follow-up.
- Tests must run against a **freshly started** server; a stale process produced two spurious batch1 failures and the crash I witnessed. Recommend each suite mint its own room and CI restart the server per run (already the e2e idiom).

## SIGN-OFF

**YES — SIGN OFF.** Zero CRITICAL/HIGH/MED confirmed product defects in the 7 features or their seams; zero console errors and zero page errors from the new features across the full arc; all cross-batch integrations compose and flow data end-to-end; the recap artifact is correct and server-kill-safe; the offline coach degrades everywhere without stalling. The two environmental issues (I-4 crash, I-5 vocab failures) are stale-process artifacts that do not reproduce against current source.
