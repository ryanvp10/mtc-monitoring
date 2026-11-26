import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { SessionProvider } from './auth/session'
import { useSession } from './auth/sessionContext'
import { AuthGate } from './auth/AuthGate'
import { countLowStock } from './db/partQueries'
import { EquipmentPage } from './features/equipment/EquipmentPage'
import { PartsPage } from './features/inventory/PartsPage'
import './App.css'

type Tab = 'equipment' | 'parts' | 'low'

export default function App() {
  return (
    <SessionProvider>
      <AppShell />
    </SessionProvider>
  )
}

function AppShell() {
  const { profile, logout } = useSession()
  const [tab, setTab] = useState<Tab>('equipment')
  const lowStock = useLiveQuery(() => countLowStock(), [])

  if (!profile) return <AuthGate />

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand brand-compact">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-name">mtc-monitoring</span>
        </div>
        <nav className="app-nav" aria-label="Modules">
          <button
            className={`nav-tab ${tab === 'equipment' ? 'is-active' : ''}`}
            type="button"
            aria-current={tab === 'equipment' ? 'page' : undefined}
            onClick={() => setTab('equipment')}
          >
            Equipment
          </button>
          <button
            className={`nav-tab ${tab === 'parts' ? 'is-active' : ''}`}
            type="button"
            aria-current={tab === 'parts' ? 'page' : undefined}
            onClick={() => setTab('parts')}
          >
            Spare parts
          </button>
          <button
            className={`nav-tab ${tab === 'low' ? 'is-active' : ''}`}
            type="button"
            aria-current={tab === 'low' ? 'page' : undefined}
            onClick={() => setTab('low')}
          >
            Low stock
            {Boolean(lowStock) && (
              <span className="nav-badge" aria-label={`${lowStock} parts below minimum stock`}>
                {lowStock}
              </span>
            )}
          </button>
        </nav>
        <div className="session-info">
          <span className="session-name">{profile.name}</span>
          <span className={`role-badge role-${profile.role}`}>{profile.role}</span>
          <button className="button button-quiet" type="button" onClick={logout}>
            Sign out
          </button>
        </div>
      </header>
      <main className="app-main">
        {tab === 'equipment' && <EquipmentPage />}
        {tab === 'parts' && <PartsPage key="parts" />}
        {tab === 'low' && <PartsPage key="low" startAtLowStock />}
      </main>
      <footer className="app-footer">Offline-first CMMS · data stays on this device</footer>
    </div>
  )
}
