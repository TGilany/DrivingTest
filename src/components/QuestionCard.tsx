import type { ExamQuestion, Question } from '../types'

export function QuestionCard({
  index, eq, q, pick, locked, onPick, onCheck,
}: {
  index: number
  eq: ExamQuestion
  q: Question | undefined
  pick: number | undefined
  locked: boolean
  onPick: (canonicalIndex: number) => void
  onCheck: () => void
}) {
  if (!q) return null
  return (
    <div className="rounded-xl bg-white p-7 shadow dark:bg-slate-900">
      <h2 className="text-[1.35rem] leading-snug font-semibold">
        <span className="mr-1 text-slate-500 dark:text-slate-400">{index + 1}.</span> {q.question}
      </h2>
      {q.image && (
        <img
          className="my-3 block w-full max-w-[400px] rounded-lg"
          src={`${import.meta.env.BASE_URL}images/${q.image}`}
          alt="Traffic sign or road scenario"
          onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
        />
      )}
      <div className="my-4 flex flex-col gap-2.5">
        {eq.order.map((canonical) => {
          let stateCls = 'border-transparent bg-slate-100 enabled:hover:bg-slate-200 dark:bg-slate-800 dark:enabled:hover:bg-slate-700'
          if (locked && canonical === q.correct) {
            stateCls = 'border-green-600 bg-green-50 dark:border-green-500 dark:bg-green-950'
          } else if (locked && pick === canonical) {
            stateCls = 'border-red-600 bg-red-50 dark:border-red-500 dark:bg-red-950'
          } else if (pick === canonical) {
            stateCls = 'border-blue-600 bg-blue-50 dark:border-blue-400 dark:bg-blue-950'
          }
          return (
            <button
              key={canonical}
              className={`rounded-lg border-2 px-4 py-3.5 text-left text-[1.05rem] disabled:cursor-default ${stateCls}`}
              disabled={locked}
              onClick={() => onPick(canonical)}
            >
              {q.answers[canonical]}
            </button>
          )
        })}
      </div>
      {!locked && (
        <button
          className="rounded-lg bg-amber-500 px-5 py-2.5 font-semibold text-slate-900 enabled:hover:bg-amber-400 disabled:cursor-default disabled:opacity-45"
          disabled={pick === undefined}
          onClick={onCheck}
        >
          Check answer
        </button>
      )}
      {locked && (
        <div className={`mt-3.5 rounded-lg border-l-4 bg-slate-100 p-3.5 dark:bg-slate-800 ${pick === q.correct ? 'border-green-600' : 'border-red-600'}`}>
          <strong>{pick === q.correct ? 'Correct!' : 'Wrong.'}</strong> {q.explanation}
        </div>
      )}
    </div>
  )
}
