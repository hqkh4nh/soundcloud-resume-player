export type SavedProgress = {
  trackUrl: string
  position: number
  updatedAt: number
}

export const progressStorageKey = 'latestProgress'

export function isSavedProgress(value: unknown): value is SavedProgress {
  if (!isRecord(value)) return false

  return (
    typeof value.trackUrl === 'string' &&
    value.trackUrl.startsWith('/') &&
    value.trackUrl.length > 1 &&
    Number.isFinite(value.position) &&
    value.position >= 0 &&
    Number.isFinite(value.updatedAt) &&
    value.updatedAt > 0
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
