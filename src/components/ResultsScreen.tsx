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
    <div>
      <div
        className={`mb-4 rounded-xl border-2 p-6 text-center ${
          passed
            ? 'border-green-600 bg-green-50 dark:border-green-500 dark:bg-green-950'
            : 'border-red-600 bg-red-50 dark:border-red-500 dark:bg-red-950'
        }`}
      >
        <h1 className="text-3xl font-bold">{passed ? 'PASSED ✓' : 'FAILED ✗'}</h1>
        <p className="mt-2">
          {mistakes} mistake{mistakes === 1 ? '' : 's'} out of {state.questions.length} (up to {PASS_MAX_MISTAKES} allowed)
        </p>
      </div>
      <div className="mb-5 flex justify-center gap-2.5">
        <button
          className="rounded-lg bg-blue-700 px-7 py-3 text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
          onClick={onNewExam}
        >
          Start new exam
        </button>
        <button
          className="rounded-lg border border-slate-300 px-4 py-2 hover:bg-slate-200 dark:border-slate-600 dark:hover:bg-slate-800"
          onClick={onHome}
        >
          Home
        </button>
      </div>
      <div>
        {perQuestion.map((g, i) => {
          const q = byId.get(g.id)!
          return (
            <div
              key={g.id}
              className={`mb-2.5 rounded-lg border-l-4 bg-white p-4 dark:bg-slate-900 ${g.isMistake ? 'border-red-600' : 'border-green-600'}`}
            >
              <h3 className="text-[1.05rem] font-semibold">{i + 1}. {q.question}</h3>
              {q.image && (
                <img
                  className="my-1.5 block max-w-[220px] rounded-md"
                  src={`${import.meta.env.BASE_URL}images/${q.image}`}
                  alt=""
                  onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
                />
              )}
              <p className="my-1">
                <strong>Your answer:</strong>{' '}
                {g.pick === null ? <em>not answered</em> : q.answers[g.pick]}
              </p>
              {g.isMistake && (
                <p className="my-1">
                  <strong>Correct answer:</strong> {q.answers[q.correct]}
                </p>
              )}
              <p className="my-1 text-slate-600 dark:text-slate-300">{q.explanation}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
