import { describe, expect, it } from 'vitest'
import {
  isAudioCapturedMessage,
  isAudioProgressMessage,
  isRequestSeekMessage,
  isSeekAudioMessage,
  runtimeMessageType,
} from '../../src/shared/messages'

describe('runtime messages', () => {
  it('validates audio messages', () => {
    expect(isAudioCapturedMessage({ type: runtimeMessageType.audioCaptured })).toBe(true)
    expect(isAudioProgressMessage({ type: runtimeMessageType.audioProgress, position: 12.4 })).toBe(true)
    expect(isAudioProgressMessage({ type: runtimeMessageType.audioProgress, position: -1 })).toBe(false)
  })

  it('validates seek commands', () => {
    expect(
      isRequestSeekMessage({
        type: runtimeMessageType.requestSeek,
        position: 150,
        playAfterSeek: false,
      }),
    ).toBe(true)
    expect(
      isSeekAudioMessage({
        type: runtimeMessageType.seekAudio,
        position: 150,
        playAfterSeek: true,
      }),
    ).toBe(true)
    expect(isRequestSeekMessage({ type: runtimeMessageType.requestSeek, position: Number.NaN })).toBe(false)
  })

  it('accepts audioProgress with optional important flag', () => {
    expect(
      isAudioProgressMessage({
        type: runtimeMessageType.audioProgress,
        position: 12,
        important: true,
      }),
    ).toBe(true)
    expect(
      isAudioProgressMessage({
        type: runtimeMessageType.audioProgress,
        position: 12,
      }),
    ).toBe(true)
  })

  it('rejects audioProgress with non-boolean important', () => {
    expect(
      isAudioProgressMessage({
        type: runtimeMessageType.audioProgress,
        position: 12,
        important: 'yes',
      }),
    ).toBe(false)
  })
})
