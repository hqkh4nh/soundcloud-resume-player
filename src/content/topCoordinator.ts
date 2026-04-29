import type { SavedProgress } from '../shared/progress'
import { shouldResume } from '../shared/resume'
import type { ResumeSettings } from '../shared/settings'

type Dependencies = {
  readCurrentTrackUrl: () => string | null
  loadSettings: () => Promise<ResumeSettings>
  loadProgress: () => Promise<SavedProgress | null>
  saveProgress: (progress: SavedProgress) => Promise<void>
  sendSeek: (position: number, playAfterSeek: boolean) => Promise<boolean>
  now: () => number
}

const saveThrottleMs = 5000

export function createTopCoordinator(dependencies: Dependencies) {
  let settingsPromise: Promise<ResumeSettings> | null = null
  let progressPromise: Promise<SavedProgress | null> | null = null
  let resumeSettled = false
  let audioReady = false
  let lastSaveAt = 0
  let pendingPosition: number | null = null

  async function ensureResumeSettled() {
    if (resumeSettled || !audioReady) return

    const [settings, savedProgress] = await Promise.all([getSettings(), getProgress()])
    const currentTrackUrl = dependencies.readCurrentTrackUrl()
    const decision = shouldResume({ currentTrackUrl, savedProgress, settings })

    if (decision.shouldSeek) {
      await dependencies.sendSeek(decision.position, decision.shouldPlay)
    }

    resumeSettled = true

    if (pendingPosition !== null) {
      await saveLatestPosition(pendingPosition, true)
      pendingPosition = null
    }
  }

  async function saveLatestPosition(position: number, force = false) {
    const settings = await getSettings()
    if (!settings.saveProgress) return

    const trackUrl = dependencies.readCurrentTrackUrl()
    if (!trackUrl) return

    const now = dependencies.now()
    if (!force && now - lastSaveAt < saveThrottleMs) return

    lastSaveAt = now
    await dependencies.saveProgress({ trackUrl, position, updatedAt: now })
  }

  function getSettings() {
    settingsPromise ??= dependencies.loadSettings()
    return settingsPromise
  }

  function getProgress() {
    progressPromise ??= dependencies.loadProgress()
    return progressPromise
  }

  return {
    async onAudioFrameReady() {
      audioReady = true
      await ensureResumeSettled()
    },
    async onAudioProgress(position: number) {
      await ensureResumeSettled()

      if (!resumeSettled) {
        pendingPosition = position
        return
      }

      await saveLatestPosition(position)
    },
  }
}
