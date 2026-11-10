import type { Role } from '../db/types'

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ForbiddenError'
  }
}

/** The single source of truth for destructive equipment actions. */
export function canDeleteEquipment(role: Role | null | undefined): boolean {
  return role === 'admin'
}

/** Throws instead of silently doing nothing: callers cannot bypass the check by UI accident. */
export function assertCanDeleteEquipment(role: Role | null | undefined): void {
  if (!canDeleteEquipment(role)) {
    throw new ForbiddenError('Only an admin can delete equipment')
  }
}
