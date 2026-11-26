import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { countLowStock, isPartCodeTaken, listPartCategories, queryParts, stockByPart } from './partQueries'
import { createRecord } from './repo'
import type { Payload, SparePart } from './types'

async function makePart(code: string, overrides: Partial<Payload<SparePart>> = {}): Promise<SparePart> {
  return createRecord(
    db.parts,
    {
      code,
      name: `Part ${code}`,
      category: 'Hydraulic',
      unit: 'pcs',
      min_stock: 5,
      ...overrides,
    },
    'test',
  )
}

async function addMovement(partId: string, type: 'in' | 'out', qty: number) {
  const now = Date.now()
  await db.stock_movements.add({
    id: crypto.randomUUID(),
    part_id: partId,
    type,
    qty,
    note: '',
    machine_id: null,
    created_by: 'test',
    device_id: 'test-device',
    created_at: now,
    updated_at: now,
    deleted_at: null,
    version: 1,
  })
}

beforeEach(async () => {
  await db.parts.clear()
  await db.stock_movements.clear()
})

describe('stockByPart', () => {
  it('sums movements per part and defaults to zero', async () => {
    const a = await makePart('SP-A')
    const b = await makePart('SP-B')
    await addMovement(a.id, 'in', 10)
    await addMovement(a.id, 'out', 4)

    const totals = await stockByPart([a.id, b.id])
    expect(totals.get(a.id)).toBe(6)
    expect(totals.get(b.id)).toBe(0)
  })
})

describe('queryParts', () => {
  it('paginates and reports the full total', async () => {
    for (let i = 0; i < 25; i += 1) await makePart(`SP-${String(i).padStart(3, '0')}`)

    const first = await queryParts({ search: '', page: 0, pageSize: 20 })
    const second = await queryParts({ search: '', page: 1, pageSize: 20 })

    expect(first.total).toBe(25)
    expect(first.items).toHaveLength(20)
    expect(second.items).toHaveLength(5)
    expect(first.items[0].code).toBe('SP-000')
  })

  it('searches code, name and category case-insensitively', async () => {
    await makePart('HY-1', { name: 'Hydraulic hose', category: 'Hose' })
    await makePart('EL-1', { name: 'Contactor', category: 'Electrical' })

    expect((await queryParts({ search: 'hy-1', page: 0, pageSize: 20 })).total).toBe(1)
    expect((await queryParts({ search: 'contac', page: 0, pageSize: 20 })).total).toBe(1)
    expect((await queryParts({ search: 'electrical', page: 0, pageSize: 20 })).total).toBe(1)
  })

  it('filters by category', async () => {
    await makePart('HY-1', { category: 'Hose' })
    await makePart('EL-1', { category: 'Electrical' })

    const result = await queryParts({ search: '', category: 'Hose', page: 0, pageSize: 20 })
    expect(result.total).toBe(1)
    expect(result.items[0].code).toBe('HY-1')
  })

  it('treats stock equal to the minimum as NOT low, and one below as low', async () => {
    const atMinimum = await makePart('SP-MIN', { min_stock: 5 })
    const below = await makePart('SP-LOW', { min_stock: 5 })
    await addMovement(atMinimum.id, 'in', 5)
    await addMovement(below.id, 'in', 4)

    const low = await queryParts({ search: '', lowStockOnly: true, page: 0, pageSize: 20 })
    expect(low.total).toBe(1)
    expect(low.items[0].code).toBe('SP-LOW')

    const all = await queryParts({ search: '', page: 0, pageSize: 20 })
    const minRow = all.items.find((row) => row.code === 'SP-MIN')
    expect(minRow?.stock).toBe(5)
    expect(minRow?.low).toBe(false)
  })

  it('ignores deleted parts and deleted movements', async () => {
    const part = await makePart('SP-DEL')
    await addMovement(part.id, 'in', 3)
    await db.parts.update(part.id, { deleted_at: Date.now() })

    expect((await queryParts({ search: '', page: 0, pageSize: 20 })).total).toBe(0)
  })
})

describe('countLowStock / listPartCategories', () => {
  it('counts only parts strictly below minimum', async () => {
    const low = await makePart('SP-1', { min_stock: 2 })
    await makePart('SP-2', { min_stock: 0 })
    await addMovement(low.id, 'in', 1)

    expect(await countLowStock()).toBe(1)
  })

  it('lists distinct non-empty categories sorted', async () => {
    await makePart('SP-1', { category: 'Wear' })
    await makePart('SP-2', { category: 'Electrical' })
    await makePart('SP-3', { category: 'Wear' })
    await makePart('SP-4', { category: '' })

    expect(await listPartCategories()).toEqual(['Electrical', 'Wear'])
  })
})

describe('isPartCodeTaken', () => {
  it('detects duplicates case-insensitively and ignores the edited row', async () => {
    const part = await makePart('SP-DUP')
    expect(await isPartCodeTaken(' sp-dup ')).toBe(true)
    expect(await isPartCodeTaken('SP-DUP', part.id)).toBe(false)
    expect(await isPartCodeTaken('SP-NEW')).toBe(false)
  })

  it('ignores deleted rows', async () => {
    const part = await makePart('SP-GONE')
    await db.parts.update(part.id, { deleted_at: Date.now() })
    expect(await isPartCodeTaken('SP-GONE')).toBe(false)
  })
})
