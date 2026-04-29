import { createRelayState } from './relayState'
import {
  isAudioCapturedMessage,
  isAudioProgressMessage,
  isRequestSeekMessage,
  runtimeMessageType,
  type RuntimeMessage,
} from '../shared/messages'

const relayState = createRelayState()

chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
  const tabId = sender.tab?.id
  const frameId = sender.frameId

  if (tabId === undefined || frameId === undefined) {
    sendResponse({ ok: false })
    return false
  }

  if (isAudioCapturedMessage(message)) {
    relayState.setAudioFrame(tabId, frameId)
    sendTopFrame(tabId, { type: runtimeMessageType.audioFrameReady })
    sendResponse({ ok: true })
    return false
  }

  if (isAudioProgressMessage(message)) {
    const audioFrame = relayState.getAudioFrame(tabId)

    if (audioFrame && audioFrame.frameId !== frameId) {
      sendResponse({ ok: false })
      return false
    }

    if (!audioFrame) {
      relayState.setAudioFrame(tabId, frameId)
      sendTopFrame(tabId, { type: runtimeMessageType.audioFrameReady })
    }

    sendTopFrame(tabId, message)
    sendResponse({ ok: true })
    return false
  }

  if (isRequestSeekMessage(message)) {
    if (frameId !== 0) {
      sendResponse({ ok: false })
      return false
    }

    const audioFrame = relayState.getAudioFrame(tabId)

    if (!audioFrame) {
      sendResponse({ ok: false })
      return false
    }

    chrome.tabs.sendMessage(
      audioFrame.tabId,
      {
        type: runtimeMessageType.seekAudio,
        position: message.position,
        playAfterSeek: message.playAfterSeek,
      },
      { frameId: audioFrame.frameId },
      () => {
        const error = chrome.runtime.lastError
        if (error && !isPortClosedError(error.message)) {
          relayState.clearTab(tabId)
          sendResponse({ ok: false })
          return
        }
        // Treat both "no error" and "port closed without response" as success: the
        // audio-frame listener dispatches the seek synchronously into the page, so a
        // missing response does not mean the seek failed.
        sendResponse({ ok: true })
      },
    )
    return true
  }

  sendResponse({ ok: false })
  return false
})

chrome.tabs.onRemoved.addListener((tabId) => {
  relayState.clearTab(tabId)
})

function isPortClosedError(message: string | undefined): boolean {
  // "The message port closed before a response was received." fires when the receiver's
  // onMessage listener returns without calling sendResponse. Expected for fire-and-forget
  // listeners; not an actionable error.
  return typeof message === 'string' && message.includes('message port closed')
}

function sendTopFrame(
  tabId: number,
  message: Extract<
    RuntimeMessage,
    { type: typeof runtimeMessageType.audioFrameReady | typeof runtimeMessageType.audioProgress }
  >,
) {
  chrome.tabs.sendMessage(tabId, message, { frameId: 0 }, () => {
    void chrome.runtime.lastError
  })
}
