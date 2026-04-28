import { describe, expect, it } from 'vitest'
import { defaultSettings, mergeSettings } from '../../src/shared/settings'

describe('settings', () => {
  it('uses safe defaults', () => {
    expect(defaultSettings).toEqual({
      saveProgress: true,
      resumeOnlySameTrack: true,
      forceOldTrack: false,
      autoPlayAfterResume: false,
      debug: false,
    })
  })

  it('merges only boolean settings', () => {
    expect(
      mergeSettings({
        saveProgress: false,
        resumeOnlySameTrack: 'no',
        forceOldTrack: true,
        autoPlayAfterResume: true,
        debug: 1,
      }),
    ).toEqual({
      saveProgress: false,
      resumeOnlySameTrack: true,
      forceOldTrack: true,
      autoPlayAfterResume: true,
      debug: false,
    })
  })
})
