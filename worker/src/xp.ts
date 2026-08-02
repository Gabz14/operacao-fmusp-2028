import type { Env } from './router'
import { todayStr, nowStr, mondayOf, addDays } from './db'
import type { UserRow } from './db'
import { level_for_xp, rank_for_xp, RANKS, QUOTES_RANK, MISSIONS_DAILY, MISSIONS_WEEKLY, MISSIONS_MONTHLY } from './data'

export async function quoteOf(env: Env, occasion: string): Promise<string> {
  const rows = (await env.DB.prepare('SELECT text FROM quotes WHERE occasion = ?').bind(occasion).all()).results as { text: string }[]
  const pool = rows.length ? rows : ((await env.DB.prepare("SELECT text FROM quotes WHERE occasion = 'dia'").all()).results as { text: string }[])
  const ordinal = Math.floor(Date.now() / 86400000) + 719163
  return pool[ordinal % pool.length].text
}

export async function unlockCardsForPhase(env: Env, phaseNum: number): Promise<number> {
  const r = await env.DB.prepare('UPDATE cards SET unlocked_at = ? WHERE phase_unlock <= ? AND unlocked_at IS NULL').bind(nowStr(), phaseNum).run()
  return r.meta.changes ?? 0
}

export async function updateRank(env: Env, user: UserRow): Promise<{ slug: string; name: string } | null> {
  const [slug, name] = rank_for_xp(user.xp)
  if (user.rank_slug !== slug) {
    user.rank_slug = slug
    const msg = QUOTES_RANK[slug] ?? `Patente promovida: ${name}.`
    await env.DB.prepare('UPDATE users SET rank_slug = ? WHERE id = ?').bind(slug, user.id).run()
    await env.DB.prepare('INSERT INTO notifications (type, title, body, at, read) VALUES (?, ?, ?, ?, 0)')
      .bind('rank', `Patente promovida: ${name}`, msg, nowStr()).run()
    return { slug, name }
  }
  return null
}

export async function updateLevel(env: Env, user: UserRow): Promise<boolean> {
  const newLevel = level_for_xp(user.xp)
  if (newLevel > user.level) {
    user.level = newLevel
    await env.DB.prepare('UPDATE users SET level = ? WHERE id = ?').bind(newLevel, user.id).run()
    await env.DB.prepare('INSERT INTO notifications (type, title, body, at, read) VALUES (?, ?, ?, ?, 0)')
      .bind('level', `Nível ${newLevel} alcançado`, 'Seu nível subiu. A cidade percebeu.', nowStr()).run()
    if (newLevel >= 10) await unlockAchievement(env, user, 'nivel10')
    return true
  }
  return false
}

export async function unlockAchievement(env: Env, user: UserRow, slug: string): Promise<{ slug: string; title: string; xp: number } | null> {
  const ach = (await env.DB.prepare('SELECT * FROM achievements WHERE slug = ?').bind(slug).first()) as any
  if (ach && ach.unlocked_at === null) {
    await env.DB.prepare('UPDATE achievements SET unlocked_at = ? WHERE slug = ?').bind(nowStr(), slug).run()
    user.xp += ach.xp
    await env.DB.prepare('UPDATE users SET xp = ? WHERE id = ?').bind(user.xp, user.id).run()
    await updateLevel(env, user)
    await updateRank(env, user)
    await env.DB.prepare('INSERT INTO notifications (type, title, body, at, read) VALUES (?, ?, ?, ?, 0)')
      .bind('conquista', `Conquista: ${ach.title}`, `+${ach.xp} XP — ${ach.description}`, nowStr()).run()
    return { slug: ach.slug, title: ach.title, xp: ach.xp }
  }
  return null
}

export async function touchStreak(env: Env, user: UserRow): Promise<void> {
  const today = todayStr()
  if (user.last_study_date === today) return
  let streak: number
  if (user.last_study_date === addDays(today, -1)) streak = user.streak + 1
  else streak = 1
  const best = Math.max(user.best_streak, streak)
  user.streak = streak
  user.best_streak = best
  user.last_study_date = today
  await env.DB.prepare('UPDATE users SET streak = ?, best_streak = ?, last_study_date = ? WHERE id = ?')
    .bind(streak, best, today, user.id).run()
  if (streak === 30) await unlockAchievement(env, user, 'd30')
  if (streak === 100) await unlockAchievement(env, user, 'd100')
}

export async function missionProgress(env: Env, metric: string, amount: number): Promise<void> {
  const user = await getUserRef(env)
  if (!user) return
  const today = todayStr()
  const missions = (await env.DB.prepare('SELECT * FROM missions WHERE period_start = ? AND completed = 0').bind(today).all()).results as any[]
  for (const m of missions) {
    if (m.slug === 'm_dias25' && metric === 'minutos' && amount > 0) continue
    if (metric === 'dias' && m.slug !== 'm_dias25') continue
    let progress: number
    if (m.slug === 'm_dias25' && metric === 'dias') {
      progress = Math.min(m.progress + amount, m.target)
    } else if (['minutos', 'questoes', 'pomodoro', 'flashcards', 'redacao', 'leitura', 'revisao', 'simulado', 'precisao'].includes(metric)) {
      progress = Math.min(m.progress + amount, m.target)
    } else {
      continue
    }
    await env.DB.prepare('UPDATE missions SET progress = ? WHERE id = ?').bind(progress, m.id).run()
    if (progress >= m.target && !m.completed) {
      await env.DB.prepare('UPDATE missions SET completed = 1 WHERE id = ?').bind(m.id).run()
      user.xp += m.reward_xp
      await env.DB.prepare('UPDATE users SET xp = ? WHERE id = ?').bind(user.xp, user.id).run()
      await updateLevel(env, user)
      await updateRank(env, user)
      await env.DB.prepare('INSERT INTO notifications (type, title, body, at, read) VALUES (?, ?, ?, ?, 0)')
        .bind('missao', 'Missão cumprida', `${m.title} — +${m.reward_xp} XP`, nowStr()).run()
    }
  }
}

export async function awardXp(env: Env, user: UserRow, amount: number): Promise<number> {
  user.xp += amount
  await env.DB.prepare('UPDATE users SET xp = ? WHERE id = ?').bind(user.xp, user.id).run()
  await updateLevel(env, user)
  await updateRank(env, user)
  return user.xp
}

export async function ensureMissions(env: Env): Promise<void> {
  const today = todayStr()
  const user = await getUserRef(env)
  if (!user) return
  const daily = (await env.DB.prepare('SELECT COUNT(*) AS n FROM missions WHERE type = ? AND period_start = ?').bind('diaria', today).first()) as any
  if (!daily.n) {
    for (const [slug, title, target, , xp] of MISSIONS_DAILY) {
      await env.DB.prepare('INSERT INTO missions (type, slug, title, target, reward_xp, period_start) VALUES (?, ?, ?, ?, ?, ?)')
        .bind('diaria', slug, title, target, xp, today).run()
    }
  }
  const monday = mondayOf(today)
  const weekly = (await env.DB.prepare('SELECT COUNT(*) AS n FROM missions WHERE type = ? AND period_start = ?').bind('semanal', monday).first()) as any
  if (!weekly.n) {
    for (const [slug, title, target, , xp] of MISSIONS_WEEKLY) {
      await env.DB.prepare('INSERT INTO missions (type, slug, title, target, reward_xp, period_start) VALUES (?, ?, ?, ?, ?, ?)')
        .bind('semanal', slug, title, target, xp, monday).run()
    }
  }
  const month = today.slice(0, 8) + '01'
  const monthly = (await env.DB.prepare('SELECT COUNT(*) AS n FROM missions WHERE type = ? AND period_start = ?').bind('mensal', month).first()) as any
  if (!monthly.n) {
    for (const [slug, title, target, , xp] of MISSIONS_MONTHLY) {
      await env.DB.prepare('INSERT INTO missions (type, slug, title, target, reward_xp, period_start) VALUES (?, ?, ?, ?, ?, ?)')
        .bind('mensal', slug, title, target, xp, month).run()
    }
  }
}

async function getUserRef(env: Env): Promise<UserRow | null> {
  return (await env.DB.prepare('SELECT * FROM users ORDER BY id LIMIT 1').first()) as unknown as UserRow | null
}

export { RANKS }
