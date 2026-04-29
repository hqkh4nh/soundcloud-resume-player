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

  it('isolates frame state across tabs', () => {
    const state = createRelayState()

    state.setAudioFrame(10, 3)
    state.setAudioFrame(11, 9)

    expect(state.getAudioFrame(10)).toEqual({ tabId: 10, frameId: 3 })
    expect(state.getAudioFrame(11)).toEqual({ tabId: 11, frameId: 9 })
  })

  it('clears only the requested tab', () => {
    const state = createRelayState()

    state.setAudioFrame(10, 3)
    state.setAudioFrame(11, 9)
    state.clearTab(10)

    expect(state.getAudioFrame(10)).toBeNull()
    expect(state.getAudioFrame(11)).toEqual({ tabId: 11, frameId: 9 })
  })

  it('returns null for unknown tabs', () => {
    const state = createRelayState()

    expect(state.getAudioFrame(99)).toBeNull()

    state.setAudioFrame(10, 3)
    expect(state.getAudioFrame(99)).toBeNull()
  })

  it('treats clear of an unknown tab as a no-op', () => {
    const state = createRelayState()

    state.setAudioFrame(10, 3)
    state.clearTab(42)

    expect(state.getAudioFrame(10)).toEqual({ tabId: 10, frameId: 3 })
  })
})
