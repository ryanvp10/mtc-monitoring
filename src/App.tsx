import { SessionProvider } from './auth/session'
import { useSession } from './auth/sessionContext'
import { AuthGate } from './auth/AuthGate'
import { EquipmentPage } from './features/equipment/EquipmentPage'
import './App.css'

export default function App() {
  return (
    <SessionProvider>
      <AppShell />
    </SessionProvider>
  )
}

function AppShell() {
  const { profile, logout } = useSession()

  if (!profile) return <AuthGate />

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand brand-compact">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-name">mtc-monitoring</span>
        </div>
        <div className="session-info">
          <span className="session-name">{profile.name}</span>
          <span className={`role-badge role-${profile.role}`}>{profile.role}</span>
          <button className="button button-quiet" type="button" onClick={logout}>
            Sign out
          </button>
        </div>
      </header>
      <main className="app-main">
        <EquipmentPage />
      </main>
      <footer className="app-footer">Offline-first CMMS · data stays on this device</footer>
    </div>
  )
}