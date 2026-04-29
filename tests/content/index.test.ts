import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { runtimeMessageType } from '../../src/shared/messages'

type RuntimeListener = (
  message: unknown,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void,
) => boolean | void

describe('content bridge', () => {
  let runtimeMessages: unknown[]
  let runtimeListener: RuntimeListener | null
  let sentCommand: CustomEvent | null

  beforeEach(() => {
    vi.resetModules()

    runtimeMessages = []
    runtimeListener = null
    sentCommand = null

    vi.stubGlobal('chrome', {
      runtime: {
        id: 'test-extension-id',
        sendMessage: vi.fn((message: unknown) => {
          runtimeMessages.push(message)
          return Promise.resolve({ ok: true })
        }),
        onMessage: {
          addListener: vi.fn((handler: RuntimeListener) => {
            runtimeListener = handler
          }),
        },
      },
      storage: {
        sync: { get: vi.fn().mockResolvedValue({}) },
        local: { get: vi.fn().mockResolvedValue({}), set: vi.fn().mockResolvedValue(undefined) },
      },
    })

    document.body.innerHTML = ''
    window.addEventListener('soundcloud-resume-player:command', (event) => {
      sentCommand = event as CustomEvent
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('forwards an important page-event progress to the runtime', async () => {
    await import('../../src/content/index')

    window.dispatchEvent(
      new CustomEvent('soundcloud-resume-player:audio-event', {
        detail: { kind: 'progress', position: 12, important: true },
      }),
    )

    expect(runtimeMessages.at(-1)).toEqual({
      type: runtimeMessageType.audioProgress,
      position: 12,
      important: true,
    })
  })

  it('defaults important to false when the page event omits it', async () => {
    await import('../../src/content/index')

    window.dispatchEvent(
      new CustomEvent('soundcloud-resume-player:audio-event', {
        detail: { kind: 'progress', position: 7 },
      }),
    )

    expect(runtimeMessages.at(-1)).toEqual({
      type: runtimeMessageType.audioProgress,
      position: 7,
      important: false,
    })
  })

  it('relays seekAudio runtime messages as a command DOM event', async () => {
    await import('../../src/content/index')

    expect(runtimeListener).not.toBeNull()
    runtimeListener?.(
      {
        type: runtimeMessageType.seekAudio,
        position: 99,
        playAfterSeek: true,
      },
      {} as chrome.runtime.MessageSender,
      () => undefined,
    )

    expect(sentCommand).not.toBeNull()
    expect((sentCommand as CustomEvent).detail).toEqual({
      position: 99,
      playAfterSeek: true,
    })
  })

  it('rejects malformed page progress events without sending a runtime message', async () => {
    await import('../../src/content/index')

    const before = runtimeMessages.length
    window.dispatchEvent(
      new CustomEvent('soundcloud-resume-player:audio-event', {
        detail: { kind: 'progress', position: -1 },
      }),
    )

    expect(runtimeMessages.length).toBe(before)
  })

  it('forwards page captured events to the runtime', async () => {
    await import('../../src/content/index')

    window.dispatchEvent(
      new CustomEvent('soundcloud-resume-player:audio-event', {
        detail: { kind: 'captured' },
      }),
    )

    expect(runtimeMessages.at(-1)).toEqual({ type: runtimeMessageType.audioCaptured })
  })

  it('stops forwarding page events after the extension context is invalidated', async () => {
    await import('../../src/content/index')

    // Simulate Chrome reloading/updating the extension while the page keeps firing
    // audio events: chrome.runtime.id becomes undefined, and any subsequent
    // sendMessage call would throw "Extension context invalidated."
    ;(chrome.runtime as unknown as { id: string | undefined }).id = undefined

    const before = runtimeMessages.length
    window.dispatchEvent(
      new CustomEvent('soundcloud-resume-player:audio-event', {
        detail: { kind: 'progress', position: 42, important: true },
      }),
    )
    window.dispatchEvent(
      new CustomEvent('soundcloud-resume-player:audio-event', {
        detail: { kind: 'captured' },
      }),
    )

    expect(runtimeMessages.length).toBe(before)
  })

  it('survives a synchronous throw from sendMessage by detaching the listener', async () => {
    const sendMessageSpy = chrome.runtime.sendMessage as unknown as ReturnType<typeof vi.fn>
    sendMessageSpy.mockImplementationOnce(() => {
      throw new Error('Extension context invalidated.')
    })

    await import('../../src/content/index')

    expect(() =>
      window.dispatchEvent(
        new CustomEvent('soundcloud-resume-player:audio-event', {
          detail: { kind: 'progress', position: 1, important: false },
        }),
      ),
    ).not.toThrow()

    const afterFirst = runtimeMessages.length
    window.dispatchEvent(
      new CustomEvent('soundcloud-resume-player:audio-event', {
        detail: { kind: 'progress', position: 2, important: false },
      }),
    )

    expect(runtimeMessages.length).toBe(afterFirst)
  })
})
