import { describe, it, expect } from 'vitest'
import type { Question, ExamState } from '../types'
import { sampleExam, createExam, grade, EXAM_SIZE, EXAM_MS, collectMistakeIds } from './exam'

function fakeBank(): Question[] {
  const mk = (id: number, category: Question['category']): Question => ({
    id, category, question: `q${id}`, answers: ['a', 'b', 'c', 'd'],
    correct: id % 4, explanation: 'e', image: null, licenses: [],
  })
  const bank: Question[] = []
  let id = 1
  for (let i = 0; i < 40; i++) bank.push(mk(id++, 'traffic-laws'))
  for (let i = 0; i < 20; i++) bank.push(mk(id++, 'signs'))
  for (let i = 0; i < 20; i++) bank.push(mk(id++, 'safety'))
  for (let i = 0; i < 10; i++) bank.push(mk(id++, 'vehicle'))
  return bank
}

describe('sampleExam', () => {
  it('returns 20 unique questions with category proportions 10/4/4/2', () => {
    const bank = fakeBank()
    const byId = new Map(bank.map((q) => [q.id, q]))
    const exam = sampleExam(bank, 42)
    expect(exam).toHaveLength(EXAM_SIZE)
    expect(new Set(exam.map((q) => q.id)).size).toBe(EXAM_SIZE)
    const counts: Record<string, number> = {}
    for (const eq of exam) {
      const c = byId.get(eq.id)!.category
      counts[c] = (counts[c] ?? 0) + 1
    }
    expect(counts).toEqual({ 'traffic-laws': 10, signs: 4, safety: 4, vehicle: 2 })
  })

  it('is deterministic per seed and varies across seeds', () => {
    const bank = fakeBank()
    expect(sampleExam(bank, 7)).toEqual(sampleExam(bank, 7))
    expect(sampleExam(bank, 7).map((q) => q.id)).not.toEqual(sampleExam(bank, 8).map((q) => q.id))
  })

  it('shuffles answer order as a permutation of 0-3', () => {
    const exam = sampleExam(fakeBank(), 42)
    for (const eq of exam) expect([...eq.order].sort()).toEqual([0, 1, 2, 3])
  })
})

describe('createExam', () => {
  it('sets deadline 30 minutes from now', () => {
    const state = createExam(fakeBank(), 42, 1_000_000)
    expect(state.deadline).toBe(1_000_000 + EXAM_MS)
    expect(state.version).toBe(1)
    expect(state.questions).toHaveLength(EXAM_SIZE)
    expect(state.picks).toEqual({})
    expect(state.locked).toEqual([])
  })
})

describe('grade', () => {
  function gradedState(mistakes: number): { state: ExamState; byId: Map<number, Question> } {
    const bank = fakeBank()
    const byId = new Map(bank.map((q) => [q.id, q]))
    const state = createExam(bank, 42, 0)
    state.questions.forEach((eq, i) => {
      const q = byId.get(eq.id)!
      // first `mistakes` questions answered wrong, rest right
      state.picks[eq.id] = i < mistakes ? (q.correct + 1) % 4 : q.correct
    })
    return { state, byId }
  }

  it('passes with exactly 4 mistakes', () => {
    const { state, byId } = gradedState(4)
    const r = grade(state, byId)
    expect(r.mistakes).toBe(4)
    expect(r.passed).toBe(true)
  })

  it('fails with 5 mistakes', () => {
    const { state, byId } = gradedState(5)
    expect(grade(state, byId).passed).toBe(false)
  })

  it('counts unanswered as mistakes', () => {
    const { state, byId } = gradedState(0)
    const someId = state.questions[0].id
    delete state.picks[someId]
    const r = grade(state, byId)
    expect(r.mistakes).toBe(1)
    expect(r.perQuestion.find((p) => p.id === someId)!.pick).toBeNull()
  })
})

describe('collectMistakeIds', () => {
  it('collects wrong and unanswered ids from snapshots, ignores old entries and unknown ids', () => {
    const bank = fakeBank()
    const byId = new Map(bank.map((q) => [q.id, q]))
    const q1 = bank[0], q2 = bank[1], q3 = bank[2]
    const history = [
      { date: 1, mistakes: 2, passed: true }, // old entry, no snapshot
      {
        date: 2, mistakes: 2, passed: true,
        questions: [
          { id: q1.id, order: [0, 1, 2, 3] },
          { id: q2.id, order: [0, 1, 2, 3] },
          { id: q3.id, order: [0, 1, 2, 3] },
          { id: 99999, order: [0, 1, 2, 3] }, // not in bank → ignored
        ],
        picks: { [q1.id]: (q1.correct + 1) % 4, [q3.id]: q3.correct }, // q1 wrong, q2 unanswered, q3 right
      },
    ]
    const ids = collectMistakeIds(history, byId)
    expect(ids).toContain(q1.id)
    expect(ids).toContain(q2.id)
    expect(ids).not.toContain(q3.id)
    expect(ids).not.toContain(99999)
  })
})

describe('retry seeding', () => {
  it('sampleExam includes given retry ids, keeps proportions, no duplicates', () => {
    const bank = fakeBank()
    const byId = new Map(bank.map((q) => [q.id, q]))
    const retryIds = [bank[0].id, bank[45].id] // one traffic-laws, one signs (fakeBank layout: 40 tl, 20 signs, 20 safety, 10 vehicle)
    const exam = sampleExam(bank, 42, retryIds)
    expect(exam).toHaveLength(EXAM_SIZE)
    expect(new Set(exam.map((q) => q.id)).size).toBe(EXAM_SIZE)
    for (const id of retryIds) expect(exam.map((q) => q.id)).toContain(id)
    const counts: Record<string, number> = {}
    for (const eq of exam) {
      const c = byId.get(eq.id)!.category
      counts[c] = (counts[c] ?? 0) + 1
    }
    expect(counts).toEqual({ 'traffic-laws': 10, signs: 4, safety: 4, vehicle: 2 })
  })

  it('sampleExam ignores retry ids missing from the bank', () => {
    const exam = sampleExam(fakeBank(), 42, [99999])
    expect(exam).toHaveLength(EXAM_SIZE)
    expect(exam.map((q) => q.id)).not.toContain(99999)
  })

  it('createExam seeds past mistakes from history (both of 2 known wrongs appear)', () => {
    const bank = fakeBank()
    const wrong = [bank[50], bank[51]] // exactly 2 wrong ids -> both become retry seeds
    const history = [{
      date: 1, mistakes: 2, passed: true,
      questions: wrong.map((q) => ({ id: q.id, order: [0, 1, 2, 3] })),
      picks: Object.fromEntries(wrong.map((q) => [q.id, (q.correct + 1) % 4])),
    }]
    const state = createExam(bank, 42, 0, history)
    const seeded = state.questions.filter((eq) => wrong.some((w) => w.id === eq.id))
    expect(seeded.length).toBe(2)
  })

  it('createExam with empty history behaves like before', () => {
    const state = createExam(fakeBank(), 42, 0)
    expect(state.questions).toHaveLength(EXAM_SIZE)
  })
})
