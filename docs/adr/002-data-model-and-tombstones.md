# ADR-002: Data model, versions and tombstones

Status: accepted

- Every synced record has: `id` (UUID), `created_by`, `device_id`, `created_at`, `updated_at`, `deleted_at`, `version`.
- IDs are generated on the client so records can be created offline without collisions.
- Deletes are **soft** (`deleted_at`): a hard delete cannot be propagated to another device.
- Conflict detection uses `version` vs the last-synced base version, **not** `updated_at`:
  device clocks drift, version counters do not. `updated_at` is for display only.
