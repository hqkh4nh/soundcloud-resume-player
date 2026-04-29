import {
  commandEventName,
  pageEventKind,
  pageEventName,
  resumeHintEventName,
} from '../shared/messages'

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
  let pendingResume: { position: number } | null = null
  let resumeApplied = false

  window.addEventListener(resumeHintEventName, (event) => {
    if (resumeApplied) return
    const detail = (event as CustomEvent).detail
    if (
      typeof detail === 'object' &&
      detail !== null &&
      'position' in detail &&
      typeof (detail as { position: unknown }).position === 'number' &&
      Number.isFinite((detail as { position: number }).position) &&
      (detail as { position: number }).position >= 0
    ) {
      pendingResume = { position: (detail as { position: number }).position }
    }
  })

  window.HTMLAudioElement.prototype.play = function patchedPlay(...args) {
    applyPendingResume(this)
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
      audio.addEventListener('seeked', () => emitProgress(audio, true, true))
      audio.addEventListener('pause', () => emitProgress(audio, true, true))
      audio.addEventListener('loadedmetadata', () => emitProgress(audio, true, true))
    }

    emitPageEvent({ kind: pageEventKind.captured })
    emitProgress(audio, true, true)
  }

  function emitProgress(audio: HTMLAudioElement, force = false, important = false) {
    if (audio !== activeAudio) return

    const now = Date.now()
    if (!force && now - lastProgressEmit < progressEmitIntervalMs) return
    if (!Number.isFinite(audio.currentTime) || audio.currentTime < 0) return

    lastProgressEmit = now
    emitPageEvent({
      kind: pageEventKind.progress,
      position: audio.currentTime,
      important,
    })
  }

  function applyPendingResume(audio: HTMLAudioElement) {
    if (!pendingResume || resumeApplied) return
    const targetPosition = pendingResume.position

    if (audio.readyState > 0) {
      audio.currentTime = clampPosition(targetPosition, audio.duration)
      resumeApplied = true
      pendingResume = null
      emitPageEvent({ kind: pageEventKind.resumeApplied, position: audio.currentTime })
      return
    }

    const apply = () => {
      audio.removeEventListener('loadedmetadata', apply)
      audio.removeEventListener('canplay', apply)
      if (resumeApplied || !pendingResume) return
      audio.currentTime = clampPosition(pendingResume.position, audio.duration)
      resumeApplied = true
      pendingResume = null
      emitPageEvent({ kind: pageEventKind.resumeApplied, position: audio.currentTime })
    }
    audio.addEventListener('loadedmetadata', apply)
    audio.addEventListener('canplay', apply)
  }

  function seekWhenReady(
    audio: HTMLAudioElement | null,
    position: number,
    playAfterSeek: boolean,
    startedAt: number,
  ) {
    if (!audio) return
    if (audio !== activeAudio) return

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
