import { describe, it, expect } from 'vitest'
import { remainingMs, formatMMSS, isExpired } from './timer'

describe('timer', () => {
  it('computes remaining ms', () => {
    expect(remainingMs(10_000, 4_000)).toBe(6_000)
  })

  it('clamps to zero past deadline', () => {
    expect(remainingMs(10_000, 20_000)).toBe(0)
  })

  it('formats mm:ss zero-padded', () => {
    expect(formatMMSS(29 * 60_000 + 5_000)).toBe('29:05')
    expect(formatMMSS(0)).toBe('00:00')
    expect(formatMMSS(30 * 60_000)).toBe('30:00')
  })

  it('detects expiry', () => {
    expect(isExpired(10_000, 10_000)).toBe(true)
    expect(isExpired(10_000, 9_999)).toBe(false)
  })
})
