import type { Env } from './router'
import { todayStr, nowStr, addDays, getCurrentWeek } from './db'
import { PHASE_LOAD, CRISIS_GOALS } from './data'
import { unlockAchievement } from './xp'

const CRISIS_DAYS = 3

export async function replan(env: Env): Promise<{ moved: number }> {
  const today = todayStr()
  const wk = await getCurrentWeek(env)
  const overdue = (await env.DB.prepare('SELECT * FROM weeks WHERE end_date < ? ORDER BY start_date').bind(today).all()).results as any[]
  let moved = 0
  for (const week of overdue) {
    const pending = (await env.DB.prepare('SELECT * FROM week_items WHERE week_id = ? AND status = ?').bind(week.id, 'pendente').all()).results as any[]
    if (wk && pending.length) {
      const remainingDays: number[] = []
      for (let wd = 0; wd < 6; wd++) {
        if (addDays(week.start_date, wd) >= today) remainingDays.push(wd)
      }
      if (!remainingDays.length) remainingDays.push(0, 1, 2, 3, 4, 5)
      for (let idx = 0; idx < pending.length; idx++) {
        const day = remainingDays[idx % remainingDays.length]
        await env.DB.prepare('UPDATE week_items SET week_id = ?, day = ?, ord = ? WHERE id = ?')
          .bind(wk.id, day, 1000 + idx, pending[idx].id).run()
        moved++
      }
    }
    await env.DB.prepare('UPDATE weeks SET status = ? WHERE id = ?').bind(pending.length ? 'vencida' : 'concluida', week.id).run()
  }
  if (wk) await env.DB.prepare('UPDATE weeks SET status = ? WHERE id = ?').bind('ativa', wk.id).run()
  return { moved }
}

export async function checkCrisis(env: Env): Promise<boolean> {
  const user = (await env.DB.prepare('SELECT * FROM users ORDER BY id LIMIT 1').first()) as any
  if (!user) return false
  if (user.crisis) return true
  if (user.last_study_date && (Math.round((new Date(todayStr()).getTime() - new Date(user.last_study_date).getTime()) / 86400000)) >= CRISIS_DAYS) {
    await env.DB.prepare('UPDATE users SET crisis = 1, crisis_start = ? WHERE id = ?').bind(todayStr(), user.id).run()
    const quotes = (await env.DB.prepare("SELECT text FROM quotes WHERE occasion = 'crise'").all()).results as { text: string }[]
    const idx = (Math.floor(Date.now() / 86400000) + 719163) % Math.max(1, quotes.length)
    const quote = quotes.length ? quotes[idx].text : ''
    await env.DB.prepare('UPDATE users SET crisis_quote = ? WHERE id = ?').bind(quote, user.id).run()
    await env.DB.prepare('INSERT INTO notifications (type, title, body, at, read) VALUES (?, ?, ?, ?, 0)')
      .bind('crise', 'Modo Crise ativado', 'Três dias de silêncio. Pequenas metas para reacender a cidade.', nowStr()).run()
    return true
  }
  return false
}

export async function finishItem(env: Env, item: any): Promise<void> {
  await env.DB.prepare('UPDATE week_items SET status = ?, done_at = ? WHERE id = ?').bind('concluida', nowStr(), item.id).run()
  const pending = (await env.DB.prepare('SELECT COUNT(*) AS n FROM week_items WHERE week_id = ? AND status != ?').bind(item.week_id, 'concluida').first()) as any
  const week = (await env.DB.prepare('SELECT * FROM weeks WHERE id = ?').bind(item.week_id).first()) as any
  if (week && pending.n === 0) {
    await env.DB.prepare('UPDATE weeks SET status = ? WHERE id = ?').bind('concluida', week.id).run()
    await env.DB.prepare('INSERT INTO notifications (type, title, body, at, read) VALUES (?, ?, ?, ?, 0)')
      .bind('cronograma', 'Semana concluída', `Você fechou a ${week.title}. A cidade ficou um pouco mais dourada.`, nowStr()).run()
  }
  if (item.type === 'conteudo' && item.subject_id) {
    const topic = String(item.title).replace('Conteúdo: ', '')
    const cfg = PHASE_LOAD[week?.phase ?? 1] ?? PHASE_LOAD[1]
    const n = Math.min(3, Math.max(1, Math.floor(cfg.flashcards / 10)))
    const due = todayStr()
    if (n >= 1) {
      await env.DB.prepare('INSERT INTO flashcards (subject_id, topic, front, back, due) VALUES (?, ?, ?, ?, ?)')
        .bind(item.subject_id, topic, `O que é ${topic}? (defina em 1 frase)`, `${topic}. Consulte seu material para a definição essencial — escreva-a aqui depois.`, due).run()
    }
    if (n >= 2) {
      await env.DB.prepare('INSERT INTO flashcards (subject_id, topic, front, back, due) VALUES (?, ?, ?, ?, ?)')
        .bind(item.subject_id, topic, `Exemplo prático de ${topic} (aplique em um caso real)`, `Exemplo de aplicação de ${topic} visto na FUVEST/ENEM. Anote o que caiu nas últimas provas.`, due).run()
    }
    const subj = (await env.DB.prepare('SELECT * FROM subjects WHERE id = ?').bind(item.subject_id).first()) as any
    if (subj && subj.content_finished) {
      const slug: Record<string, string> = { matematica: 'fim_matematica', biologia: 'fim_biologia', fisica: 'fim_fisica', quimica: 'fim_quimica' }
      const s = slug[subj.slug]
      if (s) {
        const user = (await env.DB.prepare('SELECT * FROM users ORDER BY id LIMIT 1').first()) as any
        await unlockAchievement(env, user, s)
      }
    }
    const base = item.done_at ? item.done_at.slice(0, 10) : todayStr()
    await env.DB.prepare('INSERT INTO revisions (subject_id, topic, due, window) VALUES (?, ?, ?, 7)').bind(item.subject_id, topic, addDays(base, 7)).run()
    await env.DB.prepare('INSERT INTO revisions (subject_id, topic, due, window) VALUES (?, ?, ?, 21)').bind(item.subject_id, topic, addDays(base, 21)).run()
  }
}

export async function completeCrisisGoal(env: Env): Promise<{ crisis: boolean; message: string }> {
  await env.DB.prepare('UPDATE users SET crisis = 0, crisis_start = NULL').run()
  const quotes = (await env.DB.prepare("SELECT text FROM quotes WHERE occasion = 'crise'").all()).results as { text: string }[]
  const message = quotes.length > 1 ? quotes[1].text : 'A cidade reacendeu.'
  return { crisis: false, message }
}

export { CRISIS_GOALS }
