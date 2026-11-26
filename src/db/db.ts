import Dexie, { type Table } from 'dexie'
import type { Equipment, Profile, SparePart, StockMovement } from './types'

export class MtcDb extends Dexie {
  profiles!: Table<Profile, string>
  equipment!: Table<Equipment, string>
  sync_state!: Table<{ key: string; value: string }, string>
  parts!: Table<SparePart, string>
  stock_movements!: Table<StockMovement, string>

  constructor(name = 'mtc-monitoring') {
    super(name)
    // Only indexed fields are listed; other fields are stored anyway.
    // Never edit a released version: add a new one (ADR-002).
    this.version(1).stores({
      profiles: 'id, name, updated_at, deleted_at',
      equipment: 'id, code, line, category, status, updated_at, deleted_at',
      sync_state: 'key',
    })
    // Phase 2 — inventory. Stock itself is not stored; movements are the ledger.
    this.version(2).stores({
      parts: 'id, code, category, updated_at, deleted_at',
      stock_movements: 'id, part_id, type, created_at, updated_at, deleted_at',
    })
  }
}

export const db = new MtcDb()
