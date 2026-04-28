export type AudioFrameRef = {
  tabId: number
  frameId: number
}

export function createRelayState() {
  const audioFrames = new Map<number, AudioFrameRef>()

  return {
    setAudioFrame(tabId: number, frameId: number) {
      audioFrames.set(tabId, { tabId, frameId })
    },
    getAudioFrame(tabId: number): AudioFrameRef | null {
      return audioFrames.get(tabId) ?? null
    },
    clearTab(tabId: number) {
      audioFrames.delete(tabId)
    },
  }
}
