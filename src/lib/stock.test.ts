import { describe, expect, it } from 'vitest'
import { isLowStock, stockOf, validateMovement } from './stock'

const mv = (type: 'in' | 'out', qty: number, deleted_at: number | null = null) => ({ type, qty, deleted_at })

describe('stock', () => {
  it('sums in and out, ignoring tombstoned movements', () => {
    expect(stockOf([mv('in', 10), mv('out', 3), mv('out', 5, 123)])).toBe(7)
  })
  it('low stock only when strictly below minimum', () => {
    expect(isLowStock(4, 5)).toBe(true)
    expect(isLowStock(5, 5)).toBe(false)
  })
  it('validates movements', () => {
    expect(validateMovement(5, 'out', 6)).toBe('insufficient_stock')
    expect(validateMovement(5, 'out', 5)).toBeNull()
    expect(validateMovement(0, 'in', 1)).toBeNull()
    expect(validateMovement(5, 'in', 0)).toBe('invalid_qty')
    expect(validateMovement(5, 'in', 1.5)).toBe('invalid_qty')
  })
})
