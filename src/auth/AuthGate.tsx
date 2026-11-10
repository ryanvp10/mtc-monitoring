import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { listActive } from '../db/repo'
import { FirstAdminScreen } from './FirstAdminScreen'
import { LoginScreen } from './LoginScreen'
import { useSession } from './sessionContext'

export function AuthGate() {
  const { ready } = useSession()
  const profiles = useLiveQuery(() => listActive(db.profiles), [])

  if (!ready || profiles === undefined) {
    return (
      <div className="auth-shell">
        <p className="muted">Loading…</p>
      </div>
    )
  }

  return (
    <div className="auth-shell">
      <div className="auth-panel">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <div>
            <h1 className="brand-name">mtc-monitoring</h1>
            <p className="brand-sub">Offline-first maintenance</p>
          </div>
        </div>
        {profiles.length === 0 ? <FirstAdminScreen /> : <LoginScreen profiles={profiles} />}
      </div>
    </div>
  )
}