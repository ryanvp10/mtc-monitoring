import { assertCanDeletePart } from '../auth/roleGuard'
import { stockOf, validateMovement } from '../lib/stock'
import { db } from './db'
import { createRecord, softDelete } from './repo'
import type { Payload, Profile, StockMovement } from './types'

export interface InventoryActor {
  id: string
  role: Profile['role']
}

export type MovementInput = Payload<StockMovement>

export type MovementErrorCode = 'invalid_qty' | 'insufficient_stock' | 'part_not_found'

export class MovementError extends Error {
  code: MovementErrorCode
  constructor(code: MovementErrorCode, message: string) {
    super(message)
    this.name = 'MovementError'
    this.code = code
  }
}

/**
 * Current stock for one part, straight from the ledger.
 * Must run inside the same transaction as the write that depends on it.
 */
export async function currentStock(partId: string): Promise<number> {
  const rows = await db.stock_movements.where('part_id').equals(partId).toArray()
  return stockOf(rows)
}

/**
 * Appends a movement. There is deliberately no updateMovement / deleteMovement:
 * a wrong entry is corrected with a new movement (ADR-004).
 * The stock check runs inside the write transaction so two tabs cannot oversell.
 */
export async function recordMovement(
  actor: InventoryActor | null,
  input: MovementInput,
): Promise<StockMovement> {
  if (!actor) throw new Error('Sign in to record stock movements')

  return db.transaction('rw', db.parts, db.stock_movements, async () => {
    const part = await db.parts.get(input.part_id)
    if (!part || part.deleted_at !== null) {
      throw new MovementError('part_not_found', 'This spare part no longer exists')
    }

    const current = await currentStock(input.part_id)
    const problem = validateMovement(current, input.type, input.qty)
    if (problem === 'invalid_qty') {
      throw new MovementError('invalid_qty', 'Quantity must be a whole number above zero')
    }
    if (problem === 'insufficient_stock') {
      throw new MovementError(
        'insufficient_stock',
        `Only ${current} in stock, cannot take out ${input.qty}`,
      )
    }

    return createRecord(
      db.stock_movements,
      {
        part_id: input.part_id,
        type: input.type,
        qty: input.qty,
        note: input.note.trim(),
        machine_id: input.machine_id,
      },
      actor.id,
    )
  })
}

/** Movements for one part, newest first (display order only). */
export async function listMovements(partId: string): Promise<StockMovement[]> {
  const rows = await db.stock_movements.where('part_id').equals(partId).toArray()
  return rows
    .filter((row) => row.deleted_at === null)
    .sort((a, b) => b.created_at - a.created_at)
}

/** Deleting a part is admin-only; movements stay in the ledger untouched. */
export async function deletePart(actor: InventoryActor | null, partId: string): Promise<void> {
  if (!actor) throw new Error('Sign in to delete spare parts')
  assertCanDeletePart(actor.role)
  await softDelete(db.parts, partId)
}
