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
    isNonNegativeFinite(value.position) &&
    isPositiveFinite(value.updatedAt)
  )
}

function isNonNegativeFinite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function isPositiveFinite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
