import { describe, expect, it } from 'vitest'
import { shouldResume } from '../../src/shared/resume'

describe('resume rules', () => {
  it('resumes matching tracks by default', () => {
    expect(
      shouldResume({
        currentTrackUrl: '/artist/track',
        savedProgress: {
          trackUrl: '/artist/track',
          position: 0,
          updatedAt: 1777377600000,
        },
        settings: {
          saveProgress: true,
          resumeOnlySameTrack: true,
          forceOldTrack: false,
          autoPlayAfterResume: false,
          debug: false,
        },
      }),
    ).toEqual({ shouldSeek: true, position: 0, shouldPlay: false, reason: 'match' })
  })

  it('fails closed for different tracks when same-track mode is enabled', () => {
    expect(
      shouldResume({
        currentTrackUrl: '/artist/new-track',
        savedProgress: {
          trackUrl: '/artist/old-track',
          position: 120,
          updatedAt: 1777377600000,
        },
        settings: {
          saveProgress: true,
          resumeOnlySameTrack: true,
          forceOldTrack: false,
          autoPlayAfterResume: true,
          debug: false,
        },
      }),
    ).toEqual({ shouldSeek: false, reason: 'track-mismatch' })
  })

  it('does not navigate or force old track when forceOldTrack is enabled', () => {
    expect(
      shouldResume({
        currentTrackUrl: '/artist/new-track',
        savedProgress: {
          trackUrl: '/artist/old-track',
          position: 120,
          updatedAt: 1777377600000,
        },
        settings: {
          saveProgress: true,
          resumeOnlySameTrack: false,
          forceOldTrack: true,
          autoPlayAfterResume: true,
          debug: false,
        },
      }),
    ).toEqual({ shouldSeek: true, position: 120, shouldPlay: true, reason: 'same-track-disabled' })
  })
})
