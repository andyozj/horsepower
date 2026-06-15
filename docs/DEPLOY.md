# Deploying Horsepower to the public internet

Single instance (workshop scale ≤ a few hundred concurrent). No DB required.

## Required on the host
- A persistent volume mounted at `/data`, with `DATA_DIR=/data` (otherwise every restart wipes live workshops — free-tier disks are ephemeral).
- Health check: `GET /api/health`.
- Node 18+ (`engines` in package.json). Native WebSockets must be proxied (Render/Railway/Fly all do).
- Set the platform replica count to **1** (the app is single-process; multiple replicas would split rooms — see CLAUDE.md scaling notes).

## Security env (set ALL of these on a public host)
| Var | Set to | Why |
|-----|--------|-----|
| `ALLOWED_ORIGINS` | `https://your-app.example.com` | WS origin allowlist (Task 5). Empty = allow all (LAN/dev). |
| `TRUSTED_PROXY_HOPS` | `1` (single PaaS proxy) | correct per-IP attribution (Task 3). `0` = direct connection. |
| `COACH_GLOBAL_MAX` | e.g. `2000` | global daily-ish ceiling on AI key spend (Task 1) |
| `COACH_IP_MAX` | e.g. `40` | per-IP ceiling on AI key spend (Task 1) |
| `MINT_GLOBAL_MAX` | e.g. `300` | global room-creation backstop (Task 4) |
| `ANTHROPIC_API_KEY` | your key (optional) | omit to run on the free rule-based bank path |
| `ANTHROPIC_BASE_URL` | (leave default) | override only for testing/proxying the Anthropic endpoint |

Defaults: every var above is default-OFF or default-high so LAN/dev/CI behaviour is unchanged
until you set it. Codes are now **6 chars** (legacy 4-char rooms still join).

Also set a **billing cap/alert** on the Anthropic/Azure account — the env caps are the app-side
defense, the provider cap is the hard backstop.

## Verifying before you ship
Run the public-hardening suite (self-spawns its own server, no setup):
```
node qa-online.js
```
Plus the full regression sweep (see CLAUDE.md run/test section).

## Not done by this plan (operator's call)
- Durable DB migration (not needed at this scale; the volume covers durability).
- CAPTCHA on room creation (the per-IP + global mint caps are the current backstop).
- Horizontal scaling (single instance is ~15× over the design target; would need room-affinity routing — see CLAUDE.md).
