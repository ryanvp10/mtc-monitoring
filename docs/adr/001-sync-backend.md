# ADR-001: Sync backend

Status: accepted — 2026-11-09 (Phase 0). Revisit only if auth becomes multi-tenant.

## Context

mtc-01 is offline-first. IndexedDB on the device is the source of truth for daily work; the cloud
is a sync hub that receives batches when the user chooses to sync. Phase 0 only needs the decision
recorded, not the code: the sync client lands in Phase 3.

Constraints that matter:

- Demo scale: 2 devices, a few thousand rows. Free tier must cover it, permanently.
- No realtime requirement. Sync is manual/batch, so a request that takes 200 ms is fine.
- Hosting is already Cloudflare (see `wrangler.jsonc`), so a second vendor is a cost in attention.
- The conflict model is user-curated merge (ADR-003), which means the server does not have to
  resolve anything clever. It stores rows and returns them; the client compares.

## Decision

**Cloudflare Workers + Hono for the API, D1 (SQLite) for storage, served from the same Worker as
the static PWA.**

One Worker, two jobs:

- `/api/*` → Hono routes (push/pull endpoints, per-table upsert).
- everything else → static assets from `./dist`, SPA fallback.

## Reasons

1. One vendor, one deploy. The PWA is already deployed on Cloudflare, so sync adds no new account,
   no new secret store, no second billing surface.
2. Free tier is enough for the demo: Workers 100k requests/day, D1 5 GB total with millions of row
   reads/day. Two devices syncing a handful of times per day is nowhere near that.
3. D1 is SQLite, and our client schema is already flat relational tables with a fixed metadata
   block (ADR-002). The server-side schema is a near copy of `src/db/types.ts`, which keeps the
   push/pull mapping boring and testable.
4. Hono runs on Workers and in plain Node, so the API logic can be unit-tested with vitest on the
   VM without emulating the Cloudflare runtime. That also makes a clean interview story: routing
   layer portable, storage layer small and swappable.
5. Exit cost is low. `wrangler d1 export` gives a SQLite file, so the data is not locked up.

## Trade-offs (accepted)

- **No built-in auth.** Supabase ships users, JWT and row-level security for free; D1 ships none.
  We implement a device token ourselves. Acceptable because v1 has no real accounts (demo login)
  and the cloud holds no secrets beyond the user's own maintenance data.
- **D1 is single-writer per database** and has weaker concurrency guarantees than Postgres. Not a
  problem while sync is batch and user-curated: there is no concurrent multi-writer path to
  protect. It would become a problem if we ever add realtime collaboration, which is explicitly
  out of scope (PRD §6).
- **Vendor coupling** to Workers bindings (`env.DB`, wrangler config). Contained inside the
  `worker/` directory and one repository interface.
- No admin UI, no migrations framework beyond numbered SQL files. Fine at this size; revisit if
  the schema churns.

## Alternatives rejected

- **Supabase (Postgres + Auth + RLS).** Strongest option if the product needed accounts and
  realtime. It does not: the app must work offline first, and sync is user-triggered. A second
  vendor plus a second set of secrets is real cost for features we would not use in v1. Reconsider
  if Phase 3 shows we need per-user row policies.
- **Firebase / Firestore.** Its offline model wants to own conflict resolution, which directly
  contradicts the user-curated A-vs-B merge that is the whole point of this project.
- **Custom server on a VPS.** Cheapest in theory, most expensive in maintenance: TLS, backups,
  process supervision, patching. No.

## Consequences

- Phase 3 adds `worker/` (Hono app + `schema.sql` + D1 binding) and a `sync/` client in the app.
- Keep the deploy unit singular: `npm run deploy` builds the PWA and deploys Worker + assets
  together, so a stale frontend can never talk to a newer API.
- Secrets: one Worker secret for the device-token signing key, set with `wrangler secret put`.
  Nothing else.
- If the demo ever needs genuine multi-tenant auth, the migration path is D1 for data plus an
  identity provider in front, not a rewrite of the sync protocol.