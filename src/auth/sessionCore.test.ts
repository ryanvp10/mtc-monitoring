import { beforeEach, describe, expect, it } from 'vitest'
import type { Profile } from '../db/types'
import {
  DEMO_PROFILE_NAME,
  SESSION_STORAGE_KEY,
  authenticateProfile,
  createProfileData,
  findDemoProfile,
  isFirstRun,
  randomDemoPin,
  readSessionProfileId,
  validateProfileDraft,
  writeSessionProfileId,
  clearSessionProfileId,
} from './sessionCore'

function asProfile(data: Awaited<ReturnType<typeof createProfileData>>): Profile {
  const now = Date.now()
  return {
    ...data,
    id: crypto.randomUUID(),
    created_by: 'test',
    device_id: 'test-device',
    created_at: now,
    updated_at: now,
    deleted_at: null,
    version: 1,
  }
}

beforeEach(() => {
  sessionStorage.clear()
})

describe('first run detection', () => {
  it('is true with no profiles and with only tombstones', () => {
    expect(isFirstRun([])).toBe(true)
    expect(isFirstRun([{ deleted_at: 123 }])).toBe(true)
    expect(isFirstRun([{ deleted_at: null }])).toBe(false)
  })
})

describe('profile draft validation', () => {
  it('rejects a bad PIN and a mismatched confirmation', () => {
    const errors = validateProfileDraft({ name: 'Alva', pin: '123', confirmPin: '123' })
    expect(errors.pin).toBe('PIN must be exactly 4 digits')

    const mismatch = validateProfileDraft({ name: 'Alva', pin: '1234', confirmPin: '4321' })
    expect(mismatch.confirmPin).toBe('PINs do not match')
  })

  it('rejects a blank name and accepts a complete draft', () => {
    expect(validateProfileDraft({ name: ' ', pin: '1234', confirmPin: '1234' }).name).toBe(
      'Name is required',
    )
    expect(validateProfileDraft({ name: 'Alva', pin: '1234', confirmPin: '1234' })).toEqual({})
  })
})

describe('PIN login', () => {
  it('accepts the correct PIN and rejects a wrong one', async () => {
    const profile = asProfile(await createProfileData('Alva', 'admin', '2468'))
    expect(await authenticateProfile(profile, '2468')).toBe(true)
    expect(await authenticateProfile(profile, '1357')).toBe(false)
  })

  it('ignores tombstones and never authenticates a deleted profile', async () => {
    const profile = { ...asProfile(await createProfileData('Gone', 'technician', '1111')), deleted_at: 99 }
    expect(await authenticateProfile(profile, '1111')).toBe(false)
  })
})

describe('session storage', () => {
  it('stores only the profile id', () => {
    writeSessionProfileId('profile-123')
    expect(sessionStorage.length).toBe(1)
    expect(sessionStorage.key(0)).toBe(SESSION_STORAGE_KEY)
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBe('profile-123')
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).not.toMatch(/[0-9a-f]{16,}/)
    expect(readSessionProfileId()).toBe('profile-123')
  })

  it('clears the id on logout', () => {
    writeSessionProfileId('profile-123')
    clearSessionProfileId()
    expect(readSessionProfileId()).toBeNull()
    expect(sessionStorage.length).toBe(0)
  })
})

describe('demo profile', () => {
  it('reuses an existing live demo profile', async () => {
    const demo = asProfile(await createProfileData(DEMO_PROFILE_NAME, 'admin', randomDemoPin()))
    expect(findDemoProfile([demo])?.id).toBe(demo.id)
    expect(findDemoProfile([{ ...demo, deleted_at: 1 }])).toBeUndefined()
  })

  it('builds a random 4-digit demo PIN', () => {
    expect(randomDemoPin()).toMatch(/^\d{4}$/)
  })
})