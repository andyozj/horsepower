# Theo — Orientation & Recovery critique (iter1)

**Lens:** the late arrival. What it's like to walk in after Surface has started, get oriented, lose your device, refresh, and find your footing on a workflow you never saw built.
**Run:** joined `VN2E` ~90s into Surface as "Theo" onto **Credit Desk**; contributed a block; killed the browser context mid-Surface and reclaimed from a fresh context; refreshed mid-Rebuild; read the teardown cold; rode through Share to Closed. 16 shots in `qa-critic/theo/`. **Zero console/page errors the entire journey.**

---

## Problems

### 1. [BLOCKER] Reclaim after device-death silently EMPTIES your contributed block
**Severity: High (data integrity / the core "recover gracefully" promise).**
Before I closed the context, my block "the callback nobody owns" was on the canvas WITH its inspector WHY ("a customer chases us twice before anyone calls back") — see `04-block-added.png` and `05-block-why-inspector.png`. After device-death + reclaiming myself from a fresh context, the node is still there in position **but its label and WHY are gone — it renders as a blank selected rectangle** (`07-after-reclaim-surface.png`, lower-centre). The node skeleton (geometry, selection, author) survived the server round-trip; the *content* did not.
- This is worse than a clean loss: the team is left with a mystery empty box on their map, which actively damages the "newcomer could run it" gate the product sells.
- My driver logged `my block survived device death? false` — the locator that matched the labelled node before now matches nothing.
- **Not a driver artifact:** the text demonstrably committed (visible across two pre-death shots), and the reclaim itself succeeded (avatar, identity, team all correct). Only the block body vanished. Suspect: reclaim restores the member's nodes by id but drops `label`/`meta` (or the pre-death label commit raced the disconnect and the server kept the geometry from an earlier create but not the later label `canvas:update`).
- **Evidence:** `04`, `05` (block present + why) → `07` (same node, empty).

### 2. [Medium] The catch-up card is a generic "what this app is" tour, not a "what your team already did" briefing
The card titled **"You're in — quick saddle-up"** (`02-catchup-card-before-dismiss.png`) gives three bullets: "This is your team's living map / The Coach reads along / The goal." Useful for a brand-new user — but it is **identical to what any first-time joiner sees**. It tells me *how the tool works*, not **what Credit Desk has already decided in the 90 seconds I missed**. There were 7 nodes already on the canvas (a full underwriting flow + a flagged "borderline score" moment) and the card says nothing about them. The single most valuable latecomer sentence — "your team has mapped underwriting up to the approve/refer/decline decision; the open question is X" — is absent. It does not orient me in 15 seconds to *the work*; it orients me to *the product*. The live map showing behind the scrim does more orienting than the card itself.

### 3. [Low] Latecomer picker first-paint is blank / slow
`01-picker-as-latecomer.png` caught the picker showing only "Pick your stable" with no teams for ~800ms after a clean join (the team list and ontology tour paint a beat later — visible fully in `06`). For someone hurrying to catch up, a blank "where's my team?" first frame adds anxiety. The eventual picker is good (existing teams listed, "you, riding in as Theo", ontology sketch), but the first paint should not be empty.

### 4. [Low] "Jump in →" auto-selects an empty placement and the catch-up card competes with the goal banner
On dismiss I land mid-canvas and immediately have two persistent instructional surfaces stacked: the dismissible **"Goal: map it so a newcomer could run it — clear the Newcomer check"** banner AND the freshly-revealed map. A latecomer who just dismissed one overlay is met by another. Minor cognitive tax at the exact moment you're trying to read the room.

---

## What's genuinely good

- **Reclaim modal is best-in-class.** `06-reclaim-modal.png`: *"Picking up where you left off? Some riders stepped away from Credit Desk. Tap yourself to carry on — or start fresh."* with my offline identity ("Midnight Gizmo · Theo") as a tappable row and an honest "I'm new here →". No jargon, no leak, exactly the right two choices. This is how recovery should feel.
- **No ghost duplicate.** After device-death + reclaim the topbar listed exactly ONE Theo (`08-topbar-avatars-ghost-check.png`: `["Thunder Sundae · Mara","Midnight Gizmo · Theo"]`). The dreaded zombie-member bug is genuinely prevented at source. (The block-content loss in #1 is a *separate* defect from ghosting.)
- **Refresh-resume is flawless.** Reloading mid-Rebuild dropped me back on the exact same teardown canvas — locked blocks, candidate card, people tray, "0/1 landed" pill all intact (`11-after-refresh-rebuild.png`). No reveal re-run, no lost state.
- **Cold Rebuild is participable without ever seeing the original.** The teardown (`10-rebuild-landed-cold.png`) hands a latecomer everything they need: scrambled LOCKED blocks labelled by capacity, a gold candidate-constraint card, a people tray with stays/transforms/removed explained *inline*, and **every artifact explains itself on hover** (`12-teardown-card-hover-why.png` surfaces the candidate's WHY). I could have contributed cold.
- **The assumptions explainer reads cold.** (`13`) "Log the guess and keep building. At the share-out, the team who lived this process confirms ✓ or busts ✗ each one." A latecomer understands the whole loop from one panel.
- **The double reveal is legible to a latecomer.** `14-share-as-latecomer.png`: "What it was — Credit Desk's real process" beside "What it became — by Ops Crew." Even arriving cold I understood the before/after. The Closed race card (`16`) even credits me by steed despite my late arrival and one death.

## WTF moments

- **The empty box that used to be mine.** Watching my labelled, why-annotated block come back from reclaim as a blank rectangle (#1) — and realising the *team* now owns that mystery box on their audit-grade map — is the standout WTF. The recovery flow looks like it worked (right avatar, right team) which makes the silent content-loss more dangerous, not less.
- **The catch-up card teaching me the app while my team's finished underwriting map sits visible behind it.** The information I needed was literally rendered behind the thing blocking it.
- **The Farrier proceeded to Surface with 0 teams / 0 members** (per the shared farrier log) — yet by the time I joined, Credit Desk existed with a full 7-node map and a teammate (Mara). So teams *did* assemble, just after the gate fired. Orthogonal to my lens, but worth flagging: the room can advance past an empty lobby.

## Verdict

**Recovery mechanics: A-. Orientation content: C+.** The *plumbing* of arriving-late and dying-and-coming-back is among the most polished things in this app — the reclaim modal, ghost-prevention, and refresh-resume are all genuinely excellent, and the cold-readable teardown means a latecomer can contribute in Rebuild without ever seeing the original. But two things keep it from shipping clean: (1) **reclaim silently empties your contributed block's content** — a real data-integrity bug that scars the team's map and undercuts the "newcomer could run it" gate; fix before any real room. (2) The catch-up card orients you to *the product* when a latecomer needs orienting to *the work their team already did* — the hardest 15 seconds of walking in late are left unaddressed. Fix #1 as a blocker; rewrite the catch-up card to summarise team state as the high-value follow-up.

*Owned driver caveats: my `theoId`-from-localStorage probe returned null (wrong storage key guessed) — irrelevant, reclaim is server/modal-driven and verified visually. Picker shot 01 is a genuine slow first-paint, not a snap-timing miss (confirmed against the fully-painted picker in shot 06).*
