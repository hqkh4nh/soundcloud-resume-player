import { isSavedProgress, progressStorageKey, type SavedProgress } from '../shared/progress'
import {
  defaultSettings,
  mergeSettings,
  settingsStorageKey,
  type ResumeSettings,
} from '../shared/settings'
import { isExtensionContextValid } from './extensionContext'

export async function loadSettings(): Promise<ResumeSettings> {
  if (!isExtensionContextValid()) return defaultSettings
  try {
    const data = await chrome.storage.sync.get(settingsStorageKey)
    return mergeSettings(data[settingsStorageKey])
  } catch {
    return defaultSettings
  }
}

export async function loadProgress(): Promise<SavedProgress | null> {
  if (!isExtensionContextValid()) return null
  try {
    const data = await chrome.storage.local.get(progressStorageKey)
    const value = data[progressStorageKey]
    return isSavedProgress(value) ? value : null
  } catch {
    return null
  }
}

export async function saveProgress(progress: SavedProgress): Promise<void> {
  if (!isExtensionContextValid()) return
  try {
    await chrome.storage.local.set({ [progressStorageKey]: progress })
  } catch {
    // Context invalidated mid-flight (extension reload/update). Drop the write.
  }
}
