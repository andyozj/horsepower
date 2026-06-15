# IPO review — product-track decisions (user, 2026-06-13)

## Approved to build
- **R1 + R2** — post-workshop momentum + exit pulse (the verdict pair).
- **R3** — Farrier rehearsal sandbox + seeded worked example.
- **R5** — Coach instant-synthesis (cluster the parking lot + end-of-phase synthesis).
- **R7** — Farrier whisper-to-team (vocab-linted both sides).
- **R4** — capture ontology enrichment, **both halves** (systems/data + today-baseline), as separately-toggleable optional fields. Discipline locked: strictly optional, never gate-blocking, Coach asks only in the "polish while the room catches up" green-and-idle slot; the baseline is *evidence of today*, never an ROI/feasibility judgment of the rebuild.
- **R10** — 6-team scale validation + Share gallery mode (the PRD ceiling is untested).

## TTL decision (revised)
- **Keep the shipped A6 sweep as-is: 48h idle / 24h closed.** No 1-year extension. (No code change — less work.)
- ⚠ **Consequence for R9:** at a 48h TTL, nothing survives long enough to browse, so R9's *server-side* long-term memory — archive/browse-past-workshops and cross-run "most-busted myths" patterns — **cannot exist** and is dropped/deferred. What survives the 48h TTL: (a) **R1's travelling recap** (it lives in the recipient's inbox/link, off-server — unaffected); (b) a lightweight **"re-run" clone of room settings** *if* done at close (no persistence needed). R9's fate = user's call (see below).

## Not yet decided
- **R9** — given the 48h TTL, is R9 dropped entirely, or kept as just "re-run = clone settings into a fresh room at close" (no archive, no cross-run patterns)?
- **R6** — private brain-dump mode.
- **R8** — async pre-work intake.

## Build approach
Each approved item runs the same pipeline used for the engineering work: design doc → adversarial lead review → implement → verify against all suites (+ new checks per item). Sequence/grouping TBD with the user.
