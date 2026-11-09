import { describe, expect, it } from 'vitest'
import { nextDue, pmStatus } from './pm'

const d = (s: string) => new Date(s + 'T10:00:00')

describe('pmStatus daily', () => {
  const created = d('2026-01-01')
  it('done when executed today', () => expect(pmStatus(d('2026-03-10'), d('2026-03-10'), created, 'daily')).toBe('done'))
  it('due when last done yesterday', () => expect(pmStatus(d('2026-03-10'), d('2026-03-09'), created, 'daily')).toBe('due'))
  it('overdue after skipping a day', () => expect(pmStatus(d('2026-03-10'), d('2026-03-08'), created, 'daily')).toBe('overdue'))
})

describe('pmStatus weekly/monthly', () => {
  const created = d('2026-01-01')
  it('weekly: done within the week, due on day 7, overdue after', () => {
    expect(pmStatus(d('2026-03-12'), d('2026-03-10'), created, 'weekly')).toBe('done')
    expect(pmStatus(d('2026-03-17'), d('2026-03-10'), created, 'weekly')).toBe('due')
    expect(pmStatus(d('2026-03-18'), d('2026-03-10'), created, 'weekly')).toBe('overdue')
  })
  it('monthly clamps to end of month', () => {
    expect(nextDue(d('2026-01-31'), 'monthly').getDate()).toBe(28)
    expect(nextDue(d('2028-01-31'), 'monthly').getDate()).toBe(29) // leap year
  })
})

describe('never executed', () => {
  it('is due on the creation day and overdue afterwards', () => {
    expect(pmStatus(d('2026-03-10'), null, d('2026-03-10'), 'weekly')).toBe('due')
    expect(pmStatus(d('2026-03-11'), null, d('2026-03-10'), 'weekly')).toBe('overdue')
  })
})
