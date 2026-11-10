import { describe, expect, it } from 'vitest'
import {
  emptyEquipmentDraft,
  isDuplicateCode,
  toEquipmentPayload,
  validateEquipmentDraft,
  type EquipmentDraft,
} from './equipmentValidation'

const valid: EquipmentDraft = {
  code: 'EQ-010',
  name: 'Hydraulic press',
  line: 'Line A',
  category: 'Press',
  status: 'running',
}

describe('equipment form validation', () => {
  it('rejects an empty code', () => {
    const errors = validateEquipmentDraft({ ...valid, code: '   ' }, [])
    expect(errors.code).toBe('Code is required')
  })

  it('rejects a required name and accepts a valid draft', () => {
    expect(validateEquipmentDraft({ ...valid, name: '  ' }, []).name).toBe('Name is required')
    expect(validateEquipmentDraft(valid, [])).toEqual({})
  })

  it('rejects a duplicate code (case-insensitive, ignoring deleted rows)', () => {
    const rows = [
      { id: 'a', code: 'EQ-010', deleted_at: null },
      { id: 'b', code: 'EQ-020', deleted_at: 123 },
    ]
    expect(validateEquipmentDraft({ ...valid, code: ' eq-010 ' }, rows).code).toBe(
      'This code is already used',
    )
    // The same code may be kept when editing that record.
    expect(validateEquipmentDraft({ ...valid, code: 'EQ-010' }, rows, 'a')).toEqual({})
    // A tombstoned row does not block reuse.
    expect(validateEquipmentDraft({ ...valid, code: 'EQ-020' }, rows)).toEqual({})
  })

  it('detects duplicates without treating empty codes as duplicates', () => {
    const rows = [{ id: 'a', code: 'EQ-010', deleted_at: null }]
    expect(isDuplicateCode('EQ-010', rows)).toBe(true)
    expect(isDuplicateCode('  ', rows)).toBe(false)
  })

  it('trims the payload before it reaches Dexie', () => {
    const payload = toEquipmentPayload({ ...emptyEquipmentDraft, code: ' EQ-1 ', name: ' Press ' })
    expect(payload).toMatchObject({ code: 'EQ-1', name: 'Press', line: '', category: '' })
  })
})