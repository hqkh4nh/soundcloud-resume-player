import {
  commandEventName,
  isAudioFrameReadyMessage,
  isAudioProgressMessage,
  isSeekAudioMessage,
  pageEventKind,
  pageEventName,
  runtimeMessageType,
} from '../shared/messages'
import { readCurrentTrackUrl } from '../shared/track'
import { loadProgress, loadSettings, saveProgress } from './storage'
import { createTopCoordinator } from './topCoordinator'

const isTopFrame = window.top === window

const coordinator = isTopFrame
  ? createTopCoordinator({
      readCurrentTrackUrl,
      loadSettings,
      loadProgress,
      saveProgress,
      now: () => Date.now(),
      sendSeek: async (position, playAfterSeek) => {
        const response = await chrome.runtime.sendMessage({
          type: runtimeMessageType.requestSeek,
          position,
          playAfterSeek,
        })
        return Boolean(response?.ok)
      },
      logger: (event, details) => {
        console.debug('[soundcloud-resume-player]', event, details)
      },
    })
  : null

function ignoreCoordinatorRejection(promise: Promise<void>) {
  void promise.catch(() => undefined)
}

window.addEventListener(pageEventName, (event) => {
  const detail = (event as CustomEvent).detail

  if (detail?.kind === pageEventKind.captured) {
    void chrome.runtime.sendMessage({ type: runtimeMessageType.audioCaptured })
    return
  }

  if (
    detail?.kind === pageEventKind.progress &&
    typeof detail.position === 'number' &&
    Number.isFinite(detail.position) &&
    detail.position >= 0
  ) {
    void chrome.runtime.sendMessage({
      type: runtimeMessageType.audioProgress,
      position: detail.position,
    })
  }
})

chrome.runtime.onMessage.addListener((message: unknown) => {
  if (isTopFrame && coordinator && isAudioFrameReadyMessage(message)) {
    ignoreCoordinatorRejection(coordinator.onAudioFrameReady())
    return
  }

  if (isTopFrame && coordinator && isAudioProgressMessage(message)) {
    ignoreCoordinatorRejection(coordinator.onAudioProgress(message.position))
    return
  }

  if (isSeekAudioMessage(message)) {
    window.dispatchEvent(
      new CustomEvent(commandEventName, {
        detail: {
          position: message.position,
          playAfterSeek: message.playAfterSeek,
        },
      }),
    )
  }
})
