import type { ExamResult, Question } from '../types'

export interface SubjectCoverage {
  category: Question['category']
  covered: number
  total: number
  percentage: number
}

export interface ProgressSummary {
  examsTaken: number
  passedExams: number
  passRate: number
  uniqueQuestionsSeen: number
  subjectCoverage: SubjectCoverage[]
}

const CATEGORY_ORDER: Question['category'][] = ['traffic-laws', 'signs', 'safety', 'vehicle']

export function summarizeProgress(bank: Question[], history: ExamResult[]): ProgressSummary {
  const byId = new Map(bank.map((q) => [q.id, q]))
  const seenQuestionIds = new Set<number>()

  for (const result of history) {
    if (!result.questions) continue
    for (const examQuestion of result.questions) {
      if (byId.has(examQuestion.id)) {
        seenQuestionIds.add(examQuestion.id)
      }
    }
  }

  const subjectCoverage = CATEGORY_ORDER.filter((category) => bank.some((q) => q.category === category)).map((category) => {
    const total = bank.filter((q) => q.category === category).length
    const covered = [...seenQuestionIds].filter((id) => byId.get(id)?.category === category).length
    return {
      category,
      covered,
      total,
      percentage: total === 0 ? 0 : Math.round((covered / total) * 100),
    }
  })

  return {
    examsTaken: history.length,
    passedExams: history.filter((result) => result.passed).length,
    passRate: history.length === 0 ? 0 : Math.round((history.filter((result) => result.passed).length / history.length) * 100),
    uniqueQuestionsSeen: seenQuestionIds.size,
    subjectCoverage,
  }
}
