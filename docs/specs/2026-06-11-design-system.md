# Horsepower — Design System

**Status:** Fourth pass — §0–7 formalize the scattered-but-consistent visual decisions; §8 (Voice & copy, added in the 2026-06-11 reconciliation pass) makes the words — incl. the 🤫 pre-reveal vocabulary rule — part of the system; §9–17 (audit pass) extend the *look* layer to **every surface**; the **craft pass** (also 2026-06-11) closes the taste-to-execution gap — §2 rebuilt (two families + a real type scale), the §1 map-wash rule, the §3 stroke/texture recipe, §16 no-system-emoji, and the new §18 craft-assets layer. The craft pass exists because the gap between "warm hand-made notebook" on paper and what default CSS + Google handwriting fonts + system emoji produce is exactly where this would land as *school project* instead of *expensive sketchbook*.
**Date:** 2026-06-11
**Layer:** the *look* (PRD = what · UX = flow · **this = look**). Per-screen *behaviour* lives in the screen specs (`lobby-design.md`, `swap-design.md`, `share-design.md`, `farrier-console-design.md`); those consume the tokens here — this doc does not re-spec their flows.

---

## What the audit pass added (and why)
§0–8 were canvas-centric. Pressure-testing them against real collaborative tools (Mobbin) surfaced eight gaps that bite the moment you leave the map. Each new section closes one, keeping the Critic's Notebook soul (§0) intact:

| § | Gap closed | Grounded in (real-world reference) |
|---|---|---|
| **9** | Accessibility — contrast, focus, keyboard, ARIA, touch, colour-not-alone | projector-from-the-back-row + non-technical/own-device audience (workshop-context) |
| **10** | Component **states** — incl. AI idle→thinking→streaming→**failed/degraded** | ClickUp Brain "Indexing… this may take a few moments"; the CLAUDE.md graceful-degradation rule made visual |
| **11** | Responsive + **device matrix** (projector · facilitator laptop · member device) | dashboards ship light **and** dark variants (Asana); Google Classroom code-entry on any device |
| **12** | **Elevation / z-scale** — toolbars, floating bar, modals, toasts, cursors, tray | floating contextual toolbars over canvas (Miro/Mural/Confluence) |
| **13** | **Presence / multiplayer** — cursors, avatars, node-locks, follow-mode | "You are collaborating on this whiteboard / 1 person is following you" (Zoom); per-object editor dot (Mural) |
| **14** | **Canvas viewport** — zoom/pan/fit, dimension readout, contextual toolbar, palette flyout | resize size-badge `160×120` (Zoom); flyout shape/connector palettes (Miro/Mural/Fibery) |
| **15** | **Coach interaction** — quick-action chips, per-message actions, status line | AskFred: numbered challenges, colour-dot chips, copy/👍 per message, "Live Assist is listening" |
| **16** | **Iconography** stance — emoji-as-type-glyph vs UI icons | mixed emoji glyphs (👤⚡🔒) already in §4 needed a consistency rule |
| **17** | **Per-surface look notes** — lobby · swap · share · farrier · projector | the non-canvas screens above had no look guidance |

---

## 0. Principles (every rule serves one of these)
1. **Critic's Notebook soul** — hand-made, warm, a little wry; it's a sketchbook with an opinion, not a corporate tool.
2. **Expressive chrome, legible content** — hand fonts + texture on the *frame*; anything **typed or read** stays in a clean, high-contrast face. Must read **on a projector from the back row** *and* a laptop up close.
3. **Calm 95% / loud 5%** — the everyday surface is quiet; loud (stamp, scribble, marker) is reserved for **peak moments** (swap reveal, retrofit kill).
4. **Everything purposeful** — no decoration. Every color, motion, and symbol **encodes a state or a meaning**. If it doesn't communicate, cut it.
5. **SOLID + performant** — animate only `transform`/`opacity` (GPU); no layout thrash; 60fps; honor `prefers-reduced-motion`.

---

## 1. Color tokens
| Token | Hex | Use |
|---|---|---|
| `--paper` | `#f4efe2` | canvas / app background (craft paper) |
| `--card` | `#fffaf0` | raised surfaces, cards |
| `--ink` | `#21314f` | ballpoint — primary text, strokes |
| `--muted` | `#66708a` | secondary text |
| `--line` | `#b9b094` / `#d9cfb3` | dashed dividers, hairlines |
| `--red-pen` | `#e23b3b` | the Coach's mark / challenge (calm use) |
| `--loud-red` | `#e02d2d` | peak moments (stamp, scribble-out) |
| `--highlighter` | `#ffd24a` | outcome, primary action, accents |
| `--lock` | `#7c3aed` / `#f3e8ff` | personas, locked constraints |
| `--blue` | `#dbe6ff` / `#9fb8ff` | moments, user voice |
| `--agent` | `#e7f0ff` / `#2b3a55` | AI-native agent block (Rebuild) |
| `--pain` | `#ffe3e3` / `#b91c1c` | pain points |
| `--ok` | `#2e7d52` / `#e6f4ec` | green / ready / kept-constraint |
| `--thin` | `#b3760b` / `#fff6e3` | thin (amber) governance |

**Restraint is the soul** — three voices max on screen; never the full crayon box.

**The map-wash rule (craft pass).** §4's symbol vocabulary puts six-plus hues on one canvas — at full strength that's a kindergarten poster, not a critic's notebook. So on the map, **block fills are low-chroma paper-tinted washes (~6–10% chroma against `--paper`)**; a block's identity is carried by its **ink border + type glyph + label** — which §9 requires anyway (colour is never the only signal). Full saturation is reserved for exactly three voices: `--highlighter` (the outcome / primary action), `--pain` red, and the Coach's `--red-pen`. The hex values above are the *reference hues*; on-canvas fills use wash variants (`--wash-*`, each hue blended into `--paper` — see §18).

---

## 2. Typography (craft pass: two families, not five)

Free handwriting fonts at UI sizes are the single loudest "generated, not authored" tell — Patrick Hand reads flat and childish on chips and buttons, and Permanent Marker is one step from Comic Sans energy. The warmth must come from **Fraunces' variable axes, the strokes, and the texture** (§3/§18), not from handwriting-everywhere.

| Family | Role |
|---|---|
| **Fraunces** | display + identity — headlines, panel titles, the logo wordmark, the room-view code. Use the **optical-size axis** (high `opsz` at display sizes) and a touch of the **WONK axis** — hand-made warmth *inside* a serious face. |
| **Inter** | everything else — **all content** (brain-dump, intent/outcome, inputs) *and* all UI labels: chips, buttons, map block text (Medium 500 for labels). `font-variant-numeric: tabular-nums` wherever counts or timers appear (console stats, room timer). |
| **Caveat** | **the Coach's hand only** — the chat header ("the Coach · …"), the status line ("Coach is reading along…"), margin annotations; the places where it literally represents the critic's handwriting. Never panel titles, labels, buttons, or anything another surface owns. |

**Retired:** Patrick Hand (labels move to Inter Medium 500) and Permanent Marker (the loud peaks — the stamp, "CHALLENGE" — become **designed SVG assets**, §18, not text set in a marker font).

**Type scale** (Fraunces display sizes get high `opsz` + tracking −2%; Inter line-heights stay generous for projector reading):

| Token | Size / line | Face | Use |
|---|---|---|---|
| `display-xl` | 72–96px / 1.0 | Fraunces (opsz 144, wonk on) | room-view code, swap-reveal line |
| `display` | 40px / 1.1 | Fraunces (opsz 72) | screen titles, share-out headers |
| `title` | 24px / 1.2 | Fraunces (opsz 36) | panel titles, lobby welcome, tooltip headers |
| `body` | 16px / 1.5 | Inter 400 | content, chat, inputs |
| `label` | 14px / 1.3 | Inter 500 | buttons, chips, map block labels |
| `meta` | 13px / 1.4 | Inter 400 `--muted` | hints, captions — bump to ≥16px if essential (§9) |

**Rule:** content and labels are always Inter; Fraunces is the brand voice; Caveat is the Coach's hand — three faces, no exceptions. Present/projector mode multiplies the scale ≥1.25× (§11).

---

## 3. Spacing, radius, texture
- **Spacing scale:** 4 · 8 · 12 · 16 · 20 · 24.
- **Radius:** cards 12–16 · chips 999 · map nodes 10–14 · **stickies use irregular radii** (`18px 15px 20px 13px`) for the hand-made wobble.
- **Texture (craft pass — the recipe; assets in §18):**
  - **Paper:** the dot-grid alone reads as flat cream Bootstrap. Layer a **static SVG noise grain** (`feTurbulence` fractalNoise rendered once as a texture, ~3% opacity, fixed, `pointer-events:none`) over `--paper` on every surface.
  - **Strokes:** hand-drawn boxes/arrows/underlines are drawn with **vendored `rough.js`** — *not* a live `feTurbulence`+`feDisplacementMap` filter, which aliases on projectors and can't hit the §0 60fps rule. **Seed per node id** so the wobble is deterministic across renders and devices (the same box looks the same on every screen in the room).
  - **Freehand:** the freehand tool uses **vendored `perfect-freehand`** — pressure-tapered ink, not uniform polylines.
  - **Ink bleed:** red-pen marks (squiggle, scribble-out, circles) get a subtle bleed — a blurred duplicate stroke (~1px blur, ~20% opacity) under the crisp one.
  - Both libraries are small single-purpose files — exactly the CLAUDE.md "vendoring is the pressure valve" case.

---

## 4. The MAP symbol vocabulary  ⬅ the diagram language (Surface **and** Rebuild, identical)
The map must read as **clear, typed symbols** — a glance tells you *what each thing is*. One consistent language across both phases:

| Element | Shape | Color | Mark |
|---|---|---|---|
| **Persona / owner** | rounded block | lock-purple `#f3e8ff`/`#7c3aed` | 👤 |
| **Trigger** | **ellipse / pill** | green `#cfe0d2` | 🔔 (the event that starts it) |
| **Input** | small tag/note under trigger | muted | "inputs: …" |
| **Phase** | **large container rectangle** | cream `#fff9ec` | holds moments |
| **Moment** | small rounded block *inside* a phase | blue `#dbe6ff` | — |
| **Moment · pain** | small block | pain-red `#ffe3e3` | ⚠ + "painful" |
| **Intent** | banner block | amber `#fff7df`/`#b8860b` | 💡 (the *why* — a decision, not an artifact) |
| **Outcome** | rounded block | highlighter `#ffd24a` | 🚩 (the change in the world) |
| **Free text** | no box, just text | ink | the Text tool — Excalidraw-style annotation |
| **AI-native agent** *(Rebuild)* | bold block | agent-blue `#e7f0ff`/`#2b3a55` | ⚡ |
| **Kept constraint** *(Rebuild)* | chip/block | lock-purple | 🔒 (accountable/legal) |
| **Orphan** | **sticky, off-canvas tray, wiggling** | thin-yellow `#fff3c4`/`#d9920b` | 🧷 |
| **Flow arrow** | solid stroke + arrowhead | grey `#9aa3b8` | follows nodes live |
| **Conditional / branch** | **dashed** stroke | grey | e.g. ">£10k" |

**Glyphs (craft pass):** the emoji in this table are **shorthand for the §18 custom glyph set** — small inline ink-stroke SVGs, identical on every device — never system emoji (§16). Fills follow the §1 map-wash rule: low-chroma washes, identity carried by border + glyph + label.

**Authoring:** a **typed-block palette** exposes these directly (Persona/Trigger/Input/Phase/Moment/Outcome) so participants **identify each element's type by hand** — the structure is always explicit, never an ambiguous box. Drawn freehand, lines/arrows, and labels are all first-class. (Capture §2a.)

**Hierarchy:** Phases are containers; Moments nest inside; Trigger → Phases → Outcome read left-to-right; personas tag moments. Pain and orphans are the only "loud" things on a calm map.

**The autonomy-audit visual rule (Rebuild):** an ⚡ agent block with **no arrow to any human block** (👤 persona or 🔒 kept constraint) is the visible trigger of the over-automation flag (Rebuild §4) — pleasingly rule-checkable, so it works offline. The escalation path is literally *drawn*: agent → human gate.

---

## 4a. Authoring the canvas (interaction — Excalidraw-grade, clear & friendly)
The map is a **real diagramming tool**; the interaction must be obvious to a non-technical hand.
- **Toolbar** — labeled, colour-coded tools: `Select · 👤 Persona · Trigger · Input · Phase · Moment · 💡 Intent · Outcome · ⚡ Agent (Rebuild) · Text · Arrow`. Shows each symbol's colour; never cryptic icons-only. **All ontology components are first-class blocks** (incl. Intent).
- **Add a block:** click a tool → click the canvas → a **typed block** drops there (type explicit by shape+colour+icon). A **hint bar narrates every step** ("Click the canvas to drop a Phase").
- **Connect an arrow:** click **Arrow** → click the **source** block → click the **target** → arrow created and **bound** to both. Two clicks, no precise dragging — friendly for everyone.
- **Edit an arrow (angles):** select it → a **bend handle (dot)** appears; **double-click the arrow** (or drag the dot) to add a **bend point and adjust the angle**; endpoints stay bound. *(Full parity: multi-point + re-bindable endpoints.)*
- **Move:** drag a block — **bound arrows re-route live.**
- **Resize:** select → **8 handles (4 corners + 4 sides)**, Excalidraw-style; drag any (min sizes per type).
- **Text:** **type inline** — double-click a block to edit its text **in place** (not a popup); **font-size** via `+`/`−` when selected. A **free-form Text tool** drops standalone annotations anywhere.
- **Delete:** select a block *or* arrow → ⌫.
- **Discoverability:** empty-state prompt + per-step hints; nothing behind obscure gestures; forgiving (undo).
- **Works without the Coach** — this is the canvas the AI sits *on top of* (capture §2a). Reference build: `hifi-canvas-authoring.html`.

## 5. Component catalog (with states)
- **Governance chip** — grey (missing) · amber (thin) · green (ok). Pill.
- **Conflict marker** — paired badge on a contested node ("two versions — Alex / Sam"); amber family (it counts as thin until resolved); tap reveals both versions side-by-side + a "keep / merge" choice.
- **Thought-check squiggle** — wavy red underline on thin text; draws on (see motion).
- **Chat bubble** — Coach (white, red-pen border, tail-left) · user (blue, ink border, tail-right) · system (centered, muted).
- **Button** — primary (highlighter fill, ink border, Inter Medium) · ghost · subtle · **loud** (the §18 stamp treatment — loud-red, hard offset shadow, slight rotate — peaks only).
- **Stamp** — a **designed SVG asset** (§18): double ring, distressed ink texture, 4–6° rotation, `--loud-red` — never marker-font text; peak only.
- **Orphan sticky** — irregular radius, wiggle idle, fly-to-map on resolve.
- **Map node** — per §4; hover = soft shadow + grab cursor; selected = handles.
- **Lock box** — dashed purple, "🔒 LOCKED" tag (intent/outcome/personas at Rebuild).
- **Ingredient context card** *(Rebuild — the scattered teardown components, Swap §4)* — the block + a **one-line context** beneath it (Inter, `--muted`, e.g. *"locked: legally accountable for sign-off"*) + an **ⓘ affordance**; **select/hover opens the context tooltip** (full abstracted WHY: what it is, why it's here, who claimed it, capacity rung). Tooltip = `--card` panel at `--z-canvas-ui`, Inter content, Fraunces `title` header; **select-triggered, not hover-only** (§11 touch rule). Candidate constraints carry the chip *"candidate — pressure-test me."*
- **Assumption sticky** *(Rebuild → Share)* — Team B's logged guesses about the hidden process; visually a cousin of the orphan sticky (irregular radius) in `--blue` family with a "?" tag; at the reveal flips to **confirmed ✓** (green) or **busted ✗** (red-pen strike).
- **Role-landing card** — stays (blue) / transforms (green) / removed (grey, struck).

---

## 6. Motion system (purposeful only — every motion = a state change)
| Motion | Trigger | Meaning | Spec |
|---|---|---|---|
| **map-build** | Coach structures a dump | "your words became structure" | nodes fade+settle in sequence, ~350ms stagger |
| **boiling-line** | idle, subtle | "this is a *living* sketch" | 2–3 pre-rendered rough.js seed-variants per stroke, swapped on a ~300ms timer (the classic hand-animation "boil") — near-free, never a live filter; the *only* idle motion; very subtle; off under reduced-motion |
| **squiggle-draw** | thin flagged | "this is sus" | red wavy underline draws on (~1s) |
| **orphan-fly** | orphan placed | "resolved → it found a home" | sticky translates from tray into the map |
| **stamp-slam** | the swap reveal | "🤫 the twist" | scale-in from 3× + settle; **peak** |
| **scribble-out** | retrofit killed | "that's dead" | red scribble strokes draw over; **peak** |
| **node-drag** | direct edit | "you're in control" | node follows pointer; **arrows re-route live** |
| **presence** | teammate acts | "you're not alone" | smooth cursor/avatar moves |

**Rules:** transitions 200–400ms ease; peaks may be bigger/slower but resolve fast. **No animation without a state change** (except boiling-line, which itself signals "alive"). All via `transform`/`opacity`. Respect `prefers-reduced-motion` (drop to instant + no boiling-line).

---

## 7. Do / Don't
- ✅ Three color-voices max per screen · ✅ content in Inter · ✅ loud only at peaks · ✅ every symbol typed & identifiable · ✅ motion that means something.
- ❌ marker fonts in body/input · ❌ decorative animation · ❌ ambiguous unlabeled boxes (it's not generic Excalidraw) · ❌ low-contrast text on texture · ❌ loud energy in the everyday surface.

---

## 8. Voice & copy (added 2026-06-11 — the words are part of the system)

The Notebook has a voice: **wry, warm, specific — never corporate, never scolding.** The Coach is a sharp colleague in the margin ("a report isn't a reason"), governance copy names the *consequence* not the rule violation, and error states stay calm (§10).

**🤫 The pre-reveal vocabulary rule (HARD — capture §5a).** Before the swap reveal, **no team-facing copy** — chips, tooltips, gate banners, empty states, lobby text, *or Coach utterances* — may use: *swap · redesign · rebuild · hand over / handoff · receiving team · stranger · transfer.*
- The team-facing gate is the **"Newcomer check"** (*"could someone who just joined your team run with this?"*) — a true cover story for transfer-grade quality.
- The honest names (*redesign-ready?*, retrofit match-flags) live **only on the Farrier's private console**; the projected **room view** obeys the team-facing rule.
- This is a copy-review checklist item for every new string, and a prompt-level rule for the Coach (coach-behavior §2).

---

## 9. Accessibility (a hard requirement — the room is non-technical and the screen is a projector)
The audience is mixed/non-technical and the map is read **from the back row of a room**. Accessibility here is legibility, not compliance theatre.

- **Contrast targets (AA):** body/content (Inter on `--paper`/`--card`) ≥ **4.5:1**; large display & chrome ≥ **3:1**; UI borders/focus rings ≥ **3:1** against their background. `--ink #21314f` on `--paper #f4efe2` ≈ 9:1 ✅ and on `--card #fffaf0` ≈ 11:1 ✅ — safe. **Watch-list (verify/darken before ship):** `--muted #66708a` on `--paper` (~3.6:1 — fails AA for small body, **use only ≥16px or for non-essential meta**); highlighter `#ffd24a` is a **fill, never a text colour** — text on it must be `--ink`; `--thin #b3760b`/`--red-pen #e23b3b` as text need ≥16px or bold.
- **Colour is never the only signal.** Governance chips (grey/amber/green, §5) MUST also carry a **glyph + label** (`○ missing` · `~ thin` · `✓ ready`) — a colour-blind facilitator or a washed-out projector must still read state. Same for the three role-landings (§5) and kept-vs-agent blocks (§4): shape/label/icon carry the meaning, colour reinforces it.
- **Focus-visible:** every interactive element gets a **2px `--ink` outline + 2px offset** on `:focus-visible` (keyboard only; not on mouse click). Never `outline:none` without a replacement.
- **Keyboard:** lobby/forms/chat are fully keyboard-operable. **Canvas:** `Tab` cycles blocks in reading order (Trigger→Phases→Outcome); arrows nudge a selected block; `Enter`/`F2` edits text in place; `⌫` deletes; `Esc` deselects. Coach chat: `↑` edits last message, `Enter` sends. Document these in an in-app `?` shortcut sheet.
- **ARIA / semantics:** real `<button>`/`<label>`/`<nav>` — not clickable divs. Canvas SVG nodes get `role="group"` + `aria-label="Phase: <name>"`; the orphan tray is an `aria-live="polite"` region (the Coach "chasing" an orphan should be announced); coach streaming uses `aria-live="polite"`, never `assertive` (don't machine-gun a screen reader).
- **Touch targets:** **≥44×44px** for anything tappable — members may join on a phone (§11). Toolbar tools, chips, send button all clear this.
- **Motion:** already covered (§6) — `prefers-reduced-motion` drops to instant + kills boiling-line. Honour it everywhere new motion is added below.

---

## 10. Component states (the matrix every component must answer)
A component isn't done until these states exist. Default • **hover** • **focus-visible** • active/pressed • **disabled** • **loading** • **empty** • **error**. Highlights:

- **Button** — disabled = 40% opacity + `not-allowed`, no shadow; loading = inline spinner, label persists, width locked (no reflow). Loud buttons (§5) never show a spinner — peaks are instant.
- **Input / textarea (brain-dump, join-code, name)** — focus = `--ink` ring (§9); error = `--red-pen` border + helper text below (e.g. join-code "That room doesn't exist — check the 4 letters"); the brain-dump empty state carries the prompt *"Dump your process here — any order, we'll sort it"* (capture is a dump, not a form).
- **Governance chip** — the three states ARE its purpose (§5); add **focus** (keyboard reachable to jump to the gap it flags).
- **Map node** — default · hover (soft shadow + grab) · selected (handles + contextual toolbar, §14) · **editing** (inline caret) · **locked** (dashed purple, no handles, §4) · **being-edited-by-other** (presence ring, §13).
- **AI / Coach states (load-bearing — graceful degradation is a CLAUDE.md hard rule).** The Coach has its own lifecycle, shown honestly:
  | State | Treatment | Notes |
  |---|---|---|
  | **idle / listening** | quiet status line *"Coach is reading along…"* (Caveat, muted) | the AskFred "Live Assist is listening" cue |
  | **thinking** | three-dot pulse in a Coach bubble | ≤ ~1.5s; if longer → working |
  | **working** | *"Structuring your dump… this takes a sec"* | ClickUp Brain's honest "this may take a few moments" |
  | **streaming** | text appends token-by-token; `aria-live=polite` | map-build motion (§6) fires as nodes land |
  | **done** | bubble settles; per-message actions appear (§15) | — |
  | **unavailable / failed** | **calm** banner *"Coach is offline — keep going, the map and checks all work without it"* + offer the built-in question bank | NEVER a red error wall; the workshop must not stall (CLAUDE.md). The 5% loud is reserved for peaks, not for failures. |

---

## 11. Responsive & the device matrix (one product, three viewing distances)
This isn't one viewport — it's three roles at three distances. Design for the role, not just the width.

| Role | Device (assume) | Distance | Gets |
|---|---|---|---|
| **Team member** | own laptop *or phone* | arm's length | full authoring on laptop; phone = **read + brain-dump + chip-tap + Coach**, heavy canvas authoring gracefully reduced (pan/zoom/read, simple add; no fiddly multi-point arrow editing on a phone) |
| **Farrier (facilitator)** | laptop | arm's length | console dashboard + canvas-mirror drill-down (§17) |
| **Projector / present** | shared screen | **back of room** | large-type, high-contrast, chrome minimised; Before/After present view (§17) |

- **Breakpoints:** `≥1280` full canvas + side panels · `768–1279` canvas with collapsible/overlay Coach · `<768` (phone) stacked, canvas read-first, Coach as a bottom sheet, palette as a compact bar. Surface's chat|map split (memory: resizable) collapses to tabbed at `<768`.
- **Pointer vs touch:** hover affordances must have a tap equivalent — the contextual toolbar (§14) appears on **select**, not hover, so it works on touch. Honour `(hover:none)` / `(pointer:coarse)`: bump targets, drop hover-only reveals.
- **Projector mode is a real mode, not a zoom:** a `present`/large display state increases base type ≥1.25×, forces max-contrast pairs only (drop `--muted` for body), hides editing chrome. See §17.

---

## 12. Elevation & z-scale (so the floating things stack predictably)
Many things float over the canvas. One ordered scale — never invent ad-hoc `z-index`:

| Layer | z | Examples |
|---|---|---|
| `--z-canvas` | 0 | map nodes, arrows, paper grain |
| `--z-presence` | 10 | other people's cursors & node-edit rings (above content, below chrome) |
| `--z-canvas-ui` | 20 | viewport controls, palette, **floating contextual toolbar** (§14) |
| `--z-panel` | 30 | side panels (Coach, console), orphan tray |
| `--z-overlay` | 40 | modals (join, swap reveal scrim), bottom sheets |
| `--z-toast` | 50 | toasts, presence banners ("you're collaborating…") |
| `--z-peak` | 60 | the stamp-slam / scribble-out peaks (§6) — above everything, briefly |

**Shadow = elevation, kept hand-made:** flat on canvas; soft offset shadow on selected/floating UI; the **hard offset shadow** (no blur, ink-coloured) belongs to loud buttons & stamps only (§5). Don't blur-shadow everything — restraint is the soul (§0).

---

## 13. Presence & multiplayer (B-lite: many devices, one canonical map)
Collaboration is B-lite (memory): each member on their own device, server is source of truth, edits node-scoped soft-lock + LWW. The look must make "you're not alone" felt without clutter.

- **Roster avatars:** stacked top-right, initials on a deterministic per-person colour (drawn from the §1 palette, **never** the loud/state colours — presence must not read as governance). Overflow `+3`. Tooltip = name.
- **Cursors:** smooth-following (§6 presence motion), name flag in the person's colour, fade after ~3s idle.
- **Node being edited by someone else:** a **2px ring in their colour + tiny name tag** on the node (the Mural per-object editor dot). This is the visual of the soft-lock — others see it's claimed; direct edit is discouraged, the Coach reconciles (memory).
- **Follow-mode (optional, projector-friendly):** "following <name>" banner (the Zoom pattern) — viewport tracks theirs; `Esc` to stop. Useful when the Farrier wants the room to watch one board.
- **Join / leave:** quiet toast (`--z-toast`), never modal. No celebration — calm 95% (§0).
- **Reduced-motion:** cursors jump instead of glide; rings are static.

---

## 14. Canvas viewport & the contextual toolbar (Excalidraw-grade, friendly — extends §4a)
§4a covers the tools; this covers *operating the surface*, matched to what real canvases do.

- **Viewport controls (bottom-right, the universal spot):** `− [100%] +` zoom, **fit-to-content**, and a **mini-map** toggle for big maps. Pan = space-drag or trackpad; pinch-zoom on touch. Zoom range ~25–200%.
- **Floating contextual toolbar:** on **select** (not hover — touch-safe, §11), a small toolbar floats just above the selection (Miro/Mural/Confluence pattern) with the *relevant* actions only — block: colour/type-swap, font `+`/`−`, delete; arrow: straight/elbow/curved, bend, delete. Keeps the main palette (§4a) uncluttered.
- **Resize readout:** while resizing, show a **live dimension badge** (`160 × 120`, the Zoom cue) so sizing is precise, not guesswork.
- **Palette flyout:** the typed-block palette (§4a) groups under labelled flyouts where it gets long (e.g. *Blocks* / *Connectors*), each swatch showing its §4 colour — never icon-only (§0: no cryptic boxes).
- **Connector affordance:** hovering a block reveals **connect handles** on its edges (the Mural "connector points"); two-click arrow creation stays the friendly default (§4a). Arrows snap to handles, stay bound on move.
- **Empty canvas:** an onboarding hint over the blank board — *"Click a block, then click here to drop it"* — optionally a one-glance gesture key (the Miro "Smart drawing" card). Dismissible, never blocking.

---

## 15. Coach interaction (the AI's surface — modelled on AskFred, kept in the Notebook voice)
The Coach is an **accelerator, not a gatekeeper** (memory) — its UI must feel like a sharp colleague in the margin, and must keep working when offline (§10).

- **Voice & frame:** Coach bubbles use Caveat for the conversational chrome but **content/challenges in Inter** (§2 — it's read, often projected). White bubble, `--red-pen` border, tail-left (§5).
- **Challenges as numbered, scannable items** (AskFred): when the Coach pushes back ("a report isn't a reason", the rabbit-rule — memory), it leads with a **bold one-line provocation**, then the why. Not a wall of prose.
- **Quick-action chips** at the input: context entry points — *"What's thin?"* · *"Run the Newcomer check"* (Surface — §8 vocabulary rule; the Rebuild equivalent may speak freely) · *"Challenge this phase"* — each with a small §1 colour-dot (AskFred). Tapping seeds the conversation; never a dead end.
- **Per-message actions** on a settled Coach message: **copy**, **👍/👎 feedback** (a quiet *"thanks"* toast — the Fireflies pattern), and where a message references a node, a **"show me on the map"** link that pans/pulses it (ties chat to canvas).
- **Status line** above the composer reflects the §10 AI state (*reading along / thinking / working / offline*) — honest, low-key, muted Caveat.
- **Composer:** persistent, `Enter` sends, `Shift+Enter` newline, `↑` edits last. Placeholder in the room's own language (*"Tell the Coach about your process…"* in Surface).
- **Degraded mode is first-class, not an afterthought:** offline → the composer swaps to the built-in **question-bank** chips (CLAUDE.md fallback) under a calm note; rule-based checks (§5 governance) keep running. The team never gets stuck.

---

## 16. Iconography (one stance, consistently applied — craft pass: **no system emoji anywhere in chrome**)
System emoji are per-OS candy — Apple's 👤 sitting on hand-drawn ink is the fastest way for the map to read "slapped together," and they render differently on the projector vs. every phone in the room. The audit-pass rule ("inline SVG for emoji that must match") is now the rule for *all* of them:

- **Ontology glyphs are a custom hand-drawn SVG set** (§18) — 10 small inline SVGs (persona, trigger-bell, agent-bolt, lock, intent-bulb, outcome-flag, orphan-pin, pain-mark, the 🐎 wordmark, the stamp motif): single `--ink` stroke at one consistent weight, slightly wobbly, sized 16/20/24 on the §3 scale, **identical pixels on every device**. They tag *what a thing is* (§4 — the emoji in that table are shorthand for these assets, not a rendering instruction). Trigger and outcome carry glyphs so the flow's endpoints don't rely on colour+shape alone (§9); phases/moments/inputs stay glyph-less, typed by shape and containment. Keep the set small and fixed — don't add glyphs for decoration (§0).
- **UI affordances use line icons, not glyphs** — toolbar tools, viewport controls, copy/feedback, close/expand. Same single light-stroke language (~1.5–2px) so they sit with the ink line-work.
- **Never** mix a glyph and a line icon for the *same* meaning across screens. Glyphs = ontology identity; line icons = actions. That split is the whole rule.
- Emoji may still appear where they are **content** (a participant types 🎉 into the brain-dump) — never as system chrome.

---

## 17. Per-surface look notes (how the system lands on each screen)
Behaviour is in the screen specs; these are the *look* deltas. All inherit §0–16.

> **Layout update (2026-06-12 — `2026-06-12-coach-layout-and-motion-design.md`):** the Surface "chat∣map split" and Rebuild "map-heavy + Coach dock" below are superseded by **one collapsible/resizable right Coach rail in both phases, map full-bleed** (open in Surface, collapsed-with-badge in Rebuild). In Rebuild the teardown ingredients live **on the map as scattered context cards** (not a side panel); people land via a canvas tray; Assumptions is an always-visible rail-bottom/floating strip. §6's motion table is extended there with the landing/lobby/ready/transition moments (playful & characterful, still GPU-only + reduced-motion-safe).

- **Lobby (create/join):** the calmest surface — one centred card, Fraunces welcome, the 🐎 mark. **Join = identity + 4-letter code** (the Google Classroom class-code model): name field, big code input with **format helper** ("4 letters, e.g. `MARE`") and the §10 error state. Create-a-room is one loud-*ish* primary (highlighter, §5) — inviting, not shouting. **No hint of the swap** (it's a surprise — workshop-context); lobby copy stays about *your* workflow only.
- **Surface (capture):** chat|map split (resizable; memory). Map is the hero; Coach assists. Orphan tray docked and visible (§4). Everyday calm — this is 95% territory.
- **Swap (the reveal — the one big peak):** full-bleed `--z-overlay` scrim, **stamp-slam** (§6) using the **§18 stamp asset** in `--loud-red`, the plot-twist line ("you're redesigning *another* team's") at `display-xl`. This is the 5% — the only place the crayon-manifesto energy is fully unleashed (§0), and the most-photographed moment of the workshop: it gets a *designed* asset, not styled text. Then it resolves fast into Rebuild.
- **Rebuild (redesign):** map-heavy + Coach-assist. **Locked blocks** delivered scrambled (dashed purple, 🔒, no handles — §4/memory); **agent blocks** (⚡ agent-blue) are the new build material. Retrofit kill = **scribble-out** peak (§6), used sparingly.
- **Share-out:** clean, presentable. The **double reveal** (share §1): original revealed ("what it was") → rebuild ("what it became") → the Coach's "what died" diff as a caption strip. *No scoring in v1 (PRD-locked).* Legibility over chrome; this goes on the projector → §11 present rules apply.
- **Farrier console (NEVER projected — its phase rail spells out the swap):** the one **dashboard** surface — a **metric stat-card row** (teams: capturing / ready / orphans-blocking), an **auto-refresh** live indicator (the ClickUp/Asana pattern), and **canvas-mirror** drill-down (shows a team's *actual* board incl. floating orphans — not a list; memory). Calm, scannable, monitoring-grade. Offer a **dark variant** for a dim room (Asana ships both).
- **Room view (the only projectable surface pre-share — farrier-console §2a):** treat it as a **typographic poster** — it's on the projector longer than any other surface and carries the brand for the whole room. The workshop code at `display-xl` (Fraunces, high `opsz`, a touch of wonk, letterpress-subtle inset shadow); roster + live counts and the timer set quietly below in Inter (`tabular-nums` so the timer doesn't jitter). No phase rail, no governance language, no controls; obeys §8's vocabulary rule. Max-contrast pairs, §11 present rules.
- **Projector / present view:** §11 present mode — large type, max-contrast pairs only, editing chrome hidden. The Farrier's **Before/After present view** (the double reveal; workshop-context) lives here, on the room view.

---

## 18. Craft assets (the authored layer — built once, used everywhere)
§0–17 are taste rules; these are the **assets and vendored tools** that close the gap between "warm hand-made" on paper and what default CSS produces. The thesis: *authored, not generated* comes from a small number of things a person clearly drew — not from more decoration. Build these first; every surface inherits them.

**Reference sheet: `craft-assets.html`** (repo root) — the glyph set and both stamps exist there as canonical inline SVG `<defs>` (copy wholesale), with the wash palette and grain demonstrated live. Drawing decisions made there: the orphan glyph renders as a **pushpin** ("parked in the tray" — a safety pin doesn't read at 16px) and the horse wordmark is a **chess-knight silhouette** (the one horse shape legible at any size).

| Asset | Spec | Where it lands |
|---|---|---|
| **Glyph set** (10 inline SVGs) | persona · trigger-bell · agent-bolt · lock · intent-bulb · outcome-flag · orphan-pin · pain-mark · 🐎 wordmark · stamp motif — single `--ink` stroke, one weight, slight wobble | every §4 block, the logo, the toolbar (§16) |
| **The stamp** | designed SVG: double ring, distressed ink texture, 4–6° rotation, `--loud-red` | swap reveal (§6 stamp-slam), "CHALLENGE", loud buttons (§5) |
| **Paper grain** | static SVG fractalNoise overlay, ~3% opacity, fixed, `pointer-events:none` | `--paper` background, every surface (§3) |
| **Ink bleed** | blurred duplicate stroke (~1px / ~20%) under red-pen marks | squiggle, scribble-out, Coach circles (§3) |
| **Wash palette** (`--wash-*`) | each §4 hue blended into `--paper` to ~6–10% chroma | map block fills (§1 map-wash rule) |
| **rough.js** (vendored, plain file) | seeded per node-id — deterministic wobble across devices | all hand-drawn boxes/arrows/underlines (§3) |
| **perfect-freehand** (vendored, plain file) | pressure-tapered ink strokes | the freehand tool (§4a) |
| **Boil frames** | 2–3 rough.js seed-variants per stroke, swapped ~300ms | boiling-line idle (§6) |

**Build order (highest leverage first):** glyph set → §2 type scale (incl. retiring the hand fonts) → wash palette → rough.js strokes → grain + bleed → the stamp. The glyph set and the font demotion are each roughly an afternoon, and together do more for "authored, not generated" than everything else combined.

---

## 19. Status
- §0–8 values are **already consistent** across the mocks; this doc makes them **criteria**.
- §9–17 (audit pass) extend the look to **every surface** and close the eight gaps in the table at top — grounded in real collaborative tools (Mobbin), kept inside the Critic's Notebook soul (§0).
- The **craft pass** (§1 map-wash, §2 two-families + scale, §3 stroke/texture recipe, §16 no-system-emoji, §18 assets) supersedes the mocks where they disagree — the existing prototypes still use Patrick Hand / Permanent Marker / system emoji / full-strength fills and are **not** the visual target.
- **Next (build):** produce the §18 assets first; refresh the prototypes (esp. `hifi-horsepower.html`) to the §4 symbol vocabulary + §6 motion + §18 craft layer; then sweep the §9–16 criteria across each surface (a11y contrast verify, AI/degraded states, presence, contextual toolbar). The watch-list contrast pairs in §9 are the one thing to **verify against a real projector** before run #1.
