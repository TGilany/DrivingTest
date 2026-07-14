import { describe, it, expect } from 'vitest'
import type { ExamResult, Question } from '../types'
import { summarizeProgress } from './progress'

function fakeBank(): Question[] {
  return [
    { id: 1, category: 'traffic-laws', question: 'q1', answers: ['a'], correct: 0, explanation: 'e', image: null, licenses: [] },
    { id: 2, category: 'traffic-laws', question: 'q2', answers: ['a'], correct: 0, explanation: 'e', image: null, licenses: [] },
    { id: 3, category: 'signs', question: 'q3', answers: ['a'], correct: 0, explanation: 'e', image: null, licenses: [] },
    { id: 4, category: 'safety', question: 'q4', answers: ['a'], correct: 0, explanation: 'e', image: null, licenses: [] },
    { id: 5, category: 'vehicle', question: 'q5', answers: ['a'], correct: 0, explanation: 'e', image: null, licenses: [] },
  ]
}

describe('summarizeProgress', () => {
  it('summarizes exams, pass rate, and subject coverage from history snapshots', () => {
    const history: ExamResult[] = [
      {
        date: 1,
        mistakes: 2,
        passed: true,
        questions: [{ id: 1, order: [0, 1, 2, 3] }, { id: 2, order: [0, 1, 2, 3] }, { id: 3, order: [0, 1, 2, 3] }],
        picks: { 1: 0, 2: 0, 3: 0 },
      },
      {
        date: 2,
        mistakes: 5,
        passed: false,
        questions: [{ id: 1, order: [0, 1, 2, 3] }, { id: 4, order: [0, 1, 2, 3] }, { id: 5, order: [0, 1, 2, 3] }],
        picks: { 1: 1, 4: 0, 5: 0 },
      },
    ]

    const stats = summarizeProgress(fakeBank(), history)

    expect(stats.examsTaken).toBe(2)
    expect(stats.passedExams).toBe(1)
    expect(stats.passRate).toBe(50)
    expect(stats.uniqueQuestionsSeen).toBe(5)
    expect(stats.subjectCoverage).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ category: 'traffic-laws', covered: 2, total: 2, percentage: 100 }),
        expect.objectContaining({ category: 'signs', covered: 1, total: 1, percentage: 100 }),
        expect.objectContaining({ category: 'safety', covered: 1, total: 1, percentage: 100 }),
        expect.objectContaining({ category: 'vehicle', covered: 1, total: 1, percentage: 100 }),
      ]),
    )
  })
})
