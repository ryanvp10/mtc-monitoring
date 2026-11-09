import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { queryEquipment } from './equipmentQueries'
import { createRecord, softDelete } from './repo'

beforeEach(async () => {
  await db.equipment.clear()
  for (let i = 0; i < 50; i++) {
    await createRecord(
      db.equipment,
      {
        code: `EQ-${String(i).padStart(3, '0')}`,
        name: i % 2 ? 'Press' : 'Conveyor',
        line: i < 25 ? 'A' : 'B',
        category: 'x',
        status: i % 5 === 0 ? 'breakdown' : 'running',
      },
      'test',
    )
  }
})

describe('queryEquipment', () => {
  it('paginates', async () => {
    const p0 = await queryEquipment({ search: '', page: 0, pageSize: 20 })
    const p2 = await queryEquipment({ search: '', page: 2, pageSize: 20 })
    expect(p0.total).toBe(50)
    expect(p0.items).toHaveLength(20)
    expect(p2.items).toHaveLength(10)
    expect(p0.items[0].code).toBe('EQ-000')
  })
  it('searches by name and filters by line/status', async () => {
    expect((await queryEquipment({ search: 'conveyor', page: 0, pageSize: 100 })).total).toBe(25)
    expect((await queryEquipment({ search: '', line: 'B', page: 0, pageSize: 100 })).total).toBe(25)
    expect((await queryEquipment({ search: '', status: 'breakdown', page: 0, pageSize: 100 })).total).toBe(10)
  })
  it('hides soft-deleted records', async () => {
    const first = (await queryEquipment({ search: '', page: 0, pageSize: 1 })).items[0]
    await softDelete(db.equipment, first.id)
    expect((await queryEquipment({ search: '', page: 0, pageSize: 100 })).total).toBe(49)
  })
})
