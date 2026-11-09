/** Metadata every synced record carries (see ADR-002). */
export interface SyncMeta {
  id: string // stable UUID, generated on the client
  created_by: string // profile id or name that created it
  device_id: string // device that last wrote it
  created_at: number // epoch ms
  updated_at: number // epoch ms (display only; do NOT use for conflict logic)
  deleted_at: number | null // tombstone: never hard-delete synced records
  version: number // +1 on every local change; drives conflict detection
}

export type Role = 'admin' | 'technician'

export interface Profile extends SyncMeta {
  name: string
  role: Role
  pin_salt: string
  pin_hash: string
}

export type EquipmentStatus = 'running' | 'standby' | 'breakdown'

export interface Equipment extends SyncMeta {
  code: string
  name: string
  line: string
  category: string
  status: EquipmentStatus
}

/** User-editable fields only (everything except sync metadata). */
export type Payload<T extends SyncMeta> = Omit<T, keyof SyncMeta>

// ---- Phase 2 ----
/** Append-only stock ledger entry. Stock is derived from movements (see ADR-004). */
export interface StockMovement extends SyncMeta {
  part_id: string
  type: 'in' | 'out'
  qty: number
  note: string
  machine_id: string | null
}
