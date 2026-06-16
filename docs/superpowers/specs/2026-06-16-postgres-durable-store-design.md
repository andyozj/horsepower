# Durable Postgres store (design)

**Goal:** rooms survive restart/redeploy on hosted free tiers (Render's disk is ephemeral) **without** breaking the "clone & `node server.js`, zero setup" invariant.

**Approved scope (user, 2026-06-16):** durable foundation, **single instance**. Postgres on a managed cloud (Azure Database for PostgreSQL). NOT horizontal scale (that's a deferred Phase 2).

## Approach — a two-backend storage adapter, selected by `DATABASE_URL`
The in-memory `workshops` Map is always the **live source of truth** (WS broadcasts read it). This layer is the durable mirror.

- **No `DATABASE_URL`** → existing atomic file store, byte-identical: `data/workshops.json`, tmp + fsync + rename, `.bak` fallback (`saveFile`/`loadFile`).
- **`DATABASE_URL` set** → Postgres.

## Postgres model — JSONB blob, one row per workshop
```sql
CREATE TABLE workshops (
  code       text PRIMARY KEY,
  data       jsonb NOT NULL,          -- the whole Workshop object
  updated_at timestamptz NOT NULL DEFAULT now()
);
```
**Why JSONB, not normalized:** the access pattern is pure key-by-`code` — load the whole room, broadcast it whole; we never run a relational query *inside* it. Normalizing teams/canvas/blocks would be a brittle schema with constant migrations as the nested shape evolves, for zero query benefit. Reads are primary-key fast; no GIN index needed.

## Seams (so the rest of the server is unchanged)
- `saveNow()` branches: file → `saveFile()`; PG → serialized fire-and-forget `pgChain.then(pgSaveAll)` (a DB hiccup logs but never blocks the room — rule #8).
- `pgSaveAll()` upserts every live room (`INSERT … ON CONFLICT (code) DO UPDATE`) **and** `DELETE … WHERE code <> ALL($codes)` — the table mirrors the Map exactly (matches the file's write-the-whole-set semantics). N is small (a handful of rooms), debounced 400ms.
- Boot is async (`bootStore`): `pgInit` (create-table-if-not-exists) → `pgLoad` → rehydrate Map. **One-time cutover:** if the table is empty and a `data/workshops.json` exists, import it once.
- `shutdown` awaits the final flush + `pool.end()`.
- `scheduleSave` call-sites, the TTL sweep `workshops.delete()`, and `createWorkshop` are untouched — deletes mirror out via the next `pgSaveAll`.

## Operational
- `pg` is a dependency, **lazy-`require`d only when `DATABASE_URL` is set** — laptop installs never load it.
- TLS on by default (`ssl:{rejectUnauthorized:false}` — managed PG needs it). `PG_NO_SSL=1` only for a local no-TLS Postgres (tests).
- `GET /api/health` reports `db: "postgres" | "postgres-error" | "file"`. A PG init failure logs loudly + shows `postgres-error` but never blocks startup (room runs in-memory, non-durable).
- `PG_POOL_MAX` (default 4).

## Out of scope (deferred Phase 2 — multi-instance scale)
Cross-instance broadcast (Postgres `LISTEN/NOTIFY` or Redis pub/sub) + DB-as-live-state + sticky/shared sessions. The JSONB store is the necessary foundation for it, but is not it.

## Tests
- `qa-postgres.js` (6 checks against a real PG): file→PG import cutover · room+edits persisted as JSONB · survives RESTART (loaded from PG) · table mirrors the Map. **Skips** with no `DATABASE_URL`.
- Every existing suite runs with no `DATABASE_URL` (file path) and must stay green — the regression net. `qa-hostile`'s kill-&-restore + SIGTERM-flush specifically guards file durability.
