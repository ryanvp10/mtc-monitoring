# mtc-monitoring

A small CMMS (Computerized Maintenance Management System) for maintenance teams whose laptops are
locked down and whose internet is unreliable. The app runs entirely in the browser: records live in
IndexedDB, so it keeps working with no connection at all. Syncing to the cloud will be optional and
user-triggered, and when two devices disagree the user picks the winner side by side instead of the
app guessing.

Built in public. Status: Phase 0 (foundation) verified locally: offline-first skeleton, green
lint/typecheck/tests/build, deploy config ready. The cloud sync client, stock UI, PM UI and daily
report UI land in later phases; their pure logic already exists and is tested.

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests
npm run lint && npm run typecheck && npm run build
npm run preview    # serve the production build
```

## Offline check (the point of the project)

1. `npm run build && npm run preview`
2. Open the page, add a demo equipment.
3. DevTools → Network → Offline, then reload.
4. The equipment is still there, and the app still serves. The service worker does this, not a cache hack.

## Structure

```
src/db/        Dexie schema, sync metadata, generic repo (create / update / soft delete), queries
src/lib/       pure logic with tests: pin, stock ledger, PM status, CSV export
src/sync/      conflict classification (pure); push/pull client arrives in Phase 3
worker/        Cloudflare Worker: Hono API + static assets (planned, Phase 3)
docs/adr/      architecture decision records
docs/          phase notes
```

## Decisions

- Offline-first, cloud as a sync hub, never as the source of truth.
- User-curated conflict merge, A vs B. No last-write-wins magic.
- Stock is an append-only ledger, current stock is derived (`ADR-004`).
- Cloudflare Workers + D1 for sync (`ADR-001`).

Read `docs/adr/` before changing anything in `src/db/` or `src/sync/`.

## Roadmap

| Phase | Outcome |
|---|---|
| 0 | Live URL, green CI, PWA installs and works offline |
| 1 | Profile login, equipment CRUD with search and pagination |
| 2 | Sparepart inventory, stock in/out, low stock alerts |
| 3 | Two-device sync and the A-vs-B conflict screen |
| 4 | Preventive maintenance, daily report, CSV export |
| 5 | Seed data, backup/restore, performance numbers |
| 6 | Landing page, final README, security pass, launch |

## Known limitations

- Demo login only, no real accounts yet. The profile PIN is a convenience gate (salted hash in
  IndexedDB), not authentication.
- Sync is manual and batch, not realtime.
- Tested on Chromium. Safari/iOS install flow is untested.