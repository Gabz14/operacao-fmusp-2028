import { define, json, err } from './router'
import type { Env, Ctx } from './router'
import { todayStr, nowStr, getUser, getSubjects } from './db'
import { XP_FLASHCARD, XP_REDACAO, XP_SIMULADO } from './data'
import { touchStreak, missionProgress, unlockAchievement, awardXp } from './xp'
import { applyReview } from './srs'

function cardDict(c: any) {
  return { id: c.id, subject_id: c.subject_id, front: c.front, back: c.back, topic: c.topic, ease: Math.round(c.ease * 100) / 100, interval_days: c.interval_days, reps: c.reps, lapses: c.lapses, due: c.due }
}

// ---------------------------------------------------------------- flashcards
define('GET', /^\/api\/flashcards\/overview$/, async (env) => {
  const subjects = await getSubjects(env)
  const today = todayStr()
  const decks = []
  for (const s of subjects) {
    const cards = (await env.DB.prepare('SELECT * FROM flashcards WHERE subject_id = ?').bind(s.id).all()).results as any[]
    decks.push({
      subject_id: s.id, slug: s.slug, name: s.name, icon: s.icon, color: s.color,
      total: cards.length,
      due: cards.filter((c) => c.due <= today).length,
      new: cards.filter((c) => c.reps === 0 && c.due <= today).length,
    })
  }
  const dueTotal = decks.reduce((a, d) => a + d.due, 0)
  const reviewedToday = (await env.DB.prepare('SELECT COUNT(*) AS n FROM flashcards WHERE due = ? AND reps > 0').bind(today).first()) as any
  return json({ decks, due_total: dueTotal, today_reviewed: reviewedToday.n })
})

define('GET', /^\/api\/flashcards\/due$/, async (env) => {
  const cards = (await env.DB.prepare('SELECT * FROM flashcards WHERE due <= ? ORDER BY due').bind(todayStr()).all()).results as any[]
  return json({ cards: cards.map(cardDict) })
})

define('GET', /^\/api\/flashcards\/(\d+)$/, async (env, _req, ctx) => {
  const cards = (await env.DB.prepare('SELECT * FROM flashcards WHERE subject_id = ?').bind(Number(ctx.params['0'])).all()).results as any[]
  return json({ cards: cards.map(cardDict) })
})

define('POST', /^\/api\/flashcards$/, async (env, _req, ctx) => {
  const b = ctx.body as any
  const r = await env.DB.prepare('INSERT INTO flashcards (subject_id, front, back, topic, due) VALUES (?, ?, ?, ?, ?)')
    .bind(Number(b.subject_id), b.front ?? '', b.back ?? '', b.topic ?? '', todayStr()).run()
  const card = (await env.DB.prepare('SELECT * FROM flashcards WHERE id = ?').bind(r.meta.last_row_id).first()) as any
  return json(cardDict(card))
})

define('DELETE', /^\/api\/flashcards\/(\d+)$/, async (env, _req, ctx) => {
  await env.DB.prepare('DELETE FROM flashcards WHERE id = ?').bind(Number(ctx.params['0'])).run()
  return json({ ok: true })
})

define('POST', /^\/api\/flashcards\/(\d+)\/review$/, async (env, _req, ctx) => {
  const card = (await env.DB.prepare('SELECT * FROM flashcards WHERE id = ?').bind(Number(ctx.params['0'])).first()) as any
  if (!card) return err('card não encontrado', 404)
  const user = await getUser(env)
  const result = await applyReview(env, card, (ctx.body as any).rating ?? 'facil')
  await env.DB.prepare('UPDATE users SET total_flashcards = total_flashcards + 1 WHERE id = ?').bind(user.id).run()
  user.total_flashcards += 1
  const rating = (ctx.body as any).rating ?? 'facil'
  const xp = rating !== 'esqueci' ? XP_FLASHCARD : 0
  await touchStreak(env, user)
  await awardXp(env, user, xp)
  await missionProgress(env, 'flashcards', 1)
  await unlockAchievement(env, user, 'primeiro_flashcard')
  return json({ ...result, xp })
})

define('GET', /^\/api\/revisions\/pending$/, async (env) => {
  const revs = (await env.DB.prepare('SELECT * FROM revisions WHERE due <= ? AND done = 0 ORDER BY due').bind(todayStr()).all()).results as any[]
  const subs = await getSubjects(env)
  const subMap = new Map(subs.map((s) => [s.id, s]))
  return json({ revisions: revs.map((r) => ({ id: r.id, subject: subMap.get(r.subject_id)?.name ?? '', topic: r.topic, due: r.due, window: r.window })) })
})

// ---------------------------------------------------------------- biblioteca
define('GET', /^\/api\/biblioteca$/, async (env) => {
  const subjects = await getSubjects(env)
  const notes = (await env.DB.prepare('SELECT * FROM notes ORDER BY created_at DESC').all()).results as any[]
  return json({
    subjects: subjects.map((s) => ({ id: s.id, slug: s.slug, name: s.name, icon: s.icon, color: s.color, notes: notes.filter((n) => n.subject_id === s.id).length })),
    notes: notes.map((n) => ({ id: n.id, subject_id: n.subject_id, title: n.title, content: n.content, note_type: n.note_type, source_file: n.source_file, created_at: n.created_at ?? '' })),
  })
})

define('POST', /^\/api\/biblioteca\/notes$/, async (env, _req, ctx) => {
  const b = ctx.body as any
  const r = await env.DB.prepare('INSERT INTO notes (subject_id, title, content, note_type, source_file, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(b.subject_id ?? null, b.title ?? '', b.content ?? '', b.note_type ?? 'texto', b.source_file ?? '', nowStr()).run()
  return json({ id: r.meta.last_row_id })
})

define('DELETE', /^\/api\/biblioteca\/notes\/(\d+)$/, async (env, _req, ctx) => {
  await env.DB.prepare('DELETE FROM notes WHERE id = ?').bind(Number(ctx.params['0'])).run()
  return json({ ok: true })
})

// ---------------------------------------------------------------- redacao
define('GET', /^\/api\/redacoes$/, async (env) => {
  const reds = (await env.DB.prepare('SELECT * FROM redacoes ORDER BY date DESC').all()).results as any[]
  return json({ redacoes: reds.map((r) => ({ id: r.id, date: r.date, tema: r.tema, nota: r.nota, comp1: r.comp1, comp2: r.comp2, comp3: r.comp3, comp4: r.comp4, comp5: r.comp5, texto: r.texto, correcao: r.correcao })) })
})

define('POST', /^\/api\/redacoes$/, async (env, _req, ctx) => {
  const b = ctx.body as any
  const user = await getUser(env)
  const r = await env.DB.prepare('INSERT INTO redacoes (date, tema, texto, nota, comp1, comp2, comp3, comp4, comp5) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(todayStr(), b.tema ?? '', b.texto ?? '', b.nota ?? null, b.comp1 ?? null, b.comp2 ?? null, b.comp3 ?? null, b.comp4 ?? null, b.comp5 ?? null).run()
  await env.DB.prepare('UPDATE users SET total_redacoes = total_redacoes + 1 WHERE id = ?').bind(user.id).run()
  user.total_redacoes += 1
  await touchStreak(env, user)
  await awardXp(env, user, XP_REDACAO)
  await missionProgress(env, 'redacao', 1)
  await unlockAchievement(env, user, 'primeira_redacao')
  return json({ id: r.meta.last_row_id, xp: XP_REDACAO })
})

define('DELETE', /^\/api\/redacoes\/(\d+)$/, async (env, _req, ctx) => {
  await env.DB.prepare('DELETE FROM redacoes WHERE id = ?').bind(Number(ctx.params['0'])).run()
  return json({ ok: true })
})

// ---------------------------------------------------------------- provas
define('GET', /^\/api\/provas$/, async (env) => {
  const exams = (await env.DB.prepare('SELECT * FROM exams').all()).results as any[]
  const results = (await env.DB.prepare('SELECT * FROM exam_results').all()).results as any[]
  return json({
    exams: exams.map((e) => {
      let qs: any[] = []
      try { qs = JSON.parse(e.questions_json || '[]') } catch { /* noop */ }
      return { id: e.id, institution: e.institution, name: e.name, year: e.year, questions: qs.length, suggested_minutes: e.suggested_minutes }
    }),
    results: results.map((r) => ({ id: r.id, exam_id: r.exam_id, date: r.date, score: r.score, total: r.total, seconds: r.seconds, wrong_topics: safeParse(r.wrong_topics) })),
  })
})

define('GET', /^\/api\/provas\/(\d+)$/, async (env, _req, ctx) => {
  const e = (await env.DB.prepare('SELECT * FROM exams WHERE id = ?').bind(Number(ctx.params['0'])).first()) as any
  if (!e) return err('prova não encontrada', 404)
  const questions = safeParse(e.questions_json)
  const subjects = await getSubjects(env)
  const subMap = new Map(subjects.map((s) => [s.id, s]))
  return json({
    id: e.id, institution: e.institution, name: e.name, year: e.year, suggested_minutes: e.suggested_minutes,
    questions: questions.map((q: any) => ({
      id: q.id, subject: q.subject, topic: q.topic, text: q.text, options: q.options,
      subject_name: q.subject_id ? subMap.get(q.subject_id)?.name ?? '' : q.subject ?? '',
    })),
  })
})

define('POST', /^\/api\/provas\/(\d+)\/submit$/, async (env, _req, ctx) => {
  const exam = (await env.DB.prepare('SELECT * FROM exams WHERE id = ?').bind(Number(ctx.params['0'])).first()) as any
  if (!exam) return err('prova não encontrada', 404)
  const user = await getUser(env)
  const questions = safeParse(exam.questions_json)
  const answers = ((ctx.body as any).answers ?? {}) as Record<string, string>
  const byQ = new Map(questions.map((q: any) => [String(q.id), q]))
  let score = 0
  const wrong: any[] = []
  for (const [qid, opt] of Object.entries(answers)) {
    const q = byQ.get(qid)
    if (!q) continue
    if (opt === q.answer) score += 1
    else wrong.push({ topic: q.topic ?? '', subject: q.subject ?? '', correct: q.answer, you: opt })
  }
  const total = questions.length
  const xp = XP_SIMULADO + score * 5
  await env.DB.prepare('INSERT INTO exam_results (exam_id, date, answers, score, total, seconds, wrong_topics) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(exam.id, todayStr(), JSON.stringify(answers), score, total, Number((ctx.body as any).seconds) || 0, JSON.stringify(wrong)).run()
  await env.DB.prepare('UPDATE users SET total_questions = total_questions + ?, total_correct = total_correct + ? WHERE id = ?').bind(total, score, user.id).run()
  user.total_questions += total
  user.total_correct += score
  await touchStreak(env, user)
  await awardXp(env, user, xp)
  await missionProgress(env, 'simulado', 1)
  await missionProgress(env, 'questoes', total)
  return json({
    score, total, xp, percent: Math.round((score / Math.max(1, total)) * 1000) / 10, wrong,
    message: 'Simulado registrado. As questões erradas viraram alvos da sua próxima revisão.',
  })
})

function safeParse(s: string): any[] {
  try {
    const v = JSON.parse(s || '[]')
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}
