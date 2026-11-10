import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { db } from '../db/db'
import { createRecord, listActive } from '../db/repo'
import type { Profile } from '../db/types'
import { SessionContext, type SessionValue } from './sessionContext'
import {
  DEMO_PROFILE_NAME,
  authenticateProfile,
  clearSessionProfileId,
  createProfileData,
  findDemoProfile,
  isFirstRun,
  randomDemoPin,
  readSessionProfileId,
  validateProfileDraft,
  writeSessionProfileId,
  type ProfileDraft,
} from './sessionCore'

export function SessionProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function restore() {
      const id = readSessionProfileId()
      if (id) {
        const stored = await db.profiles.get(id)
        if (!cancelled && stored && stored.deleted_at === null) {
          setProfile(stored)
        } else {
          clearSessionProfileId()
        }
      }
      if (!cancelled) setReady(true)
    }
    void restore()
    return () => {
      cancelled = true
    }
  }, [])

  const startSession = useCallback((next: Profile) => {
    writeSessionProfileId(next.id)
    setProfile(next)
    return next
  }, [])

  const login = useCallback(
    async (profileId: string, pin: string): Promise<boolean> => {
      const candidate = await db.profiles.get(profileId)
      if (!candidate || candidate.deleted_at !== null) return false
      const ok = await authenticateProfile(candidate, pin)
      if (!ok) return false
      startSession(candidate)
      return true
    },
    [startSession],
  )

  const createFirstAdmin = useCallback(
    async (draft: ProfileDraft): Promise<Profile> => {
      const errors = validateProfileDraft(draft)
      if (Object.keys(errors).length > 0) throw new Error('Invalid profile details')
      if (!isFirstRun(await listActive(db.profiles))) {
        throw new Error('An admin profile already exists')
      }
      const data = await createProfileData(draft.name, 'admin', draft.pin)
      const created = await createRecord(db.profiles, data, 'first-run')
      return startSession(created)
    },
    [startSession],
  )

  const loginAsDemo = useCallback(async (): Promise<Profile> => {
    const live = await listActive(db.profiles)
    const existing = findDemoProfile(live)
    if (existing) return startSession(existing)
    const data = await createProfileData(DEMO_PROFILE_NAME, 'admin', randomDemoPin())
    const created = await createRecord(db.profiles, data, 'demo')
    return startSession(created)
  }, [startSession])

  const logout = useCallback(() => {
    clearSessionProfileId()
    setProfile(null)
  }, [])

  const value = useMemo<SessionValue>(
    () => ({ profile, ready, login, createFirstAdmin, loginAsDemo, logout }),
    [profile, ready, login, createFirstAdmin, loginAsDemo, logout],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}