# Typography Audit — Horsepower 🐎

**Auditor:** Typography director, hostile pass. **Date:** 2026-06-13.
**Method:** Self-hosted room (code 9UDD), two teams driven through the full
lobby → surface → swap → rebuild → share → closed arc; retina (DSF2) captures at
1440×900 + zoomed element shots of every type-dense region.
Evidence in `qa-design/typography/`.

**Idiom is LOCKED and judged on its own terms:** hand-drawn paper/ink — Fraunces
display (variable: opsz 9–144, WONK 0–1), Inter body (400/500/600), Caveat
handwriting (500/600), navy `#21314f` ink on cream `#f4efe2` paper. The question
is *execution within this idiom against the best craft on the web* — and on the
display tier, this is genuinely top-shelf. The defects below are almost all in
the **small/secondary** tier and in **long-content handling**, not in the headline
voice.

---

## Problems

### 1. Team-name truncation is systemic and lands on the keepsake — HIGH
**Where:** everywhere a team name is set in Fraunces `white-space:nowrap`.
Confirmed in **four** places with the test name "Accounts Payable Process
Excellence Squad":
- the keepsake **race card** (`.racecard h3`) → "…Excelle**" — clipped mid-word,
  the highlighter swash sheared off (`64-share-racecard-zoom.png`,
  `67-closed-member.png`)
- the **lobby** team identity → "…Squa" (`21-lobby-saddled.png`)
- the **share double-reveal** heading → "What it was — Accounts Payable Process
  Excellence **Squa's** real process" — the truncation manufactures a fake
  possessive ("Squa's"), which reads as a typo (`60-share-top.png`)
- the **console team table** → "…Squa" (`38-console-surface-timer.png`)

The race card is the single worst instance: it is the artifact participants
literally screenshot and take home (`Save-as-PNG`), and it ships with a chopped
word and a severed highlighter underline. `text-overflow:ellipsis` is declared on
`.racecard h3` but **no ellipsis is rendering** — it's a hard clip, which means
the nowrap + overflow combination is being defeated by the highlighter
`box-shadow:inset` + `padding-right` geometry.
**Evidence:** `64-share-racecard-zoom.png`, `67-closed-member.png`,
`21-lobby-saddled.png`, `60-share-top.png`, `38-console-surface-timer.png`.
**Prescription:** Allow team names to wrap to **2 lines** on the race card and
in the lobby/share headings rather than truncate — these are not space-
constrained the way a table cell is. For the race card h3 specifically: drop
`white-space:nowrap`, set `display:-webkit-box; -webkit-line-clamp:2;
-webkit-box-orient:vertical; overflow:hidden; line-height:1.12`, and render the
highlighter swash as an underline that follows the wrapped text (e.g. a
`background:linear-gradient` on the inline run, not an `inset box-shadow` that
assumes one line). For the **console table cell** (where wrap would break the
row), keep one line but enforce a real ellipsis: `max-width:32ch; overflow:
hidden; text-overflow:ellipsis; white-space:nowrap` on the `<td>`'s inner span
and add a `title` attribute for the full name. A 24-char cap on capture would
also be reasonable product hygiene.

### 2. Land-tray fate buttons clip "removed" → "remove" — MED
**Where:** Rebuild people-landing tray (`.land-btn` row inside `.landtray`).
The three fate buttons **stays / transforms / removed** overflow the 1-rail
panel width; "removed" is sheared to "remove" at the panel edge
(`51-rebuild-land-tray-zoom.png`). This isn't cosmetic — it inverts the meaning
of the most consequential control in the human-landing gate (Product rule 6:
"removed-justified-by-the-design"). A facilitator scanning the rail reads
"remove" as a softer word than "removed."
**Evidence:** `51-rebuild-land-tray-zoom.png`, `46-rebuild-initial.png`.
**Prescription:** Let the three buttons wrap to a 2-row grid
(`display:grid; grid-template-columns:repeat(2,1fr); gap:6px`) or shrink to
`font-size:12px; padding:5px 8px` and set `flex-wrap:wrap` on the row so no label
is ever clipped. Never truncate a verb that is a state label.

### 3. Caveat in `--muted` at ≤16px is asked to carry real reading — MED
**Where:** repeated pattern of handwriting set small AND low-contrast:
- Coach rail subhead "Coach is offline — the map & checks still work" — Caveat
  16px, `--muted` `#66708a` on `--card` (`27-surface-coach-rail-zoom.png`)
- statusline `.statusline` Caveat 16px `--muted`
- land-tray subhead "everyone lands — that's the deal" — Caveat in `--muted`
  (`48-rebuild-candidate-zoom.png` neighbour)
- `.railpeekpill` "the Coach is reading along…" — Caveat 16px `--muted-strong`

Caveat is a single-weight informal script; at 16px in `#66708a` on cream its
x-height strokes thin out and the contrast ratio is ~3.0:1 — under WCAG AA for
text. Handwriting earns its charm on *short, glanceable* asides (annotations,
the coach's name, the whisper column) — it should **not** be the carrier for a
functional status string the user is expected to actually read. Where it's doing
a job, it's noise dressed as charm.
**Evidence:** `27-surface-coach-rail-zoom.png`, `51-rebuild-land-tray-zoom.png`.
**Prescription:** Two-tier rule. (a) Caveat stays for **decorative/annotation**
only (node annotations `.hann`, coach name `.who`, the console whisper column,
trigger captions) — those are excellent, keep them. (b) Any Caveat that conveys
**state or instruction** demotes to Inter 13px `--muted-strong` (`#4a5468`,
≈4.6:1) — that covers `.statusline`, the offline subhead, and the land-tray
"everyone lands" line. If you want to keep the script flavour on those, bump to
Caveat **18px weight 600** and `--ink` (`#21314f`) so it can be read, not just
admired.

### 4. The 12px floor is overloaded across dense panels — MED
**Where:** an unusually large amount of *functional* copy sits at exactly 12px:
inspector labels/textarea (`.inspector label`, `.inspector textarea`), locked-
node small-caps (`.node.locked small`), candidate cap/ctag, person `why`,
landtray `ppl-how`, ingcard `capline`/`why`, briefblock `.h`, console table
`th`, statustag, runscript eye, amend-compare header, bubble `.nm`/`.sys`,
msgactions. On the Rebuild canvas the locked-node eyebrow ("LOCKED · INTENT")
is 12px **uppercase + 0.08em tracking** — at retina it survives, but on a
1×-DPI projector or a participant phone it's the first thing to disintegrate
(`46-rebuild-initial.png`, `28-surface-map-built.png`). The codebase clearly
*knows* this (comment "E2: <14px secondary text uses the stronger muted") — the
mitigation is colour, not size, and colour doesn't restore the strokes.
**Evidence:** `32-surface-inspector-zoom.png`, `46-rebuild-initial.png`,
`38-console-surface-timer.png`.
**Prescription:** Raise the secondary floor from **12px → 13px** for any text a
user reads to act (inspector labels, locked eyebrows, briefblock headers, land
buttons, candidate caps). Reserve 12px strictly for **count badges and
tabular chrome** (`.dimbadge`, `.zlbl`, avatar initials) where it's a glyph not a
sentence. Locked-node eyebrow specifically: 12px → 13px, tracking 0.08em →
0.06em (tighter tracking reads better as size drops).

### 5. Case inconsistency between labels and their placeholders — LOW
**Where:** form fields. Label "Your name" (sentence case) sits over placeholder
"your name" (lowercase); "Workshop code" over "4 letters — e.g. MARE"
(`12-landing-form.png`). The mismatched case of label vs ghost text reads as
two different voices in one field. Separately, the ticket input forces
`text-transform:uppercase` + 0.32em on entered codes but the placeholder is
`text-transform:none` — intentional and fine, but the *name* field's lowercase
ghost is just inconsistent.
**Evidence:** `12-landing-form.png`, `69-mobile-landing.png`.
**Prescription:** Sentence-case the name placeholder to match its label
("Your name"), or commit fully to lowercase ghosts as a deliberate system and
make ALL placeholders lowercase. Pick one; right now it's accidental.

### 6. Em-dash spacing is inconsistent across the product — LOW
**Where:** the product leans heavily (and stylishly) on the spaced em-dash as
its signature connective — "Surface — mapping how it works today", "kept = a real
constraint that survived". Good. But some strings use a spaced **en**-dash or a
hyphen where an em-dash is meant, and the run-of-show rows / coach replies vary.
At display sizes this is invisible; in the share ledger and console it's a
faint inconsistency a typographer will catch.
**Evidence:** `60-share-top.png`, `62-share-ledger-zoom.png`,
`38-console-surface-timer.png`.
**Prescription:** Standardise on **spaced em-dash** ( ` — ` ) as the house
connective and audit literal strings for stray ` - ` / ` – `. Low effort, raises
the finish. (The curly-quote usage is already correct — "rule", "freed up…" —
so the punctuation discipline is *mostly* there; the dash is the gap.)

---

## What's genuinely excellent

- **The display tier is IPO-grade.** The "Horsepower" wordmark (opsz 144, WONK 1,
  -0.03em) and the projected room-view code "9UDD" (opsz 144, letterpress
  text-shadow, 0.06em) are *correctly set as display type* — high optical size,
  WONK engaged for the lively Fraunces terminals, negative tracking on the
  wordmark and positive tracking on the spaced code. This is the difference
  between "used a nice serif" and "set display type." (`11-landing-wordmark.png`,
  `15-roomview-lobby-codethrone.png`, `40-roomview-timer-throne.png`)
- **Tabular numerals are applied everywhere they matter** — every timer
  (`.timer`, `.bigtimer`, `19:58` throne), the zoom `.zlbl`, dim badges, stat
  numbers, the join code. No timer jitter. This is the detail most products miss
  and Horsepower nails it. (`40-roomview-timer-throne.png`)
- **The optical-size ladder is disciplined and intentional:** h1 opsz 96 / h2
  opsz 36 / h3 opsz 24, with the stat number at opsz 60 and throne at 144 — the
  variable axis is being driven by *role*, not left at auto. Rare.
- **Inter body rhythm is correct:** 16px/1.5 base, 14px/1.45 in chat bubbles, the
  long-phase node wraps to four clean lines at 1.5 with no rivers or orphans
  (`30-surface-node-longname-zoom.png`). Measure on the landing tag is capped at
  46ch — a deliberate, healthy line length.
- **The stamp.** "REDESIGN / DON'T RETROFIT" in tracked red caps with the rough
  letterpress stroke is *real stamp typography* — the wide tracking, the two-tier
  size relationship, the distressed edges all read as an actual rubber stamp, not
  a font in a box. (`45-reveal-stamp-zoom.png`)
- **Caveat where it belongs** — the red-pen annotations, the coach's name
  ("the Coach · scribe"), the console whisper column, the trigger caption
  ("Trigger — what kicks it off") — is the charm working exactly as intended.

---

## The 3 worst / 3 best moments

**3 worst:**
1. **Race-card team name clipped mid-word** (`64-…`, `67-…`) — the keepsake, the
   one artifact that leaves the room, ships broken. Worst because it's the most
   precious surface.
2. **"removed" → "remove" on the land-tray fate button** (`51-…`) — a truncation
   that changes the meaning of a gate control.
3. **Caveat status strings at 16px/`--muted`** (`27-…`) — handwriting carrying a
   functional offline-state message below AA contrast; charm undermining
   legibility exactly where you need the user to read.

**3 best:**
1. **The "9UDD" room-view code throne** (`15-…`) — flawless projected display
   setting; opsz 144 + letterpress + spaced tracking. The product's high note.
2. **The "19:58" timer throne** (`40-…`) — display serif + tabular nums; a
   countdown that looks like a stadium clock rendered in ink.
3. **The "REDESIGN / DON'T RETROFIT" stamp** (`45-…`) — type set *as an object*,
   not as a label.

---

## Verdict

**Is this IPO-grade type? On the display and chrome tier — yes, unreservedly.**
The Fraunces variable axis is driven by role, tabular nums are universal, the
optical sizes are deliberate, the measure and body rhythm are healthy, and the
hand-drawn idiom is executed with real discipline rather than as a gimmick. The
headline voice would not embarrass anyone next to Linear, Stripe, or Notion's
craft tier.

It is **held back from a clean sweep by two things, both fixable in an afternoon:**
(a) **long-content truncation** — team names clip mid-word in four places
including the keepsake, with the declared ellipsis silently failing; and (b) an
**overloaded small tier** — too much functional copy at the 12px floor and too
much Caveat doing reading-work below AA contrast.

**The single change that moves it most: fix the team-name truncation system-wide,
starting with the race card** (wrap to 2 lines + a swash that follows the text).
It is the most-screenshotted artifact in the product, it currently ships a
chopped word, and the fix is contained CSS. Do that and raise the secondary
floor to 13px, and the small tier catches up to the (already excellent) display
tier.
