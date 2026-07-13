import type { ExamState, ExamResult } from '../types'

const STATE_KEY = 'refresher-exam/state/v1'
const HISTORY_KEY = 'refresher-exam/history/v1'

export function loadState(): ExamState | null {
  try {
    const raw = localStorage.getItem(STATE_KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as ExamState
    if (s.version !== 1 || !Array.isArray(s.questions)) return null
    return s
  } catch {
    return null
  }
}

export function saveState(s: ExamState): void {
  localStorage.setItem(STATE_KEY, JSON.stringify(s))
}

export function clearState(): void {
  localStorage.removeItem(STATE_KEY)
}

export function loadHistory(): ExamResult[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const h = JSON.parse(raw)
    if (!Array.isArray(h)) return []
    return h.filter(
      (r) =>
        r &&
        typeof r.date === 'number' &&
        typeof r.mistakes === 'number' &&
        typeof r.passed === 'boolean' &&
        (r.questions === undefined || Array.isArray(r.questions)),
    )
  } catch {
    return []
  }
}

export function addResult(r: ExamResult): void {
  localStorage.setItem(HISTORY_KEY, JSON.stringify([r, ...loadHistory()]))
}
