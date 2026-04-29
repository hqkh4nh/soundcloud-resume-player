import { describe, expect, it, vi } from 'vitest'
import { createPopupStateLoader } from '../../src/popup/popupStorage'

describe('popup storage', () => {
  it('loads merged settings and valid progress', async () => {
    const getSync = vi.fn().mockResolvedValue({
      settings: { saveProgress: false },
    })
    const getLocal = vi.fn().mockResolvedValue({
      latestProgress: {
        trackUrl: '/artist/track',
        position: 45,
        updatedAt: 1777377600000,
      },
    })

    const load = createPopupStateLoader({ getSync, getLocal })
    const state = await load()

    expect(state.settings.saveProgress).toBe(false)
    expect(state.settings.resumeOnlySameTrack).toBe(true)
    expect(state.progress?.trackUrl).toBe('/artist/track')
  })
})
