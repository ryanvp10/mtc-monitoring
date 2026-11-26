import { describe, expect, it } from 'vitest'
import {
  draftFromPart,
  emptyPartDraft,
  parseMinStock,
  toPartPayload,
  validatePartDraft,
} from './partValidation'

const rows = [{ id: 'a', code: 'SP-001', deleted_at: null }]

describe('parseMinStock', () => {
  it('accepts whole numbers including zero', () => {
    expect(parseMinStock('0')).toBe(0)
    expect(parseMinStock('12')).toBe(12)
    expect(parseMinStock(' 7 ')).toBe(7)
  })

  it('rejects empty, negative, decimal and junk input', () => {
    expect(parseMinStock('')).toBeNull()
    expect(parseMinStock('-1')).toBeNull()
    expect(parseMinStock('1.5')).toBeNull()
    expect(parseMinStock('abc')).toBeNull()
  })
})

describe('validatePartDraft', () => {
  it('requires code and name', () => {
    const errors = validatePartDraft(emptyPartDraft, [])
    expect(errors.code).toBe('Code is required')
    expect(errors.name).toBe('Name is required')
  })

  it('rejects a duplicate code regardless of case, but allows the edited row itself', () => {
    const draft = { ...emptyPartDraft, code: ' sp-001 ', name: 'Hose' }
    expect(validatePartDraft(draft, rows).code).toBe('This code is already used')
    expect(validatePartDraft(draft, rows, 'a').code).toBeUndefined()
  })

  it('flags a bad minimum stock', () => {
    const draft = { ...emptyPartDraft, code: 'SP-9', name: 'Belt', min_stock: 'x' }
    expect(validatePartDraft(draft, rows).min_stock).toBe('Use a whole number (0 or more)')
  })
})

describe('toPartPayload / draftFromPart', () => {
  it('trims text and converts minimum stock to a number', () => {
    const payload = toPartPayload({ code: ' SP-2 ', name: ' Belt ', category: ' Wear ', unit: ' pcs ', min_stock: '3' })
    expect(payload).toEqual({ code: 'SP-2', name: 'Belt', category: 'Wear', unit: 'pcs', min_stock: 3 })
  })

  it('round-trips a stored part back into a draft', () => {
    const part = {
      id: 'p1',
      code: 'SP-3',
      name: 'Filter',
      category: 'Oil',
      unit: 'pcs',
      min_stock: 4,
      created_by: 'u',
      device_id: 'd',
      created_at: 1,
      updated_at: 2,
      deleted_at: null,
      version: 1,
    }
    expect(draftFromPart(part)).toEqual({
      code: 'SP-3',
      name: 'Filter',
      category: 'Oil',
      unit: 'pcs',
      min_stock: '4',
    })
  })
})
