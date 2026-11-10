import { useLiveQuery } from 'dexie-react-hooks'
import type { ReactNode } from 'react'
import { db } from '../../db/db'
import { StatusPill } from './EquipmentList'

interface EquipmentDetailProps {
  equipmentId: string
  onBack: () => void
  onEdit: () => void
}

function formatDate(epochMs: number): string {
  return new Date(epochMs).toLocaleString()
}

export function EquipmentDetail({ equipmentId, onBack, onEdit }: EquipmentDetailProps) {
  const equipment = useLiveQuery(async () => (await db.equipment.get(equipmentId)) ?? null, [equipmentId])

  if (equipment === undefined) return <p className="muted">Loading equipment…</p>

  if (equipment === null || equipment.deleted_at !== null) {
    return (
      <section className="equipment-page">
        <p className="empty-state">This equipment no longer exists.</p>
        <button className="button button-quiet" type="button" onClick={onBack}>
          Back to list
        </button>
      </section>
    )
  }

  return (
    <section className="equipment-page">
      <div className="page-heading">
        <div>
          <button className="link-button back-link" type="button" onClick={onBack}>
            ← Equipment
          </button>
          <h2 className="page-title">{equipment.name}</h2>
          <p className="page-sub mono">{equipment.code}</p>
        </div>
        <button className="button button-secondary" type="button" onClick={onEdit}>
          Edit
        </button>
      </div>

      <div className="detail-grid">
        <DetailItem label="Status">
          <StatusPill status={equipment.status} />
        </DetailItem>
        <DetailItem label="Line">{equipment.line || '—'}</DetailItem>
        <DetailItem label="Category">{equipment.category || '—'}</DetailItem>
        <DetailItem label="Last updated">{formatDate(equipment.updated_at)}</DetailItem>
      </div>

      <div className="placeholder-panel">
        <h3>PM history</h3>
        <p>Preventive maintenance history for this equipment arrives in a later phase.</p>
      </div>

      <div className="placeholder-panel">
        <h3>Daily reports</h3>
        <p>Daily reports linked to this equipment arrive in a later phase.</p>
      </div>

      <p className="meta-line">
        Added {formatDate(equipment.created_at)} · created by {equipment.created_by || 'unknown'} ·
        version {equipment.version}
      </p>
    </section>
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