import { describe, expect, it } from 'vitest'
import { isSavedProgress, progressStorageKey } from '../../src/shared/progress'

describe('progress', () => {
  it('accepts latest-track progress', () => {
    expect(
      isSavedProgress({
        trackUrl: '/artist/track',
        position: 73.5,
        updatedAt: 1777377600000,
      }),
    ).toBe(true)
  })

  it('rejects invalid progress payloads', () => {
    expect(isSavedProgress({ trackUrl: '', position: 4, updatedAt: 1 })).toBe(false)
    expect(isSavedProgress({ trackUrl: '/artist/track', position: -1, updatedAt: 1 })).toBe(false)
    expect(isSavedProgress({ trackUrl: '/artist/track', position: 1, updatedAt: 0 })).toBe(false)
    expect(progressStorageKey).toBe('latestProgress')
  })
})
