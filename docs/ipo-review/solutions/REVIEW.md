# Lead review of solution designs (iterate-until-satisfied record)

## a11y-platform-design.md (Cluster B) — **APPROVED, no revision round needed** (2026-06-13)

Probed and satisfied on:
- B5 focus capture placement (after editingLock early-return; microtask covers all five wipe branches; `activeElement!==body` yield-guard).
- B6 dialog: paddingless-dialog + inner-card isolates backdrop clicks; `page.on('dialog')` inert for `<dialog>`; testids byte-identical; no open animation → suite timing holds.
- B9: keys delegate into the EXISTING scene keydown so label/inspector `stopPropagation` makes typing immune by construction; `focus` (non-bubbling) on nodes can't fire from label clicks; `sel!==b.id` settles the refocus loop in one bounce; Tab exits natively at flock ends (no trap); nudge mirrors the pointer fast-path + debounced commit.
- B10: css2-API-only fetch protects the WONK axis (gwfh would silently drop it); honest secure-context flag on SW/Web-Locks (fonts are the real LAN fix).
- Verification: 12-row suite-assumption audit checks out against my own knowledge of the suites (incl. the modal-confirm and reveal-timing paths the suites click).

Implementation-time verifications (not design changes):
1. The `i`-key inspector target selector (`.inspector textarea, .inspector .capb`) — confirm the capacity-button class name at build time.
2. Post-fetch `document.fonts.check` + wordmark WONK eyeball before swapping the `<link>` out.
3. Ship the SVG manifest icon day one (no 404 noise in qa-walkthrough's console log).
4. R13 fallback (`role=group` + `aria-roledescription`) stays documented in a code comment beside the node role.

## hardening-design.md (Cluster A) — **APPROVED, no revision round needed** (2026-06-13)

Probed and satisfied on:
- Projection matrix: §2.1 consumer table is grep-complete; OWN withholds own teardown (self-spoiler); share/closed = today's full wire (secrecy over by design); STUB keeps members for picker/reclaim; e2e asserts cross-team data only on the farrier socket.
- A9 legacy migration: pre-deploy members (no token) rebind fine (`member.token &&` guard) — no deploy-window lockout; reclaim deliberately tokenless-but-offline-only with rotation.
- A11: crossing-deletes closed by the skip row; knownIds-absent = byte-identical legacy path = e2e untouched + field kill-switch.
- Two consolidated one-liners CORRECTED by the scout (accepted): A10 allowlist must include persona/input (else honest challenges silently drop); A7 must preserve member 'assistant' (the coach relay) and only coerce 'system'.
- CONFIG numbers derived from measured suite peaks (≥5×); H-series tests pin the exploits (H7 is the eng#5 bypass and must flip from passing to failing).
- Suite-edit ledger: exactly 2 hostKey-length asserts. 10 client edits enumerated.

Implementation notes (not design changes):
1. Prefer the separate `coachBuckets` Map (R11) — don't serialize buckets into workshops.json.
2. Verify `GET /api/workshop` client consumers really only check `r.ok` before trimming (A15).
3. `newCode(8)` — confirm newCode takes a length param.
4. Build order as §"Build order"; run §16.2 leak sweep immediately after step 6 (projection).

## Outcome (hardening + a11y)
Both designs approved in one round. Implementation proceeds: Cluster A first (server), then Cluster B (client a11y/platform), suites green between batches, qa-hostile.js + qa-a11y.js written alongside.

---

## Product-track designs (2026-06-13)

### batch1-design.md (R4 + R5 + R7) — APPROVED with adjudications
Verified: R4a `meta.system` sanitize line + R4b canvas-baseline sanitize/merge-preserve (the two hardening traps); R4b correctly chosen canvas-level (not trigger-meta) to avoid leaking timing onto the locked rebuild seed; R7's four hard constraints (authz/bucket/server-lint/clamp) + projection-for-free (whisper in chat → own team via teamOwn, invisible via teamStub) + role un-forgeability; R5's two `/api/coach` branches sit past the A4 gate/bucket/timeout; offline degradation per feature (R4 fully offline, R5a honest-absence, R5b rule-based `synthLines`).
**Adjudications (binding for the implementer):**
1. **REQUIRE R5 AI-reply vocab-lint parity** (the deferred call): server-side `BANNED_VOCAB.test()` the synth + cluster replies before broadcast; on trip, fall back to rule-based (synth) / honest-absence (cluster). The leak risk is real (a stray "rebuild"/"swap" in an LLM line breaks rule #2), the cost is ~2 lines, and with no key the live path is untestable — defensive server lint is exactly right. Reuse the R7 `BANNED_VOCAB` constant.
2. **R4b baseline: SHIP as designed** (canvas-level). The user explicitly approved both R4 halves after the strain was expanded; mitigation is structural (Surface-captured, "Today"-framed, rebuild Coach not told to compare, copy says "not a target").
3. **R4a systems → keep DEFAULT flat raw-material** (do NOT auto-promote to candidateConstraints — avoids HOW-clutter).
4. **R5a accept action: create a named phase** (methodology-aligned).
5. **Rename the console read-only "Coach whisper" column → "Coach read"** in-batch (kills the R7-1 operator-confusion risk; trivial).

### batch3-design.md (R3 + R10) — APPROVED
Verified: sandbox = real workshop + `sandbox:true` + static seeded member records → one Farrier socket renders FULL via the existing A2 projection (no client-sim second-source-of-truth, no per-member sockets); the **four leak guards** (member-join refusal server-side is load-bearing; GET 404; client bounce; codes never projected) + the honest residual (Farrier mis-projecting = facilitation choice, copy-mitigated) — rule #2 preserved; `SANDBOX_TTL_MS` 4h + sweep clause + shared mint bucket; the gallery is room-view-only with `present:set` unchanged (e2e `.ba-card`===2 holds), and "every team sees its own fate" is already N-independent via `viewShare` (gallery is pure projector pacing); seed data namespaced (Field Service ⇄ Onboarding, not the suites' AP fixture).
**Adjudications:** approve all four guards (ship together); keep B.4 view-memoization gated behind qa-scale evidence (don't pre-build); seed data approved.

### batch2-design.md (R1 + R2) — APPROVED
Verified: pulse/commitment on the member object via dedicated `commitment:submit`/`pulse:submit` WS cases (never canvas — right scope/allowlist); the commitment beat is a self-serve card in share+closed (NO 6th phase — correct low-blast call, rule #7 untouched, non-blocking honors rule #6); recap is an off-server self-contained Blob HTML + clipboard (survives the 48h TTL — a server-hosted recap would die with the room, which is the whole point); the projection widening (`teamPublic` member map gains `commitment`/`pulse`) leaks nothing pre-reveal because both are server-gated to share/closed → always null pre-reveal → the widened stub carries only nulls; new WS messages get member-own authz + phase-gate + the per-socket bucket + fresh-literal clamps; R2 fully offline/rule-based.
**Adjudications (deferred decisions resolved):** (1) include the AI recap-intro tier (degrades to silence/rule-assembled — carries `${SECRECY}` defensively); (2) offer pulse+commitment in BOTH share and closed (captures while warm, covers timer-overrun); (3) recap delivery: offer both, file-save first + copy-to-clipboard; (4) 30-day resurfacing stays out of scope (phase-2). The one mild strain (phase-adjacent commitment beat) is accepted as designed — self-serve, non-blocking, no enum change.

### Build sequencing (repo is NOT git → no worktree isolation → sequential server.js+index.html edits)
All three batches edit server.js + index.html, so builds are STRICTLY sequential: **B1 build (running) → B3 build → B2 build → cross-cutting critic loop.** Full 5-suite gate (e2e 34 · UAT 64 · fixcheck 20 · a11y 33 · hostile 69) + the new per-feature checks (qa-batch1/qa-sandbox/qa-scale/qa-batch2) after each build.
