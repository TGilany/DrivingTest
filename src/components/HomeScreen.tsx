import bankJson from '../data/questions.json'
import { summarizeProgress } from '../lib/progress'
import type { ExamResult, Question } from '../types'

const bank = bankJson as Question[]

function formatCategory(category: Question['category']): string {
	return category.replace('-', ' ')
}

export function HomeScreen({
	history, onStart, onReview,
}: {
	history: ExamResult[]
	onStart: () => void
	onReview: (r: ExamResult) => void
}) {
	const summary = summarizeProgress(bank, history)

	return (
		<div>
			<h1 className="text-3xl font-bold">Driving Refresher Exam</h1>
			<p className="my-3 text-slate-500 dark:text-slate-400">
				English practice exam for the Israeli driving refresher course (השתלמות רענון בנהיגה).
				20 questions · 30 minutes · pass with up to 4 mistakes.
			</p>

			<div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
				<div className="rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
					<p className="text-sm text-slate-500">Exams taken</p>
					<p className="mt-1 text-3xl font-semibold">{summary.examsTaken}</p>
				</div>
				<div className="rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
					<p className="text-sm text-slate-500">Passed</p>
					<p className="mt-1 text-3xl font-semibold">{summary.passedExams}</p>
				</div>
				<div className="rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
					<p className="text-sm text-slate-500">Pass rate</p>
					<p className="mt-1 text-3xl font-semibold">{summary.passRate}%</p>
				</div>
				<div className="rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
					<p className="text-sm text-slate-500">Questions seen</p>
					<p className="mt-1 text-3xl font-semibold">{summary.uniqueQuestionsSeen}</p>
				</div>
			</div>

			<div className="mt-6 rounded-xl border border-slate-200 bg-white/80 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
				<div className="flex items-center justify-between gap-3">
					<h2 className="text-xl font-semibold">Subject coverage</h2>
					<p className="text-sm text-slate-500">How much of the exam bank you have already touched</p>
				</div>
				<div className="mt-4 grid gap-3 md:grid-cols-2">
					{summary.subjectCoverage.map((subject) => (
						<div key={subject.category} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
							<div className="flex items-center justify-between">
								<span className="font-medium capitalize">{formatCategory(subject.category)}</span>
								<span className="text-sm font-semibold text-blue-700 dark:text-blue-400">{subject.percentage}%</span>
							</div>
							<div className="mt-2 h-2 rounded-full bg-slate-200 dark:bg-slate-800">
								<div className="h-2 rounded-full bg-blue-600" style={{ width: `${Math.min(100, subject.percentage)}%` }} />
							</div>
							<p className="mt-2 text-sm text-slate-500">{subject.covered}/{subject.total} questions covered</p>
						</div>
					))}
				</div>
			</div>

			<button
				className="mt-6 rounded-lg bg-blue-700 px-7 py-3 text-lg text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
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
