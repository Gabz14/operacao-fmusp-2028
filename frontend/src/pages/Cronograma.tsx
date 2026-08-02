import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, Circle, ChevronDown, Layers, PenLine, RefreshCcw, BookOpen, Target } from 'lucide-react'
import { api } from '../lib/api'
import { useApp } from '../store'
import { Glass, Bar } from '../components/ui'

interface WeekItem {
  id: number; day: number; day_name: string; type: string; title: string
  qty: number; status: string; subject: number | null
  subject_name: string | null; subject_color: string | null
}
interface Week {
  id: number; phase: number; phase_name: string; start: string; end: string
  title: string; status: string; progress: number; items: WeekItem[]
}
interface Phase { num: number; name: string; start: string; end: string; weeks_done: number; weeks_total: number; progress: number }

const TYPE_ICON: Record<string, typeof BookOpen> = {
  conteudo: BookOpen, questoes: CheckCircle2, revisao: RefreshCcw,
  flashcards: Layers, redacao: PenLine, leitura: BookOpen, simulado: Target,
}
const DAY_ORDER = [0, 1, 2, 3, 4, 5, 6]

export default function Cronograma() {
  const [weeks, setWeeks] = useState<Week[]>([])
  const [phases, setPhases] = useState<Phase[]>([])
  const [openWeek, setOpenWeek] = useState<number | null>(null)
  const [currentWeekId, setCurrentWeekId] = useState<number | null>(null)
  const refresh = useApp((s) => s.refresh)
  const toast = useApp((s) => s.toast)

  const load = async () => {
    const [c, p] = await Promise.all([
      api.get<{ weeks: Week[]; today: string }>('/api/cronograma'),
      api.get<{ phases: Phase[] }>('/api/cronograma/phases'),
    ])
    setWeeks(c.weeks)
    setPhases(p.phases)
    const today = new Date(c.today + 'T12:00:00')
    const cur = c.weeks.find((w) => {
      const s = new Date(w.start + 'T00:00:00')
      const e = new Date(w.end + 'T00:00:00')
      return today >= s && today <= e
    })
    setCurrentWeekId(cur?.id ?? null)
    if (cur && openWeek === null) setOpenWeek(cur.id)
  }

  useEffect(() => { load() }, [])

  const complete = async (id: number) => {
    const r = await api.post<{ xp: number }>(`/api/cronograma/items/${id}/complete`)
    toast({ title: '+ ' + r.xp + ' XP', body: 'Tarefa concluída. A cidade está mais dourada.', kind: 'xp' })
    load()
    refresh()
  }

  const byDay = (items: WeekItem[]) => {
    const map: Record<number, WeekItem[]> = {}
    for (const d of DAY_ORDER) map[d] = []
    for (const i of items) map[i.day]?.push(i)
    return map
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-extrabold">Cronograma <span className="gold-text">da Operação</span></h1>
        <p className="text-mist text-sm mt-1">05 fases · 128 semanas · sem decisões: o plano decide por você.</p>
      </header>

      {/* Fases */}
      <div className="grid grid-cols-5 gap-1.5">
        {phases.map((p, i) => (
          <div key={p.num} className="text-center">
            <div
              className={`rounded-lg py-2 text-[10px] font-bold ${
                p.weeks_done === p.weeks_total && p.weeks_total > 0
                  ? 'bg-gold/25 text-gold border border-gold/40'
                  : 'bg-white/5 text-mist border border-white/10'
              }`}
            >
              {i + 1}
            </div>
            <div className="text-[9px] text-mist mt-1 leading-tight">{p.name}</div>
          </div>
        ))}
      </div>

      {/* Semanas */}
      <div className="space-y-2">
        {weeks.map((w) => {
          const isCurrent = w.id === currentWeekId
          const open = openWeek === w.id
          const phaseColor = PHASE_COLORS[w.phase]
          return (
            <div key={w.id}>
              <button
                onClick={() => setOpenWeek(open ? null : w.id)}
                className={`w-full text-left rounded-xl p-3 flex items-center gap-3 border transition-colors ${
                  isCurrent ? 'glass-strong gold-border' : 'glass hover:border-gold/30'
                }`}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-sm shrink-0 border"
                  style={{ background: phaseColor + '22', borderColor: phaseColor + '66', color: phaseColor }}
                >
                  F{w.phase}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm truncate">{w.title}</span>
                    {isCurrent && <span className="text-[9px] font-bold text-gold bg-gold/15 border border-gold/40 rounded-full px-2 py-0.5">ATUAL</span>}
                    {w.status === 'concluida' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                    {w.status === 'vencida' && <span className="text-[9px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/40 rounded-full px-2 py-0.5">COM PENDÊNCIAS</span>}
                  </div>
                  <div className="text-[11px] text-mist mt-0.5">
                    {w.start} → {w.end}
                  </div>
                  <Bar value={w.progress} className="mt-1.5 h-1" />
                </div>
                <ChevronDown className={`text-mist w-4 h-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
              </button>

              {open && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
                  <div className="mt-1.5 space-y-1.5 pl-1">
                    {DAY_ORDER.map((day) => {
                      const items = byDay(w.items)[day]
                      if (!items || items.length === 0) return null
                      const dayDone = items.every((i) => i.status === 'concluida')
                      return (
                        <Glass key={day} className={`p-2.5 ${dayDone ? 'opacity-70' : ''}`}>
                          <div className="flex items-center gap-2 mb-1.5">
                            <div className={`text-[10px] font-bold uppercase tracking-widest ${dayDone ? 'text-emerald-400' : 'text-gold-soft'}`}>
                              {DAY_NAMES[day]}
                            </div>
                            <div className="flex-1 h-px bg-white/8" />
                            <div className="text-[10px] text-mist">{items.filter((i) => i.status === 'concluida').length}/{items.length}</div>
                          </div>
                          <div className="space-y-1">
                            {items.map((i) => {
                              const Icon = TYPE_ICON[i.type] ?? BookOpen
                              const done = i.status === 'concluida'
                              return (
                                <button
                                  key={i.id}
                                  onClick={() => !done && complete(i.id)}
                                  disabled={done}
                                  className={`w-full flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors ${
                                    done ? 'opacity-50' : 'hover:bg-white/6 active:scale-[0.99]'
                                  }`}
                                >
                                  {done
                                    ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                    : <Circle className="w-4 h-4 text-gold/50 shrink-0" />}
                                  <Icon className="w-3.5 h-3.5 text-mist shrink-0" />
                                  <span className={`text-[13px] flex-1 truncate ${done ? 'line-through' : ''}`}>{i.title}</span>
                                  {i.qty > 0 && <span className="text-[11px] text-gold shrink-0">{i.qty}</span>}
                                  {i.subject_name && (
                                    <span className="text-[10px] text-mist shrink-0" style={{ color: i.subject_color ?? undefined }}>
                                      {i.subject_name}
                                    </span>
                                  )}
                                </button>
                              )
                            })}
                          </div>
                        </Glass>
                      )
                    })}
                  </div>
                </motion.div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const PHASE_COLORS = ['#9ca3af', '#f5c518', '#ffd968', '#b8860b', '#fff3c4']
const DAY_NAMES = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']
