// Phase 2. Stock is derived from an append-only ledger of movements.
import type { StockMovement } from '../db/types'

type LedgerRow = Pick<StockMovement, 'type' | 'qty' | 'deleted_at'>

export function stockOf(movements: LedgerRow[]): number {
  return movements
    .filter((m) => m.deleted_at === null)
    .reduce((sum, m) => sum + (m.type === 'in' ? m.qty : -m.qty), 0)
}

export const isLowStock = (current: number, minimum: number) => current < minimum

/** Returns an error code, or null when the movement is acceptable. */
export function validateMovement(current: number, type: 'in' | 'out', qty: number): 'invalid_qty' | 'insufficient_stock' | null {
  if (!Number.isInteger(qty) || qty <= 0) return 'invalid_qty'
  if (type === 'out' && qty > current) return 'insufficient_stock'
  return null
}
