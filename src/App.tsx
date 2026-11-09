import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db/db'
import { createRecord, listActive } from './db/repo'
import './App.css'

export default function App() {
  const equipment = useLiveQuery(() => listActive(db.equipment), [])

  async function addDummy() {
    await createRecord(
      db.equipment,
      { code: `EQ-${Date.now() % 10000}`, name: 'Demo machine', line: 'Line A', category: 'Press', status: 'running' },
      'phase-0',
    )
  }

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui' }}>
      <h1>mtc-01</h1>
      <p>Phase 0: offline-first skeleton. Add a record, go offline, reload: data stays.</p>
      <button onClick={addDummy}>Add demo equipment</button>
      <ul>
        {equipment?.map((e) => (
          <li key={e.id}>
            {e.code} · {e.name} · {e.status}
          </li>
        ))}
      </ul>
    </main>
  )
}
