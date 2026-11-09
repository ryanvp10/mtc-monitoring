// Phase 3: the heart of the sync engine. Pure function, no I/O, easy to test.
// Conflict detection uses VERSIONS, not clocks: device clocks drift, versions don't.
export type SyncAction = 'noop' | 'push' | 'pull' | 'conflict'

export interface Side {
  version: number
  deleted_at: number | null
}

/**
 * @param baseVersion the version both sides agreed on at the last successful sync
 *                    (undefined = never synced)
 * @param sameContent true when the user-editable payloads are identical
 *                    (both sides made the same change -> nothing to resolve)
 */
export function classify(
  local: Side | undefined,
  remote: Side | undefined,
  baseVersion: number | undefined,
  sameContent = false,
): SyncAction {
  if (!local && !remote) return 'noop'
  if (local && !remote) return 'push'
  if (!local && remote) return 'pull'

  const l = local as Side
  const r = remote as Side
  const localChanged = baseVersion === undefined || l.version > baseVersion
  const remoteChanged = baseVersion === undefined || r.version > baseVersion

  if (!localChanged && !remoteChanged) return 'noop'
  if (localChanged && !remoteChanged) return 'push'
  if (!localChanged && remoteChanged) return 'pull'
  // Both changed (this includes edit-vs-delete, since a tombstone is a version bump)
  return sameContent && l.deleted_at === r.deleted_at ? 'noop' : 'conflict'
}
