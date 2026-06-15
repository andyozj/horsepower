# IPO panel — UX & Interaction review (outward benchmark, 2026-06-13)

Lens: what the wider 2025–26 multiplayer/canvas/live-event world does that Horsepower
lacks **entirely**. Internal critic loops (iter1/iter2) already fixed execution-level UX —
nothing below re-recommends shipped work (inspector, phone lanes, reclaim/catch-up,
share choreography, proposals shelf, needs-you queue, timer-expiry treatment, etc.).

Grounding: full CLAUDE.md read; `public/index.html` flow code skimmed (viewLanding →
viewRoom, `makeCanvas`); live walk of landing → host console → room view at
localhost:3200; member-side phases verified against the 40-shot QA camera
(`qa-shots/`) and 17-shot edge camera (`qa-edges/`). Confirmed-absent first-hand:
QR join, any undo, any connection-status UI (client reconnect is a silent
`ws.onclose → setTimeout(connect, 1200)`), live cursors / selection presence,
follow/spotlight, marquee select, snap guides, drag-out auto-connect, emotes/stamps.

---

## 1. Top 10 recommendations

### 1. QR-code join on the room view (and console) — **S**
- **What:** Projected room view shows a QR alongside the code. Encode
  `http://<JOIN_HOST>/?code=3T34` and prefill the landing code field from the URL
  param. Keep the typed path as fallback.
- **Reference:** Canva Live's presenter bar — "Scan the QR code | Or visit canva.live
  and enter the code A46W 2BBP" ([Mobbin flow](https://mobbin.com/flows/f28f8936-895b-450a-8e9b-5a83c12ba692));
  Slido/Mentimeter join-friction analyses ([StreamAlive](https://www.streamalive.com/blog/7-best-slido-alternatives-in-2026),
  [Kuja Media](https://kujamedia.fi/en/uncategorized/audience-participation-apps-for-events-mentimeter-slido-and-others/)).
- **Fit:** The UX-sense pass already fixed "localhost on the projector" with
  `JOIN_HOST` — this is the natural next step. Typing `192.168.1.15:3200` + a 4-letter
  code on a phone is the single highest-friction moment of the whole workshop, at its
  coldest social moment (room entry). Phones open QRs natively from the camera.
- **Effort:** S — vendor a single-file QR generator (e.g. qrcode-svg, ~1 file, no
  build step) per the "vendoring is the pressure valve" convention. Render once in
  `viewRoom()` lobby throne + console runbar.
- **Rule tension:** none. The code stays projected; the host code stays off the room view.

### 2. Connection honesty: reconnect banner + unsynced-edit cue — **S**
- **What:** Persistent (not toast) banner when the WS is down: "Connection lost —
  reconnecting… your map is safe." Clear on reopen with a brief "back online".
  While disconnected, visually mark the canvas read-or-risky (e.g. dashed outline on
  blocks edited since the drop, or disable commit-feel affordances).
- **Reference:** banner-vs-toast guidance and detect/inform/reassure strategy
  ([Mobbin toast glossary](https://mobbin.com/glossary/toast),
  [Designing for the Offline State](https://medium.com/@mevbg/designing-for-the-offline-state-why-every-web-platform-should-handle-connectivity-gracefully-ee962caf0236));
  Slack's "trying to reconnect" marked-cache pattern ([LeanCode offline design](https://leancode.co/blog/offline-mobile-app-design)).
- **Fit:** Workshop Wi-Fi is hostile territory. Today `ws.onclose` retries silently
  every 1.2 s (index.html:959) — a member on flaky Wi-Fi keeps "editing" with zero
  feedback that nothing is landing; the iter1 device-death data-loss fix (debounced
  commits) protects the data but not the user's *trust*. Rule #8 (graceful
  degradation) is currently honest about AI failure but mute about transport failure.
- **Effort:** S — one banner element wired to `ws.onopen/onclose`, plus a dirty-flag
  on commits attempted while closed.
- **Rule tension:** none — it *completes* rule #8.

### 3. Per-user scoped undo (command-pattern, no CRDT) — **M**
- **What:** Local undo stack per member: you can only undo *your own* changes
  (create/move/resize/delete/label/meta), grouped per gesture (a whole drag = one
  undo). If the target was since deleted/edited by someone else: no-op, exactly like
  Figma and Google Slides. Ctrl/Cmd+Z + a small toolbar button (non-designers don't
  guess shortcuts). Deleting a block could additionally soft-land it in the parking
  lot ("removed — restore?") for 30 s, reusing the orphan tray pattern.
- **Reference:** Liveblocks "How to build undo/redo in a multiplayer environment" —
  "a user may only undo or redo their own changes"; pause/resume history grouping
  ([Liveblocks blog](https://liveblocks.io/blog/how-to-build-undo-redo-in-a-multiplayer-environment));
  Figma's local-undo principle ([How Figma's multiplayer technology works](https://www.figma.com/blog/how-figmas-multiplayer-technology-works/)).
- **Fit:** Every 2025 canvas tool ships undo; Horsepower has **none** (zero hits in
  the codebase) — Delete is irreversible on a *shared* map. For non-designer business
  users the fear of wrecking the team's map is a participation killer; Ravi's
  iter1 "junior hands" verdict was about exactly this population. Local undo composes
  cleanly with the contention rules: undo is just another human touch, sent through
  the normal `canvas:update`; server stays authoritative; no CRDT.
- **Effort:** M — inverse-command stack inside `makeCanvas()`, gesture grouping at
  the existing commit points, stale-target no-op check against current state.
- **Rule tension:** flag — must remain *local* (see Do-NOT #1); locked blocks stay
  excluded (rule #4); Rebuild seeding/teardown ops are not undoable.

### 4. Selection presence: "who's on what" + name-tag outlines (then cursors) — **M**
- **What:** Each member gets their steed-colour; a block being edited/selected by a
  teammate shows a thin coloured outline + tiny name chip ("Silver Bolt"). Phase 2:
  throttled live cursors with name tags. Avatar stack already half-exists (presence
  per member) — surface it on the canvas, not just the roster.
- **Reference:** Figma multiplayer — showing cursor *and selection* of all
  participants "provides important context"
  ([Figma multiplayer blog](https://www.figma.com/blog/multiplayer-editing-in-figma/));
  Liveblocks presence model ([docs](https://liveblocks.io/docs/guides/how-to-use-liveblocks-presence-with-react)).
- **Fit:** This is CLAUDE.md's own §13 gap, but the outward benchmark sharpens the
  ordering: for a SHARED MAP on separate devices, *selection presence* beats free
  cursors — it makes the existing node-scoped soft-lock **visible** instead of
  mysterious ("why won't this move?" → "ah, Copper Dash has it"), and it's cheaper
  (piggyback on existing presence pings; no 30 Hz cursor stream). Author dots cover
  *who made it*; nothing covers *who's on it now*.
- **Effort:** M — extend presence payload with `selId`, render outlines in `draw()`.
  Cursors are a later +M.
- **Rule tension:** none on team canvases. Keep ALL presence off the projected room
  view (it's code/roster/timer by design).

### 5. Farrier spotlight / follow-the-stage during Share — **M**
- **What:** When the Farrier sets `present:set`, members' share view auto-scrolls/
  pans to the presented pair with a dismissable "following the stage — break off"
  affordance; optionally a console "bring everyone here" button. The shipped
  "Now on the big screen" *banner* tells; spotlight *takes you there*.
- **Reference:** Figma/FigJam Spotlight — gather collaborators to follow the
  presenter's view, with notify-and-follow semantics
  ([Figma Help: facilitate meetings with spotlight](https://help.figma.com/hc/en-us/articles/5025214483351-Facilitate-meetings-with-spotlight),
  [Spotlight yourself or other presenters](https://help.figma.com/hc/en-us/articles/24260248467735-Spotlight-yourself-or-other-presenters)).
- **Fit:** Share-out is the payoff moment and the one phase where 20 people must
  attend to ONE artifact; heads-down-in-own-screen is the classic failure. The room
  has a projector, but spotlight closes the loop for people at the back / on phones.
  Scope to Share only — during Surface/Rebuild, autonomy is the point.
- **Effort:** M — server already broadcasts `presentingPairId`; client-side scroll/
  highlight + opt-out state.
- **Rule tension:** none post-reveal. Do NOT add facilitator-follows-team live-view
  beyond the existing console mirror — surveillance feel (see Do-NOT #6).

### 6. Drag-out auto-connect: pull a new block from a node's edge — **M**
- **What:** Hover a block → four small "+" ports; dragging one out creates an arrow
  plus a new connected block at the drop point, with an inline type mini-picker
  (defaulting to a sensible next type, e.g. phase→phase). This collapses the
  costliest loop for novices: palette → place → switch to arrow tool → click-click.
- **Reference:** standard in tldraw/FigJam/Miro connector UX; tldraw ships
  "snapping and alignment, auto-connecting arrows" as table stakes
  ([toolpick tldraw vs Excalidraw 2026](https://www.toolpick.dev/blog/excalidraw-vs-tldraw-2026),
  [AFFiNE tool comparison](https://affine.pro/blog/excalidraw-alternative)); visible
  in Miro's board UX ([Mobbin: Miro canvas](https://mobbin.com/screens/fd5b0ddc-8a20-46b6-9550-d32c67fb6866)).
- **Fit:** Business users think "then THIS happens next", not "now I need the arrow
  tool". Two-click arrows shipped and work; this is the next rung. Workflows are
  linear-ish chains — exactly the shape drag-out serves best. Desktop-first
  (phone palette lanes already solve mobile placement).
- **Effort:** M — within `makeCanvas()`: port hit-zones, ghost-arrow drag, reuse
  existing block-create + arrow-create paths.
- **Rule tension:** none. Keep it off locked blocks' mutation paths (arrows TO/FROM
  locked blocks are already legal).

### 7. Marquee select + group drag (and shift-click add) — **M**
- **What:** With the Select tool, drag on empty canvas = rubber-band selection;
  selected set moves as one; shift-click toggles membership; Delete asks once for
  multi-delete (and respects locked blocks). No group-resize, no grouping objects —
  just move.
- **Reference:** universal in Excalidraw/tldraw/FigJam/Miro (same sources as #6);
  Liveblocks undo guidance assumes gesture-grouped multi-object ops
  ([Liveblocks blog](https://liveblocks.io/blog/how-to-build-undo-redo-in-a-multiplayer-environment)).
- **Fit:** The one moment every team hits: "this phase cluster needs to shift right
  to make room." Today that's N separate drags that fight the 10 s contention
  cooldown N times; one marquee drag = one settle. Directly reduces contention
  churn — it *serves* rule #9 rather than straining it.
- **Effort:** M — selection set instead of single `sel` in `makeCanvas()` (note:
  `ui.selRestore` currently assumes a scalar), one group-translate commit.
- **Rule tension:** minor — group move must still respect per-node soft-locks
  (skip-and-narrate any node a teammate holds).

### 8. Ephemeral emotes/stamps for room energy (scoped to the right moments) — **S/M**
- **What:** Tap-and-burst emoji reactions (✨🔥👏❓) that float up and vanish —
  available in the lobby/paddock, on gate-green rosettes, and during Share
  (cheer the presenting pair, react to MYTH reveals). Deliberately NOT a sticker
  layer on the working map.
- **Reference:** FigJam stamps/emotes/high-fives — temporary reactions to support a
  presenter, lightweight feedback, capture attention
  ([Figma Help](https://help.figma.com/hc/en-us/articles/1500004290981-Stamps-emotes-and-high-fives),
  [FigJam cursor-chat & emotes guide](https://www.alicepackarddesign.com/blog/20-figjam-cursor-chat-trigger-words-and-5-secret-emotes)).
- **Fit:** The participant layer (steeds, rosettes, race card) nails *individual*
  delight but has zero *peer-to-peer* expressive channel — the room's energy
  currently flows only through the Farrier and the Coach. Share-out reactions give
  the double reveal a live audience feel. Collaborative-only constraint holds: no
  counts kept, no leaderboard, purely ephemeral.
- **Effort:** S/M — one new WS broadcast type + GPU-only float animation
  (reduced-motion: skip).
- **Rule tension:** flag — "the working canvas stays calm" (motion design spec) is
  why this must stay OUT of Surface/Rebuild canvases and live in waiting/transition/
  share moments, which is exactly where the motion spec says play belongs.

### 9. Progressive time disclosure for participants (precise clock stays with the Farrier/projector) — **S**
- **What:** Members' always-on timer shows a phase-progress arc/bar (plenty → half →
  final furlong) instead of ticking M:SS for the whole phase; it flips to a real
  countdown only in the last ~5 minutes (the existing final-furlong moment). The
  Farrier console and the projected timer throne stay precise — the room's shared
  clock of record. Honest flag: ambient music / audio cues researched and
  deliberately rejected — no audio infra, rooms run their own sound, and the
  Farrier's voice IS the audio cue (RUNSCRIPT already arms it).
- **Reference:** facilitation-timer research: precise ever-ticking digital timers
  raise anxiety; "out of the way" relative-time displays keep focus; two-stage
  alerts (5-min warn + end) are the recommended pattern
  ([Facilitator Timer](https://apps.apple.com/us/app/-/id6754923369),
  [Learning Loop: Timeboxing](https://learningloop.io/plays/workshop-exercise/timeboxing),
  [DesignSprints.Studio timeboxing](https://designsprints.studio/timeboxing-secret-to-productive-meetings/)).
- **Fit:** "The Farrier's timer always rules the room" (rule #6) is a *social*
  contract — members never act on the clock, so per-second precision on their chrome
  is pure anxiety with no agency. Keeps energy (the arc visibly drains; furlong
  still lands) without 25 people clock-watching.
- **Effort:** S — client-side rendering change on the existing server-held timer.
- **Rule tension:** none — strengthens rule #6. Keep the projector numeric (shared
  truth must stay precise somewhere visible to all).

### 10. Canvas orientation kit: zoom-to-fit + keyboard cheat-sheet overlay — **S**
- **What:** (a) One-tap "fit map" button in the view controls (the phone auto-fit
  logic generalised to desktop); (b) a `?`-key / long-press overlay listing the
  canvas verbs (double-click renames, Esc deselects, Delete removes, two-click
  arrows, drag-out connect…) in workshop language. Optionally double-click empty
  canvas = create-a-block of the last-used type (FigJam/tldraw convention) — cheap
  to add while in there.
- **Reference:** zoom-to-fit + shortcut overlays are baseline across tldraw/
  Excalidraw/Miro ([toolpick comparison](https://www.toolpick.dev/blog/excalidraw-vs-tldraw-2026));
  Miro keeps frames/fit/zoom persistently bottom-right
  ([Mobbin: Miro](https://mobbin.com/screens/fa5c14e2-006e-41b3-a0d9-76fcd8b3460e)).
- **Fit:** First-session users get one ontology tour, then meet a canvas whose verbs
  are discover-by-accident. A 30-second self-serve reference de-loads the Coach and
  the Farrier from tool-support questions mid-phase ("how do I draw an arrow" is the
  classic energy leak).
- **Effort:** S — fit already exists for phone (`_fit`); overlay is one static modal.
- **Rule tension:** none.

---

## 2. Do NOT — patterns that would break the methodology or the room

1. **Global/shared undo or document time-travel.** One member rewinding the team's
   map violates the contention model's spirit ("human touch wins" — *whose*?) and
   would let Rebuild be rolled back across the teardown seed. Per-user scoped undo
   only (rec #3); locked-field history lives in amendments, nowhere else.
2. **Points, leaderboards, streaks, speed bonuses** (Kahoot-style). PRD locks
   collaborative-only; competitive scoring poisons the swap (teams would game the
   teardown). Rosettes/race card are the ceiling.
3. **CRDT/OT adoption "to fix" conflicts.** Locked decision. The contention rules
   ARE the product's answer; benchmark patterns above (presence, scoped undo,
   marquee) all compose without it.
4. **AI auto-layout / "beautify my map" / silent canvas mutation.** Layout-stripping
   at the teardown is methodology (HOW removed, scrambled arrival); and rule #9's
   proposals-shelf principle — AI never silently mutates — must hold for layout too.
5. **Presence, cursors, or team content on the projected room view.** The room view
   is code + roster + timer by design; projecting canvases pre-reveal risks
   leak-by-projector (a glance at another team's map previews the swap).
6. **Always-on facilitator follow-mode of team members** (beyond the existing
   console mirror). Spotlight is for Share; live per-member screen-following during
   Surface/Rebuild reads as surveillance and chills the brain-dump candor the WHY
   capture depends on.
7. **Templates / example-workflow galleries at Surface.** Miro-style template
   pickers anchor teams to generic processes; the methodology needs THEIR workflow
   in THEIR words (the Coach challenges clichés — don't seed them).
8. **Web push / sound alarms on timer expiry for members.** Rule #6: the Farrier's
   timer rules the room — the human calls time. The shipped settled-red + one toast
   is the correct ceiling; alarms on 25 phones would detonate the room.
9. **Cursor-chat on the working canvas.** The Coach thread is the deliberate
   channel; a second ephemeral chat layer fragments the "one canonical AI-readable
   map + narrated settles" model and competes with verbal communication in a
   physical room.
10. **Infinite canvas.** The clamped scene is right for this audience and the
    projector-mirror; "lost in the void" is the top novice failure on infinite
    boards.

---

## 3. Verdict

**Per-user scoped undo (#3) is the highest-leverage single investment**: it is the
one pattern every 2025 canvas tool ships that Horsepower lacks entirely, and its
absence taxes exactly the population the product exists for — non-designers afraid
of wrecking a shared map. Pair it with the two S-effort trust wins (#1 QR join,
#2 reconnect banner) and the first five minutes *and* the worst five seconds of a
real room both stop depending on luck.
