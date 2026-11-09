import { beforeEach, describe, expect, it } from 'vitest'
import { MtcDb } from './db'
import { createRecord, listActive, softDelete, updateRecord } from './repo'

let db: MtcDb

beforeEach(async () => {
  db = new MtcDb('test-' + crypto.randomUUID())
  await db.open()
})

const sample = { code: 'EQ-001', name: 'Press 1', line: 'Line A', category: 'Press', status: 'running' as const }

describe('repo', () => {
  it('creates a record with sync metadata', async () => {
    const eq = await createRecord(db.equipment, sample, 'ryan')
    expect(eq.id).toMatch(/[0-9a-f-]{36}/)
    expect(eq.version).toBe(1)
    expect(eq.deleted_at).toBeNull()
    expect(eq.created_by).toBe('ryan')
  })

  it('bumps version and updated_at on update', async () => {
    const eq = await createRecord(db.equipment, sample, 'ryan')
    const next = await updateRecord(db.equipment, eq.id, { status: 'breakdown' })
    expect(next.version).toBe(2)
    expect(next.status).toBe('breakdown')
    expect(next.updated_at).toBeGreaterThanOrEqual(eq.updated_at)
  })

  it('soft delete keeps a tombstone but hides it from lists', async () => {
    const eq = await createRecord(db.equipment, sample, 'ryan')
    await softDelete(db.equipment, eq.id)
    expect(await listActive(db.equipment)).toHaveLength(0)
    const raw = await db.equipment.get(eq.id)
    expect(raw?.deleted_at).not.toBeNull()
    expect(raw?.version).toBe(2)
  })

  it('refuses to update a deleted or missing record', async () => {
    const eq = await createRecord(db.equipment, sample, 'ryan')
    await softDelete(db.equipment, eq.id)
    await expect(updateRecord(db.equipment, eq.id, { name: 'x' })).rejects.toThrow()
    await expect(updateRecord(db.equipment, 'nope', { name: 'x' })).rejects.toThrow()
  })
})
