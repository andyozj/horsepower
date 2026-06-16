# Slice C — live-AI UAT script (run on Render)

**URL:** https://horsepower-q6wf.onrender.com
**Why Render:** it's the only place the genai.heineken gateway is wired, so this is the ONLY way to test live Coach quality (the build was verified on the rule-based path only).
**Commit under test:** `90591a0` (Slice C). Free-tier Render cold-starts — the first page load can take ~50s; that's normal.

The point of this run is the **live AI**. The mechanics already pass 16 automated suites; what we can't test without a key is whether the Coach is actually *sharp*. So as you go, judge the Coach's words, not just that buttons work.

---

## Setup (one person, 3 browser windows)

Identity lives in localStorage, so each actor needs its own profile:
- **Window 1 — Farrier (host):** a normal window.
- **Window 2 — Team A member:** an Incognito/Private window.
- **Window 3 — Team B member:** a *second* Incognito window (or a different browser, e.g. Chrome + Safari). Two incognito windows of the *same* browser sometimes share storage — if Team B inherits Team A's identity, use a different browser for Window 3.

> The swap needs **2+ teams**, so both team windows are required.

---

## Step 0 — confirm the deploy actually has Slice C
1. Check your Render dashboard: latest deploy of `main` is **green/Live** and matches commit `90591a0`.
2. In Window 1, hard-refresh (Cmd-Shift-R). If anything looks stale, the CDN/cache may be holding the old build — hard-refresh each window.
3. You'll positively confirm Slice C exists when you reach **Rebuild** and see the **"Constraints — real or habit?"** panel + the **"⚑ Coach, check this"** button on a landed person. If those are missing, the deploy didn't land — stop and tell me.

---

## Step 1 — Lobby
1. **W1 (Farrier):** click **Host**. Note the 6-char code + the 8-char host code.
2. **W2:** enter your name + the code → **Join** → **Create team** → name it `AP Squad`.
3. **W3:** name + code → **Join** → **Create team** → name it `Onboarding`.
4. **W1:** confirm both teams show in the lobby/setup screen.

✅ *Watch:* lobby copy must never say swap/redesign/rebuild/transfer (the pre-reveal secrecy rule).

---

## Step 2 — Surface = the live-AI interview  ⟵ **first live-AI test**
1. **W1:** click **Start Surface**.
2. **W2 & W3** each open in the **AI-led interview** (chat hero). In each, *talk like a real team* — paste a few messy sentences about a real workflow. Give each team **2-3 people with clear roles**, a trigger, a couple of phases, a real decision (intent), an outcome. Example seeds:
   - **AP Squad:** "Supplier invoices land in a shared inbox. A clerk keys them into SAP, matches them to POs, chases mismatches by email. A manager approves anything over £10k. The point is to decide pay-or-dispute so we don't miss discounts or pay twice."
   - **Onboarding:** "When an offer's accepted, HR creates the record, IT provisions a laptop and accounts, the manager sets up first-week tasks. We're trying to get a new hire productive on day one."

**✅ What good looks like (judge the Coach):**
- Asks **one sharp question at a time**, doesn't dump a wall of text.
- **Digs into WHY** ("why does the manager approve over £10k?") and pushes artifact-intent to a real decision.
- **Builds the map live** — typed blocks appear (persona/trigger/phase/intent/outcome) with capacities/WHYs as you talk.
- **Hands off cleanly** when the workflow's captured ("that's your workflow mapped — take a look") and drops you to the map + verify banner.
- 🚩 *Flag if:* it's generic, asks several things at once, invents content you didn't say, never hands off, or the map fills with junk.
3. After hand-off, on the map, make sure each team genuinely has **2-3 persona blocks** (the people inventory + candidate constraints come from these — Slice C needs them). Add any missing via the palette. Optionally flag a pain point via the block inspector.

---

## Step 3 — The swap
1. **W1 (Farrier):** *(optional, for the spectacle)* click **Hold the room** first → the CTA flips to **Reveal the swap**; the member screens show "pens down."
2. **W1:** click **Swap → Rebuild** (or **Reveal the swap**). Confirm the modal.
3. **W2 & W3:** watch the reveal, click **Let's build** when prompted.

✅ *Watch:* each team receives the *other* team's teardown (AP Squad gets Onboarding's brief, and vice-versa); locked blocks arrive scrambled.

---

## Step 4 — Rebuild = the Slice C live-AI muscle  ⟵ **the main event**
Do all of this in **W2 (AP Squad)** at least; repeat in W3 if you have time.

### 4a. Persona challenge (live AI)
1. Open the **people tray** (right). For one person, type a deliberately *weak* note like `reviews` and click **transforms**.
2. Click **⚑ Coach, check this**.
   **✅ Good:** the Coach pushes back specifically — "'reviews' is a verb, not a role — what's it *called*?" — and a **require-chip** ("needs a named role") appears on the card. It should quote *your* words, not be generic.
3. Now try the retrofit trap: on another person, type `freed up for higher-value work`, click **removed**.
   **✅ Good:** the landing is **rejected by the gate** (the count won't tick up) — and if you fix it to a real note then ask the Coach, weak landings get flagged.
4. Land one person *well* (e.g. transforms → `Exceptions Steward — owns edge cases, sets the rules the agent follows`) and challenge it.
   **✅ Good:** the Coach acknowledges it holds (✓), doesn't manufacture a complaint.
- 🚩 *Flag if:* the challenge is generic/repetitive, contradicts itself, or the require-chip never clears on a genuinely good landing.

### 4b. Constraint routing (live AI)
1. Open **"Constraints — real or habit?"** (top-left panel). For one constraint, click **law**.
   **✅ Good:** verdict shows **REAL — survives the redesign**.
2. Click **habit** on another → verdict **ASSUMED — you can design this away**.
3. Click **Ask the Coach** on the one you called **law**.
   **✅ Good:** the Coach pushes "*which* law, exactly? cite it, or it's a policy you can change." — specific, not boilerplate.

### 4c. Shape meter + agents
1. Drop an **Agent** block (palette) where AI should act, e.g. "auto-match invoice to PO + post".
2. Land the rest of the people; watch the **shape meter** in the people tray move between **RETROFIT-SHAPED → PARTIAL → REDESIGNED** as roles move and agents appear.
   **✅ Good:** all-stays + no agents reads **RETROFIT-SHAPED**; lots of transforms/removed + agents reads **REDESIGNED**.
3. Log an assumption or two in the Assumptions ledger.

### 4d. Farrier console (live)
In **W1**, confirm the **Shape verdict · retrofit detector** board appears (per-team band + any open Coach flags). This is Farrier-only — it must **never** appear on the projected room view.

---

## Step 5 — Share
1. **W1:** **Swap → Share** (toggle room view OFF first if it's projected).
2. **W2 & W3:** confirm: before|after double reveal, "what died" strip, the **"Did the work change shape?"** shape-verdict card, and the assumption reckoning (the original team confirms/busts the other's guesses).
3. **W1:** confirm the console **pulse board + shape board** (Farrier-private).
4. Optionally fill the exit pulse / commitment cards on member screens.

---

## Step 6 — Close
**W1:** **Finish & close.** Members see the keepsake race card; recap save works.

---

## What to send me back (so I can fix)
For anything weak or broken:
- **The Coach's actual words** — copy/paste the exact reply, especially any that felt generic, wrong, repetitive, or off-tone. (This is the highest-value feedback — it's the one thing the suites can't check.)
- **Screenshots** of any layout problems — I'm most suspicious of the constraint panel vs people tray overlapping on smaller screens.
- **Console errors:** F12 → Console → tell me anything red.
- **Anything that stalled** (a Coach call that hung or returned blank instead of degrading to a bank line).
- Quick verdict per live-AI surface: interview / persona challenge / route challenge — **sharp, ok, or weak?**

I'll triage and fix whatever surfaces, then we re-deploy.
