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
  logger?: (event: string, details: Record<string, unknown>) => void
  scheduleRetry?: (callback: () => void, delayMs: number) => void
}

const saveThrottleMs = 5000
const missingTrackResumeRetryDelayMs = 250
const missingTrackResumeAttemptLimit = 3

export function createTopCoordinator(dependencies: Dependencies) {
  let progressPromise: Promise<SavedProgress | null> | null = null
  let resumeSettled = false
  let settlingPromise: Promise<void> | null = null
  let audioReady = false
  let lastSaveAt = 0
  let lastSavedTrackUrl: string | null = null
  let pendingPosition: number | null = null
  let missingTrackResumeAttempts = 0
  let saveQueue: Promise<void> = Promise.resolve()

  async function ensureResumeSettled() {
    if (resumeSettled || !audioReady) return

    settlingPromise ??= settleResume().finally(() => {
      settlingPromise = null
    })
    await settlingPromise
  }

  async function settleResume() {
    if (resumeSettled || !audioReady) return

    const [settings, savedProgress] = await Promise.all([
      dependencies.loadSettings(),
      getProgress(),
    ])
    const currentTrackUrl = dependencies.readCurrentTrackUrl()
    const decision = shouldResume({ currentTrackUrl, savedProgress, settings })
    debugLog(settings, 'resume-decision', {
      reason: decision.reason,
      shouldSeek: decision.shouldSeek,
    })

    if (decision.shouldSeek) {
      const didSeek = await dependencies.sendSeek(decision.position, decision.shouldPlay)
      // Drop any pre-seek pending position. The post-seek timeupdate event will arrive
      // shortly with the post-seek position, which is more accurate than the pre-seek value.
      pendingPosition = null

      if (!didSeek) return

      resumeSettled = true
      return
    }

    if (
      decision.reason === 'missing-current-track' &&
      missingTrackResumeAttempts < missingTrackResumeAttemptLimit - 1
    ) {
      missingTrackResumeAttempts += 1
      scheduleResumeRetry()
      return
    }

    resumeSettled = true

    if (pendingPosition !== null) {
      await saveLatestPosition(pendingPosition, true)
      pendingPosition = null
    }
  }

  function saveLatestPosition(position: number, force = false): Promise<void> {
    // Serialize storage writes so concurrent important events (e.g., pause + seeked
    // firing back-to-back) don't race against each other and produce duplicate writes.
    saveQueue = saveQueue.then(() => doSaveLatestPosition(position, force))
    return saveQueue
  }

  async function doSaveLatestPosition(position: number, force: boolean) {
    const settings = await dependencies.loadSettings()
    if (!settings.saveProgress) return

    const trackUrl = dependencies.readCurrentTrackUrl()
    if (!trackUrl) return

    const trackChanged = lastSavedTrackUrl !== null && trackUrl !== lastSavedTrackUrl
    const now = dependencies.now()
    if (!force && !trackChanged && now - lastSaveAt < saveThrottleMs) return

    lastSaveAt = now
    lastSavedTrackUrl = trackUrl
    await dependencies.saveProgress({ trackUrl, position, updatedAt: now })
  }

  function debugLog(settings: ResumeSettings, event: string, details: Record<string, unknown>) {
    if (!settings.debug) return

    dependencies.logger?.(event, details)
  }

  function scheduleResumeRetry() {
    const schedule = dependencies.scheduleRetry ?? defaultScheduleRetry

    schedule(() => {
      void ensureResumeSettled()
    }, missingTrackResumeRetryDelayMs)
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
    async onAudioProgress(position: number, important?: boolean) {
      if (!resumeSettled) {
        pendingPosition = position
        await ensureResumeSettled()
        return
      }

      await saveLatestPosition(position, important === true)
    },
    onResumeAlreadyApplied() {
      resumeSettled = true
      audioReady = true
    },
  }
}

function defaultScheduleRetry(callback: () => void, delayMs: number) {
  globalThis.setTimeout(callback, delayMs)
}
