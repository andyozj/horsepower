# IPO review — consolidated findings (5 lenses, 2026-06-13)

Sources: `product.md` · `engineering.md` · `platform.md` · `visual.md` · `ux.md` (all in this dir).
Engineering claims were independently re-verified against `server.js`/`index.html` before consolidation
(maxPayload absence, teamPublic leak, in-place writes, redesign mass-assignment, coach proxy, hostKey — all confirmed).

Ownership: **[BUILD]** = implement now (engineering/critical or cheap-and-necessary).
**[USER]** = strategy/product/visual direction — the user decides.

---

## Cluster A — Server hardening (engineering CRITICAL/HIGH + supporting MEDs) — [BUILD]

The methodology is currently enforced for honest clients only. One pass, ~150-250 lines, no new deps.

| ID | Fix | Sev | Source |
|----|-----|-----|--------|
| A1 | `maxPayload: 256KB` + `sanitizeCanvas()` (counts/lengths/finite-geometry/drop-unknown-keys) on canvas+redesign updates | CRITICAL | eng#1 |
| A2 | Per-role state projection: members get own team full + others as `{id,name,members,gateGreen}`; `receivedFromTeamName` withheld pre-rebuild; Farrier full. Also cap `chat` to last 30 in the wire state | HIGH | eng#2 + plat P2 |
| A3 | Atomic persistence: tmp-write→rename + `.bak` fallback in load() + SIGINT/SIGTERM flush + close | HIGH | eng#3 |
| A4 | Coach proxy: require live workshop code · per-room token bucket (degrade to question bank) · `AbortSignal.timeout(20s)` · cap plain replies 1200 · stop echoing upstream `detail` · "data, not instructions" delimiter | HIGH | eng#4+#13 |
| A5 | `redesign:update` whitelist-merge (canvas+notes only) + strip forged `locked:true` | HIGH | eng#5 |
| A6 | hostKey → 8 chars · 3-strike failed-farrier-join disconnect · per-IP mint limit + workshop cap + TTL sweep (closed>24h, idle>48h) | HIGH (public) | eng#6 |
| A7 | `chat:post`: members forced `role:'user'` | MED | eng#7 |
| A8 | `assumption:resolve`: share-phase + original-team/Farrier only | MED | eng#8 |
| A9 | Member seat token (minted at seat, required for reclaim/rebind) | MED | eng#9 |
| A10 | `lock:challenge` field allowlist `['intent','outcome','trigger']` | MED | eng#10 |
| A11 | Block-merge by id with client `knownIds` (stops cross-member wipes; LWW stays per-node) | MED | eng#11 |
| A12 | Per-socket msg token bucket (~20/s) + skip `bufferedAmount>1MB` sockets in broadcast | MED | eng#12 |
| A13 | nosniff/frame-ancestors/referrer headers · health `{ok,ai,workshops,uptime}` + 503-on-shutdown · JSON-line logger | LOW | eng#14 |
| A14 | Reconnect jitter/backoff client-side; "forget this room" for Farrier hostKey | LOW | eng#15 |
| A15 | Rate-limit + trim unauthenticated `GET /api/workshop/:code` | LOW/MED | eng#16 |
| A16 | Hostile-payload + kill-restore + concurrent-edit + reconnect-storm + authz-matrix test suites | — | eng tests 1-5 |

## Cluster B — Accessibility & platform resilience — [BUILD: quick wins + fonts + keyboard layer; defer the rest]

Performance measured CLEAN (1.9ms renders, flat heap, 121fps — record as diligence asset, do NOT add framework/morphdom).

| ID | Fix | Sev | Source |
|----|-----|-----|--------|
| B1 | `#toasts` → `role=status aria-live=polite` (+`role=alert` warns); announce state edges not ticks | H | plat A2 |
| B2 | Drop `maximum-scale=2` from viewport meta | M | plat A6 |
| B3 | `<main>`/`<header>` landmarks + one (sr-only) heading per view | M | plat A5 |
| B4 | aria-label sweep on title-only controls (timer custom, zoom −/+/⤢, ?) | L (axe serious) | plat A7 |
| B5 | Focus restore across render() by data-testid (extend toolRestore pattern) | H | plat A3 |
| B6 | `#reveal-go` takes focus; confirmModal → native `<dialog>`/focus trap | M | plat A4 |
| B7 | Race-card PNG: DPR-scale backing store + `document.fonts.ready` | M | plat E1 |
| B8 | Reduced-motion `change` listener | L | plat A8 |
| B9 | Canvas keyboard layer (~120 lines: roving tabindex, focus→select, arrow-nudge, Enter-place, A-arrow-mode, announcements) — the ACR-defining item | H | plat A1 |
| B10 | Self-host Fraunces/Inter/Caveat woff2 (CDN = identity SPOF on venue LAN) + minimal service worker + manifest | M | plat P3 |
| B11 | Export pack `@media print` + `print-color-adjust` + label wrap | L | plat E2 |
| B12 | gzip for hosted; Web Locks multi-tab; View Transitions for phase swap; `@starting-style` | L | plat P4/P5/platform-fits |

## Cluster C — UX (outward benchmark) — [USER decides; reconnect banner is BUILD-adjacent]

1. QR join on room view (S) — top friction moment; vendor 1-file QR lib. 2. **Reconnect banner + unsynced cue (S) — [BUILD] it completes rule #8 for transport.** 3. Per-user scoped undo (M) — the verdict pick; every 2025 canvas has it. 4. Selection presence (M) — makes soft-locks visible; beats cursors. 5. Farrier spotlight in Share (M). 6. Drag-out auto-connect ports (M). 7. Marquee select + group drag (M). 8. Ephemeral emotes scoped to lobby/share (S/M). 9. Progressive time disclosure for members (S). 10. Zoom-to-fit + shortcut overlay (S). Do-NOTs: global undo, CRDT, AI auto-layout, projector presence, member alarms, cursor chat, infinite canvas, templates.

## Cluster D — Visual (outward benchmark) — [USER decides]

1. Ink engine v2: vendor perfect-freehand (variable-width strokes; tapered arrows) + corner softening (M). 2. Paper tooth: feTurbulence grain on poster/keepsake surfaces + true letterpress emboss on code/timer thrones (S). 3. Fill the 15 illustration slots via style-anchor pipeline — Coach portrait first (M; biggest emotional upgrade). 4. Race card → true racecard anatomy (saddlecloth number, column rules, tear-off stub) (M). 5. Room view broadcast furniture: persistent lower-third + final-60s choreography (S/M). 6. Riso overprint at celebration moments (S). Do-NOTs: glassmorphism, foil, neobrutalism, clipart, animated grain, aurora-AI gradients.

## Cluster E — Product & facilitation — [USER decides]

R1 post-workshop momentum (now-what beat + travelling recap) + R2 exit pulse — the panel's verdict pair ("build the part of the workshop that happens after the workshop"). R3 Farrier rehearsal sandbox + seeded example. R4 optional systems/data + today-baseline capture (flagged tension: 20-min window — optional only). R5 Coach clustering + end-of-phase synthesis (proposals-shelf, enrichment-only). R6 private brain-dump mode. R7 Farrier whisper-to-team (S, with vocab lint both sides). R8 async pre-work (tensions flagged). R9 workshop memory/archive/re-run. R10 6-team scale validation + Share gallery mode (PRD ceiling is untested). Do-NOTs: leaderboards, participant-visible agenda, AI-generated redesigns, whiteboard parity, AI-gated progression, ROI calculators in Rebuild.

---

## Execution plan
1. Solution scouts design Cluster A (full hardening, diff-level) and Cluster B (quick wins + keyboard layer + fonts/SW) — judged and iterated by the lead until satisfied.
2. Implement A + B (+ C2 reconnect banner). Verify: full suites + new hostile-payload/authz tests.
3. Final report; C/D/E presented as the user's decision list with effort/impact and the scouts' approach sketches.
