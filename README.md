# AI-Native Workflow Studio

A real-time workshop app that drives the full exercise: teams capture a current workflow, swap canvases, and redesign each other's workflow AI-native — with a Claude coach challenging them throughout.

> **This README documents the running v0.1 app.** The locked **v0.2 design ("Horsepower")** — teardown swap, B-lite multi-device, room view, double-reveal share — lives in [`docs/specs/`](docs/specs/) (`2026-06-11-PRD-master.md` is the umbrella; `2026-06-11-ux-end-to-end.md` is the build-from source of truth).

## How the workshop maps to the app

| Workshop stage | In the app |
|---|---|
| Part 1 — capture current process | Teams fill a structured canvas (trigger, inputs, personas, phases, moments that matter, intent, outcome). A visual workflow map renders live as they type. The completeness checker flags gaps ("intent mentions an artifact — why do you need it?"). The AI coach probes deeper on demand. |
| The swap | Facilitator clicks **Swap → Redesign**. Each team receives the *next* team's canvas. Intent, outcome, and personas arrive **locked**; old phases are shown struck-through as "do NOT recreate". |
| Part 2 — AI-native redesign | Teams build new phases from scratch. The **retrofit detector** flags any new phase that mirrors an original. The AI coach switches to devil's-advocate mode (one challenge at a time, grounded in their actual content). |
| Share-out | Facilitator switches to **Share**: every team's before/after maps on one screen. |

The facilitator controls phases and a countdown timer everyone sees.

## Run it

Requires Node 18+.

```bash
cd workflow-studio
npm install
```

Pick ONE AI provider (or none):

```bash
# Option A — Anthropic
ANTHROPIC_API_KEY=sk-ant-... node server.js

# Option B — Azure OpenAI (your org's deployment)
AZURE_OPENAI_ENDPOINT=https://<resource>.openai.azure.com \
AZURE_OPENAI_KEY=<key> \
AZURE_OPENAI_DEPLOYMENT=<deployment-name, e.g. gpt-4o> \
node server.js

# Option C — no key: coach uses the built-in question bank; all rule-based checks still run
node server.js
```

If both providers are configured, Azure wins; override explicitly with `AI_PROVIDER=anthropic|azure`. `AZURE_OPENAI_API_VERSION` defaults to `2024-06-01`.

Then:

1. Open `http://localhost:3000` on the facilitator laptop → **Create new session** → a 4-letter code appears.
2. Teams on the same Wi-Fi open `http://<facilitator-LAN-IP>:3000` (find it with `ipconfig getifaddr en0` on macOS) and join with the code + a team name.
3. Facilitator drives: Lobby → Capture → Swap → Share. Timer buttons: 6/10/20/30 min.

Without an API key the app still works — the coach falls back to a curated question bank and all rule-based checks (gap flags, retrofit detector) run client-side regardless.

`ANTHROPIC_MODEL` env var overrides the model (default `claude-sonnet-4-6`).

## Known limits — read before the workshop

- **Corporate Wi-Fi client isolation** can block laptop-to-laptop traffic. Test the join flow in the actual room beforehand. Fallback: deploy to Render/Railway (the app binds `0.0.0.0` and respects `PORT`, so it deploys as-is) — but then API key lives in their env settings.
- **State is in-memory.** Restarting the server loses the session. Don't restart mid-workshop. (Clients auto-reconnect and rejoin if the network blips, since identity is kept in localStorage.)
- **One editing device per team** is the intended model. Multiple devices can join the same team via rejoin, but simultaneous edits are last-write-wins — no operational transforms.
- **Facilitator key** is held in the creating browser's localStorage. Don't clear it mid-session.
- **No persistence/export yet.** For v0.2: export each team's before/after as a brief (the data model already supports it — see `publicState()` in server.js).

## Test suite

`e2e.js` exercises the whole flow programmatically (session creation, joins, capture, swap rotation, locked-field tamper rejection, phase freezing, AI-offline fallback, guards). Run with the server up:

```bash
node server.js &   # in one terminal
node e2e.js        # in another
```

## Architecture (deliberately boring)

- `server.js` — Express + `ws`. In-memory sessions, phase state machine, swap logic, Claude API proxy (`/api/coach`) with capture-coach and redesign-devil's-advocate system prompts. ~300 lines.
- `public/index.html` — single-file vanilla-JS client: join/lobby, capture canvas, live SVG map, gap flags, redesign view with locked constraints + retrofit detector, facilitator dashboard, share-out, AI coach chat. No build step, no framework.
