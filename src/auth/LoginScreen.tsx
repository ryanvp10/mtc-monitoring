import { useState, type FormEvent } from 'react'
import type { Profile } from '../db/types'
import { useSession } from './sessionContext'

export function LoginScreen({ profiles }: { profiles: Profile[] }) {
  const { login, loginAsDemo } = useSession()
  const [selectedId, setSelectedId] = useState<string>(profiles[0]?.id ?? '')
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!selectedId) {
      setError('Choose a profile first.')
      return
    }
    if (!/^\d{4}$/.test(pin)) {
      setError('Enter your 4-digit PIN.')
      return
    }
    setBusy(true)
    setError(null)
    const ok = await login(selectedId, pin)
    if (!ok) {
      setError('Incorrect PIN. Try again.')
      setPin('')
      setBusy(false)
    }
  }

  async function handleDemo() {
    setBusy(true)
    setError(null)
    try {
      await loginAsDemo()
    } catch {
      setError('Could not open the demo session. Please try again.')
      setBusy(false)
    }
  }

  return (
    <section className="auth-section">
      <h2 className="auth-title">Sign in</h2>
      <p className="auth-intro">Choose your name, then enter your PIN.</p>

      <div className="profile-list" role="radiogroup" aria-label="Profiles">
        {profiles.map((profile) => (
          <button
            key={profile.id}
            type="button"
            role="radio"
            aria-checked={selectedId === profile.id}
            className={`profile-option${selectedId === profile.id ? ' is-selected' : ''}`}
            onClick={() => {
              setSelectedId(profile.id)
              setPin('')
              setError(null)
            }}
          >
            <span className="profile-name">{profile.name}</span>
            <span className="profile-role">{profile.role}</span>
          </button>
        ))}
      </div>

      <form className="form" onSubmit={handleSubmit}>
        <label className="field">
          <span className="field-label">PIN</span>
          <input
            className="input pin-input"
            type="password"
            inputMode="numeric"
            maxLength={4}
            autoComplete="current-password"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value.replace(/\D/g, ''))
              setError(null)
            }}
            aria-invalid={Boolean(error)}
          />
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="button button-primary" type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <div className="auth-divider">
        <span>or</span>
      </div>
      <button className="button button-secondary" type="button" onClick={handleDemo} disabled={busy}>
        Try as demo user
      </button>
      <p className="auth-note">The demo user can explore every screen. No credentials needed.</p>
    </section>
  )
}