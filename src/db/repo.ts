import type { Table } from 'dexie'
import { getDeviceId } from './device'
import type { Payload, SyncMeta } from './types'

function newMeta(createdBy: string): SyncMeta {
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    created_by: createdBy,
    device_id: getDeviceId(),
    created_at: now,
    updated_at: now,
    deleted_at: null,
    version: 1,
  }
}

export async function createRecord<T extends SyncMeta>(
  table: Table<T, string>,
  data: Payload<T>,
  createdBy: string,
): Promise<T> {
  const record = { ...data, ...newMeta(createdBy) } as unknown as T
  await table.add(record)
  return record
}

export async function updateRecord<T extends SyncMeta>(
  table: Table<T, string>,
  id: string,
  patch: Partial<Payload<T>>,
): Promise<T> {
  return table.db.transaction('rw', table, async () => {
    const current = await table.get(id)
    if (!current || current.deleted_at !== null) throw new Error(`Record ${id} not found`)
    const next = {
      ...current,
      ...patch,
      updated_at: Date.now(),
      version: current.version + 1,
      device_id: getDeviceId(),
    } as T
    await table.put(next)
    return next
  })
}

/** Soft delete: keeps the row as a tombstone so sync can propagate it. */
export async function softDelete<T extends SyncMeta>(table: Table<T, string>, id: string): Promise<void> {
  await table.db.transaction('rw', table, async () => {
    const current = await table.get(id)
    if (!current || current.deleted_at !== null) return
    await table.put({
      ...current,
      deleted_at: Date.now(),
      updated_at: Date.now(),
      version: current.version + 1,
      device_id: getDeviceId(),
    } as T)
  })
}

/** All live (non-deleted) records. */
export function listActive<T extends SyncMeta>(table: Table<T, string>): Promise<T[]> {
  return table.filter((r) => r.deleted_at === null).toArray()
}
