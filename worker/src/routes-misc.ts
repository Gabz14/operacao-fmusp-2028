import { define, json, err } from './router'
import type { Env, Ctx } from './router'
import { todayStr, nowStr, addDays, getUser } from './db'
import { CRISIS_GOALS, LOJA_ITEMS } from './data'
import { touchStreak, missionProgress, quoteOf } from './xp'
import { checkCrisis, completeCrisisGoal } from './scheduler'
import { aiAvailable, setAiKey, noKeyMessage, chat, explainTopic, solveStepByStep, generateExercises, generateFlashcards, generateExam, buildReviewPlan, correctRedacao, scanImage } from './ai'

// ---------------------------------------------------------------- crise
define('GET', /^\/api\/crise$/, async (env) => {
  const user = await getUser(env)
  const active = await checkCrisis(env)
  const daysSince = user.last_study_date ? Math.max(0, (Math.round((new Date(todayStr()).getTime() - new Date(user.last_study_date).getTime()) / 86400000))) : 0
  return json({ active, goals: CRISIS_GOALS, quote: user.crisis_quote, days_since: daysSince })
})

define('POST', /^\/api\/crise\/complete$/, async (env, _req, ctx) => {
  const goalId = (ctx.body as any).goal_id ?? ''
  const user = await getUser(env)
  if (goalId === 'flashcards') await missionProgress(env, 'flashcards', 5)
  else if (goalId === 'questoes') await missionProgress(env, 'questoes', 3)
  else if (goalId === 'minutos') await missionProgress(env, 'minutos', 10)
  await touchStreak(env, user)
  return json(await completeCrisisGoal(env))
})

// ---------------------------------------------------------------- config
define('GET', /^\/api\/notificacoes$/, async (env) => {
  const items = (await env.DB.prepare('SELECT * FROM notifications ORDER BY at DESC LIMIT 30').all()).results as any[]
  return json({ notifications: items.map((n) => ({ id: n.id, type: n.type, title: n.title, body: n.body, at: n.at, read: !!n.read })) })
})

define('POST', /^\/api\/notificacoes\/read$/, async (env) => {
  const cutoff = new Date(Date.now() - 7 * 86400000).toISOString().replace('T', ' ').slice(0, 19)
  await env.DB.prepare('UPDATE notifications SET read = 1 WHERE at >= ?').bind(cutoff).run()
  return json({ ok: true })
})

define('POST', /^\/api\/notificacoes$/, async (env, _req, ctx) => {
  const b = ctx.body as any
  await env.DB.prepare('INSERT INTO notifications (type, title, body, at, read) VALUES (?, ?, ?, ?, 0)')
    .bind(b.type ?? '', b.title ?? '', b.body ?? '', nowStr()).run()
  return json({ ok: true })
})

define('PUT', /^\/api\/datas$/, async (env, _req, ctx) => {
  const b = ctx.body as any
  const sets: [string, string][] = []
  if (b.enem_date) sets.push(['enem_date', String(b.enem_date)])
  if (b.fuvest_date1) sets.push(['fuvest_date1', String(b.fuvest_date1)])
  if (b.fuvest_date2) sets.push(['fuvest_date2', String(b.fuvest_date2)])
  if (b.start_date) sets.push(['start_date', String(b.start_date)])
  for (const [col, val] of sets) {
    await env.DB.prepare(`UPDATE users SET ${col} = ?`).bind(val).run()
  }
  return json({ ok: true })
})

// ---------------------------------------------------------------- loja
define('GET', /^\/api\/loja\/items$/, async (env) => {
  const user = await getUser(env)
  return json({ xp: user.xp, owned: ownedList(user), items: LOJA_ITEMS })
})

define('POST', /^\/api\/loja\/buy$/, async (env, _req, ctx) => {
  const itemId = String((ctx.body as any).item_id ?? '')
  const item = LOJA_ITEMS[itemId]
  if (!item) return json({ ok: false, message: 'item não existe' })
  const user = await getUser(env)
  const owned = ownedList(user)
  if (owned.includes(itemId)) return json({ ok: false, message: 'item já adquirido' })
  if (user.xp < item.price) return json({ ok: false, message: `faltam ${item.price - user.xp} XP` })
  owned.push(itemId)
  await env.DB.prepare('UPDATE users SET xp = xp - ?, owned_items = ? WHERE id = ?').bind(item.price, JSON.stringify(owned), user.id).run()
  return json({ ok: true, item, xp: user.xp - item.price })
})

function ownedList(user: { owned_items: string }): string[] {
  try {
    const v = JSON.parse(user.owned_items || '[]')
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

// ---------------------------------------------------------------- user
define('PUT', /^\/api\/user$/, async (env, _req, ctx) => {
  const b = ctx.body as any
  const user = await getUser(env)
  const fields: [string, unknown][] = [
    ['name', b.name], ['avatar', b.avatar], ['objective', b.objective],
    ['university', b.university], ['course', b.course], ['theme', b.theme],
    ['pomodoro_focus', b.pomodoro_focus], ['pomodoro_break', b.pomodoro_break],
    ['ambient_sound', b.ambient_sound], ['notifications_enabled', b.notifications_enabled === undefined ? undefined : b.notifications_enabled ? 1 : 0],
  ]
  for (const [col, val] of fields) {
    if (val === undefined || val === null) continue
    await env.DB.prepare(`UPDATE users SET ${col} = ? WHERE id = ?`).bind(val, user.id).run()
  }
  return json({ ok: true, name: b.name ?? user.name })
})

// ---------------------------------------------------------------- backup
const TABLES = ['users', 'subjects', 'topics', 'weeks', 'week_items', 'revisions', 'flashcards',
  'redacoes', 'question_logs', 'study_sessions', 'pomodoros', 'notes', 'cards', 'achievements']

define('GET', /^\/api\/backup\/export$/, async (env) => {
  const tables: Record<string, unknown[]> = {}
  for (const t of TABLES) {
    const rows = (await env.DB.prepare(`SELECT * FROM ${t}`).all()).results as any[]
    if (rows.length) tables[t] = rows
  }
  return json({ app: 'operacao-fmusp-2028', version: 1, exported: todayStr(), tables })
})

define('POST', /^\/api\/backup\/import$/, async (env, _req, ctx) => {
  let payload: any
  try {
    payload = JSON.parse(String((ctx.body as any).data ?? ''))
  } catch {
    return json({ ok: false, message: 'arquivo de backup inválido' })
  }
  if (payload?.app !== 'operacao-fmusp-2028') {
    return json({ ok: false, message: 'arquivo não é um backup da Operação FMUSP 2028' })
  }
  const stmts: D1PreparedStatement[] = []
  for (const t of TABLES) {
    stmts.push(env.DB.prepare(`DELETE FROM ${t}`))
    const rows = payload.tables?.[t] ?? []
    for (const row of rows) {
      const cols = Object.keys(row)
      stmts.push(env.DB.prepare(`INSERT INTO ${t} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`).bind(...cols.map((c) => row[c])))
    }
  }
  try {
    await env.DB.batch(stmts)
    return json({ ok: true })
  } catch (e) {
    return json({ ok: false, message: `falha ao restaurar: ${e instanceof Error ? e.message : e}` })
  }
})

define('GET', /^\/api\/backup\/relatorio$/, async (env) => {
  const user = await getUser(env)
  const subs = (await env.DB.prepare('SELECT * FROM subjects ORDER BY ord').all()).results as any[]
  const rows: string[] = []
  for (const s of subs) {
    const logs = (await env.DB.prepare('SELECT qty, correct FROM question_logs WHERE subject_id = ?').bind(s.id).all()).results as any[]
    const fc = (await env.DB.prepare('SELECT COUNT(*) AS n FROM flashcards WHERE subject_id = ?').bind(s.id).first()) as any
    rows.push(`<tr><td>${s.name}</td><td>${logs.reduce((a, l) => a + l.qty, 0)}</td><td>${logs.reduce((a, l) => a + l.correct, 0)}</td><td>${fc.n}</td></tr>`)
  }
  const html = `<h2>Resumo da operação</h2>
<p>Estudante: <b>${user.name}</b> · Objetivo: ${user.objective} · XP: ${user.xp} · Patente: ${user.rank_slug}</p>
<table>
  <tr><th>Matéria</th><th>Questões</th><th>Acertos</th><th>Flashcards</th></tr>
  ${rows.join('')}
</table>
<p class="gold">Horas totais: ${Math.round((user.total_minutes / 60) * 10) / 10} · Streak: ${user.streak} dias ·
Precisão geral: ${Math.round((user.total_correct / Math.max(1, user.total_questions)) * 1000) / 10}%</p>`
  return json({ html })
})

// ---------------------------------------------------------------- ia
define('GET', /^\/api\/ia\/status$/, async (env) => {
  return json({ available: await aiAvailable(env), hint: 'Configure a chave gratuita em aistudio.google.com/apikey' })
})

define('POST', /^\/api\/ia\/key$/, async (env, _req, ctx) => {
  await setAiKey(env, String((ctx.body as any).key ?? ''))
  return json({ ok: true, available: await aiAvailable(env) })
})

async function context(env: Env): Promise<string> {
  const user = await getUser(env)
  const today = todayStr()
  const pendingCount = (await env.DB.prepare("SELECT COUNT(*) AS n FROM week_items wi JOIN weeks w ON w.id = wi.week_id WHERE wi.status = 'pendente' AND w.start_date <= ? AND w.end_date >= ?").bind(today, today).first()) as any
  return `Data: ${today}. Dias até ENEM: ${daysUntil(today, user.enem_date)}; até FUVEST: ${daysUntil(today, user.fuvest_date1)}. `
    + `XP: ${user.xp} (nível ${user.level}). Patente: ${user.rank_slug}. Sequência: ${user.streak} dias. `
    + `Questões resolvidas: ${user.total_questions}. Horas: ${Math.round((user.total_minutes / 60) * 10) / 10}. `
    + `Redações: ${user.total_redacoes}. Pendências da semana atual: ${pendingCount.n}.`
}

function daysUntil(a: string, b: string) {
  return Math.round((new Date(b + 'T00:00:00Z').getTime() - new Date(a + 'T00:00:00Z').getTime()) / 86400000)
}

async function guarded(env: Env, fn: () => Promise<unknown>): Promise<Response> {
  if (!(await aiAvailable(env))) return json(noKeyMessage())
  try {
    return json(await fn())
  } catch (e) {
    return json({ ok: false, message: e instanceof Error ? e.message : 'erro' })
  }
}

define('POST', /^\/api\/ia\/chat$/, async (env, _req, ctx) => {
  const message = String((ctx.body as any).message ?? '')
  return guarded(env, async () => chat(env, message, await context(env)))
})

define('POST', /^\/api\/ia\/explicar$/, async (env, _req, ctx) => {
  const b = ctx.body as any
  return guarded(env, () => explainTopic(env, String(b.subject ?? ''), String(b.topic ?? '')))
})

define('POST', /^\/api\/ia\/resolver$/, async (env, _req, ctx) => {
  const b = ctx.body as any
  return guarded(env, () => solveStepByStep(env, String(b.question ?? '')))
})

define('POST', /^\/api\/ia\/exercicios$/, async (env, _req, ctx) => {
  const b = ctx.body as any
  return guarded(env, () => generateExercises(env, String(b.subject ?? ''), String(b.topic ?? ''), Number(b.qty) || 5))
})

define('POST', /^\/api\/ia\/flashcards$/, async (env, _req, ctx) => {
  const b = ctx.body as any
  const subj = (await env.DB.prepare('SELECT * FROM subjects WHERE id = ?').bind(Number(b.subject_id)).first()) as any
  if (!subj) return json({ ok: false, message: 'matéria não encontrada' })
  return guarded(env, async () => {
    const cards = await generateFlashcards(env, subj.name, String(b.topic ?? ''), Number(b.qty) || 8)
    let created = 0
    for (const c of cards) {
      if (c?.front && c?.back) {
        await env.DB.prepare('INSERT INTO flashcards (subject_id, front, back, topic, due) VALUES (?, ?, ?, ?, ?)')
          .bind(subj.id, c.front, c.back, String(b.topic ?? ''), todayStr()).run()
        created++
      }
    }
    if (created) {
      const user = await getUser(env)
      await awardXpSafe(env, user, created * 2)
    }
    return { ok: true, created, xp: created * 2 }
  })
})

define('POST', /^\/api\/ia\/simulado$/, async (env, _req, ctx) => {
  const b = ctx.body as any
  return guarded(env, async () => {
    const result = await generateExam(env, String(b.subject ?? ''), Number(b.qty) || 10)
    const user = await getUser(env)
    const r = await env.DB.prepare('INSERT INTO exams (institution, name, year, questions_json, suggested_minutes) VALUES (?, ?, ?, ?, ?)')
      .bind('IA', result.name, new Date().getUTCFullYear(), JSON.stringify(result.questions), (Number(b.qty) || 10) * 3).run()
    await awardXpSafe(env, user, 15)
    return { ok: true, exam_id: r.meta.last_row_id, xp: 15 }
  })
})

define('POST', /^\/api\/ia\/plano-revisao$/, async (env, _req, ctx) => {
  const b = ctx.body as any
  return guarded(env, () => buildReviewPlan(env, Array.isArray(b.wrong_topics) ? b.wrong_topics : []))
})

define('POST', /^\/api\/ia\/corrigir-redacao\/(\d+)$/, async (env, _req, ctx) => {
  const red = (await env.DB.prepare('SELECT * FROM redacoes WHERE id = ?').bind(Number(ctx.params['0'])).first()) as any
  if (!red) return json({ ok: false, message: 'redação não encontrada' })
  return guarded(env, async () => {
    const result = await correctRedacao(env, red.tema, red.texto)
    if (result.ok) {
      await env.DB.prepare('UPDATE redacoes SET comp1 = ?, comp2 = ?, comp3 = ?, comp4 = ?, comp5 = ?, nota = ?, correcao = ? WHERE id = ?')
        .bind(result.comp1, result.comp2, result.comp3, result.comp4, result.comp5, result.nota, result.feedback, red.id).run()
    }
    return result
  })
})

define('POST', /^\/api\/ia\/scan$/, async (env, _req, ctx) => {
  const b = ctx.body as any
  return json(await scanImage(env, String(b.image_b64 ?? ''), String(b.intent ?? 'resumo')))
})

import { awardXp } from './xp'
async function awardXpSafe(env: Env, user: any, amount: number) {
  return awardXp(env, user, amount)
}
