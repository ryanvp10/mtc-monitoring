import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type FormEvent } from 'react'
import { useSession } from '../../auth/sessionContext'
import { db } from '../../db/db'
import { isEquipmentCodeTaken } from '../../db/equipmentQueries'
import { createRecord, updateRecord } from '../../db/repo'
import type { Equipment, EquipmentStatus } from '../../db/types'
import {
  emptyEquipmentDraft,
  toEquipmentPayload,
  validateEquipmentDraft,
  type EquipmentDraft,
  type EquipmentFieldErrors,
} from '../../db/equipmentValidation'

interface EquipmentFormProps {
  equipmentId?: string
  onCancel: () => void
  onSaved: (id: string) => void
}

function draftFrom(equipment: Equipment): EquipmentDraft {
  return {
    code: equipment.code,
    name: equipment.name,
    line: equipment.line,
    category: equipment.category,
    status: equipment.status,
  }
}

export function EquipmentForm({ equipmentId, onCancel, onSaved }: EquipmentFormProps) {
  const rows = useLiveQuery(() => db.equipment.toArray(), [])

  if (equipmentId) {
    if (rows === undefined) return <p className="muted">Loading equipment…</p>
    const existing = rows.find((row) => row.id === equipmentId)
    if (!existing) {
      return (
        <section className="equipment-page">
          <p className="empty-state">This equipment no longer exists.</p>
          <button className="button button-quiet" type="button" onClick={onCancel}>
            Back to list
          </button>
        </section>
      )
    }
    return (
      <EquipmentFormFields
        key={existing.id}
        initialDraft={draftFrom(existing)}
        equipmentId={existing.id}
        rows={rows}
        onCancel={onCancel}
        onSaved={onSaved}
      />
    )
  }

  return (
    <EquipmentFormFields
      key="new"
      initialDraft={emptyEquipmentDraft}
      rows={rows ?? []}
      onCancel={onCancel}
      onSaved={onSaved}
    />
  )
}

interface FieldsProps {
  initialDraft: EquipmentDraft
  equipmentId?: string
  rows: Equipment[]
  onCancel: () => void
  onSaved: (id: string) => void
}

function EquipmentFormFields({ initialDraft, equipmentId, rows, onCancel, onSaved }: FieldsProps) {
  const { profile } = useSession()
  const [draft, setDraft] = useState<EquipmentDraft>(initialDraft)
  const [errors, setErrors] = useState<EquipmentFieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function update<K extends keyof EquipmentDraft>(field: K, value: EquipmentDraft[K]) {
    setDraft((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!profile) {
      setFormError('Your session expired. Sign in again.')
      return
    }

    const nextErrors = validateEquipmentDraft(draft, rows, equipmentId)
    // Second check straight against Dexie: catches a row created in another tab.
    if (!nextErrors.code && (await isEquipmentCodeTaken(draft.code, equipmentId))) {
      nextErrors.code = 'This code is already used'
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSaving(true)
    setFormError(null)
    const payload = toEquipmentPayload(draft)
    try {
      if (equipmentId) {
        await updateRecord(db.equipment, equipmentId, payload)
        onSaved(equipmentId)
      } else {
        const created = await createRecord(db.equipment, payload, profile.id)
        onSaved(created.id)
      }
    } catch {
      setFormError('Could not save the equipment. Please try again.')
      setSaving(false)
    }
  }

  return (
    <section className="equipment-page form-page">
      <div className="page-heading">
        <div>
          <h2 className="page-title">{equipmentId ? 'Edit equipment' : 'New equipment'}</h2>
          <p className="page-sub">Code and name are required. The code must be unique.</p>
        </div>
      </div>

      <form className="form equipment-form" onSubmit={handleSubmit} noValidate>
        <div className="form-row">
          <label className="field">
            <span className="field-label">Code</span>
            <input
              className="input"
              type="text"
              value={draft.code}
              placeholder="EQ-001"
              onChange={(e) => update('code', e.target.value)}
              aria-invalid={Boolean(errors.code)}
            />
            {errors.code && <span className="field-error">{errors.code}</span>}
          </label>
          <label className="field field-grow">
            <span className="field-label">Name</span>
            <input
              className="input"
              type="text"
              value={draft.name}
              placeholder="Hydraulic press"
              onChange={(e) => update('name', e.target.value)}
              aria-invalid={Boolean(errors.name)}
            />
            {errors.name && <span className="field-error">{errors.name}</span>}
          </label>
        </div>

        <div className="form-row">
          <label className="field">
            <span className="field-label">Line</span>
            <input
              className="input"
              type="text"
              value={draft.line}
              placeholder="Line A"
              onChange={(e) => update('line', e.target.value)}
            />
          </label>
          <label className="field">
            <span className="field-label">Category</span>
            <input
              className="input"
              type="text"
              value={draft.category}
              placeholder="Press"
              onChange={(e) => update('category', e.target.value)}
            />
          </label>
          <label className="field">
            <span className="field-label">Status</span>
            <select
              className="input"
              value={draft.status}
              onChange={(e) => update('status', e.target.value as EquipmentStatus)}
            >
              <option value="running">Running</option>
              <option value="standby">Standby</option>
              <option value="breakdown">Breakdown</option>
            </select>
          </label>
        </div>

        {formError && (
          <p className="form-error" role="alert">
            {formError}
          </p>
        )}

        <div className="form-actions">
          <button className="button button-primary" type="submit" disabled={saving}>
            {saving ? 'Saving…' : equipmentId ? 'Save changes' : 'Create equipment'}
          </button>
          <button className="button button-quiet" type="button" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
        </div>
      </form>
    </section>
  )
}