# Horsepower — Load & Latency Report

**Date:** 2026-06-13
**Harness:** `qa-load.js` (raw `ws` protocol-level clients, no browser, no new deps)
**Server under test:** `server.js` (v0.2, **unmodified** — no app-logic changes were needed), isolated instance on `PORT=3502 DATA_DIR=/tmp/hp-load`, restarted (`SIGKILL` by PID) between every level for a clean token-bucket / RSS baseline.
**Machine:** single host (darwin), Node v25.8.0. Harness and server share the same machine.

This is the first real concurrency load test of the shared-map editing path. It measures **real propagation latency** (one member's edit → another member's socket receiving the broadcast `state` that contains it) under realistic and stress concurrency.

---

## What was measured & how

- **Topology:** one minted workshop (`POST /api/workshop`), 1 Farrier (`join` w/ hostKey), N members joined **over WS** (`join` → `team:create` for the first member of each team, `team:join` for the rest) across T teams, then `phase:set surface` so `canvas:update` is accepted. Members join via WS, so the per-IP mint bucket is never the limiter.
- **Propagation latency:** every edit carries a **unique marker block id** (`L{memberIdx}-{seq}`) and a local hi-res send timestamp. When a *peer* member's socket receives a broadcast `state` whose own-team canvas contains that marker, latency = `receive_time − send_time`. Sender-self receipts are excluded; each marker is counted once per receiver. p50/p95/p99/max over all (sender→peer) pairs.
- **Event-loop responsiveness:** a separate probe socket sends `ping` every 500ms and times the `pong` RTT. This isolates server-processing/event-loop lag from broadcast fan-out cost.
- **Throughput:** accepted `canvas:update`s per second vs attempted.
- **Rate-limit drops:** count of `error:'Slow down…'` (the per-socket WS token bucket, `WS_BUCKET` cap 120 / 25 per sec).
- **RSS:** harness spawns the server as a child and samples `ps -o rss= -p <pid>` every 1s; reports start / peak / end.

**Editing scenario:** each member fires a `canvas:update` on a human cadence (2–5s jitter for the escalation; ramped down for the stress runs), adding a fresh marker block and re-sending its small (≤8-block) working set with a correct `knownIds` list so the server's `mergeCanvas` treats each fresh block as a genuine insert (not a peer-deleted echo).

---

## Escalation — realistic human cadence (2–5s/edit)

| users | teams | cadence | prop p50 (ms) | prop p95 (ms) | prop p99 (ms) | prop max (ms) | ping p95 (ms) | edits/s | drops | peak RSS (MB) |
|---|---|---|---|---|---|---|---|---|---|---|
| **30** (6×5, PRD ceiling) | 6 | 2000–5000 | 1.4 | **3.3** | 8.7 | 11.7 | 0.7 | 8.2 | 0 | 68 |
| 60 | 8 | 2000–5000 | 2.9 | 6.4 | 9.0 | 20.9 | 4.5 | 16.7 | 0 | 78 |
| 100 | 10 | 2000–5000 | 6.9 | 21.7 | 55.7 | 180.1 | 8.7 | 28.1 | 0 | 90 |
| 150 | 12 | 2000–5000 | 16.0 | 68.7 | 107.0 | 200.2 | 110.0 | 42.0 | 0 | 136 |

## Stress — hammer cadence (find the ceiling)

| users | teams | cadence | prop p50 (ms) | prop p95 (ms) | prop p99 (ms) | prop max (ms) | ping p95 (ms) | edits/s | drops | peak RSS (MB) |
|---|---|---|---|---|---|---|---|---|---|---|
| 100 | 10 | 400–800 | 389 | 833 | 1065 | 1946 | 1046 | 127 | 0 | 310 |
| 150 | 12 | 300–600 | 1709 | 3043 | 3476 | 4287 | 1941 | 173 | 0 | 674 |
| 200 | 12 | 250–500 | 4681 | 9239 | 11610 | 19019 | 3136 | 286 | 0 | 759 |

---

## Verdict at the PRD ceiling (30 users)

**Excellent — latency is imperceptible.** p95 sender→peer propagation is **3.3ms** (p99 8.7ms, worst single sample 11.7ms), and event-loop ping-RTT p95 is **0.7ms**. For a human-paced workshop where members type/drag a block every few seconds, an edit appears on a teammate's screen effectively instantly — orders of magnitude below the ~150ms "feels instant" bar. Zero rate-limit drops; RSS sits at ~68MB. **The architecture is comfortably over-provisioned for its design target.** It stays imperceptible-to-good well past the ceiling: even at **150 concurrent editors** on realistic cadence, p95 propagation is 69ms (still sub-perceptible) with 0 drops.

> Caveat: these are **server-processing** latencies on localhost (~0 network). A real LAN adds a few ms each way and a real browser adds render cost on top; neither changes the conclusion at 30 users — there are tens of milliseconds of headroom before anything is perceptible.

---

## Where it bottlenecks first, and why

**The wall is broadcast fan-out + per-role projection serialization on the single event loop — not the per-socket buckets, not memory.**

The architecture broadcasts **full state to every socket on every accepted edit**. Each broadcast calls `buildViews(w)` (server.js), which:
1. recomputes `governance()` for every team,
2. builds the full Farrier view, and
3. **`JSON.stringify`s a distinct per-role projection** — pre-share, that's the `unseated` stub view **plus one own-view string per team** (≈ T+2 serialized strings per broadcast), each containing the full canvas of every team.

So the cost of a single edit is roughly **O(edits/sec × (T distinct serializations + N socket sends))**, and the serialized payload grows with total map size. The evidence pins it on serialization/fan-out rather than the event loop's raw responsiveness:

- In the realistic runs, **propagation p95 climbs faster than ping-RTT p95** (100 users: prop 21.7ms vs ping 8.7ms) — the event loop answers a bare `ping` quickly while a `state` broadcast queues behind the stringify/fan-out work.
- The break is driven by **edit rate, not user count.** 100 users at human cadence (28 edits/s) is fine (p95 22ms); the *same* 100 users hammered to ~127 edits/s collapses to p95 833ms with ping-RTT 1046ms — now the event loop itself is saturated because each edit triggers a full multi-string serialization + N-socket fan-out.
- **Knee of the curve ≈ 100–130 accepted edits/sec.** Below it, latency is tens of ms; above it, the single loop can't keep up and both propagation and ping-RTT blow past 1s together.

To contextualize: 30 honest users at a 2–5s cadence generate **~8 edits/s** — about **15×** under the knee. You'd need every one of ~150 users editing roughly 4× faster than humanly plausible, simultaneously, to reach the wall.

## Does the hardening help or hurt under load?

- **Per-socket WS bucket (cap 120 / 25 per sec):** **0 drops at every level**, including the 286 edits/s 200-user hammer — because the bucket is *per socket* and even hammered clients stayed under their individual budget. It correctly never punished legitimate editing. Net: helps (DoS guard) with no measured cost to honest load. It does **not** protect against the aggregate fan-out wall — that's an O(N) systemic cost, not a single hostile socket.
- **Backpressure skip (`bufferedAmount > 1MB` → skip this broadcast for that socket):** the safety valve that keeps a slow socket from growing an unbounded send queue; a skipped socket resyncs on its next message. This is exactly why the server **never crashed or OOM'd** even at 759MB / 9s-p95 — it sheds rather than queues without bound. Net: helps; it's load-bearing for graceful degradation.
- **Per-role projection (the security/secrecy feature):** correct and necessary (it's what stops a member's wire from leaking other teams' canvases pre-reveal), **but it is the dominant per-broadcast CPU cost** — it serializes T+2 strings per edit instead of one. This is the single biggest lever if the ceiling ever needs raising. Net: helps secrecy, costs throughput headroom.
- No `save_failed`, no `ws_msg_throw`, no unhandled rejection, no crash across the entire suite. The server returned a healthy `/api/health` at the end of every level including the worst hammer.

---

## Recommendations

A real ceiling exists (~100–130 edits/s) but it sits **far above any plausible workshop need** (PRD target 30 users ≈ 8 edits/s; even 150 users on human cadence is ~42 edits/s — a third of the knee). So none of the below are needed to ship; they are headroom levers, all respecting the no-build-step / single-file invariant.

1. **Memoize role-views per dirty-tick** *(nice-to-have; already flagged as hardening R23 / B.4).* `buildViews` already builds each role-string once per `broadcast`; the remaining win is to **debounce/coalesce broadcasts** so a burst of edits within, say, a 30–50ms window produces **one** `buildViews` + fan-out instead of one per edit. This directly attacks the serialization cost (the dominant term) and would push the knee up several-fold with a few lines around `broadcast()`. Biggest bang-for-buck if the ceiling is ever approached. **Not needed to ship.**

2. **Team-scoped broadcasts** *(nice-to-have).* Pre-share, an edit to team A's canvas only changes team A's own-view and the `unseated`/other-team **stubs** (which carry no canvas). A team-A edit therefore doesn't need to re-serialize team B's full own-view. Sending each team only the view that actually changed would cut both serialization count and payload size at high T. More invasive (touches the projection map) — defer unless a much larger event is planned. **Not SHIP-worthy now.**

3. **Delta instead of full-state** *(nice-to-have, larger change).* The full-state broadcast is the simplicity that makes the client trivially correct (and reconnect/resync free). A delta protocol would slash payload and serialization but adds client-side reconciliation complexity and fights the "one canonical AI-readable map, server = source of truth" simplicity. Only justified for a genuinely different scale target (hundreds of high-rate editors). **Not recommended** for the current product.

**Recommendation summary:** ship as-is for the workshop's real scale. If you ever want defensive headroom, **#1 (coalesce/debounce broadcasts)** is the one cheap, low-risk, no-build-step change worth doing — and only if a real ceiling pressure appears.

---

## Honest caveats

- **Raw-ws clients are lighter than real browsers** — no DOM/canvas render cost on the receive side, so real per-user device load is higher; but the *server-side* numbers measured here are unaffected.
- **Localhost ≈ 0 network latency** — the propagation figures are **server-processing latency**, not WAN. A real LAN adds a few ms each way; a few ms on top of a 3.3ms p95 is still imperceptible.
- **Single-machine contention** — harness and server shared CPU. At the extreme stress levels the harness itself competed for the loop, so the very worst numbers (200 users / 286 edits/s) slightly overstate server-only latency. This makes the *break* evidence conservative, not optimistic: the real server-only ceiling is at least as high as measured.
- No live AI key was used (Coach proxy is enrichment-only and off the WS broadcast path), so this load test exercises the always-on rule-based broadcast path — which is exactly the path that carries the shared map.

## Reproduce

```bash
node qa-load.js                       # spawns its own server on :3502, runs all 7 levels, prints the table
# raw per-level JSON -> /tmp/hp-load-results.json
```
