export function formatPosition(seconds: number): string {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0
  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  const remainingSeconds = safeSeconds % 60

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(remainingSeconds)}`
  }

  return `${minutes}:${pad(remainingSeconds)}`
}

function pad(value: number): string {
  return value.toString().padStart(2, '0')
}
