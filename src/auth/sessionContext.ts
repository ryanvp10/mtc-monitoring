import { createContext, useContext } from 'react'
import type { Profile } from '../db/types'
import type { ProfileDraft } from './sessionCore'

export interface SessionValue {
  profile: Profile | null
  /** False until the session has been restored from sessionStorage. */
  ready: boolean
  /** Returns false for an unknown profile or a wrong PIN. */
  login(profileId: string, pin: string): Promise<boolean>
  createFirstAdmin(draft: ProfileDraft): Promise<Profile>
  loginAsDemo(): Promise<Profile>
  logout(): void
}

export const SessionContext = createContext<SessionValue | null>(null)

export function useSession(): SessionValue {
  const value = useContext(SessionContext)
  if (!value) throw new Error('useSession must be used inside <SessionProvider>')
  return value
}