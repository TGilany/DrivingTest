export interface Question {
  id: number
  category: 'traffic-laws' | 'signs' | 'safety' | 'vehicle'
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
