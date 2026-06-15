# Lobby & Onboarding — Design Spec

**Status:** First solid pass.
**Date:** 2026-06-11
**Part of:** Horsepower PRD. Implements user-journeys A1–A3, B1–B2.

---

## 1. Structure — one code + a team picker *(reworked 2026-06-11; supersedes the two-code model)*

```
Farrier ──creates──▶ WORKSHOP (code: HRSE · host code: 7H2K, private)   ← HRSE on the projector
                        │
  everyone ─HRSE + name─▶ team picker ──▶ join "AP Squad" / "ETL Crew" / ＋create a team
```

- **Workshop** groups the teams so the **swap can rotate canvases between them**. Created self-serve — *anyone* can host (not gated to special facilitators); the creator becomes the **Farrier**.
- **One code for the room.** Everyone types the projected **workshop code** + their name, then lands on a **team picker**: join an existing team or create one (name it). Teams are peer-formed; no per-team codes.
- *Why the two-code model died:* six 4-letter team codes shouted across a loud room = typos, wrong-team joins, and a second join step for every single participant. One code + a tap beats two codes + typing; a mis-tap is fixed by the Farrier re-seat (§3).

**The host code (security — closes the projected-code hole):** joining with the *workshop* code must **never** grant control — that code is on the projector, so anyone in the room could otherwise become a Farrier and fire the swap. At creation the server also mints a **host code**, shown **only on the Farrier's private console**. Co-hosts join as Farrier with workshop code + host code.

---

## 2. Flows

**Host a workshop (Farrier)**
1. "Host a workshop" → server mints a **workshop code** (4 letters, projected) + a **host code** (private, console-only) → creator is the Farrier. Persisted to disk.
2. Workshop code shown large (projector-legible — via the **room view**, farrier-console §2a). Co-hosts join as Farrier with workshop code + **host code**.

**Join (everyone else — one flow)**
1. Enter the **workshop code** + your **name** → land on the **team picker** (live list of teams + member counts).
2. **Join a team** (tap it) or **create one** (name it; you're its first member; it appears in the picker for teammates).
3. **Presence:** you see teammates (names + live count); they see you.

**Lobby / wait (all members)**
- "You're in, **<team>** — <teammates>. Waiting for the Farrier to start." Updates live as teammates join.
- 🤫 **Do NOT foreshadow the swap.** Participants must *not* know their workflow will be handed to another team — the swap is a deliberate **surprise reveal** (Swap spec §5). Lobby + Surface framing is simply *"document your real process."* This protects honest capture *and* the zero-attachment that makes anti-retrofit work.

---

## 3. Farrier's view of onboarding
- Sees every team under the workshop appear live, with member counts.
- Can **re-seat or remove** a team/member **any time before the swap** (roster fixes — wrong-team joins and latecomers happen mid-Surface too, not just in the lobby).
- Starts **Surface** when the room's ready (off-app briefing happens first).

---

## 4. Rules & edges
- **Identity persists** (localStorage: workshop code, team id, member id, role) → reconnect restores state.
- **Latecomer** joins mid-Surface → workshop code + team picker → drops straight into the team's live map.
- **Co-host Farrier** → joins with workshop code + **host code**; multiple hosts, equal control. The workshop code alone never grants control.
- **Templates** may be pre-loaded so teams "log on and start" (optional).
- Team must have ≥1 member; workshop must have ≥2 teams to swap.

## 5. Open
- Team-formation is **self-select** (peer-created) with **Farrier re-seat/remove** as the only override. (Confirmed.)
- ✅ Join model: **one workshop code + team picker** (this doc, 2026-06-11) — supersedes the two-code model in earlier drafts of the user-stories/UX docs.
