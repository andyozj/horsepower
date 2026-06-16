# Deploying Horsepower to the public internet

Single instance (workshop scale ≤ a few hundred concurrent).

## Durability — pick ONE
Rooms live in memory and are mirrored to durable storage so they survive restarts/redeploys:
- **Managed Postgres (recommended for hosted)** — set `DATABASE_URL` to a managed Postgres connection string (e.g. Azure Database for PostgreSQL). No disk needed; one JSONB row per workshop, reloaded on boot. **See "Postgres (durable store)" below.**
- **Local file (default / laptop)** — unset `DATABASE_URL`; the app uses an atomic `data/workshops.json` (`DATA_DIR` relocates it). On a hosted free tier this needs a **persistent volume mounted at `DATA_DIR`**, else every restart wipes live workshops (free-tier disks are ephemeral). Postgres avoids the disk entirely.

`GET /api/health` reports the active backend: `db: "postgres" | "postgres-error" | "file"`.

## Required on the host
- Durable storage per above (`DATABASE_URL`, or a volume at `DATA_DIR`).
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
| `DATABASE_URL` | managed Postgres conn string | durable room store (recommended). Unset → local file. |
| `PG_NO_SSL` | (leave unset) | only set `=1` for a LOCAL no-TLS Postgres; managed PG needs TLS |
| `PG_POOL_MAX` | (leave default `4`) | Postgres connection pool size |

Defaults: every var above is default-OFF or default-high so LAN/dev/CI behaviour is unchanged
until you set it. Codes are now **6 chars** (legacy 4-char rooms still join).

## Postgres (durable store)
Set `DATABASE_URL` and rooms survive restarts/redeploys — no disk required. Model: a single table
`workshops(code text primary key, data jsonb, updated_at timestamptz)`, one row per workshop, loaded
into memory on boot. The in-memory Map stays the live source of truth; Postgres is the durable mirror.
Auto-created on first boot; on cutover, an existing `data/workshops.json` is imported once.

**Azure Database for PostgreSQL (Flexible Server):**
1. Create a Flexible Server (Burstable B1ms is plenty for this). Note the admin user + password.
2. Networking: allow your app host's outbound IPs (or "Allow public access from Azure services" / add the Render egress IPs). TLS is required (the default).
3. Create a database, e.g. `horsepower`.
4. Build the connection string:
   `postgres://<user>:<password>@<server>.postgres.database.azure.com:5432/horsepower?sslmode=require`
5. Set it as `DATABASE_URL` in your host's env (Render: dashboard → Environment; it's `sync:false` in render.yaml). Redeploy.
6. Confirm: `GET /api/health` → `"db":"postgres"`. (`"postgres-error"` = configured but unreachable → it's running in-memory, NOT durable; check the connection string / firewall / TLS.)

The app keeps TLS on by default (`rejectUnauthorized:false`, which managed PG with its own CA needs). Don't
set `PG_NO_SSL` in production — that's only for a local no-TLS Postgres in tests.

**Scope:** this is single-instance durability. Running >1 instance needs cross-instance broadcast
(Postgres `LISTEN/NOTIFY` or Redis) + DB-as-live-state + sticky routing — a separate phase, not built.

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
