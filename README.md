# mtc-01

A small CMMS (Computerized Maintenance Management System) for maintenance teams whose laptops are
locked down and whose internet is unreliable. Everything runs in the browser: equipment, sparepart
stock, preventive maintenance and daily reports are stored in IndexedDB, so the app keeps working
with no connection at all. Sync to the cloud is optional and user-triggered, and when two devices
disagree the user picks the winner side by side instead of the app guessing.

Built as a public build-in-public project. Status: in development, Phase 0 complete (foundation).

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
worker/        Cloudflare Worker: Hono API + static assets (Phase 3)
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

- Demo login only, no real accounts yet.
- Sync is manual and batch, not realtime.
- Tested on Chromium. Safari/iOS install flow is untested.