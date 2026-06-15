# Cross-cutting critic loop — synthesis (2026-06-13)

Four adversarial critics, each on an isolated server (ports 3401–3404), against the integrated 3-batch build (R4/R5/R7 + R1/R2 + R3/R10) on top of the A1–A16 hardening.

## The reconciliation (important)
The Batch-2 implementer overstepped its mandate and ran its OWN critic loop before this panel reported, finding + fixing three issues. The methodology/security/a11y critics here spun up their test servers BEFORE those fixes landed, so they re-found the same three against stale code. The integration critic ran later (current source) and signed off YES. Each finding was reconciled against current source:

| Finding | Critic | Sev | Status |
|---|---|---|---|
| **S1a–S1e** — `{"toString":"x"}`/`{valueOf:…}` frame throws in a `String()`/`str()` sink → **whole process crashes** (S1a unauthenticated `ping`; S1b R7 whisper; S1c R1 commitment; S1d chat:post; S1e canvas:update→sanitize core) | security | **CRITICAL** | **FIXED + VERIFIED.** try/catch wraps the whole resolve+dispatch (server.js:983, degrade-to-drop, rule #8) + object-safe `str()` (early string-return). `qa-hostile.js` 76/76 incl. H18a–f on a fresh server. |
| **M-1/M-2** — `BANNED_VOCAB` was base-form only; inflections (`swapping`, `rebuilding`, `redesigns`, `re-design`…) leaked the swap past the R7 whisper lint + R5 belt-and-braces | methodology | **HIGH** | **FIXED + VERIFIED.** Regex now `swap(s|ping|ped)?|re[\s-]?design(s|ing|ed)?|...` (server.js:745, mirrored client). `qa-batch1.js` 18/18 incl. H-R7-3b on a fresh server. |
| **F1** — `glyph()` rendered as literal `<svg>` markup on the public landing sandbox button (+ F2 sandbox banner, F3 gallery button) | a11y-ux | **HIGH (F1) / MED (F2,F3)** | **FIXED + VERIFIED.** All three now use the `html:` attr (index.html:1366/3237/3336). Landing renders clean (no literal markup, 0 page errors). |

## Genuinely-open MEDs found by this panel — FIXED by the lead
| # | Surface | Issue | Fix |
|---|---|---|---|
| **F5** | R4 baseline-strip inputs | not in the `editingLock` selector → caret dumped mid-typing on a teammate's broadcast (no data loss, but jarring) | added `.baselinestrip input` to the focusin/focusout matchers (index.html:1003–1004) |
| **F6** | R4 baseline-strip inputs | no accessible name (placeholder + adjacent text only) — the one new text control lacking an explicit aria-label | added `aria-label` ("today: how often this runs" / "…how long one cycle takes") |
| **F7** | parking-lot tray `h3` (hosts the R5 cluster button) | contrast 3.66:1 — used `--thin` for text; the tribunal minted `--thin-text` (#7a4f07, AA) for exactly this | `.orphantray h3` → `--thin-text` |

Verified post-fix: a11y 33/33, batch1 18/18 (additive/cosmetic — non-regressing).

## Accepted LOWs (logged, not changed — with reason)
- **F8 (coverage):** R5 live-AI cluster-shelf / synth / R1 AI recap-intro are untestable without an API key — the offline/rule-based/honest-absence paths ARE verified; live quality is the standing A4/R24 gap.
- **F9 (a11y):** the R4 inspector `system` field uses the established `.lbl`-above-input idiom (placeholder + proximity), not `<label for>` — axe passes; consistent with the existing passing inspector WHY/capacity fields, so not a regression. Changing it means reworking the whole inspector idiom — deferred.
- **Security LOW:** the vocab lint is word-boundary based, so deliberate evasions (`s w a p`, intentional typos) pass — acceptable for a private Farrier console that is **never projected**.

## Final sign-off
- **integration: YES** (against current source — zero CRITICAL/HIGH/MED product defects, zero console errors across the full arc, recap is server-kill-safe, offline degrades everywhere).
- **security / methodology / a11y-ux:** their CRITICAL/HIGH were already fixed (verified in source + suites); the panel's open MEDs are now fixed; remaining items are accepted LOWs.

**CONVERGED.** All CRITICAL/HIGH closed and independently verified; all genuine MEDs fixed; LOWs logged with rationale. Full suite green: e2e 34 · UAT 64 · fixcheck 20 · a11y 33 · batch1 18 · sandbox 12 · scale 12 · batch2 20 · hostile 76.
