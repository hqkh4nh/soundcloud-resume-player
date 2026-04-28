import { describe, expect, it } from 'vitest'
import { createRelayState } from '../../src/background/relayState'

describe('relay state', () => {
  it('tracks latest audio frame per tab', () => {
    const state = createRelayState()

    state.setAudioFrame(10, 3)
    expect(state.getAudioFrame(10)).toEqual({ tabId: 10, frameId: 3 })

    state.setAudioFrame(10, 7)
    expect(state.getAudioFrame(10)).toEqual({ tabId: 10, frameId: 7 })
  })

  it('clears stale tab state', () => {
    const state = createRelayState()

    state.setAudioFrame(10, 3)
    state.clearTab(10)

    expect(state.getAudioFrame(10)).toBeNull()
  })
})
