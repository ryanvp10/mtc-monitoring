import { stockOf } from '../lib/stock'
import { db } from './db'
import { listActive } from './repo'
import type { SparePart } from './types'

/** A spare part together with its derived stock. Never stored. */
export interface PartRow extends SparePart {
  stock: number
  low: boolean
}

export interface PartsQuery {
  search: string
  category?: string
  lowStockOnly?: boolean
  page: number // 0-based
  pageSize: number
}

export function toPartRow(part: SparePart, stock: number): PartRow {
  return { ...part, stock, low: stock < part.min_stock }
}

/**
 * Sums the ledger for the given parts in one query.
 * Indexed on part_id so this stays cheap per page (see phase 2 doc, section D).
 */
export async function stockByPart(partIds: string[]): Promise<Map<string, number>> {
  const totals = new Map<string, number>(partIds.map((id) => [id, 0]))
  if (partIds.length === 0) return totals
  const movements = await db.stock_movements.where('part_id').anyOf(partIds).toArray()
  const grouped = new Map<string, { type: 'in' | 'out'; qty: number; deleted_at: number | null }[]>()
  for (const movement of movements) {
    const bucket = grouped.get(movement.part_id)
    if (bucket) bucket.push(movement)
    else grouped.set(movement.part_id, [movement])
  }
  for (const [partId, rows] of grouped) totals.set(partId, stockOf(rows))
  return totals
}

export async function queryParts(q: PartsQuery): Promise<{ items: PartRow[]; total: number }> {
  const term = q.search.trim().toLowerCase()
  const parts = (await listActive(db.parts)).filter(
    (part) =>
      (!q.category || part.category === q.category) &&
      (!term ||
        part.code.toLowerCase().includes(term) ||
        part.name.toLowerCase().includes(term) ||
        part.category.toLowerCase().includes(term)),
  )

  const totals = await stockByPart(parts.map((part) => part.id))
  const rows = parts
    .map((part) => toPartRow(part, totals.get(part.id) ?? 0))
    .filter((row) => (q.lowStockOnly ? row.low : true))
    .sort((a, b) => a.code.localeCompare(b.code))

  return {
    items: rows.slice(q.page * q.pageSize, q.page * q.pageSize + q.pageSize),
    total: rows.length,
  }
}

/** Count for the low-stock badge in the navigation. */
export async function countLowStock(): Promise<number> {
  const parts = await listActive(db.parts)
  const totals = await stockByPart(parts.map((part) => part.id))
  return parts.reduce(
    (count, part) => count + ((totals.get(part.id) ?? 0) < part.min_stock ? 1 : 0),
    0,
  )
}

/** Categories currently in use, for the filter dropdown. */
export async function listPartCategories(): Promise<string[]> {
  const parts = await listActive(db.parts)
  return [...new Set(parts.map((part) => part.category).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  )
}

/** Uniqueness check straight against Dexie (case-insensitive), ignoring deleted rows. */
export async function isPartCodeTaken(code: string, excludeId?: string): Promise<boolean> {
  const normalized = code.trim()
  if (!normalized) return false
  const count = await db.parts
    .where('code')
    .equalsIgnoreCase(normalized)
    .filter((part) => part.deleted_at === null && part.id !== excludeId)
    .count()
  return count > 0
}
