import { useEffect, useRef, useState } from 'react'
import { remainingMs, formatMMSS } from '../lib/timer'

export function TimerBar({ deadline, onExpire }: { deadline: number; onExpire: () => void }) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(t)
  }, [])

  const ms = remainingMs(deadline, now)

  const fired = useRef(false)
  useEffect(() => {
    if (ms === 0 && !fired.current) {
      fired.current = true
      onExpire()
    }
  }, [ms, onExpire])

  return (
    <div className={`text-2xl font-semibold tabular-nums ${ms < 5 * 60_000 ? 'text-red-600 dark:text-red-400' : ''}`}>
      ⏱ {formatMMSS(ms)}
    </div>
  )
}
