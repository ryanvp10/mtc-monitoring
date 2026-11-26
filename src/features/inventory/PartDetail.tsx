import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type FormEvent, type ReactNode } from 'react'
import { useSession } from '../../auth/sessionContext'
import { db } from '../../db/db'
import { listMovements, recordMovement, MovementError } from '../../db/inventoryService'
import { listActive } from '../../db/repo'
import type { StockMovement } from '../../db/types'
import { StockPill } from './PartList'

interface PartDetailProps {
  partId: string
  onBack: () => void
  onEdit: () => void
}

function formatDate(epochMs: number): string {
  return new Date(epochMs).toLocaleString()
}

export function PartDetail({ partId, onBack, onEdit }: PartDetailProps) {
  const part = useLiveQuery(async () => (await db.parts.get(partId)) ?? null, [partId])
  const movements = useLiveQuery(() => listMovements(partId), [partId])
  const equipment = useLiveQuery(() => listActive(db.equipment), [])

  if (part === undefined) return <p className="muted">Loading spare part…</p>

  if (part === null || part.deleted_at !== null) {
    return (
      <section className="equipment-page">
        <p className="empty-state">This spare part no longer exists.</p>
        <button className="button button-quiet" type="button" onClick={onBack}>
          Back to list
        </button>
      </section>
    )
  }

  const stock = (movements ?? []).reduce(
    (sum, movement) => sum + (movement.type === 'in' ? movement.qty : -movement.qty),
    0,
  )
  const machineNames = new Map((equipment ?? []).map((item) => [item.id, `${item.code} · ${item.name}`]))

  return (
    <section className="equipment-page">
      <div className="page-heading">
        <div>
          <button className="link-button back-link" type="button" onClick={onBack}>
            ← Spare parts
          </button>
          <h2 className="page-title">{part.name}</h2>
          <p className="page-sub mono">{part.code}</p>
        </div>
        <button className="button button-secondary" type="button" onClick={onEdit}>
          Edit
        </button>
      </div>

      <div className="detail-grid">
        <DetailItem label="Stock on hand">
          <StockPill stock={stock} min={part.min_stock} />
          {part.unit && <span className="unit-note"> {part.unit}</span>}
        </DetailItem>
        <DetailItem label="Minimum stock">{part.min_stock}</DetailItem>
        <DetailItem label="Category">{part.category || '—'}</DetailItem>
        <DetailItem label="Unit">{part.unit || '—'}</DetailItem>
      </div>

      <MovementForm
        partId={part.id}
        unit={part.unit}
        stock={stock}
        equipmentOptions={equipment ?? []}
      />

      <div className="data-table-wrap">
        <table className="data-table movements-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Type</th>
              <th>Qty</th>
              <th>Note</th>
              <th>Machine</th>
            </tr>
          </thead>
          <tbody>
            {(movements ?? []).length === 0 ? (
              <tr>
                <td colSpan={5} data-label="Movements">
                  <span className="muted">No movements yet. Record a stock in to start the ledger.</span>
                </td>
              </tr>
            ) : (
              (movements ?? []).map((movement) => (
                <tr key={movement.id}>
                  <td data-label="When">{formatDate(movement.created_at)}</td>
                  <td data-label="Type">
                    <span className={`movement-pill movement-${movement.type}`}>{movement.type}</span>
                  </td>
                  <td data-label="Qty">
                    {movement.type === 'in' ? '+' : '−'}
                    {movement.qty}
                  </td>
                  <td data-label="Note">{movement.note || '—'}</td>
                  <td data-label="Machine">
                    {movement.machine_id ? (machineNames.get(movement.machine_id) ?? '—') : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="meta-line">
        Movements are append-only: a wrong entry is corrected with a new movement, never edited.
        Added {formatDate(part.created_at)} · version {part.version}
      </p>
    </section>
  )
}

interface MovementFormProps {
  partId: string
  unit: string
  stock: number
  equipmentOptions: { id: string; code: string; name: string }[]
}

function MovementForm({ partId, unit, stock, equipmentOptions }: MovementFormProps) {
  const { profile } = useSession()
  const [type, setType] = useState<StockMovement['type']>('in')
  const [qty, setQty] = useState('')
  const [note, setNote] = useState('')
  const [machineId, setMachineId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSaved(false)
    if (!profile) {
      setError('Your session expired. Sign in again.')
      return
    }
    const quantity = Number(qty.trim())
    setSaving(true)
    try {
      await recordMovement(
        { id: profile.id, role: profile.role },
        {
          part_id: partId,
          type,
          qty: quantity,
          note,
          machine_id: machineId || null,
        },
      )
      setQty('')
      setNote('')
      setMachineId('')
      setSaved(true)
    } catch (caught) {
      if (caught instanceof MovementError && caught.code === 'insufficient_stock') {
        setError(`Only ${stock} ${unit || 'unit'} in stock. Take out less, or record a stock in first.`)
      } else if (caught instanceof MovementError) {
        setError('Quantity must be a whole number above zero.')
      } else {
        setError('Could not record the movement. Please try again.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="form movement-form" onSubmit={handleSubmit} noValidate>
      <h3 className="section-title">Record movement</h3>
      <div className="form-row">
        <label className="field">
          <span className="field-label">Type</span>
          <select className="input" value={type} onChange={(e) => setType(e.target.value as StockMovement['type'])}>
            <option value="in">Stock in</option>
            <option value="out">Stock out</option>
          </select>
        </label>
        <label className="field">
          <span className="field-label">Quantity</span>
          <input
            className="input"
            type="text"
            inputMode="numeric"
            value={qty}
            placeholder="0"
            onChange={(e) => setQty(e.target.value)}
          />
        </label>
        <label className="field field-grow">
          <span className="field-label">Note (optional)</span>
          <input
            className="input"
            type="text"
            value={note}
            placeholder="Used on bearing replacement"
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
        <label className="field">
          <span className="field-label">Machine (optional)</span>
          <select className="input" value={machineId} onChange={(e) => setMachineId(e.target.value)}>
            <option value="">No machine</option>
            {equipmentOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.code} · {item.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {saved && !error && <p className="form-ok">Movement recorded.</p>}

      <div className="form-actions">
        <button className="button button-primary" type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Record movement'}
        </button>
      </div>
    </form>
  )
}

function DetailItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="detail-item">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{children}</span>
    </div>
  )
}
