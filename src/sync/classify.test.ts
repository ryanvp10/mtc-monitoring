import { describe, expect, it } from 'vitest'
import { classify } from './classify'

const v = (version: number, deleted_at: number | null = null) => ({ version, deleted_at })

describe('classify', () => {
  it('new on one side only', () => {
    expect(classify(v(1), undefined, undefined)).toBe('push')
    expect(classify(undefined, v(1), undefined)).toBe('pull')
    expect(classify(undefined, undefined, undefined)).toBe('noop')
  })
  it('unchanged since last sync', () => {
    expect(classify(v(3), v(3), 3)).toBe('noop')
  })
  it('only local changed -> push', () => {
    expect(classify(v(4), v(3), 3)).toBe('push')
  })
  it('only remote changed -> pull', () => {
    expect(classify(v(3), v(5), 3)).toBe('pull')
  })
  it('both changed -> conflict', () => {
    expect(classify(v(4), v(5), 3)).toBe('conflict')
  })
  it('both changed to identical content -> noop', () => {
    expect(classify(v(4), v(4), 3, true)).toBe('noop')
  })
  it('edit vs delete is a conflict', () => {
    expect(classify(v(4), v(4, 999), 3)).toBe('conflict')
  })
  it('delete on one side only propagates', () => {
    expect(classify(v(4, 999), v(3), 3)).toBe('push')
    expect(classify(v(3), v(4, 999), 3)).toBe('pull')
  })
  it('both exist but never synced -> conflict unless identical', () => {
    expect(classify(v(1), v(1), undefined)).toBe('conflict')
    expect(classify(v(1), v(1), undefined, true)).toBe('noop')
  })
})
