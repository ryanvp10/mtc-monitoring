import type { ReactNode } from 'react'
import type { Role } from '../db/types'
import { useSession } from './sessionContext'

/** UI-level guard. The matching data-layer guard lives in auth/roleGuard.ts. */
export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { profile } = useSession()
  if (!profile || profile.role !== role) return null
  return <>{children}</>
}