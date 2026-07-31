import { useState } from 'react'
import type { ExamState, Question } from '../types'
import { saveState } from '../lib/storage'
import { isExpired } from '../lib/timer'
import { TimerBar } from './TimerBar'
import { ProgressStrip } from './ProgressStrip'
import { QuestionCard } from './QuestionCard'

const GHOST_BTN =
	'rounded-lg border border-slate-300 px-4 py-2 hover:bg-slate-200 disabled:cursor-default disabled:opacity-40 dark:border-slate-600 dark:hover:bg-slate-800'

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
	const q = eq ? byId.get(eq.id) : undefined

	if (!eq || !q) {
		return (
			<div className="p-6 text-center">
				<p className="text-lg font-semibold text-red-600">Question could not be loaded.</p>
				<button className="mt-4 rounded-lg bg-blue-600 px-6 py-2 text-white" onClick={onNewExam}>
					Start new exam
				</button>
			</div>
		)
	}

	const update = (next: ExamState) => {
		if (isExpired(state.deadline, Date.now())) return
		saveState(next)
		setState(next)
	}

	const answered = Object.keys(state.picks).length
	const totalQuestions = state.questions.length

	return (
		<div>
			<header className="flex flex-col gap-2 pr-0 sm:flex-row sm:items-center sm:justify-between sm:pr-14">
				<TimerBar deadline={state.deadline} onExpire={onSubmit} />
				<div className="flex items-center justify-between gap-2 sm:gap-3">
					<span className="text-sm text-slate-500 dark:text-slate-400 sm:text-base">{answered}/{totalQuestions} answered</span>
					<button
						className={GHOST_BTN}
						onClick={() => confirm('Abandon this exam and start a new one?') && onNewExam()}
					>
						New exam
					</button>
				</div>
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
			<footer className="mt-4 flex flex-col gap-2.5 sm:flex-row">
				<div className="flex gap-2.5">
					<button className={GHOST_BTN} disabled={current === 0} onClick={() => setCurrent(current - 1)}>
						← Previous
					</button>
					<button className={GHOST_BTN} disabled={current === totalQuestions - 1} onClick={() => setCurrent(current + 1)}>
						Next →
					</button>
				</div>
				<button
					className="rounded-lg bg-green-700 px-5 py-2.5 text-white hover:bg-green-600 sm:ml-auto"
					onClick={() =>
						(answered === totalQuestions || confirm(`${totalQuestions - answered} questions unanswered — they count as mistakes. Finish anyway?`)) &&
						onSubmit()
					}
				>
					Finish exam
				</button>
			</footer>
		</div>
	)
}
