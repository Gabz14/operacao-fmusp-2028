import { useState } from 'react'
import { motion } from 'framer-motion'
import { Layers, Timer, CheckCircle2, ShieldAlert } from 'lucide-react'
import { api } from '../lib/api'
import { useApp } from '../store'

export default function Crise() {
  const dash = useApp((s) => s.dash)
  const refresh = useApp((s) => s.refresh)
  const toast = useApp((s) => s.toast)
  const [done, setDone] = useState<Set<string>>(new Set())

  if (!dash?.crisis.active) return null
  const { goals, quote, days_since } = dash.crisis

  const complete = async (id: string) => {
    await api.post('/api/crise/complete', { goal_id: id })
    setDone((d) => new Set(d).add(id))
    toast({ title: 'Você voltou.', body: 'A cidade reacendeu com você. O cronograma normal está de volta.', kind: 'gold' })
    setTimeout(() => refresh(), 1500)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[80] bg-black/85 backdrop-blur-xl flex items-center justify-center p-5"
    >
      <div className="max-w-md w-full space-y-5">
        <div className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 rounded-full bg-red-500/15 border border-red-500/40 flex items-center justify-center text-red-400">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-black gold-text">Modo Crise</h2>
          <p className="text-sm text-mist leading-relaxed">
            {days_since} dias de silêncio. Não é derrota — é pausa. Para reacender a cidade, cumpra uma das pequenas metas:
          </p>
          <p className="text-xs text-gold-soft/80 italic leading-relaxed">"{quote}"</p>
        </div>

        <div className="space-y-2.5">
          {goals.map((g) => {
            const isDone = done.has(g.id)
            const Icon = g.id === 'flashcards' ? Layers : g.id === 'questoes' ? CheckCircle2 : Timer
            return (
              <button
                key={g.id}
                disabled={isDone}
                onClick={() => complete(g.id)}
                className={`w-full text-left glass rounded-2xl p-4 flex items-center gap-3 transition-all ${
                  isDone ? 'opacity-50 border-emerald-500/40' : 'hover:border-gold/50 gold-glow'
                }`}
              >
                <div className="w-11 h-11 rounded-xl bg-gold/15 border border-gold/40 flex items-center justify-center text-gold shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-sm">{g.title}</div>
                  <div className="text-xs text-mist mt-0.5">{g.detail}</div>
                </div>
                {isDone && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
              </button>
            )
          })}
        </div>

        <p className="text-center text-[11px] text-mist">
          Ao completar qualquer meta, o cronograma normal retorna.
        </p>
      </div>
    </motion.div>
  )
}
