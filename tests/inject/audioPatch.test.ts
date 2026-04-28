import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('audio patch script', () => {
  beforeEach(() => {
    vi.resetModules()
    Reflect.deleteProperty(window, '__soundcloudResumePlayerPatched')
    document.body.innerHTML = ''
  })

  it('preserves original play behavior and emits capture event', async () => {
    const events: CustomEvent[] = []
    window.addEventListener('soundcloud-resume-player:audio-event', (event) => {
      events.push(event as CustomEvent)
    })
    const originalPlay = vi
      .spyOn(window.HTMLMediaElement.prototype, 'play')
      .mockResolvedValue(undefined)

    await import('../../src/inject/index')

    const audio = document.createElement('audio')
    await audio.play()

    expect(originalPlay).toHaveBeenCalledTimes(1)
    expect(events.at(0)?.detail).toEqual({ kind: 'captured' })
  })
})
