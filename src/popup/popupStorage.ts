import { isSavedProgress, progressStorageKey, type SavedProgress } from '../shared/progress'
import { mergeSettings, settingsStorageKey, type ResumeSettings } from '../shared/settings'

type StorageReader = {
  getSync: (key: string) => Promise<Record<string, unknown>>
  getLocal: (key: string) => Promise<Record<string, unknown>>
}

export type PopupState = {
  settings: ResumeSettings
  progress: SavedProgress | null
}

export function createPopupStateLoader(reader: StorageReader) {
  return async function loadPopupState(): Promise<PopupState> {
    const [syncData, localData] = await Promise.all([
      reader.getSync(settingsStorageKey),
      reader.getLocal(progressStorageKey),
    ])

    const progress = localData[progressStorageKey]

    return {
      settings: mergeSettings(syncData[settingsStorageKey]),
      progress: isSavedProgress(progress) ? progress : null,
    }
  }
}

export const loadPopupState = createPopupStateLoader({
  getSync: (key) => chrome.storage.sync.get(key),
  getLocal: (key) => chrome.storage.local.get(key),
})

export async function persistPopupSettings(settings: ResumeSettings): Promise<void> {
  await chrome.storage.sync.set({ [settingsStorageKey]: settings })
}
