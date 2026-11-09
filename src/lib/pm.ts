// Phase 4. Day-granularity PM status in the user's LOCAL calendar.
export type Frequency = 'daily' | 'weekly' | 'monthly'
export type PmStatus = 'done' | 'due' | 'overdue'

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

function addMonthsClamped(d: Date, n: number): Date {
  const first = new Date(d.getFullYear(), d.getMonth() + n, 1)
  const lastDay = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  first.setDate(Math.min(d.getDate(), lastDay)) // Jan 31 + 1 month -> Feb 28/29
  return first
}

export function nextDue(base: Date, freq: Frequency): Date {
  const b = startOfDay(base)
  if (freq === 'daily') b.setDate(b.getDate() + 1)
  else if (freq === 'weekly') b.setDate(b.getDate() + 7)
  else return addMonthsClamped(b, 1)
  return b
}

/**
 * Never executed -> due from the day the schedule was created.
 * Otherwise due on lastDone + one interval; after that day it is overdue.
 */
export function pmStatus(now: Date, lastDone: Date | null, createdAt: Date, freq: Frequency): PmStatus {
  const dueDay = lastDone ? nextDue(lastDone, freq) : startOfDay(createdAt)
  const today = startOfDay(now).getTime()
  if (today < dueDay.getTime()) return 'done'
  if (today === dueDay.getTime()) return 'due'
  return 'overdue'
}
