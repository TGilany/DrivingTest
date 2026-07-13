# Driving Refresher Exam App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Local React+Vite SPA simulating the Israeli driving refresher course exam in English: 20 questions, 30-minute timer, per-question check with explanation, pass with ≤4 mistakes, resume-on-refresh.

**Architecture:** The official English question bank (1803 questions) was scraped from gov.il's `DataGovProxy/GetDGResults` API via Playwright (raw dump: `scripts/bank_en_raw.json`). One-off Node scripts parse it and download its images; explanation agents add a booklet-grounded English explanation per question, producing `src/data/questions.json` bundled into the app. The SPA is a three-screen state machine (home → exam → results) with pure logic modules (`exam`, `storage`, `timer`) unit-tested via Vitest.

**Tech Stack:** Vite, React 19, TypeScript, Vitest. No backend, no router, no CSS framework.

> **Revision 2026-07-13:** gov.il publishes an official English version of the bank (user pointed this out). Tasks 2–4 were reworked: no translation needed — Task 2 parses the scraped English dump, Task 4 only generates explanations. React pinned to 19 (as scaffolded); spec only requires React.

## Global Constraints

- **No git.** User declined git init — no commits anywhere. Skip all commit steps.
- Exam: exactly 20 questions — traffic-laws ×10, safety ×4, signs ×4, vehicle ×2 (spec).
- Timer: 30 minutes, auto-submit at zero (spec).
- Pass: mistakes ≤ 4 (unanswered counts as mistake); fail: ≥ 5 (spec).
- Check = reveal + lock; counts toward score (spec).
- Persistence: localStorage, versioned keys `refresher-exam/state/v1`, `refresher-exam/history/v1` (spec).
- Every question has exactly 4 answers, 1 correct. Bank records that don't parse to exactly 4 answers are dropped with a log line.
- Images bundled locally under `public/images/` — no runtime gov.il requests.
- Data source: official English bank scraped from gov.il `POST /en/api/DataGovProxy/GetDGResults` (DynamicTemplateID `62df29a7-0ef1-480e-9a4d-cb58cfd301be`) via Playwright — raw dump committed as `scripts/bank_en_raw.json`. gov.il blob images need browser-like User-Agent header (verified working with curl).

## File Structure

```
package.json / vite.config.ts / tsconfig.json / index.html   — scaffold
scripts/parse-bank.mjs        — parse scraped English dump → scripts/bank.en.json
scripts/fetch-images.mjs      — download question images → public/images/
scripts/make-chunks.mjs       — split bank.en.json → scripts/chunks/chunk-NN.json
scripts/merge-explanations.mjs— merge scripts/explained/*.json + bank → src/data/questions.json (+validation)
src/types.ts                  — shared interfaces
src/lib/exam.ts (+.test.ts)   — RNG, sampling, grading
src/lib/storage.ts (+.test.ts)— localStorage persistence
src/lib/timer.ts (+.test.ts)  — deadline math + formatting
src/components/HomeScreen.tsx / ExamScreen.tsx / QuestionCard.tsx /
              TimerBar.tsx / ProgressStrip.tsx / ResultsScreen.tsx
src/App.tsx / src/main.tsx / src/styles.css
```

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/styles.css` (placeholder), `src/vite-env.d.ts`

**Interfaces:**
- Produces: running Vite dev server; `npm test` runs Vitest; `src/App.tsx` placeholder to be replaced in Task 8.

- [ ] **Step 1: Scaffold with npm**

Run in `/Users/tamir.gilany/Documents/DrivingTest`:
```bash
npm create vite@latest . -- --template react-ts
npm install
npm install -D vitest @vitest/ui jsdom @testing-library/react
```
(If `npm create vite` refuses non-empty dir because of `docs/`, scaffold into a temp dir and move files in — do not delete `docs/`.)

- [ ] **Step 2: Configure Vitest**

Replace `vite.config.ts`:
```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
  },
})
```

Add to `package.json` scripts: `"test": "vitest run"`.

- [ ] **Step 3: Verify dev server + tests run**

Run: `npm run build`
Expected: builds without errors.
Run: `npm test`
Expected: "No test files found" (exit code may be non-zero — fine, no tests yet).

---

### Task 2: Parse the English question bank

**Files:**
- Create: `scripts/parse-bank.mjs`
- Input artifact (already scraped by orchestrator via Playwright): `scripts/bank_en_raw.json` — array of `{ title2, html, category }`
- Output artifact: `scripts/bank.en.json`

**Interfaces:**
- Produces: `scripts/bank.en.json` — array of `{ id:number, category:'traffic-laws'|'signs'|'safety'|'vehicle', question:string, answers:string[4], correct:number(0-3), image:string|null (full URL), licenses:string[] }`.

- [ ] **Step 1: Write the script**

`scripts/parse-bank.mjs`:
```js
import { readFileSync, writeFileSync } from 'node:fs'

const CATEGORY = {
  'Rules and Regulations': 'traffic-laws',
  'Traffic Signs': 'signs',
  'Safety': 'safety',
  'Know Your Vehicle': 'vehicle',
}

const raw = JSON.parse(readFileSync('scripts/bank_en_raw.json', 'utf8'))

const strip = (html) => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
const dropped = []
const bank = []

for (const r of raw) {
  const m = r.title2.match(/^(\d+)\.\s*([\s\S]*)$/)
  if (!m) { dropped.push({ title: r.title2.slice(0, 40), why: 'no id in title2' }); continue }
  const id = parseInt(m[1], 10)
  const question = m[2].trim()
  const desc = r.html ?? ''
  const lis = [...desc.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((x) => x[1])
  if (lis.length !== 4) { dropped.push({ id, why: `${lis.length} answers` }); continue }
  const correct = lis.findIndex((h) => h.includes('id="correctAnswer'))
  if (correct === -1) { dropped.push({ id, why: 'no correct marker' }); continue }
  const answers = lis.map(strip)
  if (answers.some((a) => !a)) { dropped.push({ id, why: 'empty answer' }); continue }
  const img = desc.match(/<img src="([^"]+)"/)
  const category = CATEGORY[r.category]
  if (!category) { dropped.push({ id, why: `unknown category ${r.category}` }); continue }
  bank.push({
    id,
    category,
    question,
    answers,
    correct,
    image: img ? img[1] : null,
    licenses: [...desc.matchAll(/«([^»]+)»/g)].map((x) => x[1]),
  })
}

const ids = new Set(bank.map((q) => q.id))
if (ids.size !== bank.length) throw new Error('duplicate question ids')

bank.sort((a, b) => a.id - b.id)
writeFileSync('scripts/bank.en.json', JSON.stringify(bank, null, 1))
console.log(`kept ${bank.length}, dropped ${dropped.length}`)
if (dropped.length) console.log(JSON.stringify(dropped.slice(0, 20), null, 1))
const counts = {}
for (const q of bank) counts[q.category] = (counts[q.category] ?? 0) + 1
console.log(counts)
console.log('with image:', bank.filter((q) => q.image).length)
```

- [ ] **Step 2: Run and verify**

Run: `node scripts/parse-bank.mjs`
Expected: `kept` close to 1803 (small dropped count acceptable — log tells why), category counts near `{traffic-laws: ~902, signs: ~391, safety: ~400, vehicle: ~110}`, `with image:` near 600. Spot-check `scripts/bank.en.json` first record: English question, 4 non-empty English answers, `correct` between 0-3.

---

### Task 3: Download question images

**Files:**
- Create: `scripts/fetch-images.mjs`
- Output artifacts: `public/images/<id>.jpg` (~599 files)

**Interfaces:**
- Consumes: `scripts/bank.en.json` (`image` URLs).
- Produces: local image per question id; app renders `/images/<id>.jpg`.

- [ ] **Step 1: Write the script**

`scripts/fetch-images.mjs`:
```js
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'

const bank = JSON.parse(readFileSync('scripts/bank.en.json', 'utf8'))
mkdirSync('public/images', { recursive: true })

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  Accept: 'image/avif,image/webp,image/*,*/*',
  Referer: 'https://www.gov.il/',
}

const jobs = bank.filter((q) => q.image)
let ok = 0
const failed = []

for (let i = 0; i < jobs.length; i += 10) {
  await Promise.all(
    jobs.slice(i, i + 10).map(async (q) => {
      const path = `public/images/${q.id}.jpg`
      if (existsSync(path)) { ok++; return }
      try {
        const res = await fetch(q.image, { headers: HEADERS })
        if (!res.ok) throw new Error(String(res.status))
        writeFileSync(path, Buffer.from(await res.arrayBuffer()))
        ok++
      } catch (e) {
        failed.push({ id: q.id, url: q.image, err: String(e) })
      }
    }),
  )
  if (i % 100 === 0) console.log(`${i}/${jobs.length}`)
}
console.log(`ok ${ok}, failed ${failed.length}`)
if (failed.length) writeFileSync('scripts/images-failed.json', JSON.stringify(failed, null, 1))
```

- [ ] **Step 2: Run and verify**

Run: `node scripts/fetch-images.mjs`
Expected: `ok` ≈ count of image questions, `failed 0`. Script is idempotent — rerun on transient failures. If any URL persistently 403s, fetch those via Playwright browser as fallback.
Verify: `ls public/images | wc -l` matches, and `file public/images/1390.jpg` reports JPEG.

---

### Task 4: Generate explanations, assemble src/data/questions.json

> Driven by the MAIN session (orchestrator dispatches parallel explanation agents) — not a plan-executor subagent. Questions and answers are already official English — only the per-question explanation is generated, grounded in the refresher-course booklet notes (scraped separately) plus standard Israeli traffic law.

**Files:**
- Create: `scripts/make-chunks.mjs`, `scripts/merge-explanations.mjs`
- Intermediate: `scripts/chunks/chunk-NN.json` (input), `scripts/explained/chunk-NN.json` (agent output: `[{ id, explanation }]`)
- Output artifact: `src/data/questions.json`

**Interfaces:**
- Consumes: `scripts/bank.en.json`.
- Produces: `src/data/questions.json` — array of `Question` (see Task 5 `src/types.ts`): `{ id, category, question, answers[4], correct, explanation, image: "<id>.jpg"|null, licenses }`.

- [ ] **Step 1: Write chunk splitter**

`scripts/make-chunks.mjs`:
```js
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

const bank = JSON.parse(readFileSync('scripts/bank.en.json', 'utf8'))
mkdirSync('scripts/chunks', { recursive: true })
mkdirSync('scripts/explained', { recursive: true })
const SIZE = 100
for (let i = 0; i * SIZE < bank.length; i++) {
  const chunk = bank.slice(i * SIZE, (i + 1) * SIZE).map((q) => ({
    id: q.id,
    category: q.category,
    question: q.question,
    answers: q.answers,
    correct: q.correct,
    hasImage: Boolean(q.image),
  }))
  writeFileSync(
    `scripts/chunks/chunk-${String(i).padStart(2, '0')}.json`,
    JSON.stringify(chunk, null, 1),
  )
}
console.log('chunks written:', Math.ceil(bank.length / SIZE))
```

Run: `node scripts/make-chunks.mjs` → expected `chunks written: 19` (for 1803).

- [ ] **Step 2: Dispatch explanation agents (main session)**

One agent per chunk, parallel background dispatch. Each agent prompt:

> Read `scripts/chunks/chunk-NN.json` — official English questions from the Israeli driving-theory exam bank, each with 4 answers and the correct answer index. Also read the booklet notes at [booklet notes path] for course grounding. Write `scripts/explained/chunk-NN.json`: a JSON array with one object per input item, same order, schema: `{ "id": <same>, "explanation": "<1-2 sentences explaining why the answer at index correct is right>" }`. Rules: plain exam-prep English; explain the rule/principle, do not merely restate the answer; do not reference answer letters/positions; for hasImage questions the question refers to a traffic-sign/scenario photo; output only via the Write tool, valid JSON.

- [ ] **Step 3: Write merge + validation script**

`scripts/merge-explanations.mjs`:
```js
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs'

const bank = JSON.parse(readFileSync('scripts/bank.en.json', 'utf8'))
const explanations = new Map()
const problems = []

for (const f of readdirSync('scripts/explained').sort()) {
  const chunk = JSON.parse(readFileSync(`scripts/explained/${f}`, 'utf8'))
  for (const t of chunk) {
    if (typeof t.explanation !== 'string' || t.explanation.trim().length < 20)
      { problems.push(`${f}: id ${t.id} bad explanation`); continue }
    explanations.set(t.id, t.explanation.trim())
  }
}

const missing = bank.filter((q) => !explanations.has(q.id))
console.log(`explained ${explanations.size}/${bank.length}, problems ${problems.length}, missing ${missing.length}`)
if (problems.length) console.log(problems.slice(0, 30).join('\n'))
if (missing.length) console.log('missing ids:', missing.slice(0, 30).map((q) => q.id).join(','))
if (problems.length || missing.length) process.exit(1)

const out = bank.map((q) => ({
  ...q,
  explanation: explanations.get(q.id),
  image: q.image ? `${q.id}.jpg` : null,
}))
mkdirSync('src/data', { recursive: true })
writeFileSync('src/data/questions.json', JSON.stringify(out))
console.log('src/data/questions.json written')
```

- [ ] **Step 4: Run merge, fix failures**

Run: `node scripts/merge-explanations.mjs`
Expected: `explained 1803/1803, problems 0, missing 0` (numbers match kept count from Task 2). On problems: re-dispatch an agent for only the failing ids/chunks, rerun merge until clean.

- [ ] **Step 5: Spot-check explanation quality**

Open 5 random entries in `src/data/questions.json`: explanation states the rule behind the correct answer, no answer-letter references, decent English. Fix any systematic issue by re-dispatching affected chunks.

---

### Task 5: Types + exam logic (sampling, grading)

**Files:**
- Create: `src/types.ts`, `src/lib/exam.ts`
- Test: `src/lib/exam.test.ts`

**Interfaces:**
- Produces:
  - `src/types.ts`: `Question`, `ExamQuestion { id: number; order: number[] }`, `ExamState { version: 1; deadline: number; questions: ExamQuestion[]; picks: Record<number, number>; locked: number[] }`, `ExamResult { date: number; mistakes: number; passed: boolean }`, `GradedQuestion { id: number; pick: number | null; correct: number; isMistake: boolean }`.
  - `src/lib/exam.ts`: `EXAM_MS = 30*60*1000`, `PASS_MAX_MISTAKES = 4`, `EXAM_SIZE = 20`, `mulberry32(seed: number): () => number`, `sampleExam(bank: Question[], seed: number): ExamQuestion[]`, `createExam(bank: Question[], seed: number, now: number): ExamState`, `grade(state: ExamState, byId: Map<number, Question>): { mistakes: number; passed: boolean; perQuestion: GradedQuestion[] }`.
  - `picks` maps question id → **canonical** answer index (0–3 in the unshuffled `answers` array).

- [ ] **Step 1: Write `src/types.ts`**

```ts
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
}

export interface GradedQuestion {
  id: number
  pick: number | null
  correct: number
  isMistake: boolean
}
```

- [ ] **Step 2: Write failing tests**

`src/lib/exam.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import type { Question, ExamState } from '../types'
import { sampleExam, createExam, grade, mulberry32, EXAM_SIZE, EXAM_MS } from './exam'

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
```

- [ ] **Step 3: Run tests, verify they fail**

Run: `npm test -- src/lib/exam.test.ts`
Expected: FAIL — cannot resolve `./exam`.

- [ ] **Step 4: Implement `src/lib/exam.ts`**

```ts
import type { Question, ExamQuestion, ExamState, GradedQuestion } from '../types'

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

export function sampleExam(bank: Question[], seed: number): ExamQuestion[] {
  const rng = mulberry32(seed)
  const picked: ExamQuestion[] = []
  for (const [category, count] of Object.entries(CATEGORY_COUNTS)) {
    const pool = bank.filter((q) => q.category === category)
    for (const q of shuffled(pool, rng).slice(0, count)) {
      picked.push({ id: q.id, order: shuffled([0, 1, 2, 3], rng) })
    }
  }
  return shuffled(picked, rng)
}

export function createExam(bank: Question[], seed: number, now: number): ExamState {
  return {
    version: 1,
    deadline: now + EXAM_MS,
    questions: sampleExam(bank, seed),
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
```

- [ ] **Step 5: Run tests, verify pass**

Run: `npm test -- src/lib/exam.test.ts`
Expected: all PASS.

---

### Task 6: Storage

**Files:**
- Create: `src/lib/storage.ts`
- Test: `src/lib/storage.test.ts`

**Interfaces:**
- Consumes: `ExamState`, `ExamResult` from `src/types.ts`.
- Produces: `loadState(): ExamState | null`, `saveState(s: ExamState): void`, `clearState(): void`, `loadHistory(): ExamResult[]`, `addResult(r: ExamResult): void`. Keys: `refresher-exam/state/v1`, `refresher-exam/history/v1`.

- [ ] **Step 1: Write failing tests**

`src/lib/storage.test.ts`:
```ts
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

  it('returns null and clears on corrupt JSON', () => {
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
})
```

- [ ] **Step 2: Run tests, verify fail**

Run: `npm test -- src/lib/storage.test.ts`
Expected: FAIL — cannot resolve `./storage`.

- [ ] **Step 3: Implement `src/lib/storage.ts`**

```ts
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
    return Array.isArray(h) ? h : []
  } catch {
    return []
  }
}

export function addResult(r: ExamResult): void {
  localStorage.setItem(HISTORY_KEY, JSON.stringify([r, ...loadHistory()]))
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npm test -- src/lib/storage.test.ts`
Expected: all PASS.

---

### Task 7: Timer helpers

**Files:**
- Create: `src/lib/timer.ts`
- Test: `src/lib/timer.test.ts`

**Interfaces:**
- Produces: `remainingMs(deadline: number, now: number): number` (never negative), `formatMMSS(ms: number): string` (`"29:05"`), `isExpired(deadline: number, now: number): boolean`.

- [ ] **Step 1: Write failing tests**

`src/lib/timer.test.ts`:
```ts
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
```

- [ ] **Step 2: Run tests, verify fail**

Run: `npm test -- src/lib/timer.test.ts`
Expected: FAIL — cannot resolve `./timer`.

- [ ] **Step 3: Implement `src/lib/timer.ts`**

```ts
export function remainingMs(deadline: number, now: number): number {
  return Math.max(0, deadline - now)
}

export function formatMMSS(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const mm = String(Math.floor(totalSec / 60)).padStart(2, '0')
  const ss = String(totalSec % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

export function isExpired(deadline: number, now: number): boolean {
  return remainingMs(deadline, now) === 0
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npm test -- src/lib/timer.test.ts`
Expected: all PASS.

---

### Task 8: UI — components, App wiring, styles

**Files:**
- Create: `src/components/HomeScreen.tsx`, `src/components/ExamScreen.tsx`, `src/components/QuestionCard.tsx`, `src/components/TimerBar.tsx`, `src/components/ProgressStrip.tsx`, `src/components/ResultsScreen.tsx`
- Modify: `src/App.tsx`, `src/main.tsx`, `src/styles.css`, `index.html` (title "Driving Refresher Exam")

**Interfaces:**
- Consumes: everything from Tasks 4–7 (`questions.json`, `exam.ts`, `storage.ts`, `timer.ts`).
- Produces: working app. `App` owns screen state: `{ screen: 'home' } | { screen: 'exam'; state: ExamState } | { screen: 'results'; state: ExamState }`.

- [ ] **Step 1: `src/components/TimerBar.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { remainingMs, formatMMSS } from '../lib/timer'

export function TimerBar({ deadline, onExpire }: { deadline: number; onExpire: () => void }) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(t)
  }, [])

  const ms = remainingMs(deadline, now)

  useEffect(() => {
    if (ms === 0) onExpire()
  }, [ms === 0])

  return (
    <div className={`timer ${ms < 5 * 60_000 ? 'timer-low' : ''}`}>
      ⏱ {formatMMSS(ms)}
    </div>
  )
}
```

- [ ] **Step 2: `src/components/ProgressStrip.tsx`**

Dot per question: gray = unanswered, blue = answered, green/red = checked right/wrong. Click jumps to question.

```tsx
import type { ExamState, Question } from '../types'

export function ProgressStrip({
  state, byId, current, onJump,
}: {
  state: ExamState
  byId: Map<number, Question>
  current: number
  onJump: (index: number) => void
}) {
  return (
    <div className="progress-strip">
      {state.questions.map((eq, i) => {
        const pick = state.picks[eq.id]
        const isLocked = state.locked.includes(eq.id)
        let cls = 'dot'
        if (isLocked) cls += pick === byId.get(eq.id)!.correct ? ' dot-right' : ' dot-wrong'
        else if (pick !== undefined) cls += ' dot-answered'
        if (i === current) cls += ' dot-current'
        return (
          <button key={eq.id} className={cls} onClick={() => onJump(i)} aria-label={`Question ${i + 1}`}>
            {i + 1}
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: `src/components/QuestionCard.tsx`**

```tsx
import type { ExamQuestion, Question } from '../types'

export function QuestionCard({
  index, eq, q, pick, locked, onPick, onCheck,
}: {
  index: number
  eq: ExamQuestion
  q: Question
  pick: number | undefined
  locked: boolean
  onPick: (canonicalIndex: number) => void
  onCheck: () => void
}) {
  return (
    <div className="question-card">
      <h2>
        <span className="q-num">{index + 1}.</span> {q.question}
      </h2>
      {q.image && (
        <img
          className="q-image"
          src={`${import.meta.env.BASE_URL}images/${q.image}`}
          alt="Traffic sign or road scenario"
          onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
        />
      )}
      <div className="answers">
        {eq.order.map((canonical) => {
          let cls = 'answer'
          if (pick === canonical) cls += ' answer-picked'
          if (locked && canonical === q.correct) cls += ' answer-correct'
          if (locked && pick === canonical && canonical !== q.correct) cls += ' answer-wrong'
          return (
            <button key={canonical} className={cls} disabled={locked} onClick={() => onPick(canonical)}>
              {q.answers[canonical]}
            </button>
          )
        })}
      </div>
      {!locked && (
        <button className="check-btn" disabled={pick === undefined} onClick={onCheck}>
          Check answer
        </button>
      )}
      {locked && (
        <div className={`explanation ${pick === q.correct ? 'explanation-right' : 'explanation-wrong'}`}>
          <strong>{pick === q.correct ? 'Correct!' : 'Wrong.'}</strong> {q.explanation}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: `src/components/ExamScreen.tsx`**

```tsx
import { useState } from 'react'
import type { ExamState, Question } from '../types'
import { saveState } from '../lib/storage'
import { TimerBar } from './TimerBar'
import { ProgressStrip } from './ProgressStrip'
import { QuestionCard } from './QuestionCard'

export function ExamScreen({
  state, byId, onSubmit, onNewExam, setState,
}: {
  state: ExamState
  byId: Map<number, Question>
  onSubmit: () => void
  onNewExam: () => void
  setState: (s: ExamState) => void
}) {
  const [current, setCurrent] = useState(0)
  const eq = state.questions[current]
  const q = byId.get(eq.id)!

  const update = (next: ExamState) => {
    saveState(next)
    setState(next)
  }

  const answered = Object.keys(state.picks).length

  return (
    <div className="exam-screen">
      <header className="exam-header">
        <TimerBar deadline={state.deadline} onExpire={onSubmit} />
        <span className="answered-count">{answered}/20 answered</span>
        <button
          className="ghost-btn"
          onClick={() => confirm('Abandon this exam and start a new one?') && onNewExam()}
        >
          New exam
        </button>
      </header>
      <ProgressStrip state={state} byId={byId} current={current} onJump={setCurrent} />
      <QuestionCard
        index={current}
        eq={eq}
        q={q}
        pick={state.picks[eq.id]}
        locked={state.locked.includes(eq.id)}
        onPick={(i) => update({ ...state, picks: { ...state.picks, [eq.id]: i } })}
        onCheck={() => update({ ...state, locked: [...state.locked, eq.id] })}
      />
      <footer className="exam-footer">
        <button className="ghost-btn" disabled={current === 0} onClick={() => setCurrent(current - 1)}>
          ← Previous
        </button>
        <button
          className="finish-btn"
          onClick={() =>
            (answered === 20 || confirm(`${20 - answered} questions unanswered — they count as mistakes. Finish anyway?`)) &&
            onSubmit()
          }
        >
          Finish exam
        </button>
        <button className="ghost-btn" disabled={current === 19} onClick={() => setCurrent(current + 1)}>
          Next →
        </button>
      </footer>
    </div>
  )
}
```

- [ ] **Step 5: `src/components/ResultsScreen.tsx`**

```tsx
import type { ExamState, Question } from '../types'
import { grade, PASS_MAX_MISTAKES } from '../lib/exam'

export function ResultsScreen({
  state, byId, onNewExam, onHome,
}: {
  state: ExamState
  byId: Map<number, Question>
  onNewExam: () => void
  onHome: () => void
}) {
  const { mistakes, passed, perQuestion } = grade(state, byId)

  return (
    <div className="results-screen">
      <div className={`banner ${passed ? 'banner-pass' : 'banner-fail'}`}>
        <h1>{passed ? 'PASSED ✓' : 'FAILED ✗'}</h1>
        <p>
          {mistakes} mistake{mistakes === 1 ? '' : 's'} out of 20 (up to {PASS_MAX_MISTAKES} allowed)
        </p>
      </div>
      <div className="actions">
        <button className="primary-btn" onClick={onNewExam}>Start new exam</button>
        <button className="ghost-btn" onClick={onHome}>Home</button>
      </div>
      <div className="review">
        {perQuestion.map((g, i) => {
          const q = byId.get(g.id)!
          return (
            <div key={g.id} className={`review-item ${g.isMistake ? 'review-wrong' : 'review-right'}`}>
              <h3>{i + 1}. {q.question}</h3>
              {q.image && (
                <img className="q-image-small" src={`${import.meta.env.BASE_URL}images/${q.image}`} alt="" />
              )}
              <p>
                <strong>Your answer:</strong>{' '}
                {g.pick === null ? <em>not answered</em> : q.answers[g.pick]}
              </p>
              {g.isMistake && <p><strong>Correct answer:</strong> {q.answers[q.correct]}</p>}
              <p className="explanation">{q.explanation}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: `src/components/HomeScreen.tsx`**

```tsx
import type { ExamResult } from '../types'

export function HomeScreen({ history, onStart }: { history: ExamResult[]; onStart: () => void }) {
  return (
    <div className="home-screen">
      <h1>Driving Refresher Exam</h1>
      <p className="subtitle">
        English practice exam for the Israeli driving refresher course (השתלמות רענון בנהיגה).
        20 questions · 30 minutes · pass with up to 4 mistakes.
      </p>
      <button className="primary-btn" onClick={onStart}>Start exam</button>
      {history.length > 0 && (
        <div className="history">
          <h2>Past exams</h2>
          <table>
            <thead>
              <tr><th>Date</th><th>Mistakes</th><th>Result</th></tr>
            </thead>
            <tbody>
              {history.map((r) => (
                <tr key={r.date}>
                  <td>{new Date(r.date).toLocaleString()}</td>
                  <td>{r.mistakes}/20</td>
                  <td className={r.passed ? 'pass' : 'fail'}>{r.passed ? 'Pass' : 'Fail'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 7: `src/App.tsx`**

```tsx
import { useMemo, useState } from 'react'
import bankJson from './data/questions.json'
import type { ExamState, Question } from './types'
import { createExam, grade } from './lib/exam'
import { loadState, saveState, clearState, loadHistory, addResult } from './lib/storage'
import { isExpired } from './lib/timer'
import { HomeScreen } from './components/HomeScreen'
import { ExamScreen } from './components/ExamScreen'
import { ResultsScreen } from './components/ResultsScreen'

const bank = bankJson as Question[]

type Screen =
  | { name: 'home' }
  | { name: 'exam'; state: ExamState }
  | { name: 'results'; state: ExamState }

export default function App() {
  const byId = useMemo(() => new Map(bank.map((q) => [q.id, q])), [])
  const [screen, setScreen] = useState<Screen>(() => {
    const saved = loadState()
    if (!saved) return { name: 'home' }
    if (isExpired(saved.deadline, Date.now())) return { name: 'results', state: finish(saved) }
    return { name: 'exam', state: saved }
  })

  function finish(state: ExamState): ExamState {
    const { mistakes, passed } = grade(state, byId)
    addResult({ date: Date.now(), mistakes, passed })
    clearState()
    return state
  }

  function startExam() {
    const state = createExam(bank, Math.floor(Math.random() * 2 ** 31), Date.now())
    saveState(state)
    setScreen({ name: 'exam', state })
  }

  if (screen.name === 'home') return <HomeScreen history={loadHistory()} onStart={startExam} />

  if (screen.name === 'exam')
    return (
      <ExamScreen
        state={screen.state}
        byId={byId}
        setState={(s) => setScreen({ name: 'exam', state: s })}
        onSubmit={() => setScreen({ name: 'results', state: finish(screen.state) })}
        onNewExam={() => { clearState(); startExam() }}
      />
    )

  return (
    <ResultsScreen
      state={screen.state}
      byId={byId}
      onNewExam={startExam}
      onHome={() => setScreen({ name: 'home' })}
    />
  )
}
```

`finish` is defined inside `App` (needs `byId`). Double-submit guard: `finish` is only reachable once because `onSubmit` replaces the screen; `TimerBar.onExpire` fires once on the exam screen.

- [ ] **Step 8: `src/main.tsx` + `index.html` + `src/styles.css`**

`src/main.tsx`:
```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

`index.html`: set `<title>Driving Refresher Exam</title>`, `<html lang="en">`.

`src/styles.css` — clean, readable, mobile-friendly. Complete stylesheet:
```css
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  background: #f4f6f8;
  color: #1a2330;
}
#root { max-width: 760px; margin: 0 auto; padding: 16px; }
h1 { font-size: 1.6rem; }
button { font: inherit; cursor: pointer; }

.primary-btn {
  background: #1565c0; color: #fff; border: 0; border-radius: 8px;
  padding: 12px 28px; font-size: 1.05rem;
}
.primary-btn:hover { background: #0d4f9e; }
.ghost-btn {
  background: transparent; border: 1px solid #b7c2cf; border-radius: 8px; padding: 8px 16px;
}
.finish-btn {
  background: #2e7d32; color: #fff; border: 0; border-radius: 8px; padding: 10px 22px;
}

.exam-header { display: flex; align-items: center; gap: 12px; justify-content: space-between; }
.timer { font-size: 1.3rem; font-variant-numeric: tabular-nums; font-weight: 600; }
.timer-low { color: #c62828; }

.progress-strip { display: flex; flex-wrap: wrap; gap: 6px; margin: 14px 0; }
.dot {
  width: 32px; height: 32px; border-radius: 50%; border: 1px solid #b7c2cf;
  background: #fff; font-size: 0.8rem; padding: 0;
}
.dot-answered { background: #bbdefb; }
.dot-right { background: #c8e6c9; border-color: #2e7d32; }
.dot-wrong { background: #ffcdd2; border-color: #c62828; }
.dot-current { outline: 3px solid #1565c0; }

.question-card { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
.question-card h2 { font-size: 1.15rem; margin-top: 0; }
.q-image { max-width: 320px; width: 100%; display: block; margin: 10px 0; border-radius: 8px; }
.q-image-small { max-width: 200px; display: block; margin: 6px 0; border-radius: 6px; }

.answers { display: flex; flex-direction: column; gap: 8px; margin: 14px 0; }
.answer {
  text-align: left; background: #f4f6f8; border: 2px solid transparent;
  border-radius: 8px; padding: 12px 14px;
}
.answer:hover:not(:disabled) { background: #e8edf2; }
.answer-picked { border-color: #1565c0; background: #e3f0fd; }
.answer-correct { border-color: #2e7d32; background: #e6f4e7; }
.answer-wrong { border-color: #c62828; background: #fdeaea; }
.answer:disabled { cursor: default; }

.check-btn {
  background: #f9a825; border: 0; border-radius: 8px; padding: 10px 20px; font-weight: 600;
}
.check-btn:disabled { opacity: 0.45; cursor: default; }

.explanation { margin-top: 12px; padding: 12px; border-radius: 8px; background: #f4f6f8; }
.explanation-right { border-left: 4px solid #2e7d32; }
.explanation-wrong { border-left: 4px solid #c62828; }

.exam-footer { display: flex; justify-content: space-between; margin-top: 16px; }

.banner { text-align: center; border-radius: 12px; padding: 24px; margin-bottom: 16px; }
.banner-pass { background: #e6f4e7; border: 2px solid #2e7d32; }
.banner-fail { background: #fdeaea; border: 2px solid #c62828; }
.actions { display: flex; gap: 10px; justify-content: center; margin-bottom: 20px; }

.review-item { background: #fff; border-radius: 10px; padding: 16px; margin-bottom: 10px; }
.review-item h3 { margin-top: 0; font-size: 1rem; }
.review-wrong { border-left: 5px solid #c62828; }
.review-right { border-left: 5px solid #2e7d32; }

.history table { width: 100%; border-collapse: collapse; margin-top: 8px; }
.history th, .history td { text-align: left; padding: 6px 10px; border-bottom: 1px solid #dde4ea; }
.pass { color: #2e7d32; font-weight: 600; }
.fail { color: #c62828; font-weight: 600; }
.subtitle { color: #51606f; }
```

Delete scaffold leftovers: `src/App.css`, `src/index.css`, `src/assets/` (if created by template).

- [ ] **Step 9: Verify build + tests**

Run: `npm test`
Expected: all suites pass.
Run: `npm run build`
Expected: builds clean, no TS errors.

---

### Task 9: End-to-end verification (Playwright browser)

**Files:** none (verification only)

- [ ] **Step 1: Start app**

Run: `npm run dev` (background). Open `http://localhost:5173` in Playwright browser.

- [ ] **Step 2: Verify core flow**

- Home: title + Start exam button visible.
- Start exam → 20 dots, timer near 30:00 counting down.
- Question shows 4 answers; image questions render local image.
- Pick answer → Check → correct/wrong highlight + explanation, answers disabled.
- Navigate Next/Previous and via dots.

- [ ] **Step 3: Verify persistence**

- Answer + check ~3 questions, reload page → same exam, same picks/locks, timer continued (not reset to 30:00).

- [ ] **Step 4: Verify grading + boundary**

- Finish exam (confirm dialog for unanswered) → results.
- Unanswered counted as mistakes; ≤4 mistakes shows PASSED, ≥5 FAILED (drive one exam to each side, or verify via a temporary manipulated localStorage state).
- Results list shows your answer, correct answer, explanation per question.

- [ ] **Step 5: Verify new exam + history**

- Start new exam → different question set, timer reset, previous result in Home history.
- Timer expiry path: set localStorage state deadline to past, reload → auto-submitted results.

---

## Self-Review (completed)

- **Spec coverage:** data pipeline (T2–T4), translation+explanations (T4), sampling proportions (T5), check+lock (T8 QuestionCard/ExamScreen), 30-min auto-submit (T8 TimerBar + App expired-on-load), pass rule boundary (T5 tests), persistence/resume (T6 + T8 + T9), new exam (T8), images local (T3), history (T6/T8). Out-of-scope items untouched. ✓
- **Placeholder scan:** none. ✓
- **Type consistency:** `ExamState.picks` canonical-index convention consistent across QuestionCard (`onPick(canonical)`), grade, tests. `EXAM_MS`/`EXAM_SIZE`/`PASS_MAX_MISTAKES` names consistent. ✓
