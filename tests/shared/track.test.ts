import { describe, expect, it } from 'vitest'
import { currentTrackSelector, normalizeSoundCloudTrackUrl } from '../../src/shared/track'

describe('track identity', () => {
  it('normalizes SoundCloud href values to paths', () => {
    expect(normalizeSoundCloudTrackUrl('/longgphung3/tra-dao-cam-sa-11-longgphung-132bpm')).toBe(
      '/longgphung3/tra-dao-cam-sa-11-longgphung-132bpm',
    )
    expect(
      normalizeSoundCloudTrackUrl(
        'https://soundcloud.com/longgphung3/tra-dao-cam-sa-11-longgphung-132bpm?in=user/set#x',
      ),
    ).toBe('/longgphung3/tra-dao-cam-sa-11-longgphung-132bpm')
  })

  it('rejects non-track-like values', () => {
    expect(normalizeSoundCloudTrackUrl('')).toBeNull()
    expect(normalizeSoundCloudTrackUrl('/')).toBeNull()
    expect(normalizeSoundCloudTrackUrl('/discover')).toBeNull()
    expect(normalizeSoundCloudTrackUrl('https://example.com/artist/track')).toBeNull()
    expect(currentTrackSelector).toBe('a.playbackSoundBadge__titleLink[href]')
  })
})
