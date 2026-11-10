import { db } from './db'
import type { EquipmentStatus } from './types'

export interface EquipmentQuery {
  search: string
  line?: string
  status?: EquipmentStatus
  page: number // 0-based
  pageSize: number
}

export async function queryEquipment(q: EquipmentQuery) {
  const term = q.search.trim().toLowerCase()
  const base = db.equipment
    .orderBy('code')
    .filter(
      (e) =>
        e.deleted_at === null &&
        (!q.line || e.line === q.line) &&
        (!q.status || e.status === q.status) &&
        (!term || e.code.toLowerCase().includes(term) || e.name.toLowerCase().includes(term)),
    )
  const total = await base.clone().count()
  const items = await base.clone().offset(q.page * q.pageSize).limit(q.pageSize).toArray()
  return { items, total }
}

/**
 * Uniqueness check against Dexie itself (case-insensitive), ignoring deleted rows
 * and optionally the record being edited.
 */
export async function isEquipmentCodeTaken(code: string, excludeId?: string): Promise<boolean> {
  const normalized = code.trim()
  if (!normalized) return false
  const count = await db.equipment
    .where('code')
    .equalsIgnoreCase(normalized)
    .filter((e) => e.deleted_at === null && e.id !== excludeId)
    .count()
  return count > 0
}
