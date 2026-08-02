import { todayStr, addDays } from './db'
import type { Env } from './router'

const RATINGS: Record<string, number> = { esqueci: 0, dificil: 1, facil: 2, muito_facil: 3 }

export async function applyReview(env: Env, card: any, rating: string): Promise<Record<string, unknown>> {
  const g = RATINGS[rating] ?? 2
  let reps = card.reps + 1
  let lapses = card.lapses
  let ease = card.ease
  let interval = card.interval_days
  let due: string
  if (g === 0) {
    lapses += 1
    ease = Math.max(1.3, ease - 0.2)
    interval = 0
    reps = 0
    due = todayStr()
  } else {
    if (reps === 1) interval = 1
    else if (reps === 2) interval = 3
    else if (g === 1) {
      interval = Math.max(1, Math.round(interval * 1.2))
      ease = Math.max(1.3, ease - 0.15)
    } else if (g === 2) {
      interval = Math.max(1, Math.round(interval * ease))
    } else {
      interval = Math.max(1, Math.round(interval * ease * 1.3))
      ease = Math.min(3.0, ease + 0.15)
    }
    due = addDays(todayStr(), interval)
  }
  await env.DB.prepare('UPDATE flashcards SET reps = ?, lapses = ?, ease = ?, interval_days = ?, due = ? WHERE id = ?')
    .bind(reps, lapses, ease, interval, due, card.id).run()
  return { interval_days: interval, ease, reps, lapses, due }
}
