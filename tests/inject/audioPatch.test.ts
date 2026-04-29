import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const audioPlayDescriptor = Object.getOwnPropertyDescriptor(window.HTMLAudioElement.prototype, 'play')

function restoreAudioPlay() {
  if (audioPlayDescriptor) {
    Object.defineProperty(window.HTMLAudioElement.prototype, 'play', audioPlayDescriptor)
  } else {
    Reflect.deleteProperty(window.HTMLAudioElement.prototype, 'play')
  }
}

describe('audio patch script', () => {
  const pageEventName = 'soundcloud-resume-player:audio-event'
  const commandEventName = 'soundcloud-resume-player:command'
  let events: CustomEvent[]
  let collectEvent: (event: Event) => void

  beforeEach(() => {
    vi.resetModules()
    vi.useRealTimers()
    restoreAudioPlay()
    Reflect.deleteProperty(window, '__soundcloudResumePlayerPatched')
    document.body.innerHTML = ''

    events = []
    collectEvent = (event) => {
      events.push(event as CustomEvent)
    }
    window.addEventListener(pageEventName, collectEvent)
  })

  afterEach(() => {
    window.removeEventListener(pageEventName, collectEvent)
    vi.useRealTimers()
    vi.restoreAllMocks()
    restoreAudioPlay()
    Reflect.deleteProperty(window, '__soundcloudResumePlayerPatched')
  })

  it('preserves original play behavior and emits capture event', async () => {
    const originalPlay = vi
      .spyOn(window.HTMLMediaElement.prototype, 'play')
      .mockResolvedValue(undefined)

    await import('../../src/inject/index')

    const audio = document.createElement('audio')
    await audio.play()

    expect(originalPlay).toHaveBeenCalledTimes(1)
    expect(events.at(0)?.detail).toEqual({ kind: 'captured' })
  })

  it('ignores progress from stale audio after another audio is captured', async () => {
    vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)

    await import('../../src/inject/index')

    const staleAudio = document.createElement('audio')
    const activeAudio = document.createElement('audio')

    await staleAudio.play()
    await activeAudio.play()

    staleAudio.currentTime = 91
    activeAudio.currentTime = 17
    staleAudio.dispatchEvent(new Event('pause'))
    activeAudio.dispatchEvent(new Event('pause'))

    const progressEvents = events
      .map((event) => event.detail)
      .filter((detail) => detail.kind === 'progress')

    expect(progressEvents).toContainEqual({ kind: 'progress', position: 17, important: true })
    expect(progressEvents).not.toContainEqual({ kind: 'progress', position: 91, important: true })
  })

  it('marks pause-driven progress events as important', async () => {
    vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)

    await import('../../src/inject/index')

    const audio = document.createElement('audio')
    Object.defineProperty(audio, 'currentTime', { configurable: true, value: 42 })

    await audio.play()
    audio.dispatchEvent(new Event('pause'))

    const progressEvents = events
      .map((event) => event.detail)
      .filter((detail) => detail.kind === 'progress')

    expect(progressEvents.at(-1)).toEqual({
      kind: 'progress',
      position: 42,
      important: true,
    })
  })

  it('does not seek a stale retry target after another audio becomes active', async () => {
    vi.useFakeTimers()
    vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)

    await import('../../src/inject/index')

    const staleAudio = document.createElement('audio')
    const activeAudio = document.createElement('audio')

    Object.defineProperty(staleAudio, 'readyState', { configurable: true, value: 0 })
    Object.defineProperty(activeAudio, 'readyState', { configurable: true, value: 1 })
    Object.defineProperty(activeAudio, 'duration', { configurable: true, value: 200 })

    await staleAudio.play()
    window.dispatchEvent(
      new CustomEvent(commandEventName, {
        detail: { position: 42, playAfterSeek: false },
      }),
    )

    await activeAudio.play()
    Object.defineProperty(staleAudio, 'readyState', { configurable: true, value: 1 })
    Object.defineProperty(staleAudio, 'duration', { configurable: true, value: 200 })

    await vi.advanceTimersByTimeAsync(100)

    expect(staleAudio.currentTime).toBe(0)
  })
})
