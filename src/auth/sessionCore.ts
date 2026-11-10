import type { Payload, Profile, Role } from '../db/types'
import { hashPin, isValidPin, newSalt, verifyPin } from '../lib/pin'

/**
 * PIN login is a convenience gate for shared shop-floor PCs, not real security:
 * the data lives in the browser anyway. Never store the PIN or its hash in
 * sessionStorage — only the signed-in profile id, so a reload keeps the session.
 */
export const SESSION_STORAGE_KEY = 'mtc-monitoring.session.profileId'

export const DEMO_PROFILE_NAME = 'Demo User'

export interface ProfileDraft {
  name: string
  pin: string
  confirmPin: string
}

export type ProfileField = 'name' | 'pin' | 'confirmPin'
export type ProfileFieldErrors = Partial<Record<ProfileField, string>>

export function validateProfileDraft(draft: ProfileDraft): ProfileFieldErrors {
  const errors: ProfileFieldErrors = {}
  if (!draft.name.trim()) errors.name = 'Name is required'
  if (!isValidPin(draft.pin)) errors.pin = 'PIN must be exactly 4 digits'
  if (draft.confirmPin !== draft.pin) errors.confirmPin = 'PINs do not match'
  return errors
}

/** First run means there is no live profile at all (tombstones do not count). */
export function isFirstRun(profiles: Pick<Profile, 'deleted_at'>[]): boolean {
  return profiles.every((p) => p.deleted_at !== null)
}

export function buildProfilePayload(
  name: string,
  role: Role,
  pinSalt: string,
  pinHash: string,
): Payload<Profile> {
  return {
    name: name.trim(),
    role,
    pin_salt: pinSalt,
    pin_hash: pinHash,
  }
}

/** Salt + hash first, then build the payload that goes into `createRecord`. */
export async function createProfileData(
  name: string,
  role: Role,
  pin: string,
): Promise<Payload<Profile>> {
  const salt = newSalt()
  const hash = await hashPin(pin, salt)
  return buildProfilePayload(name, role, salt, hash)
}

export function authenticateProfile(profile: Profile, pin: string): Promise<boolean> {
  if (profile.deleted_at !== null) return Promise.resolve(false)
  return verifyPin(pin, profile.pin_salt, profile.pin_hash)
}

export function findDemoProfile(profiles: Profile[]): Profile | undefined {
  return profiles.find((p) => p.deleted_at === null && p.name === DEMO_PROFILE_NAME)
}

/** Payload for the one-click demo account. The PIN is random and never shown. */
export function randomDemoPin(): string {
  return String(crypto.getRandomValues(new Uint16Array(1))[0] % 10000).padStart(4, '0')
}

export function readSessionProfileId(storage: Storage = sessionStorage): string | null {
  try {
    return storage.getItem(SESSION_STORAGE_KEY)
  } catch {
    return null
  }
}

export function writeSessionProfileId(id: string, storage: Storage = sessionStorage): void {
  try {
    storage.setItem(SESSION_STORAGE_KEY, id)
  } catch {
    // storage blocked (private mode): the session simply will not survive reloads
  }
}

export function clearSessionProfileId(storage: Storage = sessionStorage): void {
  try {
    storage.removeItem(SESSION_STORAGE_KEY)
  } catch {
    // ignore
  }
}
