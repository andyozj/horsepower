# Horsepower — Color & Surface Audit

**Auditor lens:** color & surface discipline within the LOCKED paper/ink idiom. No app files were edited.
**Method:** self-hosted a live workshop on `localhost:3200`, drove all phases at `deviceScaleFactor:2`, shot 57 screens + zoomed swatches into `qa-design/color/`, and computed real WCAG ratios two ways — live `getComputedStyle` in-page (`qa-design/color/ratios.json`) and from the locked tokens (color-mix washes resolved by hand). Numbers below are computed, not eyeballed.

**The locked palette as built** (from `public/index.html` :root):
`--paper #f4efe2` · `--card #fffaf0` · `--ink #21314f` · `--muted #66708a` · `--muted-strong #4a5468` · `--red-pen #e23b3b` · `--loud-red #e02d2d` · `--highlighter #ffd24a` · `--thin #b3760b` · `--gold #b8860b` · `--lock #7c3aed`.
The 10 block washes resolve to: lock `#e9dfe3` · blue `#e6e6e7` · agent `#e4e1d7` · trigger `#e0e4d4` · phase `#f0e9d5` · moment `#eae8e5` · input `#e9e5db` · pain `#f2ddd1` · intent `#ede2c8` · outcome `#f8e4a8`.

---

## Problems

### 1. The wash family has collapsed into one grey — 7 of 10 washes are indistinguishable. [SEVERITY: HIGH]
This is the single biggest color failure and it strikes at the product's core (a typed diagramming canvas where block *type* is meaning).
**Evidence (resolved wash hexes, side by side):**
`agent #e4e1d7` · `input #e9e5db` · `moment #eae8e5` · `blue #e6e6e7` · `lock #e9dfe3` · `trigger #e0e4d4`. These six sit inside a ~6-unit RGB envelope of desaturated grey-cream. In the built swatches (`16-node-trigger.png`, `17-node-input.png`, `19-node-moment.png`, `15-node-persona.png`) the *fills are visually identical* — type is carried 100% by the colored left-border + icon + the tiny "· TYPE" label, never by the wash. The wash system, as a system, is not doing its job: it reads as ONE family because it has collapsed to ONE color.
**Root cause:** the mix percentages are far too low for low-chroma source tokens. `trigger = ok 10% + paper` and `agent = agent-navy 8% + paper` can't survive being 88–92% cream. Meanwhile two washes shout (see Problem 2), so the family also lacks internal consistency of *loudness*.
**Prescription:** widen the tints to a consistent perceptual step and lift saturation of the muddy ones. Concretely, raise the quiet washes so each lands ~L\*92–94 with visible hue: `--wash-trigger: color-mix(in srgb, var(--ok) 18%, var(--paper))`, `--wash-input: color-mix(in srgb, var(--muted) 14%, var(--paper))`, `--wash-moment: color-mix(in srgb, var(--moment-blue) 22%, var(--paper))`, `--wash-agent: color-mix(in srgb, var(--agent) 14%, var(--paper))`, `--wash-lock: color-mix(in srgb, var(--lock) 16%, var(--paper))`. Then pull the two loud ones DOWN (Problem 2) so the whole set reads as one cohesive ramp of ~equal lightness but *distinct hue*. Target: any two adjacent node types must be tellable apart by fill alone at arm's length on a projector.

### 2. Two washes break the family by being far louder than the other eight. [SEVERITY: MEDIUM]
`outcome = highlighter 38%` resolves to `#f8e4a8` — a saturated marigold. `intent = gold 12%` → `#ede2c8`. Set against the eight near-grey washes, these two read as a different material (see `20-node-intent.png` vs `21-node-outcome.png` vs `16-node-trigger.png`). The outcome block is the loudest thing on the working canvas — louder than the highlighter CTA is supposed to be, which muddies the yellow's meaning (see Problem 5).
**Prescription:** drop outcome to `color-mix(in srgb, var(--highlighter) 22%, var(--paper))` and lift the eight quiet ones per Problem 1, so the spread between loudest and quietest wash is a step, not a cliff. Keep outcome the *warmest* wash, just not a different planet.

### 3. Gate chips fail AA: `--thin` on `--warn-wash`, 13px body. [SEVERITY: HIGH]
`.gchip.bad` is `color:var(--thin) #b3760b` on `background:var(--warn-wash) #fff6e3` → **3.55:1** (live-measured, `ratios.json`). The text is 13px / weight 500 — body text, needs 4.5:1. Seen in `23-surface-gate-chips.png` / `24-gate-chips-swatch.png` ("~ 3 too thin for a newcomer", "Newcomer check — 1 to fix"). These chips are mission-critical methodology copy (the readiness gate) and they're the lowest-contrast functional text in the app.
**Prescription:** darken the gate-warn text token to `#8a5a08` (gives 4.6:1 on warn-wash) OR drop to a darker amber `#7a4f07`. Do NOT lighten the wash. Same fix applies anywhere `--thin` carries small text on a wash.

### 4. `--muted` body text rides at-or-below the AA line on every wash and on paper. [SEVERITY: MEDIUM]
`--muted #66708a` is the workhorse secondary-text color and it is calibrated right on the edge:
- on `--paper`: **4.30:1** (`12-surface-empty.png` emptyhint — passes by a hair)
- on `--card`: **4.75:1** (labels — OK)
- on every node wash: **3.77–4.08:1** (intent 3.84, agent 3.78, pain 3.77) — **fails** for the `.node small` secondary text and `.ctxinfo`.
The codebase already invented `--muted-strong #4a5468` for sub-14px text (good instinct, `.meta` uses it at 13px → 6.0+:1 on washes). The problem is `--muted` is still used for plenty of ≤13px secondary text (`.bubble.sys`, `.statusline`, `.step`, `.land-tray` hints, `.orphan .olet`, `.viewctl .zlbl`).
**Prescription:** make the rule absolute — **any text ≤13px uses `--muted-strong`, never `--muted`**; reserve `--muted` for ≥15px. Cheaper alternative: nudge `--muted` to `#5c6party`→ `#5b657f` (≈4.6:1 on paper, ≈4.0 on washes — still short on washes). The token swap is the honest fix.

### 5. The yellow carries three different jobs and they bleed. [SEVERITY: MEDIUM]
There are effectively four yellows in play: `--highlighter #ffd24a` (the CTA / underline / "I'm the action" yellow), `--outcome wash #f8e4a8` (a block type), `--gold #b8860b` + `--gold-deep #e0a93a` (candidate-constraint accent), and `--thin #b3760b` (the warning amber). On the rebuild map (`32-rebuild-initial.png`) the candidate card's gold heading, the outcome-locked block's yellow wash, and any highlighter CTA all read as "the warm one" with no rank. The candidate-card gold heading (`33-card-candidate.png`) is `--gold #b8860b` on intent-wash `#ede2c8` → **2.53:1** — fails even large-text 3:1.
**Prescription:** assign each yellow a job and a value lane. (a) Highlighter stays the brightest, *CTA-only*. (b) Outcome wash drops per Problem 2 so it never out-shouts the CTA. (c) Candidate accent: stop using `--gold` for text on a gold-tinted wash — use `--gold-deep #e0a93a` only for the *border/dog-ear*, and set the "CANDIDATE CONSTRAINT" label in `--thin`-darkened `#7a4f07` (4.5:1 on the wash) or in `--ink`. (d) Warning amber (`--thin`) gets darkened per Problem 3. Three yellows, three values, three meanings.

### 6. Candidate / "tap — the why" hint and `.candidate .ctag` are sub-AA on the gold wash. [SEVERITY: LOW-MEDIUM]
`.candidate .ctag` (`--thin` 12px) on intent-wash → **2.96:1**. The "tap — the why" italic muted hint sits at ~3.8:1. Both are small affordance text on the loudest-but-one wash.
**Prescription:** rolls up into Problems 1+5 — once intent-wash is recalibrated and `--thin` darkened, recheck; target 4.5:1 for the ctag.

### 7. Decorative borders and arrows are near-invisible (figure-ground is soft, not broken). [SEVERITY: LOW]
`--line #b9b094` on paper = **1.89:1**; `--arrow-line #9aa3b8` on paper = **2.20:1**; `--ink-soft #cfd6e4` on paper = **1.27:1**. These are non-text (AA doesn't gate them) but they explain why the cream-on-cream layering goes mushy on the Share screen (`44-share-bottom-racecard.png`) — cream cards on cream paper separated only by a ~1.9:1 hairline. It holds in Surface (the canvas dot-grid + node shadows carry it) and in the lobby (the center divider). It is weakest on Share, where stacked full-width cards float on paper with almost no edge.
**Prescription:** on Share/closed only, give cards a slightly more present edge — `border:1px solid color-mix(in srgb, var(--ink) 14%, var(--paper))` (≈ `#d8d4c9`, ~2.6:1) plus the existing ink-tinted shadow. Keeps the paper world, restores the figure-ground.

### 8. Texture (grain + dot-grid) is vestigial at this contrast. [SEVERITY: LOW]
The dot-grid is visible on the canvas at 2x (`14-surface-map-built.png`) — good — but the paper grain and the dot-grid on the poster spreads (landing/lobby/share) are at the threshold of perception; on a projector at distance they'll vanish. The idiom *promises* paper; right now it whispers it.
**Prescription:** lift the dot-grid dot alpha ~15–20% on the non-canvas poster surfaces and the share stage. Don't touch the working canvas (calm is correct there).

---

## Contrast table

| Pair | Context | Ratio | Min | Verdict |
|---|---|---|---|---|
| `--muted-strong` on paper | landing tag | 6.63 | 4.5 | PASS |
| `--red-pen` Caveat hint on paper | landing "the WHY…" | 3.72 | 3.0 (large) | PASS (large/decor) |
| `--muted` label on card | form labels (13px) | 4.75 | 4.5 | PASS (just) |
| `codechip` ink on card | console | 11.31 | 4.5 | PASS |
| `.step` muted on card | run bar | 12.48 | 4.5 | PASS |
| `.ctareason` `--thin` italic on card | run bar (12px) | 3.66 | 4.5 | **FAIL** |
| `.emptyhint` `--muted` on paper | surface (≥15px) | 4.30 | 4.5 | BORDERLINE FAIL |
| `.bubble .nm` muted-strong | coach (12px) | 7.32 | 4.5 | PASS |
| node label `--ink` on outcome wash | intent/outcome blocks | 11.31 | 4.5 | PASS |
| `.node small` `--muted` on intent wash | block subtext (12px) | 3.84 | 4.5 | **FAIL** |
| `.node .ctxinfo` `--muted` on phase wash | block (12px) | 4.08 | 4.5 | **FAIL** |
| `.inspector .ihead` red Caveat on card | inspector (16px) | 4.10 | 3.0 (large) | PASS |
| `.gchip.bad` `--thin` on warn-wash | gate chip (13px) | **3.55** | 4.5 | **FAIL** |
| `.gchip.miss` `--muted` on paper | gate chip (13px) | 4.30 | 4.5 | BORDERLINE FAIL |
| reveal CTA button | swap reveal | 9.01 | 4.5 | PASS |
| reveal twist (card-white) on navy scrim | swap reveal | 12.89 | 4.5 | PASS |
| reveal twist-sub `--ink-soft` on navy scrim | swap reveal (16px) | 9.19 | 4.5 | PASS |
| reveal stamp red-pen outline on navy | swap reveal (large graphic) | 3.14 | 3.0 | PASS (graphic) |
| member `.timer` chip | surface | 12.48 | 4.5 | PASS |
| `--loud-red` TIME on cream | room view (huge) | ~4.0 | 3.0 (large) | PASS (large) |
| `.locktip .tiphint` muted-strong | rebuild (13px) | 7.32 | 4.5 | PASS |
| `candidate .ctag` `--thin` on intent wash | rebuild (12px) | **2.96** | 4.5 | **FAIL** |
| "CANDIDATE CONSTRAINT" `--gold` on intent wash | rebuild card heading | **2.53** | 3.0 | **FAIL** |
| `briefblock .h` `--muted` on card (12px caps) | rebuild | 4.75 | 4.5 | PASS (caps, letterspaced) |
| `land-btn.removed` muted on removed-wash | people tray (strike) | 4.26 | 4.5 | BORDERLINE FAIL |
| `--lock` purple (ledger "kept") on paper | share | 4.96 | 4.5 | PASS |
| `--ink` on highlighter CTA | landing/console CTA | 9.01 | 4.5 | PASS |
| `--line` border on paper | everywhere (non-text) | 1.89 | n/a | (figure-ground soft) |
| `--arrow-line` on paper | canvas arrows (non-text) | 2.20 | n/a | (acceptable for arrows) |

---

## What's genuinely excellent

- **The red economy mostly holds its three meanings.** `--red-pen` = the Coach's hand (Caveat hints, inspector head, "What died" heading); `--loud-red` = alarm (the TIME state, low-timer pulse, danger buttons); pain-wash `#f2ddd1` = the flagged-pain block. They occupy different surfaces and different shapes (handwriting vs UI vs fill), so they read as distinct registers, not noise. This is hard and it's done well.
- **The navy reveal scrim lands.** After a fully cream app, `rgba(26,39,64,.96)` is a genuine tonal event (`30-reveal-stamp-scrim.png`), and the text on it is high-contrast (12.9 / 9.2) — the red stamp + highlighter accents pop without the body copy going murky. The decision to keep this the *only* dark screen (Share/present pulled back onto paper) is exactly right.
- **The highlighter-CTA / ink pairing is the brand's best note.** `--ink` on `--highlighter` = 9.01:1, and the marker-underline-under-the-wordmark on the landing (`01-landing-desktop.png`) is the single most confident, most "expensive" color moment in the app — a real highlighter doing a real job.
- **The red TIME / timer-throne pair** (`54-roomview-red-TIME.png` vs `28-roomview-timer-throne.png`) is a clean, legible projector state — navy when calm, loud-red when out of time, both in display-scale Fraunces. Zero ambiguity across a room.
- **Ink-tinted shadow discipline is real** — spot checks show no black or purple drop-shadows; nodes are flat at rest, soft ink-tint on hover. The craft-pass claim holds up.

---

## 3 worst color moments

1. **The collapsed wash family on the canvas** (Problem 1). The product is a *typed* map and the type-color does nothing — trigger/input/moment/agent/lock/blue are the same grey. The system's central color idea is, functionally, not present.
2. **Gate chips at 3.55:1** (Problem 3). The most important functional micro-copy in the methodology (the readiness gate) is the least legible text in the build — `--thin` on warn-wash, 13px.
3. **The candidate-card gold heading at 2.53:1** (Problem 5/6). A primary card title fails even large-text contrast, and it's symptomatic of the un-ranked four-yellow problem.

## 3 best color moments

1. **Landing wordmark + highlighter underline + washi "CHALLENGE" stamp** — `01-landing-desktop.png`. Confident, branded, high-contrast.
2. **The navy swap-reveal scrim** — the one dark beat in a cream world, and it earns it.
3. **The red TIME projector state** — alarm done with one token, at display scale, unmissable across a room.

---

## Verdict

**Strong idiom, edge-of-tolerance execution.** The paper/ink world is coherent, the red economy is disciplined, the dark reveal and the highlighter CTA are genuinely excellent, and shadow hygiene is clean. But two things keep this from IPO-grade: (1) the **wash system has collapsed** — its central promise (10 distinguishable block hues) is unmet, with 7 washes reading as one grey and 2 shouting; and (2) **contrast is calibrated to the line and slips under it** in a cluster of small functional text — gate chips, node subtext, candidate accents, `--thin` micro-copy — all 2.5–4.1:1 where 4.5 is required. Neither is a teardown; both are tuning. Widen and re-rank the washes to one consistent ramp, darken `--thin` and ban `--muted` below 14px, and rank the four yellows. Do that and the color story matches the quality of the typography and the reveal. **Grade: B → A− after the wash + contrast tuning.**
