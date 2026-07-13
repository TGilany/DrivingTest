import type { Question, ExamQuestion, ExamState, GradedQuestion, ExamResult } from '../types'

export const EXAM_MS = 30 * 60 * 1000
export const PASS_MAX_MISTAKES = 4
export const EXAM_SIZE = 20

export const CATEGORY_COUNTS: Record<Question['category'], number> = {
  'traffic-laws': 10,
  safety: 4,
  signs: 4,
  vehicle: 2,
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffled<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function collectMistakeIds(history: ExamResult[], byId: Map<number, Question>): number[] {
  const wrong = new Set<number>()
  for (const r of history) {
    if (!r.questions) continue
    for (const eq of r.questions) {
      const q = byId.get(eq.id)
      if (!q) continue
      const pick = r.picks?.[eq.id] ?? null
      if (pick !== q.correct) wrong.add(eq.id)
    }
  }
  return [...wrong]
}

export function sampleExam(bank: Question[], seed: number, retryIds: number[] = []): ExamQuestion[] {
  const rng = mulberry32(seed)
  const byId = new Map(bank.map((q) => [q.id, q]))
  const retry = retryIds
    .map((id) => byId.get(id))
    .filter((q): q is Question => Boolean(q))
  const picked: ExamQuestion[] = []
  for (const [category, count] of Object.entries(CATEGORY_COUNTS)) {
    const seeded = retry.filter((q) => q.category === category).slice(0, count)
    const seededIds = new Set(seeded.map((q) => q.id))
    const pool = bank.filter((q) => q.category === category && !seededIds.has(q.id))
    const fill = shuffled(pool, rng).slice(0, count - seeded.length)
    for (const q of [...seeded, ...fill]) {
      picked.push({ id: q.id, order: shuffled([0, 1, 2, 3], rng) })
    }
  }
  return shuffled(picked, rng)
}

export function createExam(
  bank: Question[],
  seed: number,
  now: number,
  history: ExamResult[] = [],
): ExamState {
  const rng = mulberry32(seed ^ 0x9e3779b9)
  const byId = new Map(bank.map((q) => [q.id, q]))
  const retryIds = shuffled(collectMistakeIds(history, byId), rng).slice(0, 2)
  return {
    version: 1,
    deadline: now + EXAM_MS,
    questions: sampleExam(bank, seed, retryIds),
    picks: {},
    locked: [],
  }
}

export function grade(
  state: ExamState,
  byId: Map<number, Question>,
): { mistakes: number; passed: boolean; perQuestion: GradedQuestion[] } {
  const perQuestion: GradedQuestion[] = state.questions.map((eq) => {
    const q = byId.get(eq.id)!
    const pick = state.picks[eq.id] ?? null
    return { id: eq.id, pick, correct: q.correct, isMistake: pick !== q.correct }
  })
  const mistakes = perQuestion.filter((p) => p.isMistake).length
  return { mistakes, passed: mistakes <= PASS_MAX_MISTAKES, perQuestion }
}
