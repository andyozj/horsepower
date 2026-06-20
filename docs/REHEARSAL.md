# Horsepower — solo rehearsal & PTT test script

Goal: prove, with your own hands and voice, that **push-to-talk voice → map building works**, the
**canvas works**, and the **full swap → rebuild → share arc holds** — before the real workshop.

Live app: **https://horsepower-q6wf.onrender.com**
Health right now: `ai:true (anthropic) · db:postgres · voice listen:true converse:true speak:false`
(So: live Coach + realtime PTT Converse are ON. The Coach replies in **text**; it does not speak back.)

---

## 0. Before you start (2 min)

- Use **Chrome** on a laptop (best voice support). Have a **phone** ready too (you'll join as a 2nd device).
- **Headphones on** — stops the mic hearing the room / echo.
- First time you press talk, Chrome asks for **mic permission → Allow**. If you ever blocked it:
  click the 🔒 in the address bar → Site settings → Microphone → Allow → reload.
- Quiet-ish room. Speak normally, full sentences.

---

## 1. Open a room as the Farrier (1 min)

1. Go to the live URL → **Host a workshop**.
2. Note the **6-character room code** and the **JOIN line** (`<ip-or-url> · CODE`) shown on screen.
3. Leave this Farrier tab open — it's your control console. **Do NOT project it in the real workshop.**

---

## 2. THE BIG ONE — push-to-talk voice interview (≈5 min)

This is the test you care about most: *you talk, the map builds itself.*

1. In a **second browser tab** (or your phone), open the URL → **Join** → enter the code → pick a name.
2. Create a team — call it **AP Squad**.
3. Back in the **Farrier tab**, advance the room to **Surface** (the primary "next step" button).
4. On the participant device you should now see the **Coach orb** ("Tap to talk" / voice-first screen).
   If you see a typed interview instead, look for the **mic / voice** control — that's PTT.

**How PTT works:** hold the **SPACEBAR** (or tap & hold the orb) → it shows **"Listening"** → speak one
line → **release** → it shows **"Thinking"** → the Coach replies in text and the **map updates** in a few seconds.

> 👀 **Watch the transcript of YOUR words each time.** If it mis-hears you, that wrong text becomes map
> content — this is the #1 voice hazard. If a line comes out garbled, just say it again.

**Say these out loud, one PTT press per line** (this is a real AP-invoice workflow chosen to stress every
part of the extraction — named people, who's accountable, the pain, the decision, the served party):

1. *"It starts when a supplier invoice lands in our shared accounts-payable inbox. The AP clerk keys it in and is first to catch heat if something's wrong. The Financial Controller is ultimately on the hook for the numbers at month-end."*
2. *"In the middle, a Procurement Officer owns the purchase order and resolves any mismatches, and a Cost-Centre Manager codes the invoice to their budget and approves it for their area. The Controller personally signs off anything over ten thousand pounds."*
3. *"The clerk opens SAP, runs a duplicate check, then does a three-way match of the purchase order, the goods-receipt note, and the invoice."*
4. *"If those don't line up the invoice goes on hold and we chase the supplier by email. That drags on for days and we lose our early-payment discounts."*  ← this is a **pain point**
5. *"The real decision this whole thing drives is: do we pay, dispute, or hold — so we capture discounts and never pay a duplicate."*
6. *"At the end the invoice is settled correctly, with a clean audit trail ready for month-end."*
7. *"Ultimately this whole process is for the supplier — they need paying correctly and on time so they keep delivering to us."*
8. *"That's the whole thing."*

### ✅ What a GOOD result looks like (check the map after you finish)

- [ ] **Five people became persona blocks** — AP Clerk, Financial Controller, Procurement Officer,
      Cost-Centre Manager, and the **Supplier**. None of them got folded into a step/action.
- [ ] The **Financial Controller is marked *accountable*** (on the hook), and the **Supplier is *served***.
- [ ] There's a **distinct Intent** ("pay / dispute / hold" — a *decision*) **and** a separate **Outcome**
      ("settled with a clean audit trail"). They should not be the same sentence.
- [ ] The **hold / chase-the-supplier** step is flagged as a **pain point**.
- [ ] The Coach asked **one sharp question at a time**, dug into *why*, and replied in **plain prose**
      (no markdown bullets/asterisks).

### 🚩 Red flags to write down (these are what to fix before Thursday)

- A named person turned into a step, or capacities all blank → interview prompt needs tuning.
- PTT never enters "Listening", or transcript is empty → mic/permission or voice-config issue.
- Long lag (>~8s) per turn, or sessions dropping → realtime stability; have **typed fallback** ready.
- The Coach hands you a finished design instead of provoking → prompt issue.

> **Typed fallback:** there should be an **"I'd rather type →"** escape on the voice screen. Confirm it
> works — if a team's voice is flaky on the day, they switch to typing and the *same* map-building runs.

---

## 3. Canvas / map by hand (≈3 min)

Still as the AP Squad participant, prove the diagramming tool works without voice:

- [ ] **Add a block** from the palette (e.g. a Phase), **drag** it, **resize** it.
- [ ] **Two-click arrow**: pick the arrow tool, click one block then another → an arrow connects them.
- [ ] **Inspector**: select a block → set a **capacity**, type a **WHY**, toggle the **pain** flag.
      Confirm a long WHY/label doesn't clip (the box should grow).
- [ ] **Parking lot**: drop a quick note into the orphan/parking tray.
- [ ] **Reload the page** → your map and your team are still there (persistence + reclaim).

---

## 4. The surprise swap → rebuild (≈6 min, needs a 2nd team)

The swap needs **≥2 teams**. Spin up a quick second team so the teardown is real:

1. New **incognito window** (or your phone) → Join the same code → create team **Onboarding Crew**.
2. Give it a quick map — even 5–6 blocks via voice or by hand (a trigger, 2 people, a phase, an intent,
   an outcome) so it has something to tear down.
3. In the **Farrier tab**, advance to **Rebuild**.
   - Optional realism: press **"Hold the room"** first → projects a *Pens down* screen → then **Reveal**
     plays the rotation spectacle. (Skip Hold for the plain one-step reveal.)

### ✅ Check
- [ ] Each team gets the **other team's** torn-down workflow as a **surprise** (the reveal stamp).
- [ ] The teardown shows a **brief + areas of concern + candidate constraints + the people inventory**,
      and **locked** blocks (intent / outcome / accountable persona) arrived locked.
- [ ] **No "swap / redesign / rebuild / handover" words appeared anywhere a participant could see them
      before the reveal.** (Pre-reveal vocabulary rule — this is the methodology. The team-facing gate is
      called the **"Newcomer check."**)

---

## 5. Rebuild with the Coach challenging you (≈4 min)

On a team in Rebuild:
- [ ] **Land every person** in the inventory (stays / transforms / removed-with-reason). "Freed up for
      higher-value work" should be **rejected**.
- [ ] Hit **"⚑ Coach, check this"** on a landing → the Coach pushes you to name the *new* role and *who
      absorbs the dropped work*.
- [ ] Try **"Challenge this"** on a **locked** block → it should explain the lock + the amendment path.
- [ ] Route a **constraint** (real law vs. just habit) → the Coach probes "which law, exactly?"
- [ ] Add an **Agent** block or two (the AI-native move) and watch the **shape meter / "people landed" pill**.

---

## 6. Share & take-home (≈2 min)

1. Farrier → advance to **Share**.
- [ ] **Double reveal**: before (original) vs. after (rebuild), with a diff.
- [ ] The **assumption reckoning** (✓ true / ✗ busted) works.
- [ ] Fill the **one commitment** + the **60-second pulse**.
- [ ] **Save the take-home recap** (downloads an HTML file that opens offline) and the **race card PNG**.
2. Farrier → **Closed**. Done.

---

## Pass / fail for Thursday

**Green-light if:** PTT reliably builds a faithful map (§2 checklist mostly ✓), the canvas works by hand
(§3), the swap is a real surprise with locked blocks (§4), and the recap saves (§6).

**Have a plan B for:** voice flakiness → typed fallback (§2); slow realtime → tell teams to type;
project the **room view**, never the Farrier console.

**Known gotcha:** the phase-advance button isn't reachable while the **room view / gallery is projected** —
toggle room view **off** before you advance a phase.
