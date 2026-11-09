# Phase 0 notes: the three questions you must be able to answer

Written for the interview, not for the repo. Read `src/db/types.ts`, `src/db/repo.ts` and
`src/sync/classify.ts` alongside this.

## 1. Why is the ID a UUID generated on the client?

Because the device must be able to create records with no network. If the server assigned IDs, an
offline create would have nothing to reference: you could not attach a stock movement to a
sparepart that has not been synced yet, and two devices would collide on auto-increment values.

A UUID (`crypto.randomUUID()`) is generated locally, is globally unique without coordination, and
is stable for the whole life of the record. It is also the primary key in Dexie and will be the
primary key in D1, so push is a plain upsert on `id`.

## 2. Why is delete a soft delete?

A hard delete is invisible to other devices. If device A deletes a row and the row simply
disappears, device B has no way to learn that it should also delete it: the next pull just does not
mention the record, which is indistinguishable from "never synced".

So delete writes a tombstone: `deleted_at` gets a timestamp and `version` is incremented. The row
still exists on both sides, the pull returns it like any other change, and each client hides it
from the UI. Tombstones are also what makes "deleted here, edited there" a conflict we can show in
the A-vs-B screen instead of silently losing data.

## 3. Why use `version`, not `updated_at`, for conflict detection?

`updated_at` is a device clock reading. Clocks drift, users change timezones, and a phone with an
unset clock can write a timestamp in the past. Comparing timestamps answers "which edit looks
newer", which is not the same question as "did this record change since the copy I synced".

`version` is a counter that only this record's writes increment, starting at 1. The sync base
stores the version each device last saw. If the local row's version and the remote row's version
both moved past that base, both sides changed independently, so it is a real conflict and the user
curates it (ADR-003). If only one moved, it is a normal fast-forward merge. No clock involved, so
the answer is deterministic and testable.

`updated_at` still exists, but only for display: "last edited 3 days ago".