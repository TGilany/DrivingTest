import type { ExamResult } from '../types'

export function HomeScreen({
  history, onStart, onReview,
}: {
  history: ExamResult[]
  onStart: () => void
  onReview: (r: ExamResult) => void
}) {
  return (
    <div>
      <h1 className="text-3xl font-bold">Driving Refresher Exam</h1>
      <p className="my-3 text-slate-500 dark:text-slate-400">
        English practice exam for the Israeli driving refresher course (השתלמות רענון בנהיגה).
        20 questions · 30 minutes · pass with up to 4 mistakes.
      </p>
      <button
        className="rounded-lg bg-blue-700 px-7 py-3 text-lg text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
        onClick={onStart}
      >
        Start exam
      </button>
      {history.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold">Past exams</h2>
          <table className="mt-2 w-full border-collapse">
            <thead>
              <tr>
                <th className="border-b border-slate-300 p-2 text-left dark:border-slate-700">Date</th>
                <th className="border-b border-slate-300 p-2 text-left dark:border-slate-700">Mistakes</th>
                <th className="border-b border-slate-300 p-2 text-left dark:border-slate-700">Result</th>
                <th className="border-b border-slate-300 p-2 dark:border-slate-700"></th>
              </tr>
            </thead>
            <tbody>
              {history.map((r, i) => (
                <tr
                  key={`${r.date}-${i}`}
                  className={r.questions ? 'cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800' : ''}
                  onClick={() => r.questions && onReview(r)}
                >
                  <td className="border-b border-slate-200 p-2 dark:border-slate-800">{new Date(r.date).toLocaleString()}</td>
                  <td className="border-b border-slate-200 p-2 dark:border-slate-800">{r.mistakes}/20</td>
                  <td className={`border-b border-slate-200 p-2 font-semibold dark:border-slate-800 ${r.passed ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {r.passed ? 'Pass' : 'Fail'}
                  </td>
                  <td className="border-b border-slate-200 p-2 font-semibold text-blue-700 dark:border-slate-800 dark:text-blue-400">
                    {r.questions ? 'View →' : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
