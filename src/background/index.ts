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
        if (error) relayState.clearTab(tabId)
        sendResponse({ ok: !error })
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

function sendTopFrame(
  tabId: number,
  message: Extract<RuntimeMessage, { type: typeof runtimeMessageType.audioFrameReady | typeof runtimeMessageType.audioProgress }>,
) {
  chrome.tabs.sendMessage(tabId, message, { frameId: 0 }, () => {
    void chrome.runtime.lastError
  })
}
