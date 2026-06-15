# Public-Internet Hardening — Execution & Testing Log

Plan: `docs/superpowers/plans/2026-06-15-public-internet-hardening.md`
Branch: `harden/public-internet`
Started: 2026-06-15

Method: subagent-driven (one implementer subagent per task, sequential — all tasks edit
`server.js` + incrementally build `qa-online.js`, so they cannot run in parallel). Each task
runs its RED→GREEN test; controller verifies diff + output and records here; final code-review
subagent + full regression sweep at the end.

Legend: ✅ pass · ❌ fail · ⚠️ problem found/fixed

---

## Task status

| # | Task | Impl | RED→GREEN | Regression | Notes |
|---|------|------|-----------|------------|-------|
| 1 | Coach spend caps | ✅ | ✅ 0→3 pass | ✅ e2e 34 | `da999ab` clean, no deviations |
| 2 | 6-char codes | ✅ | ✅ 5→6 pass | ✅ UAT 64 · e2e 34 · sandbox 12 | ⚠️ 3 plan gaps found+fixed (see below) |
| 3 | X-Forwarded-For trust | ✅ | ✅ 6→7 pass | ✅ qa-hostile 76 | `eae4ba0` clean, no deviations |
| 4 | Global mint cap | ✅ | ✅ 7→8 pass | ✅ sandbox 12 · scale 12 | `a839418` clean, anchors matched (lines drifted) |
| 5 | WS origin allowlist | ✅ | ✅ 10→11 pass | ✅ e2e 34 | `d4eb96d` clean |
| 6 | Gate /api/diff | ✅ | ✅ 403 verified | ✅ e2e 34 (share 200) | ⚠️ weak test + ordering bug found+fixed |
| 7 | HSTS + CSP | ✅ | ✅ 13→16 pass | ✅ UAT 64, 0 CSP errors | `7819f82` clean, no widening needed |
| 8 | Regression sweep + docs | ✅ | n/a | ✅ ALL 11 suites green | ⚠️ CSP broke qa-a11y CDN axe — fixed |

---

## Detailed records

### Task 1 — Coach spend caps (`da999ab`)
- **RED:** `qa-online: 0 passed, 3 failed` — coach calls hit the real api.anthropic.com (401→degraded), upstreamCalls stayed 0, as expected pre-fix.
- **GREEN:** `qa-online: 3 passed, 0 failed` — 1st/2nd calls reach the mock upstream, 3rd blocked before spend (`degraded:true`, upstreamCalls unchanged at 2).
- **Regression:** `e2e.js` → `✅ ALL PASS — 34 passed, 0 failed`.
- **Controller review:** diff matches plan verbatim (ANTHROPIC_BASE_URL override, COACH_IP/GLOBAL buckets, `coachSpendAllowed`, single gate in handler). No deviations. ✅

### Task 2 — 6-char codes (`0715542` + review-fix `2ffe21f`)
- **RED:** `qa-online: 5 passed, 1 failed` — "new workshop code is 6 chars" failed (was 4-char `HJKZ`); coach checks still green.
- **GREEN:** `qa-online: 6 passed, 0 failed`.
- **Regression:** UAT `64 passed, 0 failed` (verified twice).
- ⚠️ **PROBLEM 1 (plan gap — app-breaker):** the plan listed only `newCode` + two `maxlength` edits, but missed a hardcoded **client join guard** `if(code.length!==4)` at `public/index.html:1537`. With only the planned edits, members could not join at all (6-char codes rejected before reaching the server; UAT 10/12). Implementer fixed it to a `4–6` range (legacy 4-char rooms still join) + de-hardcoded two copy strings. Correct fix, in plan intent.
- ⚠️ **PROBLEM 2 (stale test assertion):** `e2e-playwright.js:63` asserted `/^[A-Z0-9]{4}$/` on the code → updated to `{6}` (test-only).
- ⚠️ **PROBLEM 3 (regression the subagent missed):** controller sweep found **two more** stale `code.length === 4` assertions — `e2e.js:20` and `qa-sandbox.js:21`. Task 2's regression only ran the UAT, so it did not catch that `e2e.js` had regressed to **33/34**. Controller fixed both → e2e 34, sandbox 12 (commit `2ffe21f`). **Lesson:** a code-length change needs the FULL suite sweep, not just the one suite the task names. Logged for Task 8.

### Task 3 — X-Forwarded-For trust (`eae4ba0`)
- **RED:** `qa-online: 6 passed, 1 failed` — spoofed XFF left-entries each keyed as new IP, never throttled (404 loop). **GREEN:** `7 passed, 0 failed`.
- **Regression:** qa-hostile `76 passed, 0 failed` (default HOPS=0 → socket addr, consistent). Controller-reviewed `reqIp` diff: correct. No deviations. ✅

### Task 4 — Global mint cap (`a839418`)
- **RED:** `7 passed, 1 failed` (12 mints, no 429). **GREEN:** `8 passed, 0 failed`.
- **Regression:** qa-sandbox 12, qa-scale 12 (scale mints only 1 — nowhere near 300/hr default). No deviations (anchors matched; plan line numbers had drifted). ✅

### Task 5 — WS origin allowlist (`d4eb96d`)
- **RED:** `10 passed, 1 failed` (disallowed Origin connected). **GREEN:** `11 passed, 0 failed` (allowed connects · disallowed rejected · no-Origin allowed).
- **Regression:** e2e 34 (default allow-all, suites send no Origin). No deviations. ✅

### Task 6 — Gate /api/diff (`d8ed3a8` + test fixes `3496502`, `af72b7f`)
- Implementer added the 403 phase gate; e2e 34 confirmed the legitimate share-phase path still returns 200.
- ⚠️ **PROBLEM 4 (weak test):** the plan's check asserted only `status !== 200`, which passed BEFORE the fix too (a lobby room 404s incidentally) — it didn't actually guard the gate. Controller strengthened it to assert `403`.
- ⚠️ **PROBLEM 5 (test-isolation bug, found by the strengthened assertion):** with the stronger check it FAILED (404) — because `testGlobalMint` drains the global mint bucket (cap 4) and ran BEFORE `testDiffGate`, so the latter's `POST /api/workshop` 429'd → no code → diff GET 404'd, never reaching the gate. The **gate code was correct**; the test order was wrong. Reordered so all minting checks precede the global-mint drain → 403 verified, `12 passed, 0 failed`. **Lesson:** a check that drains a shared limiter must run last; and "not 200" is too weak an assertion to catch a mis-wired gate.



### Task 8 — Full regression sweep (final, all on fresh servers)

| Suite | Result |
|-------|--------|
| qa-online (NEW, self-spawn) | ✅ 16 passed, 0 failed |
| qa-editguard (static) | ✅ 30 passed, 0 failed |
| e2e | ✅ 34 passed, 0 failed |
| qa-batch1 | ✅ 18 passed, 0 failed |
| qa-batch2 | ✅ 20 passed, 0 failed |
| qa-sandbox | ✅ 12 passed, 0 failed |
| qa-scale | ✅ 12 passed, 0 failed |
| qa-scale-ui | ✅ 5 passed, 0 failed |
| e2e-playwright (UAT) | ✅ 64 passed, 0 failed |
| qa-a11y | ✅ 33 passed, 0 failed (after CSP fix) |
| qa-hostile | ✅ 76 passed, 0 failed |

- ⚠️ **PROBLEM 6 (CSP regression, found only by the full sweep):** the new strict CSP (`script-src 'self' 'unsafe-inline'`) blocked qa-a11y's `page.addScriptTag({url: cdn axe-core})` → suite crashed with a CSP-violation Error. The CSP is **correct for the app** (it self-hosts everything by design — CLAUDE.md), so the fix is in the TEST: fetch axe source in Node (no browser CSP) and inject it as inline content (allowed by `'unsafe-inline'`). Restored 33/33 (commit `e01e83f`). **Lesson:** a CSP change must be regression-tested against every browser harness, not just the main UAT — the UAT passed clean; only qa-a11y (which loads an external script) exposed it. The plan's Task 7 named only the UAT for the CSP check; the a11y suite should have been named too.

---

## Final code review (whole branch) — `feature-dev:code-reviewer`

Reviewed `git diff main..HEAD`. **Critical: none.** Findings + resolutions:

- ⚠️ **PROBLEM 7 (Important, real logic bug — fixed `7da9a24`):** `coachSpendAllowed` used `takeToken(room) && takeToken(ip) && takeToken(global)`. `takeToken` is destructive and `&&` short-circuits left-to-right, so when the per-IP/global gate denied, the **per-room token was already consumed** — a throttled IP could silently drain a room's shared coach budget. Fixed: split into non-destructive `peekToken` + `takeToken`; peek all three, then consume. **Verified RED→GREEN:** new `testCoachDrain` (distinct proxy IPs) fails on the old chain (IP-B degraded, 17/18) and passes on the fix (18/18).
- ⚠️ **PROBLEM 8 (Minor — fixed):** CSP relied on the `script-src` fallback for the service worker. Added explicit `worker-src 'self'`.
- ⚠️ **PROBLEM 9 (Minor — fixed):** `/api/diff` had no rate limit. Added its own per-IP bucket (separate from the `/api/workshop` GET bucket so it can't collide with the share-gallery's multi-team fetches).
- ⚠️ **PROBLEM 10 (Minor — fixed):** `originAllowed` admits no-Origin (non-browser) clients even when `ALLOWED_ORIGINS` is set (by design, for native/test clients). Added a startup log so operators know the allowlist only filters browsers.
- ✅ Reviewer adversarially confirmed non-issues: 6-char migration has no stranded 4-char assumptions; `reqIp` XFF index is correct; coach synth/cluster/recap/structure branches all sit AFTER the spend gate (no bypass); `/api/diff` gate runs before any data access; env-gating defaults all preserve LAN behaviour; race-card PNG uses `data:` (not `blob:`), unaffected by CSP.

## Final state — ALL SUITES GREEN
qa-online 18 · qa-editguard 30 · e2e 34 · qa-batch1 18 · qa-batch2 20 · qa-sandbox 12 · qa-scale 12 · qa-scale-ui 5 · e2e-playwright 64 · qa-a11y 33 · qa-hostile 76. (Re-verified e2e/a11y/UAT/hostile after the review fixes.)

## Summary: 10 problems found & fixed during execution
1–3: 6-char code change had hidden length-4 assumptions (client join guard = app-breaker; UAT regex; e2e + sandbox assertions the subagent's narrow regression missed).
4–5: diff-gate test was too weak (passed without the fix) and exposed a test-isolation ordering bug.
6: strict CSP broke qa-a11y's CDN axe load (fixed in the test; app CSP stays strict).
7: **the one real production logic bug** — destructive token-bucket chain draining room coach budget.
8–10: CSP worker-src, diff rate-limit, origin-allowlist operator log (defense-in-depth).

**Key lesson:** narrow per-task regression (running only the suite a task names) repeatedly missed cross-cutting breakage; the full sweep + an adversarial final review caught what the per-task checks did not.
