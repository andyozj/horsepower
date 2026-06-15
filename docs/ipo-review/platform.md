# IPO panel — Accessibility, Performance & Web-Platform Craft

Reviewer lens: the dimensions enterprise procurement and diligence actually audit (a11y conformance / EAA, runtime performance, export quality, platform resilience).
Method: static audit of `public/index.html` (2,955 lines) + `server.js`, plus a **live instrumented probe** against `http://localhost:3200` — self-hosted room, 3 teams × 30 blocks each, axe-core 4.10.2 scans (color-contrast rule disabled — already audited), `performance.now()` render timing, heap/listener tracking across 100 broadcasts, WS payload capture, Tab-walk. Probe script ran read-only; no app files touched.

Date: 2026-06-13.

---

## 0. Headline: performance is a measured non-issue; accessibility is the audit risk

The "full re-render per broadcast" architecture — the thing a diligence engineer would flag on whiteboard sight — **measures clean at workshop scale**:

| Metric (live, 30-block map, 3 teams) | Measured |
|---|---|
| `render()` full-DOM rebuild | **1.9 ms median, 2.7 ms p95** (max 8.5 ms first-run) |
| Idle FPS with boil ticker running | **121 fps** |
| Boil tick cost, all 80 rough paths due at once | **0.1 ms** |
| JS heap across 100 state broadcasts | **9.5 MB → 9.5 MB (flat)** |
| Listener leaks (window `resize`, document add/remove delta) | **none** (4 → 4; add/rem delta 0) |
| DOM nodes after broadcast storm | 499 |
| First contentful paint (local) | 104 ms |
| WS full-state payload, 3 teams × 30 blocks | **22.9 KB / broadcast / client** |

Verdict on the architecture: **do not add a framework, do not preemptively adopt DOM diffing.** The views are small enough that wholesale rebuild is cheaper than the bookkeeping. The real costs of the rebuild are *accessibility* costs (focus loss, no announcements) — fix those directly.

Accessibility is where an enterprise audit fails this app today: the canvas is pointer-only (WCAG 2.1.1), nothing except `#coach-msgs` is announced to screen readers, there are zero landmarks/headings, and modals don't manage focus. Context: the **European Accessibility Act became enforceable 28 June 2025** ([EAA guide](https://www.accessibility.works/european-accessibility-act/), [OneTrust on EAA + WCAG 2.2](https://www.onetrust.com/blog/understanding-the-european-accessibility-act-and-wcag-22/)) via EN 301 549 (WCAG 2.1 AA today, 2.2 incoming) — EU enterprise procurement now asks for an ACR/VPAT as table stakes. The realistic bar for a *canvas* tool is set by the market: [Miro publishes a WCAG 2.2 ACR](https://miro.com/accessibility/changelog/) and ships keyboard/AT navigation for diagrams; [FigJam ships an opt-in screen-reader mode](https://www.figma.com/blog/announcing-figjam-screen-reader-support/) with keyboard placement and an "adapt content" tab-order filter; [Excalidraw's Deque audit](https://github.com/excalidraw/excalidraw/issues/7492) flagged exactly the class of issues found here (unnamed controls, SR support). Nobody expects full SR parity on a freeform canvas — they expect **keyboard operability + announcements + named controls**.

---

## 1. Findings

Severity: **H** = will fail a procurement a11y audit / real-room failure mode · **M** = audit finding, workaround exists · **L** = polish.

### Accessibility

**A1 · H — The canvas is pointer-only (WCAG 2.1.1 Keyboard).**
Evidence (measured): 30 `.node` elements on a live map, **0 with tabindex**; selection only via `pointerdown` (`index.html:1899`), placement only via pointer click at coordinates (`createBlockAt`, `:1842`), move/resize only via pointer drag (`:1876`, `:1882`), arrows via click-click (`:1833`). The scene `keydown` handler (`:1910`) supports only Delete/Escape — both require a selection that keyboard alone cannot make. Tab-walk confirms a keyboard user reaches the tool buttons and then falls into a flat run of 30 contenteditable labels (text edit works; structure work doesn't).
Fix (no build step, all inside `makeCanvas`): (1) roving `tabindex` on `.node` (selected node `tabindex=0`, rest `-1`); (2) focus → `setSel(b.id)` so the existing inspector/Delete path lights up; (3) arrow keys nudge the selected block ±10px (`b.x/b.y` + `commit()` — the debounce machinery already exists); (4) with a placement tool active, Enter on the scene drops the block at viewport centre (reuse the existing drop-clamp); (5) `A` on a focused node starts arrow mode, Enter on target completes (reuse `linkSrc`); (6) announce each action via the live region from A2 ("Trigger placed", "moved left"). FigJam's keyboard-placement model is the precedent ([FigJam SR help](https://help.figma.com/hc/en-us/articles/14477051168791-Use-FigJam-with-a-screen-reader)). Estimated ~120 lines.

**A2 · H — One live region in the whole app; everything else is silent.**
Evidence: `[aria-live]` census on a live Surface view: `coach-msgs` only (+ the picker tour caption). The `#toasts` container has **no `aria-live`/`role`** (measured: `toastAria: null`; `toast()` at `:872`) — yet toasts are the app's announcement channel: server errors (`:957`), timer expiry, final-furlong, gate-green rosette, lock-rejection. Timer (`#timerlive`, updated every second at `:996`) and phase changes (full re-render) are also unannounced.
Fix: `<div id="toasts" role="status" aria-live="polite">` (one attribute — every existing toast becomes announced); give warn-toasts `role="alert"`. Do **not** make the ticking timer live (it would spam SRs); instead announce state edges only — "timer started", "5 minutes left", "time's up" — through the toast channel, and add a visually-hidden one-liner announcing phase on each render ("Rebuild phase — you hold Team X's workflow").

**A3 · H — Focus does not survive a state broadcast.**
Evidence (measured): focus the coach composer, have a teammate commit a block move → `document.activeElement` goes `coach-input` → **`BODY`**. The draft text survives (`ui.coachDraft`, `:2162`) but focus, caret and SR context are dumped — in a room where teammates commit every few seconds, a keyboard/SR user is perpetually thrown to the top of the page. The existing `editingLock` (`:942`) only covers `.node .label` and `.inspector textarea`, not the composer, assumption input, orphan input, team-name field…
Fix (~10 lines in `render()`): before `app.innerHTML=''`, record `document.activeElement`'s `data-testid` (and selection offsets for inputs); after rebuild, `querySelector` it back and `focus()`. The codebase already does exactly this pattern for tool/selection (`ui.toolRestore`/`ui.selRestore`, `:1624`) — extend it to focus. (Alternative that solves this class wholesale: vendor [morphdom](https://github.com/patrick-steele-idem/morphdom) (~7 KB min, plain file, no vDOM — fits the "vendoring is the pressure valve" convention) and morph instead of wipe; focused elements that didn't change are left untouched. Given P1's numbers this is *optional*, not urgent.)

**A4 · M — Modals don't manage focus; the reveal never takes it.**
Evidence: `confirmModal` (`:875-890`) focuses the confirm button but has **no focus trap** (Tab walks into the inert-looking background, which stays keyboard-interactive behind the scrim), no `aria-modal`, no focus-restore on close. `showReveal` (`:2585`) — the emotional centrepiece — adds a class to `#reveal` (`role=alertdialog`, `:830`) but **never moves focus into it**: an SR user misses the swap moment entirely and can keep operating the page underneath.
Fix: re-platform `confirmModal` on the native `<dialog>` element + `showModal()` — free top-layer, focus trap, Escape, and background inerting, zero dependencies (popover/`dialog` are Baseline; see also [`@starting-style`](https://developer.mozilla.org/en-US/docs/Web/CSS/@starting-style) for the entrance animation without class juggling). For `#reveal`: `$('#reveal-go').focus()` when staged, Escape ≡ the existing cta-ready dismiss.

**A5 · M — Zero landmarks, zero headings (axe: `landmark-one-main`, `page-has-heading-one`, `region` ×41).**
Evidence: live census `main:0, nav:0, header:0, h1:0`; axe flags 41 nodes outside any landmark on the Surface view (36 on console, 19 on landing). The app is a div forest — an SR user has no skeleton to navigate by, on every view.
Fix: in `render()` wrap view content in `<main>` and the topbar in `<header>` (two `el()` calls); give each view one heading (visually-hidden where the design has no room: "Surface — map your workflow", "Farrier console"). ~30 minutes for the whole app because rendering is centralised.

**A6 · M — `maximum-scale=2` caps pinch-zoom (WCAG 1.4.4; axe `meta-viewport-large` on every view).**
Evidence: `index.html:5`. Low-vision phone users get half the zoom they're entitled to (the SC expects 200% *text* zoom minimum and no scaling traps; auditors flag any `maximum-scale`).
Fix: drop `maximum-scale=2` — the canvas has its own zoom model and `touch-action` handling; the cap protects nothing.

**A7 · L — Unnamed/title-only controls.**
Evidence: axe `label-title-only` (**serious**) on the console timer custom input (`title='custom minutes'`, `:2665`); zoom controls `−/+/⤢` are title-only (`:1932-1935`); the `?` help button (`:1647`).
Fix: sweep `title:` → add `'aria-label'` in the same `el()` call. Minutes of work; removes the only *serious*-impact axe hit.

**A8 · L — `prefers-reduced-motion` is solid (verified) with one gap.**
Global kill at `:60`, boil ticker gated `if(!REDUCED)` (`:1589`), per-component opt-outs throughout — genuinely good. Gap: `REDUCED` is read once at load (`:1569`) with no `change` listener, so toggling the OS setting mid-session leaves intervals running until reload. One `matchMedia(...).addEventListener('change', …)` fixes it.

**A9 · L — Touch targets (phone lanes) spot-check passes.**
48px palette bar and 44px share buttons shipped per the journey overhaul; the canvas `viewctl` zoom buttons and toast dismiss are the remaining sub-44px targets on phones. Minor.

### Performance & resilience

**P1 · Positive finding (record it in diligence material) — re-render architecture measures clean.**
Numbers in §0. The two design choices that make it work: views are small (≤500 DOM nodes) and the boil ticker only touches paths whose flip time arrived (`:1589-1595` — measured 0.1 ms even when all 80 paths fire). Heap flat and listener counts stable across a 100-broadcast storm — the `el()`+wipe pattern leaks nothing because listeners die with their nodes. Keep this; document it. If a future feature triples DOM size, the escape hatch is vendored [morphdom](https://github.com/patrick-steele-idem/morphdom)/[nanomorph](https://github.com/choojs/nanomorph) as plain files, not a framework.

**P2 · M — Full-state WS fan-out grows linearly with room size; no compression.**
Evidence: 22.9 KB per broadcast with 3 teams × 30 blocks (measured), and `broadcast()` (`server.js:343`) sends *all teams to every client on every commit* — chat lines included (200 msgs × 4 KB cap per team is the worst case: state could reach ~MB scale late in a chatty workshop). At a realistic 6 teams × 8 devices that's ~45 KB × 48 sockets per edit burst — fine on room Wi-Fi, but it's the one curve that bends with adoption. `ws` ships `permessage-deflate` **disabled by default** ([ws docs](https://github.com/websockets/ws)), and enabling it naively risks zlib memory fragmentation under concurrency ([websockets compression guidance](https://websockets.readthedocs.io/en/stable/topics/compression.html)).
Fix, in order of bang/buck: (1) cap `chat` in `publicState` to the last ~30 messages per team (clients only render ~10); (2) if payloads ever matter, enable `perMessageDeflate: { threshold: 1024, concurrencyLimit: 4 }` — JSON state compresses ~8-10×; (3) team-scoped broadcasts are the structural option — not warranted at current scale.

**P3 · M — Google Fonts CDN is a single point of failure for the entire visual identity (rule #8 violation in spirit).**
Evidence: `index.html:10-12` — Fraunces/Inter/Caveat from `fonts.googleapis.com`. The stated deployment is a laptop + LAN room code; on offline/captive-portal venue Wi-Fi the CSS request fails and every wordmark, stamp, and Caveat annotation falls back to system fonts — the craft layer evaporates exactly when the room is watching. `display=swap` is already correct (no FOIT), so this is a *resilience* bug, not a loading-strategy bug.
Fix: self-host — download the woff2 subsets (e.g. [google-webfonts-helper](https://gwfh.mranftl.com/fonts)), drop in `public/fonts/`, replace the `<link>` with `@font-face` + `font-display: swap`. OFL-licensed, no build step, ~1 hour, and it removes a third-party beacon enterprise security reviews ask about.

**P4 · L — `index.html` served uncompressed (238,746 bytes transferred, measured).**
Express has no gzip by default. FCP measured 104 ms on localhost so this is invisible on LAN; for hosted (Render/Railway) demos, pre-gzip or add compression. Low priority.

**P5 · L — Multi-tab identity race.**
`me` lives in one localStorage key (`horsepower.v2`, `:928`); two tabs on the same browser share/clobber `memberId` and both hold sockets the server treats as the same member (presence flaps). The platform fix with zero deps: [Web Locks API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API) — `navigator.locks.request('hp-'+memberId, …)` to make the first tab the owner and show "already open in another tab" in the second ([leader-election pattern](https://www.sitepen.com/blog/cross-tab-synchronization-with-the-web-locks-api)).

### Print / export

**E1 · M — Race-card PNG renders at 1× and may draw before fonts load.**
Evidence: `saveRaceCardPng` (`:2484`) draws a fixed 880×520 backing store — soft/blurry on every retina/DSF2 display and in print; it also calls `g.fillText` with `44px Fraunces` without awaiting `document.fonts.ready`, so the *first* save after a cold load can render fallback Georgia (the keepsake is the artifact people screenshot — it should be the crispest thing in the app).
Fix (5 lines): `const s = Math.max(2, devicePixelRatio||1); cv.width=W*s; cv.height=H*s; g.scale(s,s);` and `await document.fonts.load('600 44px Fraunces'); await document.fonts.ready;` before drawing.

**E2 · L — Export pack: serviceable, minor print gaps.**
`exportPack` (`:2540`) — `document.write` into a popup, user prints to PDF. Pop-up-blocked path is handled (toast). Gaps: no `@page` margins / `print-color-adjust: exact` (washes may drop in print), SVG labels truncate at 28 chars (`canvasToSvg`, `:2578`) which loses long block names in the leave-behind, and `<title>` becomes the PDF filename (good — already set). Add a small `@media print` block; consider 2-line wrap for labels.

### Web-platform 2025-26 fits (all zero-build)

- **View Transitions API** for phase changes: same-document transitions are [Baseline newly available across all three engines](https://web.dev/blog/same-document-view-transitions-are-now-baseline-newly-available) ([2025 update](https://developer.chrome.com/blog/view-transitions-in-2025)). One wrapper — `document.startViewTransition ? document.startViewTransition(doRender) : doRender()` — replaces the hand-rolled phase cross-fade, degrades to instant render, and respects reduced-motion natively.
- **`<dialog>` / popover attribute** for confirmModal, locktips, challenge modal → free top-layer + focus management (fixes A4 properly instead of patching it).
- **`@starting-style`** for the entrance animations currently done with class-add-next-frame.
- **Web Locks** for P5.
- **Minimal service worker** (rule #8 alignment): precache the single HTML + self-hosted fonts, cache-first for static, never touch `/api` or WS ([MDN SW guide](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers), [deterministic SW pattern](https://dev.to/crisiscoresystems/service-workers-that-dont-surprise-you-deterministic-caching-for-offline-first-pwas-5480)). ~30 lines as `public/sw.js`. Payoff in a live room: a participant whose phone drops Wi-Fi mid-session can still *reload the app shell* and reconnect the instant the network blips back, instead of staring at a browser error page. (The WS reconnect loop at `:959` already handles the socket side.) Add `manifest.json` and the app is installable — workshop devices get a home-screen icon for free.

---

## 2. Quick wins (<1 hour each) vs structural

**Quick wins — an afternoon, removes every axe hit except the canvas itself:**
1. `role="status" aria-live="polite"` on `#toasts` (+`role=alert` for warns) — A2, one line, app-wide announcement channel.
2. Delete `maximum-scale=2` from the viewport meta — A6.
3. `<main>`/`<header>` + one (sr-only) heading per view — A5.
4. `aria-label` sweep on title-only controls (timer custom input, zoom, `?`) — A7.
5. Focus-restore by `data-testid` across `render()` — A3 (the `toolRestore` pattern already exists to copy).
6. `#reveal-go.focus()` on reveal + Escape dismiss — half of A4.
7. Race-card: DPR-scale the canvas + `document.fonts.ready` — E1.
8. Cap `chat` to last 30 in `publicState` — biggest WS payload lever, ~3 lines — P2(1).
9. `matchMedia('(prefers-reduced-motion)').addEventListener('change', …)` — A8.

**Structural (days, not hours):**
1. **Canvas keyboard layer** (A1): roving tabindex + arrow-nudge + Enter-place + keyboard arrows + announcements. ~120 lines in `makeCanvas`; the only item standing between this app and a defensible ACR. 1-2 days incl. UAT additions.
2. Self-host Fraunces/Inter/Caveat (P3) — ~1 hour but ships binary assets; do it with the SW.
3. `confirmModal`/challenge modal → `<dialog>` (A4) — half a day.
4. Minimal service worker + manifest (rule #8) — half a day.
5. `perMessageDeflate` with threshold, or team-scoped state — only when room sizes grow (P2).
6. morphdom vendoring — **explicitly deferred**: measured render cost doesn't justify it; revisit only if DOM size triples.

---

## 3. Verdict

Performance survives diligence with measured headroom (1.9 ms renders, flat heap, 121 fps) — say so with numbers and move on; the de-risking investment is **accessibility of the canvas plus the silent-app problem**: ship the quick-win batch (live-region toasts, landmarks, focus restore, viewport fix) this week and the keyboard layer next, and Horsepower clears the EAA-era procurement bar that Miro and FigJam have made table stakes for collaborative canvases. Self-hosting the fonts is the one resilience fix that protects the product's identity in the exact room it was built for — do it with the service worker and rule #8 finally covers the client, not just the Coach.
