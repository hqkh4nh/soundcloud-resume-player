export const pageEventName = 'soundcloud-resume-player:audio-event'
export const commandEventName = 'soundcloud-resume-player:command'

export const pageEventKind = {
  captured: 'captured',
  progress: 'progress',
} as const

export const runtimeMessageType = {
  audioCaptured: 'SRP_AUDIO_CAPTURED',
  audioProgress: 'SRP_AUDIO_PROGRESS',
  audioFrameReady: 'SRP_AUDIO_FRAME_READY',
  requestSeek: 'SRP_REQUEST_SEEK',
  seekAudio: 'SRP_SEEK_AUDIO',
} as const

export type AudioCapturedMessage = {
  type: typeof runtimeMessageType.audioCaptured
}

export type AudioProgressMessage = {
  type: typeof runtimeMessageType.audioProgress
  position: number
  important?: boolean
}

export type AudioFrameReadyMessage = {
  type: typeof runtimeMessageType.audioFrameReady
}

export type RequestSeekMessage = {
  type: typeof runtimeMessageType.requestSeek
  position: number
  playAfterSeek: boolean
}

export type SeekAudioMessage = {
  type: typeof runtimeMessageType.seekAudio
  position: number
  playAfterSeek: boolean
}

export type RuntimeMessage =
  | AudioCapturedMessage
  | AudioProgressMessage
  | AudioFrameReadyMessage
  | RequestSeekMessage
  | SeekAudioMessage

export function isAudioCapturedMessage(value: unknown): value is AudioCapturedMessage {
  return isRecord(value) && value.type === runtimeMessageType.audioCaptured
}

export function isAudioProgressMessage(value: unknown): value is AudioProgressMessage {
  if (!isRecord(value)) return false
  if (value.type !== runtimeMessageType.audioProgress) return false
  if (!isNonNegativeFinite(value.position)) return false
  if (value.important !== undefined && typeof value.important !== 'boolean') return false
  return true
}

export function isAudioFrameReadyMessage(value: unknown): value is AudioFrameReadyMessage {
  return isRecord(value) && value.type === runtimeMessageType.audioFrameReady
}

export function isRequestSeekMessage(value: unknown): value is RequestSeekMessage {
  return (
    isRecord(value) &&
    value.type === runtimeMessageType.requestSeek &&
    isNonNegativeFinite(value.position) &&
    typeof value.playAfterSeek === 'boolean'
  )
}

export function isSeekAudioMessage(value: unknown): value is SeekAudioMessage {
  return (
    isRecord(value) &&
    value.type === runtimeMessageType.seekAudio &&
    isNonNegativeFinite(value.position) &&
    typeof value.playAfterSeek === 'boolean'
  )
}

function isNonNegativeFinite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
