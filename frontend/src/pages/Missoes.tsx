import { useEffect, useState } from 'react'
import { CheckCircle2, Circle } from 'lucide-react'
import { api } from '../lib/api'
import type { Mission } from '../store'
import { Glass, Bar } from '../components/ui'

export default function Missoes() {
  const [groups, setGroups] = useState<{ diaria: Mission[]; semanal: Mission[]; mensal: Mission[] }>({ diaria: [], semanal: [], mensal: [] })

  useEffect(() => {
    api.get('/api/missoes').then(setGroups)
  }, [])

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-extrabold">Missões da <span className="gold-text">Operação</span></h1>
        <p className="text-mist text-sm mt-1">Cada missão cumprida move a cidade um distrito mais perto.</p>
      </header>
      <Section title="Diárias" missions={groups.diaria} />
      <Section title="Semanais" missions={groups.semanal} />
      <Section title="Mensais" missions={groups.mensal} />
      <div className="text-center text-xs text-mist pb-2">Missões completam automaticamente ao atingir a meta.</div>
    </div>
  )
}

function Section({ title, missions }: { title: string; missions: Mission[] }) {
  if (missions.length === 0) return null
  const allDone = missions.filter((m) => m.completed).length
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-bold uppercase tracking-widest text-gold-soft">{title}</div>
        <div className="text-xs text-mist">{allDone}/{missions.length}</div>
      </div>
      <div className="space-y-2">
        {missions.map((m) => {
          const done = m.completed
          return (
            <Glass key={m.id} className={`p-3 flex items-center gap-3 ${done ? 'border-emerald-500/30' : ''}`}>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${done ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gold/12 text-gold'}`}>
                {done ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm ${done ? 'line-through text-mist' : 'font-medium'}`}>{m.title}</div>
                <Bar value={(m.progress / m.target) * 100} className="mt-1.5 h-1.5" barClass={done ? 'bg-emerald-400' : undefined} />
                <div className="text-[11px] text-mist mt-1">{m.progress}/{m.target}</div>
              </div>
              <span className="text-xs text-gold whitespace-nowrap">+{m.reward_xp} XP</span>
            </Glass>
          )
        })}
      </div>
    </div>
  )
}
