import { beforeEach, describe, expect, it } from 'vitest'
import { ForbiddenError } from '../auth/roleGuard'
import { db } from './db'
import { currentStock, deletePart, listMovements, recordMovement, MovementError } from './inventoryService'
import { createRecord, listActive } from './repo'
import type { Payload, SparePart } from './types'

const admin = { id: 'admin-1', role: 'admin' as const }
const technician = { id: 'tech-1', role: 'technician' as const }

const partPayload = (code: string): Payload<SparePart> => ({
  code,
  name: `Part ${code}`,
  category: 'Hydraulic',
  unit: 'pcs',
  min_stock: 5,
})

async function makePart(code = 'SP-100'): Promise<SparePart> {
  return createRecord(db.parts, partPayload(code), 'test')
}

const move = (partId: string, type: 'in' | 'out', qty: number, note = '') =>
  recordMovement(admin, { part_id: partId, type, qty, note, machine_id: null })

beforeEach(async () => {
  await db.parts.clear()
  await db.stock_movements.clear()
})

describe('recordMovement', () => {
  it('appends movements and derives stock from the ledger', async () => {
    const part = await makePart()
    await move(part.id, 'in', 10)
    await move(part.id, 'out', 3)

    expect(await currentStock(part.id)).toBe(7)
    expect(await listMovements(part.id)).toHaveLength(2)
  })

  it('rejects taking out more than the stock and leaves the ledger untouched', async () => {
    const part = await makePart()
    await move(part.id, 'in', 4)

    await expect(move(part.id, 'out', 5)).rejects.toMatchObject({ code: 'insufficient_stock' })
    expect(await currentStock(part.id)).toBe(4)
    expect(await listMovements(part.id)).toHaveLength(1)
  })

  it('allows taking out exactly the whole stock', async () => {
    const part = await makePart()
    await move(part.id, 'in', 4)
    await move(part.id, 'out', 4)
    expect(await currentStock(part.id)).toBe(0)
  })

  it('rejects zero, negative and fractional quantities', async () => {
    const part = await makePart()
    for (const qty of [0, -2, 1.5]) {
      await expect(move(part.id, 'in', qty)).rejects.toBeInstanceOf(MovementError)
    }
    expect(await currentStock(part.id)).toBe(0)
  })

  it('refuses a signed-out actor and a deleted part', async () => {
    const part = await makePart()
    await expect(
      recordMovement(null, { part_id: part.id, type: 'in', qty: 1, note: '', machine_id: null }),
    ).rejects.toThrow()

    await deletePart(admin, part.id)
    await expect(move(part.id, 'in', 1)).rejects.toMatchObject({ code: 'part_not_found' })
  })

  it('keeps the total correct across 100 random movements', async () => {
    const part = await makePart()
    let expected = 0
    for (let i = 0; i < 100; i += 1) {
      const qty = (i % 7) + 1
      if (i % 3 === 0 && expected >= qty) {
        await move(part.id, 'out', qty)
        expected -= qty
      } else {
        await move(part.id, 'in', qty)
        expected += qty
      }
    }
    expect(await currentStock(part.id)).toBe(expected)
  })

  it('merges two devices by union of movements, without conflict resolution', async () => {
    const part = await makePart()
    // Device A offline: +10, -2. Device B offline: +5, -1.
    await move(part.id, 'in', 10)
    await move(part.id, 'out', 2)
    await move(part.id, 'in', 5)
    await move(part.id, 'out', 1)

    expect(await currentStock(part.id)).toBe(12)
    expect(await listMovements(part.id)).toHaveLength(4)
  })

  it('stores the note and machine link', async () => {
    const part = await makePart()
    await move(part.id, 'in', 5)
    await recordMovement(admin, {
      part_id: part.id,
      type: 'out',
      qty: 1,
      note: '  bearing replacement  ',
      machine_id: 'eq-1',
    })
    const [movement] = await listMovements(part.id)
    expect(movement.note).toBe('bearing replacement')
    expect(movement.machine_id).toBe('eq-1')
    expect(movement.version).toBe(1)
  })
})

describe('deletePart', () => {
  it('refuses a technician at the logic layer', async () => {
    const part = await makePart()
    await expect(deletePart(technician, part.id)).rejects.toBeInstanceOf(ForbiddenError)
    expect(await listActive(db.parts)).toHaveLength(1)
  })

  it('lets an admin soft-delete but keeps the movement ledger', async () => {
    const part = await makePart()
    await move(part.id, 'in', 3)
    await deletePart(admin, part.id)

    expect(await listActive(db.parts)).toHaveLength(0)
    expect(await listMovements(part.id)).toHaveLength(1)
  })
})
