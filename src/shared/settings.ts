export type ResumeSettings = {
  saveProgress: boolean
  resumeOnlySameTrack: boolean
  forceOldTrack: boolean
  autoPlayAfterResume: boolean
  debug: boolean
}

export const defaultSettings: ResumeSettings = {
  saveProgress: true,
  resumeOnlySameTrack: true,
  forceOldTrack: false,
  autoPlayAfterResume: false,
  debug: false,
}

export const settingsStorageKey = 'settings'

export function mergeSettings(value: unknown): ResumeSettings {
  const source = isRecord(value) ? value : {}

  return {
    saveProgress: readBoolean(source.saveProgress, defaultSettings.saveProgress),
    resumeOnlySameTrack: readBoolean(
      source.resumeOnlySameTrack,
      defaultSettings.resumeOnlySameTrack,
    ),
    forceOldTrack: readBoolean(source.forceOldTrack, defaultSettings.forceOldTrack),
    autoPlayAfterResume: readBoolean(
      source.autoPlayAfterResume,
      defaultSettings.autoPlayAfterResume,
    ),
    debug: readBoolean(source.debug, defaultSettings.debug),
  }
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
