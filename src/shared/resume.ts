import type { SavedProgress } from './progress'
import type { ResumeSettings } from './settings'

export type ResumeDecision =
  | {
      shouldSeek: true
      position: number
      shouldPlay: boolean
      reason: 'match' | 'same-track-disabled'
    }
  | {
      shouldSeek: false
      reason: 'missing-progress' | 'missing-current-track' | 'track-mismatch'
    }

export type ResumeInput = {
  currentTrackUrl: string | null
  savedProgress: SavedProgress | null
  settings: ResumeSettings
}

export function shouldResume(input: ResumeInput): ResumeDecision {
  if (!input.savedProgress) return { shouldSeek: false, reason: 'missing-progress' }
  if (!input.currentTrackUrl) return { shouldSeek: false, reason: 'missing-current-track' }

  if (input.savedProgress.trackUrl === input.currentTrackUrl) {
    return {
      shouldSeek: true,
      position: input.savedProgress.position,
      shouldPlay: input.settings.autoPlayAfterResume,
      reason: 'match',
    }
  }

  if (input.settings.resumeOnlySameTrack) {
    return { shouldSeek: false, reason: 'track-mismatch' }
  }

  return {
    shouldSeek: true,
    position: input.savedProgress.position,
    shouldPlay: input.settings.autoPlayAfterResume,
    reason: 'same-track-disabled',
  }
}
