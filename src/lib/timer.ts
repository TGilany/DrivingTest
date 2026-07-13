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
