import { commandEventName, pageEventKind, pageEventName } from '../shared/messages'

declare global {
  interface Window {
    __soundcloudResumePlayerPatched?: boolean
  }
}

const progressEmitIntervalMs = 1000
const seekRetryIntervalMs = 100
const seekRetryTimeoutMs = 5000

patchAudio()

function patchAudio() {
  if (window.__soundcloudResumePlayerPatched) return
  window.__soundcloudResumePlayerPatched = true

  const originalPlay = window.HTMLAudioElement.prototype.play
  const captured = new WeakSet<HTMLAudioElement>()
  let activeAudio: HTMLAudioElement | null = null
  let lastProgressEmit = 0

  window.HTMLAudioElement.prototype.play = function patchedPlay(...args) {
    captureAudio(this)
    return originalPlay.apply(this, args)
  }

  window.addEventListener(commandEventName, (event) => {
    const detail = (event as CustomEvent).detail
    if (!isSeekCommand(detail)) return
    seekWhenReady(activeAudio, detail.position, detail.playAfterSeek, Date.now())
  })

  function captureAudio(audio: HTMLAudioElement) {
    activeAudio = audio

    if (!captured.has(audio)) {
      captured.add(audio)
      audio.addEventListener('timeupdate', () => emitProgress(audio))
      audio.addEventListener('seeked', () => emitProgress(audio, true))
      audio.addEventListener('pause', () => emitProgress(audio, true))
      audio.addEventListener('loadedmetadata', () => emitProgress(audio, true))
    }

    emitPageEvent({ kind: pageEventKind.captured })
    emitProgress(audio, true)
  }

  function emitProgress(audio: HTMLAudioElement, force = false) {
    const now = Date.now()
    if (!force && now - lastProgressEmit < progressEmitIntervalMs) return
    if (!Number.isFinite(audio.currentTime) || audio.currentTime < 0) return

    lastProgressEmit = now
    emitPageEvent({ kind: pageEventKind.progress, position: audio.currentTime })
  }

  function seekWhenReady(
    audio: HTMLAudioElement | null,
    position: number,
    playAfterSeek: boolean,
    startedAt: number,
  ) {
    if (!audio) return

    if (audio.readyState > 0) {
      audio.currentTime = clampPosition(position, audio.duration)
      if (playAfterSeek) {
        void audio.play()
      }
      return
    }

    if (Date.now() - startedAt >= seekRetryTimeoutMs) return

    window.setTimeout(() => {
      seekWhenReady(audio, position, playAfterSeek, startedAt)
    }, seekRetryIntervalMs)
  }
}

function emitPageEvent(detail: unknown) {
  window.dispatchEvent(new CustomEvent(pageEventName, { detail }))
}

function clampPosition(position: number, duration: number): number {
  if (!Number.isFinite(duration) || duration <= 0) return Math.max(0, position)
  return Math.min(Math.max(0, position), duration)
}

function isSeekCommand(value: unknown): value is { position: number; playAfterSeek: boolean } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'position' in value &&
    'playAfterSeek' in value &&
    typeof value.position === 'number' &&
    Number.isFinite(value.position) &&
    value.position >= 0 &&
    typeof value.playAfterSeek === 'boolean'
  )
}
