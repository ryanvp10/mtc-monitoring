import { useState, type FormEvent } from 'react'
import { useSession } from './sessionContext'
import { validateProfileDraft, type ProfileDraft, type ProfileFieldErrors } from './sessionCore'

export function FirstAdminScreen() {
  const { createFirstAdmin } = useSession()
  const [draft, setDraft] = useState<ProfileDraft>({ name: '', pin: '', confirmPin: '' })
  const [errors, setErrors] = useState<ProfileFieldErrors>({})
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  function update(field: keyof ProfileDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const nextErrors = validateProfileDraft(draft)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    setSaving(true)
    setFormError(null)
    try {
      await createFirstAdmin(draft)
    } catch {
      setFormError('Could not create the admin profile. Please try again.')
      setSaving(false)
    }
  }

  return (
    <section className="auth-section">
      <h2 className="auth-title">Create first admin</h2>
      <p className="auth-intro">
        This PC has no profiles yet. Set up the first admin to start using the maintenance log.
      </p>
      <form className="form" onSubmit={handleSubmit} noValidate>
        <label className="field">
          <span className="field-label">Full name</span>
          <input
            className="input"
            type="text"
            value={draft.name}
            autoComplete="name"
            onChange={(e) => update('name', e.target.value)}
            aria-invalid={Boolean(errors.name)}
          />
          {errors.name && <span className="field-error">{errors.name}</span>}
        </label>
        <label className="field">
          <span className="field-label">4-digit PIN</span>
          <input
            className="input pin-input"
            type="password"
            inputMode="numeric"
            maxLength={4}
            autoComplete="new-password"
            value={draft.pin}
            onChange={(e) => update('pin', e.target.value.replace(/\D/g, ''))}
            aria-invalid={Boolean(errors.pin)}
          />
          {errors.pin && <span className="field-error">{errors.pin}</span>}
        </label>
        <label className="field">
          <span className="field-label">Confirm PIN</span>
          <input
            className="input pin-input"
            type="password"
            inputMode="numeric"
            maxLength={4}
            autoComplete="new-password"
            value={draft.confirmPin}
            onChange={(e) => update('confirmPin', e.target.value.replace(/\D/g, ''))}
            aria-invalid={Boolean(errors.confirmPin)}
          />
          {errors.confirmPin && <span className="field-error">{errors.confirmPin}</span>}
        </label>
        {formError && (
          <p className="form-error" role="alert">
            {formError}
          </p>
        )}
        <button className="button button-primary" type="submit" disabled={saving}>
          {saving ? 'Creating…' : 'Create admin'}
        </button>
      </form>
      <p className="auth-note">
        The PIN keeps technicians from picking the wrong profile on a shared PC. It is not real
        security: the data lives in this browser.
      </p>
    </section>
  )
}