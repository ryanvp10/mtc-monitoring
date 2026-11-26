import type { CodeOwner } from './equipmentValidation'
import { isDuplicateCode, normalizeCode } from './equipmentValidation'
import type { Payload, SparePart } from './types'

/** Form state: min_stock stays a string while the user types. */
export interface PartDraft {
  code: string
  name: string
  category: string
  unit: string
  min_stock: string
}

export type PartField = 'code' | 'name' | 'category' | 'unit' | 'min_stock'
export type PartFieldErrors = Partial<Record<PartField, string>>

export const emptyPartDraft: PartDraft = {
  code: '',
  name: '',
  category: '',
  unit: 'pcs',
  min_stock: '0',
}

export function draftFromPart(part: SparePart): PartDraft {
  return {
    code: part.code,
    name: part.name,
    category: part.category,
    unit: part.unit,
    min_stock: String(part.min_stock),
  }
}

/** Accepts only whole numbers >= 0. Returns null when the text is not usable. */
export function parseMinStock(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (!/^\d+$/.test(trimmed)) return null
  const value = Number(trimmed)
  return Number.isSafeInteger(value) ? value : null
}

export function validatePartDraft(
  draft: PartDraft,
  rows: CodeOwner[],
  excludeId?: string,
): PartFieldErrors {
  const errors: PartFieldErrors = {}
  if (!normalizeCode(draft.code)) errors.code = 'Code is required'
  else if (isDuplicateCode(draft.code, rows, excludeId)) errors.code = 'This code is already used'
  if (!draft.name.trim()) errors.name = 'Name is required'
  if (parseMinStock(draft.min_stock) === null) errors.min_stock = 'Use a whole number (0 or more)'
  return errors
}

export function toPartPayload(draft: PartDraft): Payload<SparePart> {
  return {
    code: normalizeCode(draft.code),
    name: draft.name.trim(),
    category: draft.category.trim(),
    unit: draft.unit.trim(),
    min_stock: parseMinStock(draft.min_stock) ?? 0,
  }
}
