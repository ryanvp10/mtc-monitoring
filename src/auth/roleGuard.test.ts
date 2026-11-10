import { describe, expect, it } from 'vitest'
import { ForbiddenError, assertCanDeleteEquipment, canDeleteEquipment } from './roleGuard'

describe('role guard', () => {
  it('only admins may delete', () => {
    expect(canDeleteEquipment('admin')).toBe(true)
    expect(canDeleteEquipment('technician')).toBe(false)
    expect(canDeleteEquipment(null)).toBe(false)
    expect(canDeleteEquipment(undefined)).toBe(false)
  })

  it('throws for a technician instead of failing silently', () => {
    expect(() => assertCanDeleteEquipment('admin')).not.toThrow()
    expect(() => assertCanDeleteEquipment('technician')).toThrow(ForbiddenError)
  })
})