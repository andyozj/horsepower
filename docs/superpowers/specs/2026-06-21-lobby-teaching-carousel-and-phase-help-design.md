# Lobby teaching carousel + per-phase "?" help — design

**Date:** 2026-06-21
**Status:** Approved (brainstorm), pending implementation plan
**Author:** Andy O (with Claude)

## Problem

Two UX gaps surfaced from real use (user feedback + screenshots):

1. **The lobby doesn't teach people what to *do*.** The "Meet your Coach" panel is a static stack of Coach-voiced promises ("I'll capture everything", "I push on the WHY"). Participants reach the interview not knowing *what to say* or *what a complete map needs* — they stare at a blank canvas.
2. **Once you're in Surface/Rebuild, there's no persistent "what am I doing here?" affordance.** The `goalNote()` banner states the goal once, then is dismissed forever. Nothing re-explains what the Coach is watching for.

Underlying both: the workshop's **arc was over-hidden**. The old pre-reveal rule (#2) concealed the *entire* second act — the words `redesign`/`rebuild` were banned pre-reveal — which forced coy, vague copy (the "Newcomer check" euphemism) that *caused* the confusion. This spec **relaxes that rule** to reveal the arc (*surface → redesign*) while keeping the genuine surprise — **the swap** (you redesign a *stranger's* torn-down workflow, not your own) — hidden.

## Scope decision: relax the pre-reveal vocabulary rule (#2)

**Old rule:** no team-facing surface says `swap / redesign / rebuild / hand over / receiving team / stranger / transfer` before the reveal.

**New rule:** the *arc* is revealed; only **whose workflow** stays secret.

- **Now ALLOWED pre-reveal** (lobby + Surface, Coach, all surfaces): `surface`, `redesign`, `rebuild`, `AI-native`.
- **Still HIDDEN until the reveal:** `swap`, `rotate/rotation`, `hand over / handoff`, `receiving team`, `another team`, `someone else's`, `stranger`, `transfer` — anything that implies *whose* workflow you'll redesign.

### Why this is the right call (devil's-advocate record)

- **The swap is the real surprise**, not the existence of a redesign phase. "Rebuild a stranger's torn-down workflow you've never seen" is the memorable gut-punch; "there's a redesign phase" was always the weaker secret riding along. Revealing it costs almost no surprise.
- **Confusion is a certain cost; biased capture is only a possible one.** The coy vagueness was actively confusing the room. Orienting people is honest and motivating.

### The one genuine risk + three guardrails

**Risk:** knowing redesign is coming, participants may pre-editorialize during Surface ("this step is dumb, we'll cut it") instead of capturing honest current-state — and pain-flags / areas-of-concern *survive the teardown*, so that bias can leak to the receiving team.

**Guardrails (built into the copy, cost nothing):**
1. **The redesign slide is impersonal** — "then *these* get redesigned, AI-native", never "you'll redesign *your* workflow". Protects the swap *and* avoids the retrofit-your-own framing.
2. **Surface teaching explicitly says "capture it honestly, warts and all, how it *really* runs today."** Directly counters pre-editorializing.
3. **A teaser keeps the swap charged:** "…and there's one twist on redesign day we're not going to spoil." Turns the remaining secret into anticipation.

## Feature 1 — Lobby "Meet your Coach" → auto-advancing teaching carousel

The big white "Meet your Coach" card becomes a **4-slide auto-rotating carousel**. The bottom *"While your teammates saddle up…"* scratchpad (a live text input) stays **pinned below — it never rotates** (avoids the broadcast-wipe / mid-typing-loss bug class the repo keeps fighting).

### The 4 slides

| # | Slide | Purpose | Copy (final) |
|---|-------|---------|--------------|
| 1 | **Meet your Coach** | sets the "just talk" tone | *"When we start, I'll interview you — just talk, like you're explaining it to a new colleague. I build the map and keep you honest."* |
| 2 | **First — surface it** *(animated)* | what to say + honest-capture guardrail | *"Walk me through a process you know, honestly — how it **really** runs today. Who's involved & who decides, what kicks it off, the steps (flag the painful ones), and the **why** behind each."* |
| 3 | **Then — redesign it** | reveal the arc, impersonal, teaser | *"Next we rebuild it AI-native — Agent blocks doing the real work, every person re-landed. (And there's one twist on the day we're not going to spoil. 🤫)"* |
| 4 | **Talk to me or type — I'm always here** | voice/type discoverability + "where to find me" | *"Say it out loud or type it, whichever suits you. I live beside every map — tap my face if I'm tucked away."* |

**Deliberate tension resolved:** slide 2 *names* what the Coach wants but stays tight — it does **not** exhaustively list all 9 gate checks. The full "what the Coach wants" checklist lives in the in-phase "?" help (Feature 2), surfaced when it's relevant. **Lobby = the gist; "?" = the checklist.**

### Behaviour

- **Auto-advance** ~5–6s per slide; **clickable dots** (jump to slide); **pause-on-hover** (and pause-on-focus-within for keyboard/AT users).
- **Animated sketch style** reused from the existing `coachVignette(i)` (`public/index.html:2158`) — example phrases fly in and snap into real map blocks (washes + rough-lite + boil). Slide 2 is the primary animated one; slides 1/3/4 may be lighter (avatar + line + a small mark).
- **Re-author** the existing `coachVignette()` content (currently capture/thin/WHY) into the new 4-slide set; the carousel shell wraps it.
- The static promise-rows (capture / WHY / newcomer-proof / where-to-find-me) are **replaced** by the carousel — "where to find me" folds into slide 4.

### Motion / accessibility (repo rules)

- GPU-only transitions; **`prefers-reduced-motion` → no auto-advance**, dots render as a static stepper the user clicks. (Honors the repo's reduced-motion + finite-animation rules; perpetual auto-advance must not break click stability — use a finite-safe interval that's cleared on unmount.)
- Carousel is keyboard-reachable; dots are real buttons with `aria-label`; the live slide region announces politely (no aggressive `aria-live`).
- The pinned scratchpad keeps its existing `editingLock` protection (it's already covered — `.scratch textarea`).

## Feature 2 — Per-phase "?" help popover

A **persistent small "?" button**, docked near the gate bar (Surface) / goal area (Rebuild), complementing the dismissible `goalNote()` (which vanishes; this doesn't).

- **Trigger:** hover **and** tap (tap is required — hover-only strands phones).
- **Content:** a small popover with **one short, phase-aware prose line**, framed as *what the Coach wants*:
  - **Surface:** *"The Coach wants: who's involved, what kicks it off, the steps (flag the painful ones), and the why behind each."*
  - **Rebuild:** *"The Coach wants: AI agents doing the real work, every person landed, and your guesses logged."*
- Short and sweet — one line, no wall of text, no full 9-check list.
- **Pre-reveal safe:** the Surface line names no swap/whose vocab; the Rebuild line only ever renders in the (post-reveal) rebuild phase.
- Dismiss on click-outside (modal-scrim parity); keyboard-dismissible (Esc); focus-safe across the broadcast re-renders (the established `selRestore`/`activeElement` idiom).

## Server change — split `BANNED_VOCAB`

`server.js:973`. Remove `redesign`/`rebuild` (now allowed everywhere); keep the swap-secret terms and strengthen with `rotate/rotation`, `another team`, `someone else's`.

**Before:**
```js
const BANNED_VOCAB = /\b(swap(s|ping|ped)?|re[\s-]?design(s|ing|ed)?|re[\s-]?build(s|ing)?|rebuilt|hand[\s-]?s?[\s-]?over(s|ing)?|hand[\s-]?off(s)?|receiving[\s-]?team|stranger(s)?|transfer(s|ring|red)?)\b/i;
```

**After (intent — finalize exact regex in the plan):**
```js
const BANNED_VOCAB = /\b(swap(s|ping|ped)?|hand[\s-]?s?[\s-]?over(s|ing)?|hand[\s-]?off(s)?|receiving[\s-]?team|another[\s-]?team|someone[\s-]?else'?s|rotat(e|es|ing|ed|ion)|stranger(s)?|transfer(s|ring|red)?)\b/i;
```

This regex is the choke point for the Coach interview/stream, recap, synth, cluster, and the Farrier whisper (all the call sites at `server.js:1468,1476,1497,1562,1573,1592,2222`). Allowing `redesign`/`rebuild` globally is consistent: pre-reveal it's now intended; post-reveal the secret is already out. The **client mirror** of this regex (`public/index.html`) must be updated identically.

## Out of scope / decided against

- Scratchpad as a rotating slide (broadcast-wipe risk) — it stays pinned.
- Gate-tags ("✓ clears: persona") on slides — kept clean.
- Full 9-check checklist inside the "?" — one short line only.
- Renaming the "Newcomer check" gate — it's a good name on its own merits; leave it.
- Touching landing / picker-tour copy — they don't need to mention redesign, and don't contradict it.

## Testing

- **`e2e-playwright.js`** — carousel renders, auto-advances, dots jump; "?" popover opens on both Surface and Rebuild with the right line.
- **`qa-a11y.js`** — reduced-motion halts auto-advance (dots become a static stepper); "?" is keyboard-reachable and Esc-dismissible; carousel dots have labels.
- **`qa-batch1.js` (H-R7-3b, the inflected-vocab guard)** — **must be updated**: drop the `redesign`/`rebuild` assertions (no longer banned) and assert the *still-banned* terms instead (`swap`, `rotation`, `another team`, `someone else's`, `handoff`, `transfer`, `stranger`, `receiving team`).
- **`qa-stream.js`** (mid-stream vocab-trip) — ensure its trip word is a **still-banned** term (`swap`), not `redesign`.
- Server contract suites otherwise unaffected (no new WS messages; the carousel + "?" are client-only besides the regex edit).

## Risks

- **Secrecy-critical regex edit.** Getting the split wrong leaks the swap. Mitigation: the updated qa-batch1 guard + a projection-leak re-run (`qa-hostile.js` sweep) before sign-off.
- **Pre-retrofit bias in Surface capture** — mitigated by guardrails 1–3 above; accept as a known, pushed-against residual.
