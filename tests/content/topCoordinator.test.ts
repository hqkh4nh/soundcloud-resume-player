import { describe, expect, it, vi } from 'vitest'
import { createTopCoordinator } from '../../src/content/topCoordinator'

describe('top coordinator', () => {
  it('seeks once before saving fresh progress for the same track', async () => {
    const sendSeek = vi.fn().mockResolvedValue(true)
    const saveProgress = vi.fn().mockResolvedValue(undefined)
    const coordinator = createTopCoordinator({
      readCurrentTrackUrl: () => '/artist/track',
      loadSettings: async () => ({
        saveProgress: true,
        resumeOnlySameTrack: true,
        forceOldTrack: false,
        autoPlayAfterResume: false,
        debug: false,
      }),
      loadProgress: async () => ({
        trackUrl: '/artist/track',
        position: 87,
        updatedAt: 1777377600000,
      }),
      saveProgress,
      sendSeek,
      now: vi.fn().mockReturnValueOnce(1777377605000).mockReturnValueOnce(1777377610000),
    })

    await coordinator.onAudioProgress(2)
    await coordinator.onAudioFrameReady()
    await coordinator.onAudioProgress(3)

    expect(sendSeek).toHaveBeenCalledTimes(1)
    expect(sendSeek).toHaveBeenCalledWith(87, false)
    expect(saveProgress).toHaveBeenCalledWith({
      trackUrl: '/artist/track',
      position: 3,
      updatedAt: 1777377605000,
    })
    expect(saveProgress).toHaveBeenCalledTimes(1)
  })

  it('does not save pending progress when resume seek fails', async () => {
    const sendSeek = vi.fn().mockResolvedValue(false)
    const saveProgress = vi.fn().mockResolvedValue(undefined)
    const coordinator = createTopCoordinator({
      readCurrentTrackUrl: () => '/artist/track',
      loadSettings: async () => ({
        saveProgress: true,
        resumeOnlySameTrack: true,
        forceOldTrack: false,
        autoPlayAfterResume: false,
        debug: false,
      }),
      loadProgress: async () => ({
        trackUrl: '/artist/track',
        position: 87,
        updatedAt: 1777377600000,
      }),
      saveProgress,
      sendSeek,
      now: () => 1777377605000,
    })

    await coordinator.onAudioProgress(2)
    await coordinator.onAudioFrameReady()

    expect(sendSeek).toHaveBeenCalledTimes(1)
    expect(sendSeek).toHaveBeenCalledWith(87, false)
    expect(saveProgress).not.toHaveBeenCalled()
  })

  it('shares concurrent resume settlement without duplicate seeks', async () => {
    const sendSeek = vi.fn().mockResolvedValue(true)
    const saveProgress = vi.fn().mockResolvedValue(undefined)
    const coordinator = createTopCoordinator({
      readCurrentTrackUrl: () => '/artist/track',
      loadSettings: async () => ({
        saveProgress: true,
        resumeOnlySameTrack: true,
        forceOldTrack: false,
        autoPlayAfterResume: false,
        debug: false,
      }),
      loadProgress: async () => ({
        trackUrl: '/artist/track',
        position: 87,
        updatedAt: 1777377600000,
      }),
      saveProgress,
      sendSeek,
      now: () => 1777377605000,
    })

    await Promise.all([coordinator.onAudioFrameReady(), coordinator.onAudioProgress(2)])

    expect(sendSeek).toHaveBeenCalledTimes(1)
    expect(sendSeek).toHaveBeenCalledWith(87, false)
    expect(saveProgress).not.toHaveBeenCalled()
  })

  it('does not seek a different track in default mode', async () => {
    const sendSeek = vi.fn().mockResolvedValue(true)
    const coordinator = createTopCoordinator({
      readCurrentTrackUrl: () => '/artist/new-track',
      loadSettings: async () => ({
        saveProgress: true,
        resumeOnlySameTrack: true,
        forceOldTrack: false,
        autoPlayAfterResume: true,
        debug: false,
      }),
      loadProgress: async () => ({
        trackUrl: '/artist/old-track',
        position: 87,
        updatedAt: 1777377600000,
      }),
      saveProgress: async () => undefined,
      sendSeek,
      now: () => 1777377605000,
    })

    await coordinator.onAudioFrameReady()

    expect(sendSeek).not.toHaveBeenCalled()
  })

  it('retries resume when the current track is temporarily unavailable', async () => {
    const readCurrentTrackUrl = vi
      .fn<() => string | null>()
      .mockReturnValueOnce(null)
      .mockReturnValue('/artist/track')
    const sendSeek = vi.fn().mockResolvedValue(true)
    const coordinator = createTopCoordinator({
      readCurrentTrackUrl,
      loadSettings: async () => ({
        saveProgress: true,
        resumeOnlySameTrack: true,
        forceOldTrack: false,
        autoPlayAfterResume: false,
        debug: false,
      }),
      loadProgress: async () => ({
        trackUrl: '/artist/track',
        position: 87,
        updatedAt: 1777377600000,
      }),
      saveProgress: async () => undefined,
      sendSeek,
      now: () => 1777377605000,
    })

    await coordinator.onAudioFrameReady()
    await coordinator.onAudioProgress(2)

    expect(readCurrentTrackUrl).toHaveBeenCalledTimes(2)
    expect(sendSeek).toHaveBeenCalledTimes(1)
    expect(sendSeek).toHaveBeenCalledWith(87, false)
  })

  it('reloads save settings before saving later progress', async () => {
    const sendSeek = vi.fn().mockResolvedValue(true)
    const saveProgress = vi.fn().mockResolvedValue(undefined)
    const loadSettings = vi
      .fn()
      .mockResolvedValueOnce({
        saveProgress: true,
        resumeOnlySameTrack: true,
        forceOldTrack: false,
        autoPlayAfterResume: false,
        debug: false,
      })
      .mockResolvedValue({
        saveProgress: false,
        resumeOnlySameTrack: true,
        forceOldTrack: false,
        autoPlayAfterResume: false,
        debug: false,
      })
    const coordinator = createTopCoordinator({
      readCurrentTrackUrl: () => '/artist/track',
      loadSettings,
      loadProgress: async () => ({
        trackUrl: '/artist/track',
        position: 87,
        updatedAt: 1777377600000,
      }),
      saveProgress,
      sendSeek,
      now: () => 1777377610000,
    })

    await coordinator.onAudioFrameReady()
    await coordinator.onAudioProgress(3)

    expect(sendSeek).toHaveBeenCalledTimes(1)
    expect(loadSettings).toHaveBeenCalledTimes(2)
    expect(saveProgress).not.toHaveBeenCalled()
  })

  it('logs coordinator decisions only when debug is enabled', async () => {
    const logger = vi.fn()
    const coordinator = createTopCoordinator({
      readCurrentTrackUrl: () => '/artist/track',
      loadSettings: async () => ({
        saveProgress: true,
        resumeOnlySameTrack: true,
        forceOldTrack: false,
        autoPlayAfterResume: false,
        debug: true,
      }),
      loadProgress: async () => ({
        trackUrl: '/artist/track',
        position: 87,
        updatedAt: 1777377600000,
      }),
      saveProgress: async () => undefined,
      sendSeek: vi.fn().mockResolvedValue(true),
      now: () => 1777377605000,
      logger,
    })

    await coordinator.onAudioFrameReady()

    expect(logger).toHaveBeenCalledWith('resume-decision', {
      reason: 'match',
      shouldSeek: true,
    })
  })

  it('does not log coordinator decisions when debug is disabled', async () => {
    const logger = vi.fn()
    const coordinator = createTopCoordinator({
      readCurrentTrackUrl: () => '/artist/track',
      loadSettings: async () => ({
        saveProgress: true,
        resumeOnlySameTrack: true,
        forceOldTrack: false,
        autoPlayAfterResume: false,
        debug: false,
      }),
      loadProgress: async () => ({
        trackUrl: '/artist/track',
        position: 87,
        updatedAt: 1777377600000,
      }),
      saveProgress: async () => undefined,
      sendSeek: vi.fn().mockResolvedValue(true),
      now: () => 1777377605000,
      logger,
    })

    await coordinator.onAudioFrameReady()

    expect(logger).not.toHaveBeenCalled()
  })
})
