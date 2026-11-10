import Dexie, { type Table } from 'dexie'
import type { Equipment, Profile } from './types'

export class MtcDb extends Dexie {
  profiles!: Table<Profile, string>
  equipment!: Table<Equipment, string>
  sync_state!: Table<{ key: string; value: string }, string>

  constructor(name = 'mtc-monitoring') {
    super(name)
    // Only indexed fields are listed; other fields are stored anyway.
    this.version(1).stores({
      profiles: 'id, name, updated_at, deleted_at',
      equipment: 'id, code, line, category, status, updated_at, deleted_at',
      sync_state: 'key',
    })
  }
}

export const db = new MtcDb()
