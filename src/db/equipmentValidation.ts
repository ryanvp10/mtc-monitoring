import type { Equipment, EquipmentStatus, Payload } from './types'

export interface EquipmentDraft {
  code: string
  name: string
  line: string
  category: string
  status: EquipmentStatus
}

export type EquipmentField = 'code' | 'name' | 'line' | 'category' | 'status'
export type EquipmentFieldErrors = Partial<Record<EquipmentField, string>>

/** Fields needed to check uniqueness without pulling the whole record. */
export interface CodeOwner {
  id: string
  code: string
  deleted_at: number | null
}

export const emptyEquipmentDraft: EquipmentDraft = {
  code: '',
  name: '',
  line: '',
  category: '',
  status: 'running',
}

export function normalizeCode(code: string): string {
  return code.trim()
}

export function isDuplicateCode(
  code: string,
  rows: CodeOwner[],
  excludeId?: string,
): boolean {
  const normalized = normalizeCode(code).toLowerCase()
  if (!normalized) return false
  return rows.some(
    (row) =>
      row.deleted_at === null &&
      row.id !== excludeId &&
      row.code.trim().toLowerCase() === normalized,
  )
}

export function validateEquipmentDraft(
  draft: EquipmentDraft,
  rows: CodeOwner[],
  excludeId?: string,
): EquipmentFieldErrors {
  const errors: EquipmentFieldErrors = {}
  if (!normalizeCode(draft.code)) errors.code = 'Code is required'
  else if (isDuplicateCode(draft.code, rows, excludeId)) errors.code = 'This code is already used'
  if (!draft.name.trim()) errors.name = 'Name is required'
  return errors
}

export function toEquipmentPayload(draft: EquipmentDraft): Payload<Equipment> {
  return {
    code: normalizeCode(draft.code),
    name: draft.name.trim(),
    line: draft.line.trim(),
    category: draft.category.trim(),
    status: draft.status,
  }
}
