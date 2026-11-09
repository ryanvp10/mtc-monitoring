import { describe, expect, it } from 'vitest'
import { hashPin, isValidPin, newSalt, verifyPin } from './pin'

describe('pin', () => {
  it('validates 4 digits only', () => {
    expect(isValidPin('1234')).toBe(true)
    expect(isValidPin('123')).toBe(false)
    expect(isValidPin('12345')).toBe(false)
    expect(isValidPin('12a4')).toBe(false)
  })

  it('verifies the right pin and rejects the wrong one', async () => {
    const salt = newSalt()
    const hash = await hashPin('1234', salt)
    expect(await verifyPin('1234', salt, hash)).toBe(true)
    expect(await verifyPin('4321', salt, hash)).toBe(false)
  })

  it('same pin with different salt gives different hash', async () => {
    expect(await hashPin('1234', newSalt())).not.toBe(await hashPin('1234', newSalt()))
  })
})
