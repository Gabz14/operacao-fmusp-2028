import { create } from 'zustand'
import { api } from './lib/api'

export interface DashboardData {
  greeting: { name: string; date: string; weekday: string; time: string }
  days: { enem: number; fuvest: number; fuvest2: number }
  rpg: {
    xp: number; level: number; rank: string; rank_name: string
    next_rank: { slug: string; name: string; threshold: number; needed: number } | null
    rank_progress: number; streak: number; best_streak: number
  }
  phase: { num: number; name: string; weeks_done: number; weeks_total: number; progress: number }
  next_reward: {
    rank: { slug: string; name: string; threshold: number; needed: number } | null
    achievement: { slug: string; title: string; xp: number } | null
  }
  missions: {
    diaria: Mission[]
    semanal: Mission[]
    mensal: Mission[]
  }
  summary: {
    minutes: number; pomodoros: number; questions: number
    redacoes: number; flashcards_due: number; revisions_due: number
  }
  week: {
    id: number | null; title: string; start: string; end: string
    progress: number
    items: { id: number; day: number; type: string; title: string; qty: number; status: string; subject: number | null }[]
  }
  continue_study: { id: number; type: string; title: string; qty: number; subject: number | null } | null
  by_subject: Record<string, { questions: number; correct: number }>
  quote: string
  crisis: { active: boolean; goals: { id: string; title: string; detail: string }[]; quote: string; days_since: number }
}

export interface Mission {
  id: number; slug: string; title: string; target: number
  progress: number; completed: boolean; reward_xp: number
}

export interface Toast {
  id: number
  title: string
  body?: string
  kind?: 'xp' | 'info' | 'gold' | 'alert'
}

interface AppState {
  dash: DashboardData | null
  loading: boolean
  toasts: Toast[]
  refresh: (silent?: boolean) => Promise<void>
  toast: (t: Omit<Toast, 'id'>) => void
  dismissToast: (id: number) => void
}

let toastId = 0

export const useApp = create<AppState>((set, get) => ({
  dash: null,
  loading: true,
  toasts: [],
  refresh: async (silent = false) => {
    try {
      const dash = await api.get<DashboardData>('/api/dashboard')
      set({ dash, loading: false })
    } catch (e) {
      set({ loading: false })
      if (!silent) get().toast({ title: 'Falha na conexão', body: String(e).slice(0, 120), kind: 'alert' })
    }
  },
  toast: (t) => {
    const id = ++toastId
    set((s) => ({ toasts: [...s.toasts, { ...t, id }] }))
    setTimeout(() => get().dismissToast(id), 4200)
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))
