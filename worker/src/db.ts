import type { Env } from './router'

export function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export function nowStr() {
  const d = new Date()
  const iso = d.toISOString().replace('T', ' ').slice(0, 19)
  const ms = String(d.getMilliseconds()).padStart(3, '0')
  return `${iso}.${ms}000`
}

export function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function mondayOf(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00Z')
  const wd = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - wd)
  return d.toISOString().slice(0, 10)
}

export function daysUntil(a: string, b: string) {
  return Math.round((new Date(b + 'T00:00:00Z').getTime() - new Date(a + 'T00:00:00Z').getTime()) / 86400000)
}

export function phaseForDate(d: string) {
  for (const p of PHASES_LOCAL) {
    if (p.start <= d && d <= p.end) return p
  }
  if (d < PHASES_LOCAL[0].start) return PHASES_LOCAL[0]
  return PHASES_LOCAL[PHASES_LOCAL.length - 1]
}

import { PHASES as PHASES_LOCAL } from './data'

export type UserRow = {
  id: number
  name: string
  avatar: string
  objective: string
  university: string
  course: string
  theme: string
  xp: number
  level: number
  rank_slug: string
  streak: number
  best_streak: number
  last_study_date: string | null
  start_date: string
  enem_date: string
  fuvest_date1: string
  fuvest_date2: string
  total_minutes: number
  total_questions: number
  total_correct: number
  total_flashcards: number
  total_redacoes: number
  total_pomodoros: number
  total_revisoes: number
  total_leituras_pag: number
  pomodoro_focus: number
  pomodoro_break: number
  ambient_sound: string
  crisis: number
  crisis_start: string | null
  crisis_quote: string
  notifications_enabled: number
  settings_json: string
  owned_items: string
  created_at: string | null
}

export async function getUser(env: Env): Promise<UserRow> {
  return (await env.DB.prepare('SELECT * FROM users ORDER BY id LIMIT 1').first()) as unknown as UserRow
}

export function ownedList(user: UserRow): string[] {
  try {
    const v = JSON.parse(user.owned_items || '[]')
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

export function settings(user: UserRow): Record<string, string> {
  try {
    return JSON.parse(user.settings_json || '{}')
  } catch {
    return {}
  }
}

export async function getSubjects(env: Env): Promise<any[]> {
  return (await env.DB.prepare('SELECT * FROM subjects ORDER BY ord').all()).results as any[]
}

export async function getCurrentWeek(env: Env): Promise<any | null> {
  const t = todayStr()
  return (await env.DB.prepare('SELECT * FROM weeks WHERE start_date <= ? AND end_date >= ? ORDER BY start_date DESC LIMIT 1').bind(t, t).first()) as any | null
}
