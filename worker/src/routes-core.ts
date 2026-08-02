import { define, json, err } from './router'
import type { Env, Ctx } from './router'
import { todayStr, nowStr, addDays, mondayOf, daysUntil, phaseForDate, getUser, getSubjects, getCurrentWeek } from './db'
import { PHASES, rank_for_xp, next_rank, RANKS, XP_POMODORO, XP_QUESTAO, XP_ACERTO, XP_FLASHCARD, XP_REVISAO, XP_REDACAO, XP_SIMULADO, CRISIS_GOALS } from './data'
import { quoteOf, unlockCardsForPhase, touchStreak, missionProgress, awardXp, ensureMissions, unlockAchievement } from './xp'
import { replan, checkCrisis, finishItem } from './scheduler'

const WEEKDAY_NAMES = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']

function weekdayOf(dateStr: string) {
  return (new Date(dateStr + 'T00:00:00Z').getUTCDay() + 6) % 7
}

// ---------------------------------------------------------------- dashboard
define('GET', /^\/api\/dashboard$/, async (env) => {
  await replan(env)
  await ensureMissions(env)
  const crisisActive = await checkCrisis(env)
  const user = await getUser(env)
  const today = todayStr()
  const phase = phaseForDate(today)

  await unlockCardsForPhase(env, phase.num)

  const wk = await getCurrentWeek(env)
  const weeksInPhase = (await env.DB.prepare('SELECT * FROM weeks WHERE phase = ?').bind(phase.num).all()).results as any[]
  const doneWeeks = weeksInPhase.filter((w) => w.end_date < today).length
  const phaseProgress = Math.min(100, Math.round((doneWeeks / Math.max(1, weeksInPhase.length)) * 100))

  const nxtRank = next_rank(user.xp)
  const nextAch = (await env.DB.prepare('SELECT * FROM achievements WHERE unlocked_at IS NULL ORDER BY id LIMIT 1').first()) as any
  let rankProgress = 0
  if (nxtRank) {
    const prev = Math.max(...RANKS.filter((r) => r[2] <= user.xp).map((r) => r[2]))
    const span = nxtRank.threshold - prev
    rankProgress = Math.min(100, Math.round(((user.xp - prev) / Math.max(1, span)) * 100))
  }

  const dailyMissions = (await env.DB.prepare('SELECT * FROM missions WHERE type = ? AND period_start = ?').bind('diaria', today).all()).results as any[]
  const monday = mondayOf(today)
  const weeklyMissions = (await env.DB.prepare('SELECT * FROM missions WHERE type = ? AND period_start = ?').bind('semanal', monday).all()).results as any[]
  const month = today.slice(0, 8) + '01'
  const monthlyMissions = (await env.DB.prepare('SELECT * FROM missions WHERE type = ? AND period_start = ?').bind('mensal', month).all()).results as any[]

  const sessions = (await env.DB.prepare('SELECT minutes FROM study_sessions WHERE date = ?').bind(today).all()).results as any[]
  const minutes = sessions.reduce((a, s) => a + s.minutes, 0)
  const pomodoros = (await env.DB.prepare('SELECT COUNT(*) AS n FROM pomodoros WHERE date = ? AND completed = 1').bind(today).first()) as any
  const questionsToday = (await env.DB.prepare('SELECT qty FROM question_logs WHERE date = ?').bind(today).all()).results as any[]
  const questions = questionsToday.reduce((a, q) => a + q.qty, 0)
  const redacoesToday = (await env.DB.prepare('SELECT COUNT(*) AS n FROM redacoes WHERE date = ?').bind(today).first()) as any
  const flashcardsDue = (await env.DB.prepare('SELECT COUNT(*) AS n FROM flashcards WHERE due <= ?').bind(today).first()) as any
  const revisionsDue = (await env.DB.prepare('SELECT COUNT(*) AS n FROM revisions WHERE due <= ? AND done = 0').bind(today).first()) as any

  let continueItem: any = null
  if (wk) {
    const todayItems = (await env.DB.prepare('SELECT * FROM week_items WHERE week_id = ? AND day = ? AND status = ? ORDER BY ord').bind(wk.id, weekdayOf(today), 'pendente').all()).results as any[]
    if (todayItems.length) {
      const i = todayItems[0]
      continueItem = { id: i.id, type: i.type, title: i.title, qty: i.qty, subject: i.subject_id }
    }
  }
  if (!continueItem) {
    const nxt = (await env.DB.prepare('SELECT wi.* FROM week_items wi JOIN weeks w ON w.id = wi.week_id WHERE wi.status = ? ORDER BY w.phase, w.start_date, wi.day, wi.ord LIMIT 1').bind('pendente').first()) as any
    if (nxt) continueItem = { id: nxt.id, type: nxt.type, title: nxt.title, qty: nxt.qty, subject: nxt.subject_id }
  }

  const subjects = await getSubjects(env)
  const bySubject: Record<string, { questions: number; correct: number }> = {}
  for (const s of subjects) {
    const logs = (await env.DB.prepare('SELECT qty, correct FROM question_logs WHERE subject_id = ?').bind(s.id).all()).results as any[]
    bySubject[s.slug] = { questions: logs.reduce((a, l) => a + l.qty, 0), correct: logs.reduce((a, l) => a + l.correct, 0) }
  }

  let weekProgress = 0
  let weekItems: any[] = []
  if (wk) {
    weekItems = (await env.DB.prepare('SELECT * FROM week_items WHERE week_id = ? ORDER BY ord').bind(wk.id).all()).results as any[]
    const done = weekItems.filter((i) => i.status === 'concluida').length
    weekProgress = Math.min(100, Math.round((done / Math.max(1, weekItems.length)) * 100))
  }

  const [rankSlug, rankName] = rank_for_xp(user.xp)

  return json({
    greeting: { name: user.name, date: today, weekday: WEEKDAY_NAMES[weekdayOf(today)], time: `${today.slice(8, 10)}/${today.slice(5, 7)}/${today.slice(0, 4)}` },
    days: { enem: daysUntil(today, user.enem_date), fuvest: daysUntil(today, user.fuvest_date1), fuvest2: daysUntil(today, user.fuvest_date2) },
    rpg: {
      xp: user.xp, level: user.level, rank: rankSlug, rank_name: rankName,
      next_rank: nxtRank, rank_progress: rankProgress,
      streak: user.streak, best_streak: user.best_streak,
    },
    phase: { num: phase.num, name: phase.name, weeks_done: doneWeeks, weeks_total: weeksInPhase.length, progress: phaseProgress },
    next_reward: { rank: nxtRank, achievement: nextAch ? { slug: nextAch.slug, title: nextAch.title, xp: nextAch.xp } : null },
    missions: {
      diaria: dailyMissions.map(m => ({ id: m.id, slug: m.slug, title: m.title, target: m.target, progress: m.progress, completed: !!m.completed, reward_xp: m.reward_xp })),
      semanal: weeklyMissions.map(m => ({ id: m.id, slug: m.slug, title: m.title, target: m.target, progress: m.progress, completed: !!m.completed, reward_xp: m.reward_xp })),
      mensal: monthlyMissions.map(m => ({ id: m.id, slug: m.slug, title: m.title, target: m.target, progress: m.progress, completed: !!m.completed, reward_xp: m.reward_xp })),
    },
    summary: {
      minutes, pomodoros: pomodoros.n, questions, redacoes: redacoesToday.n,
      flashcards_due: flashcardsDue.n, revisions_due: revisionsDue.n,
    },
    week: {
      id: wk?.id ?? null, title: wk?.title ?? '', start: wk?.start_date ?? '', end: wk?.end_date ?? '',
      progress: weekProgress,
      items: weekItems.map(i => ({ id: i.id, day: i.day, type: i.type, title: i.title, qty: i.qty, status: i.status, subject: i.subject_id })),
    },
    continue_study: continueItem,
    by_subject: bySubject,
    quote: await quoteOf(env, 'dia'),
    crisis: {
      active: crisisActive, goals: CRISIS_GOALS,
      quote: user.crisis_quote || CRISIS_GOALS[0].title,
      days_since: user.last_study_date ? Math.max(0, daysUntil(user.last_study_date, today)) : 0,
    },
  })
})

// ---------------------------------------------------------------- cronograma
const DAY_SHORT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

define('GET', /^\/api\/cronograma\/phases$/, async (env) => {
  const today = todayStr()
  const result = []
  for (const p of PHASES) {
    const weeks = (await env.DB.prepare('SELECT * FROM weeks WHERE phase = ?').bind(p.num).all()).results as any[]
    const done = weeks.filter((w) => (w.status === 'concluida' || w.status === 'vencida') && w.end_date < today).length
    const total = weeks.length
    result.push({ num: p.num, name: p.name, start: p.start, end: p.end, weeks_done: done, weeks_total: total, progress: Math.min(100, Math.round((done / Math.max(1, total)) * 100)) })
  }
  return json({ phases: result })
})

define('GET', /^\/api\/cronograma$/, async (env) => {
  await replan(env)
  const weeks = (await env.DB.prepare('SELECT * FROM weeks ORDER BY start_date').all()).results as any[]
  const subs = await getSubjects(env)
  const subMap = new Map(subs.map((s) => [s.id, s]))
  const today = todayStr()
  const result = []
  for (const w of weeks) {
    const items = (await env.DB.prepare('SELECT * FROM week_items WHERE week_id = ? ORDER BY ord').bind(w.id).all()).results as any[]
    const done = items.filter((i) => i.status === 'concluida').length
    const total = items.length
    let status: string
    if (w.start_date <= today && today <= w.end_date) status = 'ativa'
    else if (w.end_date < today) status = total && done === total ? 'concluida' : 'vencida'
    else status = 'futura'
    result.push({
      id: w.id, phase: w.phase, phase_name: w.phase_name,
      start: w.start_date, end: w.end_date, title: w.title, status,
      progress: Math.min(100, Math.round((done / Math.max(1, total)) * 100)),
      items: items.map((i) => {
        const sub = i.subject_id != null ? subMap.get(i.subject_id) : undefined
        return {
          id: i.id, day: i.day, day_name: DAY_SHORT[i.day], type: i.type,
          title: i.title, qty: i.qty, status: i.status, subject: i.subject_id,
          subject_name: sub?.name ?? null, subject_color: sub?.color ?? null,
        }
      }),
    })
  }
  return json({ weeks: result, today })
})

define('POST', /^\/api\/cronograma\/items\/(\d+)\/complete$/, async (env, _req, ctx) => {
  const itemId = Number(ctx.params['0'])
  const item = (await env.DB.prepare('SELECT * FROM week_items WHERE id = ?').bind(itemId).first()) as any
  if (!item) return err('item não encontrado', 404)
  if (item.status === 'concluida') return json({ xp: 0, already: true })
  const user = await getUser(env)
  let xp = 0
  if (item.type === 'questoes') xp = item.qty * XP_QUESTAO
  else if (item.type === 'conteudo') xp = 15
  else if (item.type === 'revisao') xp = XP_REVISAO
  else if (item.type === 'flashcards') xp = item.qty * XP_FLASHCARD
  else if (item.type === 'leitura') xp = Math.max(5, Math.floor(item.qty / 2))
  else if (item.type === 'redacao') { xp = XP_REDACAO; await env.DB.prepare('UPDATE users SET total_redacoes = total_redacoes + 1 WHERE id = ?').bind(user.id).run(); user.total_redacoes += 1 }
  else if (item.type === 'simulado') xp = XP_SIMULADO

  await finishItem(env, item)
  await touchStreak(env, user)
  await awardXp(env, user, xp)
  if (item.type === 'questoes') await missionProgress(env, 'questoes', item.qty)
  else if (item.type === 'revisao') await missionProgress(env, 'revisao', 1)
  else if (item.type === 'redacao') {
    await missionProgress(env, 'redacao', 1)
    await unlockAchievement(env, user, 'primeira_redacao')
  } else if (item.type === 'simulado') await missionProgress(env, 'simulado', 1)
  else if (item.type === 'leitura') await missionProgress(env, 'leitura', item.qty)

  const week = (await env.DB.prepare('SELECT * FROM weeks WHERE id = ?').bind(item.week_id).first()) as any
  if (week && week.status === 'concluida') {
    const remaining = (await env.DB.prepare('SELECT COUNT(*) AS n FROM week_items WHERE week_id = ? AND status != ?').bind(week.id, 'concluida').first()) as any
    if (remaining.n === 0) await unlockAchievement(env, user, 'primeira_semana')
  }
  return json({ xp, status: 'concluida' })
})

// ---------------------------------------------------------------- perfil
define('GET', /^\/api\/perfil$/, async (env) => {
  const user = await getUser(env)
  const rank = rank_for_xp(user.xp)
  const nxt = next_rank(user.xp)
  const achievements = (await env.DB.prepare('SELECT * FROM achievements ORDER BY id').all()).results as any[]
  const cards = (await env.DB.prepare('SELECT * FROM cards').all()).results as any[]
  return json({
    user: {
      name: user.name, avatar: user.avatar, objective: user.objective,
      university: user.university, course: user.course,
      xp: user.xp, level: user.level,
      rank: rank[0], rank_name: rank[1], next_rank: nxt,
      streak: user.streak, best_streak: user.best_streak,
      start_date: user.start_date, enem_date: user.enem_date,
      fuvest_date1: user.fuvest_date1, fuvest_date2: user.fuvest_date2,
      total_minutes: user.total_minutes, total_questions: user.total_questions,
      total_correct: user.total_correct, total_flashcards: user.total_flashcards,
      total_redacoes: user.total_redacoes, total_pomodoros: user.total_pomodoros,
      total_revisoes: user.total_revisoes,
      pomodoro_focus: user.pomodoro_focus, pomodoro_break: user.pomodoro_break,
      ambient_sound: user.ambient_sound, theme: user.theme,
      notifications_enabled: !!user.notifications_enabled,
      crisis: !!user.crisis,
      owned_items: ownedList(user),
    },
    achievements: achievements.map((a) => ({ id: a.id, slug: a.slug, title: a.title, description: a.description, xp: a.xp, unlocked: a.unlocked_at !== null })),
    cards: cards.map((c) => ({ id: c.id, slug: c.slug, name: c.name, rarity: c.rarity, description: c.description, history: c.history, phase_unlock: c.phase_unlock, art_seed: c.art_seed, unlocked: c.unlocked_at !== null })),
  })
})

define('GET', /^\/api\/missoes$/, async (env) => {
  const today = todayStr()
  const monday = mondayOf(today)
  const month = today.slice(0, 8) + '01'
  const groups: Record<string, any[]> = {}
  for (const [t, p] of [['diaria', today], ['semanal', monday], ['mensal', month]] as [string, string][]) {
    const ms = (await env.DB.prepare('SELECT * FROM missions WHERE type = ? AND period_start = ?').bind(t, p).all()).results as any[]
    groups[t] = ms.map((m) => ({ id: m.id, slug: m.slug, title: m.title, target: m.target, progress: m.progress, completed: !!m.completed, reward_xp: m.reward_xp }))
  }
  return json(groups)
})

define('GET', /^\/api\/frase\/([^/]+)$/, async (env, _req, ctx) => {
  const occasion = ctx.params['0']
  let quotes = (await env.DB.prepare('SELECT text FROM quotes WHERE occasion = ?').bind(occasion).all()).results as { text: string }[]
  if (!quotes.length) quotes = (await env.DB.prepare("SELECT text FROM quotes WHERE occasion = 'dia'").all()).results as { text: string }[]
  const q = quotes[(Math.floor(Date.now() / 86400000) + 719163) % quotes.length]
  return json({ text: q.text })
})

// ---------------------------------------------------------------- estudo
define('POST', /^\/api\/sessions$/, async (env, _req, ctx) => {
  const b = ctx.body as any
  const minutes = Number(b.minutes) || 0
  let xp = 0
  const t = b.type ?? ''
  if (t === 'pomodoro') xp = XP_POMODORO * Math.max(1, Math.floor(minutes / 25))
  else if (t === 'questoes') xp = Math.floor(minutes / 10)
  else if (t === 'flashcards') xp = Math.floor(minutes / 10)
  else if (t === 'redacao') xp = XP_REDACAO
  else if (t === 'simulado') xp = XP_SIMULADO
  else if (t === 'leitura') xp = Math.max(1, Math.floor(minutes / 10))
  else xp = Math.max(1, Math.floor(minutes / 25))
  const user = await getUser(env)
  await env.DB.prepare('INSERT INTO study_sessions (date, minutes, type, subject_id, xp) VALUES (?, ?, ?, ?, ?)')
    .bind(todayStr(), minutes, t, b.subject_id ?? null, xp).run()
  await env.DB.prepare('UPDATE users SET total_minutes = total_minutes + ? WHERE id = ?').bind(minutes, user.id).run()
  user.total_minutes += minutes
  await touchStreak(env, user)
  await awardXp(env, user, xp)
  await missionProgress(env, 'minutos', minutes)
  if (user.total_minutes >= 100 * 60) await unlockAchievement(env, user, 'h100')
  if (user.total_minutes >= 500 * 60) await unlockAchievement(env, user, 'h500')
  const yearIn = daysUntil(user.start_date, todayStr()) >= 365
  if (yearIn) await unlockAchievement(env, user, 'ano1')
  return json({ xp, total_minutes: user.total_minutes, level: user.level })
})

define('POST', /^\/api\/pomodoros$/, async (env, _req, ctx) => {
  const b = ctx.body as any
  const minutes = Number(b.minutes) || 0
  const user = await getUser(env)
  await env.DB.prepare('INSERT INTO pomodoros (date, minutes, mode, completed) VALUES (?, ?, ?, ?)')
    .bind(todayStr(), minutes, b.mode ?? '25/5', b.completed === false ? 0 : 1).run()
  if (b.completed !== false) {
    await env.DB.prepare('UPDATE users SET total_pomodoros = total_pomodoros + 1 WHERE id = ?').bind(user.id).run()
    user.total_pomodoros += 1
    await touchStreak(env, user)
    await missionProgress(env, 'pomodoro', 1)
    await missionProgress(env, 'minutos', minutes)
    await unlockAchievement(env, user, 'primeiro_pomodoro')
    const xp = XP_POMODORO * Math.max(1, Math.floor(minutes / 25))
    await env.DB.prepare('INSERT INTO study_sessions (date, minutes, type, xp) VALUES (?, ?, ?, ?)').bind(todayStr(), minutes, 'pomodoro', xp).run()
    await env.DB.prepare('UPDATE users SET total_minutes = total_minutes + ? WHERE id = ?').bind(minutes, user.id).run()
    user.total_minutes += minutes
    if (user.total_minutes >= 100 * 60) await unlockAchievement(env, user, 'h100')
    if (user.total_minutes >= 500 * 60) await unlockAchievement(env, user, 'h500')
    await awardXp(env, user, xp)
    return json({ xp, pomodoros: user.total_pomodoros })
  }
  return json({ xp: 0 })
})

define('POST', /^\/api\/questions$/, async (env, _req, ctx) => {
  const b = ctx.body as any
  const qty = Number(b.qty) || 0
  const correct = Number(b.correct) || 0
  const user = await getUser(env)
  await env.DB.prepare('INSERT INTO question_logs (date, subject_id, qty, correct, topic, source) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(todayStr(), b.subject_id ?? null, qty, correct, b.topic ?? '', b.source ?? '').run()
  await env.DB.prepare('UPDATE users SET total_questions = total_questions + ?, total_correct = total_correct + ? WHERE id = ?')
    .bind(qty, correct, user.id).run()
  user.total_questions += qty
  user.total_correct += correct
  const xp = qty * XP_QUESTAO + correct * XP_ACERTO
  await touchStreak(env, user)
  await awardXp(env, user, xp)
  await missionProgress(env, 'questoes', qty)
  if (qty && correct / qty >= 0.8) await missionProgress(env, 'precisao', 80)
  await unlockAchievement(env, user, 'primeira_questao')
  if (user.total_questions >= 100) await unlockAchievement(env, user, 'q100')
  if (user.total_questions >= 1000) await unlockAchievement(env, user, 'q1000')
  return json({ xp, total_questions: user.total_questions })
})

define('POST', /^\/api\/revisions\/(\d+)\/done$/, async (env, _req, ctx) => {
  const id = Number(ctx.params['0'])
  const rev = (await env.DB.prepare('SELECT * FROM revisions WHERE id = ?').bind(id).first()) as any
  if (!rev) return err('revisão não encontrada', 404)
  if (rev.done) return json({ xp: 0, already: true })
  const user = await getUser(env)
  await env.DB.prepare('UPDATE revisions SET done = 1, done_at = ? WHERE id = ?').bind(todayStr(), id).run()
  await env.DB.prepare('UPDATE users SET total_revisoes = total_revisoes + 1 WHERE id = ?').bind(user.id).run()
  user.total_revisoes += 1
  await touchStreak(env, user)
  await awardXp(env, user, XP_REVISAO)
  await missionProgress(env, 'revisao', 1)
  return json({ xp: XP_REVISAO, total_revisoes: user.total_revisoes })
})

// ---------------------------------------------------------------- estatisticas
define('GET', /^\/api\/estatisticas$/, async (env) => {
  const user = await getUser(env)
  const today = todayStr()
  const days = 60
  const start = addDays(today, -(days - 1))

  const minutesByDay: Record<string, number> = {}
  const pomosByDay: Record<string, number> = {}
  const questionsByDay: Record<string, number> = {}
  for (let i = 0; i < days; i++) {
    const d = addDays(start, i)
    minutesByDay[d] = 0
    pomosByDay[d] = 0
    questionsByDay[d] = 0
  }
  const sessions = (await env.DB.prepare('SELECT date, minutes FROM study_sessions WHERE date >= ?').bind(start).all()).results as any[]
  for (const s of sessions) minutesByDay[s.date] = (minutesByDay[s.date] ?? 0) + s.minutes
  const pomos = (await env.DB.prepare('SELECT date FROM pomodoros WHERE date >= ? AND completed = 1').bind(start).all()).results as any[]
  for (const p of pomos) pomosByDay[p.date] = (pomosByDay[p.date] ?? 0) + 1
  const logs = (await env.DB.prepare('SELECT date, qty FROM question_logs WHERE date >= ?').bind(start).all()).results as any[]
  for (const q of logs) questionsByDay[q.date] = (questionsByDay[q.date] ?? 0) + q.qty

  const subjStart = addDays(today, -30)
  const subjects = await getSubjects(env)
  const minutesBySubject: Record<string, number> = {}
  const qBySubject: Record<string, number> = {}
  const correctBySubject: Record<string, number> = {}
  for (const s of subjects) {
    minutesBySubject[s.name] = 0
    qBySubject[s.name] = 0
    correctBySubject[s.name] = 0
  }
  const subjMap = new Map(subjects.map((s) => [s.id, s]))
  const sessions30 = (await env.DB.prepare('SELECT subject_id, minutes FROM study_sessions WHERE date >= ? AND subject_id IS NOT NULL').bind(subjStart).all()).results as any[]
  for (const s of sessions30) {
    const sub = subjMap.get(s.subject_id)
    if (sub) minutesBySubject[sub.name] = (minutesBySubject[sub.name] ?? 0) + s.minutes
  }
  const logs30 = (await env.DB.prepare('SELECT subject_id, qty, correct FROM question_logs WHERE date >= ? AND subject_id IS NOT NULL').bind(subjStart).all()).results as any[]
  for (const q of logs30) {
    const sub = subjMap.get(q.subject_id)
    if (sub) {
      qBySubject[sub.name] = (qBySubject[sub.name] ?? 0) + q.qty
      correctBySubject[sub.name] = (correctBySubject[sub.name] ?? 0) + q.correct
    }
  }

  const redacoes = (await env.DB.prepare('SELECT date, nota FROM redacoes ORDER BY date').all()).results as any[]
  const redacaoEvolution = redacoes.map((r) => ({ date: r.date, nota: r.nota ?? 0 }))

  const fcBySubject: Record<string, number> = {}
  for (const s of subjects) {
    const r = (await env.DB.prepare('SELECT COUNT(*) AS n FROM flashcards WHERE subject_id = ?').bind(s.id).first()) as any
    fcBySubject[s.name] = r.n
  }

  const totalDays = Math.max(1, Math.max(1, daysUntil(user.start_date, today)))
  const avg = (user.total_minutes / totalDays) * 7

  const topSubject = Object.values(minutesBySubject).some((v) => v > 0)
    ? Object.entries(minutesBySubject).sort((a, b) => b[1] - a[1])[0][0] : '—'

  return json({
    totals: {
      minutes: user.total_minutes, hours: Math.round((user.total_minutes / 60) * 10) / 10,
      streak: user.streak, best_streak: user.best_streak,
      questions: user.total_questions, correct: user.total_correct,
      accuracy: Math.round((user.total_correct / Math.max(1, user.total_questions)) * 1000) / 10,
      flashcards: user.total_flashcards, pomodoros: user.total_pomodoros,
      redacoes: user.total_redacoes, revisoes: user.total_revisoes,
      avg_week_minutes: Math.round(avg * 10) / 10,
    },
    minutes_by_day: minutesByDay,
    pomos_by_day: pomosByDay,
    questions_by_day: questionsByDay,
    minutes_by_subject: minutesBySubject,
    questions_by_subject: qBySubject,
    accuracy_by_subject: Object.fromEntries(Object.entries(correctBySubject).map(([k, v]) => [k, Math.round((v / Math.max(1, qBySubject[k] ?? 0)) * 1000) / 10])),
    top_subject: topSubject,
    redacao_evolution: redacaoEvolution,
    flashcards_by_subject: fcBySubject,
    pomodoro_avg_daily: Math.round((user.total_pomodoros / Math.max(1, totalDays)) * 10) / 10,
  })
})

function ownedList(user: { owned_items: string }): string[] {
  try {
    const v = JSON.parse(user.owned_items || '[]')
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}
