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
		<div className="my-4 grid grid-cols-5 gap-1.5 sm:grid-cols-10 sm:gap-2">
			{state.questions.map((eq, i) => {
				const pick = state.picks[eq.id]
				const isLocked = state.locked.includes(eq.id)
				let cls = 'h-8 w-8 shrink-0 justify-self-center rounded-full border p-0 text-[0.8rem] sm:h-10 sm:w-10 sm:text-sm '
				if (isLocked) {
					cls += pick === byId.get(eq.id)!.correct
						? 'border-green-600 bg-green-100 dark:border-green-500 dark:bg-green-950 '
						: 'border-red-600 bg-red-100 dark:border-red-500 dark:bg-red-950 '
				} else if (pick !== undefined) {
					cls += 'border-blue-400 bg-blue-100 dark:border-blue-500 dark:bg-blue-950 '
				} else {
					cls += 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900 '
				}
				if (i === current) cls += 'outline-3 outline-blue-600 dark:outline-blue-400'
				return (
					<button key={eq.id} className={cls} onClick={() => onJump(i)} aria-label={`Question ${i + 1}`}>
						{i + 1}
					</button>
				)
			})}
		</div>
	)
}
