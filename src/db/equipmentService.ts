import { assertCanDeleteEquipment } from '../auth/roleGuard'
import { db } from './db'
import { softDelete } from './repo'
import type { Profile } from './types'

export interface EquipmentActor {
  id: string
  role: Profile['role']
}

/**
 * Deleting equipment is admin-only. The check lives here, in the data layer,
 * so hiding the button in the UI is not the only protection.
 */
export async function deleteEquipment(actor: EquipmentActor | null, equipmentId: string): Promise<void> {
  if (!actor) throw new Error('Sign in to delete equipment')
  assertCanDeleteEquipment(actor.role)
  await softDelete(db.equipment, equipmentId)
}
