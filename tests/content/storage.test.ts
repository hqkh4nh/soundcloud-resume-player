import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultSettings } from '../../src/shared/settings'

describe('content storage', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('returns default settings without touching storage when context is invalidated', async () => {
    const syncGet = vi.fn().mockResolvedValue({})
    vi.stubGlobal('chrome', {
      runtime: { id: undefined },
      storage: { sync: { get: syncGet }, local: { get: vi.fn(), set: vi.fn() } },
    })

    const { loadSettings } = await import('../../src/content/storage')
    const settings = await loadSettings()

    expect(settings).toEqual(defaultSettings)
    expect(syncGet).not.toHaveBeenCalled()
  })

  it('returns null progress without touching storage when context is invalidated', async () => {
    const localGet = vi.fn().mockResolvedValue({})
    vi.stubGlobal('chrome', {
      runtime: { id: undefined },
      storage: { sync: { get: vi.fn() }, local: { get: localGet, set: vi.fn() } },
    })

    const { loadProgress } = await import('../../src/content/storage')
    const progress = await loadProgress()

    expect(progress).toBeNull()
    expect(localGet).not.toHaveBeenCalled()
  })

  it('drops the saveProgress write when context is invalidated', async () => {
    const localSet = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('chrome', {
      runtime: { id: undefined },
      storage: { sync: { get: vi.fn() }, local: { get: vi.fn(), set: localSet } },
    })

    const { saveProgress } = await import('../../src/content/storage')
    await saveProgress({ trackUrl: '/a/b', position: 12, updatedAt: 1 })

    expect(localSet).not.toHaveBeenCalled()
  })

  it('falls back to default settings when chrome.storage rejects mid-flight', async () => {
    vi.stubGlobal('chrome', {
      runtime: { id: 'test-extension-id' },
      storage: {
        sync: { get: vi.fn().mockRejectedValue(new Error('Extension context invalidated.')) },
        local: { get: vi.fn(), set: vi.fn() },
      },
    })

    const { loadSettings } = await import('../../src/content/storage')
    const settings = await loadSettings()

    expect(settings).toEqual(defaultSettings)
  })

  it('reads merged settings when context is valid', async () => {
    vi.stubGlobal('chrome', {
      runtime: { id: 'test-extension-id' },
      storage: {
        sync: { get: vi.fn().mockResolvedValue({ settings: { saveProgress: false } }) },
        local: { get: vi.fn(), set: vi.fn() },
      },
    })

    const { loadSettings } = await import('../../src/content/storage')
    const settings = await loadSettings()

    expect(settings.saveProgress).toBe(false)
    expect(settings.resumeOnlySameTrack).toBe(true)
  })
})
