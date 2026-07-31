export type QuestionCategory = 'traffic-laws' | 'signs' | 'safety' | 'vehicle'

export const BOOKLET_CATEGORY_LABELS: Record<QuestionCategory, string> = {
  'traffic-laws': 'Legal Basis & Traffic Statutes (Unit 1)',
  'safety': 'Human Factor & Driving Safety (Units 2-4)',
  'signs': 'Schedule of Road Signs (Unit 5)',
  'vehicle': 'Driver & Modern Vehicle (Unit 6)',
}

export interface Question {
  id: number
  category: QuestionCategory
  question: string
  answers: string[]
  correct: number
  explanation: string
  image: string | null
  licenses: string[]
}

export interface ExamQuestion {
  id: number
  order: number[]
}

export interface ExamState {
  version: 1
  deadline: number
  questions: ExamQuestion[]
  picks: Record<number, number>
  locked: number[]
}

export interface ExamResult {
  date: number
  mistakes: number
  passed: boolean
  questions?: ExamQuestion[]
  picks?: Record<number, number>
}

export interface GradedQuestion {
  id: number
  pick: number | null
  correct: number
  isMistake: boolean
}
