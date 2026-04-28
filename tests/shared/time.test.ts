import { describe, expect, it } from 'vitest'
import { formatPosition } from '../../src/shared/time'

describe('time formatting', () => {
  it('formats seconds as compact time', () => {
    expect(formatPosition(0)).toBe('0:00')
    expect(formatPosition(73.8)).toBe('1:13')
    expect(formatPosition(3671)).toBe('1:01:11')
  })
})
