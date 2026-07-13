import { useEffect, useMemo, useRef, useState } from 'react'
import bankJson from './data/questions.json'
import type { ExamResult, ExamState, Question } from './types'
import { createExam, grade } from './lib/exam'
import { loadState, saveState, clearState, loadHistory, addResult } from './lib/storage'
import { isExpired } from './lib/timer'
import { HomeScreen } from './components/HomeScreen'
import { ExamScreen } from './components/ExamScreen'
import { ResultsScreen } from './components/ResultsScreen'
import { ThemeToggle } from './components/ThemeToggle'

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
    return { name: 'exam', state: saved }
  })

  const submitted = useRef<ExamState | null>(null)
  function finish(state: ExamState): ExamState {
    if (submitted.current !== state) {
      submitted.current = state
      const { mistakes, passed } = grade(state, byId)
      addResult({ date: Date.now(), mistakes, passed, questions: state.questions, picks: state.picks })
      clearState()
    }
    return state
  }

  useEffect(() => {
    if (screen.name === 'exam' && isExpired(screen.state.deadline, Date.now())) {
      setScreen({ name: 'results', state: finish(screen.state) })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function startExam() {
    const state = createExam(bank, Math.floor(Math.random() * 2 ** 31), Date.now(), loadHistory())
    saveState(state)
    setScreen({ name: 'exam', state })
  }

  function reviewResult(r: ExamResult) {
    if (!r.questions) return
    const questions = r.questions.filter((q) => byId.has(q.id))
    if (questions.length === 0) return
    setScreen({
      name: 'results',
      state: { version: 1, deadline: r.date, questions, picks: r.picks ?? {}, locked: [] },
    })
  }

  let body
  if (screen.name === 'home') {
    body = <HomeScreen history={loadHistory()} onStart={startExam} onReview={reviewResult} />
  } else if (screen.name === 'exam') {
    body = (
      <ExamScreen
        key={screen.state.deadline}
        state={screen.state}
        byId={byId}
        setState={(s) => setScreen({ name: 'exam', state: s })}
        onSubmit={() => setScreen({ name: 'results', state: finish(screen.state) })}
        onNewExam={() => { clearState(); startExam() }}
      />
    )
  } else {
    body = (
      <ResultsScreen
        state={screen.state}
        byId={byId}
        onNewExam={startExam}
        onHome={() => setScreen({ name: 'home' })}
      />
    )
  }

  return (
    <>
      <ThemeToggle />
      <div className="mx-auto max-w-[1100px] p-5">{body}</div>
    </>
  )
}
