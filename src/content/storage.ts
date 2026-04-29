import { isSavedProgress, progressStorageKey, type SavedProgress } from '../shared/progress'
import { mergeSettings, settingsStorageKey, type ResumeSettings } from '../shared/settings'

export async function loadSettings(): Promise<ResumeSettings> {
  const data = await chrome.storage.sync.get(settingsStorageKey)
  return mergeSettings(data[settingsStorageKey])
}

export async function loadProgress(): Promise<SavedProgress | null> {
  const data = await chrome.storage.local.get(progressStorageKey)
  const value = data[progressStorageKey]
  return isSavedProgress(value) ? value : null
}

export async function saveProgress(progress: SavedProgress): Promise<void> {
  await chrome.storage.local.set({ [progressStorageKey]: progress })
}
