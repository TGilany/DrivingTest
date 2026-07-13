import { describe, it, expect, beforeEach } from 'vitest'
import type { ExamState } from '../types'
import { loadState, saveState, clearState, loadHistory, addResult } from './storage'

const state: ExamState = {
  version: 1,
  deadline: 123,
  questions: [{ id: 1, order: [2, 0, 3, 1] }],
  picks: { 1: 2 },
  locked: [1],
}

beforeEach(() => localStorage.clear())

describe('exam state storage', () => {
  it('round-trips state', () => {
    saveState(state)
    expect(loadState()).toEqual(state)
  })

  it('returns null when empty', () => {
    expect(loadState()).toBeNull()
  })

  it('returns null on corrupt JSON', () => {
    localStorage.setItem('refresher-exam/state/v1', '{nope')
    expect(loadState()).toBeNull()
  })

  it('returns null on wrong version', () => {
    localStorage.setItem('refresher-exam/state/v1', JSON.stringify({ ...state, version: 99 }))
    expect(loadState()).toBeNull()
  })

  it('clearState removes state', () => {
    saveState(state)
    clearState()
    expect(loadState()).toBeNull()
  })
})

describe('history storage', () => {
  it('appends results newest-first', () => {
    addResult({ date: 1, mistakes: 2, passed: true })
    addResult({ date: 2, mistakes: 7, passed: false })
    const h = loadHistory()
    expect(h).toHaveLength(2)
    expect(h[0].date).toBe(2)
  })

  it('returns [] on corrupt history', () => {
    localStorage.setItem('refresher-exam/history/v1', 'garbage')
    expect(loadHistory()).toEqual([])
  })

  it('round-trips snapshot fields', () => {
    const r = {
      date: 5, mistakes: 3, passed: true,
      questions: [{ id: 7, order: [3, 1, 0, 2] }],
      picks: { 7: 2 },
    }
    addResult(r)
    expect(loadHistory()[0]).toEqual(r)
  })

  it('drops malformed history elements', () => {
    localStorage.setItem(
      'refresher-exam/history/v1',
      JSON.stringify([
        { date: 1, mistakes: 2, passed: true },
        { date: 2, mistakes: 1, passed: false, questions: 'not-an-array' },
        null,
        { date: 3 },
      ]),
    )
    const h = loadHistory()
    expect(h).toHaveLength(1)
    expect(h[0].date).toBe(1)
  })
})
