import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type FormEvent } from 'react'
import { useSession } from '../../auth/sessionContext'
import { db } from '../../db/db'
import { isPartCodeTaken } from '../../db/partQueries'
import {
  draftFromPart,
  emptyPartDraft,
  toPartPayload,
  validatePartDraft,
  type PartDraft,
  type PartFieldErrors,
} from '../../db/partValidation'
import { createRecord, updateRecord } from '../../db/repo'
import type { SparePart } from '../../db/types'

interface PartFormProps {
  partId?: string
  onCancel: () => void
  onSaved: (id: string) => void
}

export function PartForm({ partId, onCancel, onSaved }: PartFormProps) {
  const rows = useLiveQuery(() => db.parts.toArray(), [])

  if (partId) {
    if (rows === undefined) return <p className="muted">Loading spare part…</p>
    const existing = rows.find((row) => row.id === partId)
    if (!existing) {
      return (
        <section className="equipment-page">
          <p className="empty-state">This spare part no longer exists.</p>
          <button className="button button-quiet" type="button" onClick={onCancel}>
            Back to list
          </button>
        </section>
      )
    }
    return (
      <PartFormFields
        key={existing.id}
        initialDraft={draftFromPart(existing)}
        partId={existing.id}
        rows={rows}
        onCancel={onCancel}
        onSaved={onSaved}
      />
    )
  }

  return (
    <PartFormFields
      key="new"
      initialDraft={emptyPartDraft}
      rows={rows ?? []}
      onCancel={onCancel}
      onSaved={onSaved}
    />
  )
}

interface FieldsProps {
  initialDraft: PartDraft
  partId?: string
  rows: SparePart[]
  onCancel: () => void
  onSaved: (id: string) => void
}

function PartFormFields({ initialDraft, partId, rows, onCancel, onSaved }: FieldsProps) {
  const { profile } = useSession()
  const [draft, setDraft] = useState<PartDraft>(initialDraft)
  const [errors, setErrors] = useState<PartFieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function update<K extends keyof PartDraft>(field: K, value: PartDraft[K]) {
    setDraft((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!profile) {
      setFormError('Your session expired. Sign in again.')
      return
    }

    const nextErrors = validatePartDraft(draft, rows, partId)
    if (!nextErrors.code && (await isPartCodeTaken(draft.code, partId))) {
      nextErrors.code = 'This code is already used'
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSaving(true)
    setFormError(null)
    const payload = toPartPayload(draft)
    try {
      if (partId) {
        await updateRecord(db.parts, partId, payload)
        onSaved(partId)
      } else {
        const created = await createRecord(db.parts, payload, profile.id)
        onSaved(created.id)
      }
    } catch {
      setFormError('Could not save the spare part. Please try again.')
      setSaving(false)
    }
  }

  return (
    <section className="equipment-page form-page">
      <div className="page-heading">
        <div>
          <h2 className="page-title">{partId ? 'Edit spare part' : 'New spare part'}</h2>
          <p className="page-sub">
            Stock is not edited here. Stock changes are recorded as movements on the part page.
          </p>
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
              placeholder="SP-001"
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
              placeholder="Hydraulic hose 1/2 inch"
              onChange={(e) => update('name', e.target.value)}
              aria-invalid={Boolean(errors.name)}
            />
            {errors.name && <span className="field-error">{errors.name}</span>}
          </label>
        </div>

        <div className="form-row">
          <label className="field">
            <span className="field-label">Category</span>
            <input
              className="input"
              type="text"
              value={draft.category}
              placeholder="Hydraulic"
              onChange={(e) => update('category', e.target.value)}
            />
          </label>
          <label className="field">
            <span className="field-label">Unit</span>
            <input
              className="input"
              type="text"
              value={draft.unit}
              placeholder="pcs"
              onChange={(e) => update('unit', e.target.value)}
            />
          </label>
          <label className="field">
            <span className="field-label">Minimum stock</span>
            <input
              className="input"
              type="text"
              inputMode="numeric"
              value={draft.min_stock}
              placeholder="0"
              onChange={(e) => update('min_stock', e.target.value)}
              aria-invalid={Boolean(errors.min_stock)}
            />
            {errors.min_stock && <span className="field-error">{errors.min_stock}</span>}
          </label>
        </div>

        {formError && (
          <p className="form-error" role="alert">
            {formError}
          </p>
        )}

        <div className="form-actions">
          <button className="button button-primary" type="submit" disabled={saving}>
            {saving ? 'Saving…' : partId ? 'Save changes' : 'Create spare part'}
          </button>
          <button className="button button-quiet" type="button" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
        </div>
      </form>
    </section>
  )
}
