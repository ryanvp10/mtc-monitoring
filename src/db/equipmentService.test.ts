import { beforeEach, describe, expect, it } from 'vitest'
import { ForbiddenError } from '../auth/roleGuard'
import { db } from './db'
import { deleteEquipment } from './equipmentService'
import { createRecord, listActive } from './repo'

const sample = {
  code: 'EQ-DEL',
  name: 'Delete me',
  line: 'Line A',
  category: 'Press',
  status: 'running' as const,
}

beforeEach(async () => {
  await db.equipment.clear()
})

describe('deleteEquipment', () => {
  it('refuses a technician at the logic layer and keeps the record', async () => {
    const item = await createRecord(db.equipment, sample, 'test')
    await expect(
      deleteEquipment({ id: 'tech-1', role: 'technician' }, item.id),
    ).rejects.toBeInstanceOf(ForbiddenError)
    expect(await listActive(db.equipment)).toHaveLength(1)
    expect((await db.equipment.get(item.id))?.deleted_at).toBeNull()
  })

  it('lets an admin soft-delete the record', async () => {
    const item = await createRecord(db.equipment, sample, 'test')
    await deleteEquipment({ id: 'admin-1', role: 'admin' }, item.id)
    expect(await listActive(db.equipment)).toHaveLength(0)
    expect((await db.equipment.get(item.id))?.deleted_at).not.toBeNull()
  })

  it('refuses a signed-out actor', async () => {
    const item = await createRecord(db.equipment, sample, 'test')
    await expect(deleteEquipment(null, item.id)).rejects.toThrow()
    expect(await listActive(db.equipment)).toHaveLength(1)
  })
})