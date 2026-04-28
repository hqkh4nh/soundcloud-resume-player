import { beforeEach, describe, expect, it, vi } from 'vitest'
import { runtimeMessageType } from '../../src/shared/messages'

type RuntimeListener = (
  message: unknown,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: { ok: boolean }) => void,
) => boolean

describe('background relay', () => {
  let listener: RuntimeListener
  let sendMessage: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.resetModules()

    sendMessage = vi.fn((...args: unknown[]) => {
      const callback = args.at(-1)
      if (typeof callback === 'function') callback()
    })

    vi.stubGlobal('chrome', {
      runtime: {
        lastError: undefined,
        onMessage: {
          addListener: vi.fn((handler: RuntimeListener) => {
            listener = handler
          }),
        },
      },
      tabs: {
        sendMessage,
        onRemoved: {
          addListener: vi.fn(),
        },
      },
    })

    await import('../../src/background/index')
  })

  it('rejects seek requests outside the top frame', () => {
    sendFromFrame({ type: runtimeMessageType.audioCaptured }, 3)
    sendMessage.mockClear()

    const result = sendFromFrame(
      {
        type: runtimeMessageType.requestSeek,
        position: 150,
        playAfterSeek: true,
      },
      3,
    )

    expect(result.returnValue).toBe(false)
    expect(result.response).toEqual({ ok: false })
    expect(sendMessage).not.toHaveBeenCalled()
  })

  it('rejects progress from a stale audio frame', () => {
    sendFromFrame({ type: runtimeMessageType.audioCaptured }, 3)
    sendFromFrame({ type: runtimeMessageType.audioCaptured }, 7)
    sendMessage.mockClear()

    const result = sendFromFrame({ type: runtimeMessageType.audioProgress, position: 12 }, 3)

    expect(result.returnValue).toBe(false)
    expect(result.response).toEqual({ ok: false })
    expect(sendMessage).not.toHaveBeenCalled()
  })

  function sendFromFrame(message: unknown, frameId: number) {
    let response: { ok: boolean } | undefined
    const returnValue = listener(message, { tab: { id: 10 }, frameId }, (value) => {
      response = value
    })

    return { response, returnValue }
  }
})
