import {
  commandEventName,
  isAudioFrameReadyMessage,
  isAudioProgressMessage,
  isSeekAudioMessage,
  pageEventKind,
  pageEventName,
  resumeHintEventName,
  runtimeMessageType,
} from '../shared/messages'
import { shouldResume } from '../shared/resume'
import { readCurrentTrackUrl } from '../shared/track'
import { isExtensionContextValid } from './extensionContext'
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
        if (!isExtensionContextValid()) return false
        try {
          const response = await chrome.runtime.sendMessage({
            type: runtimeMessageType.requestSeek,
            position,
            playAfterSeek,
          })
          return Boolean(response?.ok)
        } catch {
          return false
        }
      },
      logger: (event, details) => {
        console.debug('[soundcloud-resume-player]', event, details)
      },
    })
  : null

function ignoreCoordinatorRejection(promise: Promise<void>) {
  void promise.catch(() => undefined)
}

if (isTopFrame) {
  void tryPreResume().catch(() => undefined)
}

async function tryPreResume() {
  const [settings, progress] = await Promise.all([loadSettings(), loadProgress()])
  if (!progress) return

  for (let attempt = 0; attempt < preResumeMaxAttempts; attempt += 1) {
    const trackUrl = readCurrentTrackUrl()
    if (trackUrl !== null) {
      const decision = shouldResume({
        currentTrackUrl: trackUrl,
        savedProgress: progress,
        settings,
      })
      if (decision.shouldSeek) {
        window.dispatchEvent(
          new CustomEvent(resumeHintEventName, {
            detail: { position: decision.position },
          }),
        )
      }
      return
    }
    await sleep(preResumePollIntervalMs)
  }
}

const preResumeMaxAttempts = 30
const preResumePollIntervalMs = 100

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms)
  })
}

function handlePageEvent(event: Event) {
  if (!isExtensionContextValid()) {
    window.removeEventListener(pageEventName, handlePageEvent)
    return
  }

  const detail = (event as CustomEvent).detail

  try {
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
        important: detail.important === true,
      })
      return
    }

    if (detail?.kind === pageEventKind.resumeApplied) {
      if (isTopFrame && coordinator) {
        coordinator.onResumeAlreadyApplied()
      }
    }
  } catch {
    // sendMessage can throw "Extension context invalidated" synchronously when the
    // extension reloads while playback is still firing audio events. Drop the listener
    // so we stop spamming the console for the rest of this page's life.
    window.removeEventListener(pageEventName, handlePageEvent)
  }
}

window.addEventListener(pageEventName, handlePageEvent)

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (isTopFrame && coordinator && isAudioFrameReadyMessage(message)) {
    ignoreCoordinatorRejection(coordinator.onAudioFrameReady())
    sendResponse({ ok: true })
    return false
  }

  if (isTopFrame && coordinator && isAudioProgressMessage(message)) {
    ignoreCoordinatorRejection(coordinator.onAudioProgress(message.position, message.important))
    sendResponse({ ok: true })
    return false
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
    sendResponse({ ok: true })
    return false
  }

  return false
})
