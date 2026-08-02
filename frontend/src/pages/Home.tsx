import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Flame, Sparkles, Target, Play, Clock, CheckCircle2,
  CalendarDays, ChevronRight, TrendingUp,
} from 'lucide-react'
import { useApp } from '../store'
import { api } from '../lib/api'
import { Glass, Bar, Tag } from '../components/ui'

export default function Home() {
  const dash = useApp((s) => s.dash)
  const toast = useApp((s) => s.toast)
  const refresh = useApp((s) => s.refresh)

  if (!dash) return null
  const { greeting, days, rpg, phase, next_reward, missions, summary, week, continue_study, crisis, quote } = dash

  const completeItem = async () => {
    if (!continue_study) return
    const r = await api.post<{ xp: number }>(`/api/cronograma/items/${continue_study.id}/complete`)
    toast({ title: 'Tarefa concluída', body: `+${r.xp} XP — ${continue_study.title}`, kind: 'xp' })
    refresh()
  }

  const daily = missions.diaria.slice(0, 3)

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-3xl font-extrabold tracking-tight">
              Bom dia, <span className="gold-text">{greeting.name}</span>.
            </div>
            <div className="text-mist text-sm mt-1">
              {greeting.weekday}, {greeting.time}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Tag tone="gold"><Flame className="w-3.5 h-3.5" /> {rpg.streak} dias</Tag>
          </div>
        </div>
      </motion.div>

      {/* Countdowns */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="grid grid-cols-2 gap-3">
        <Glass className="p-4 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-gold/10 blur-xl" />
          <div className="text-[11px] uppercase tracking-widest text-mist">ENEM 2028</div>
          <div className="text-3xl font-black gold-text mt-1">{days.enem.toLocaleString('pt-BR')}</div>
          <div className="text-xs text-mist mt-1">dias para a prova</div>
        </Glass>
        <Glass className="p-4 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-gold/10 blur-xl" />
          <div className="text-[11px] uppercase tracking-widest text-mist">FUVEST 2028</div>
          <div className="text-3xl font-black gold-text mt-1">{days.fuvest.toLocaleString('pt-BR')}</div>
          <div className="text-xs text-mist mt-1">dias para a 1ª fase</div>
        </Glass>
      </motion.div>

      {/* RPG + fase */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Glass strong className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-gold/15 border border-gold/40 flex items-center justify-center text-gold font-black text-lg float-slow">
                {rpg.level}
              </div>
              <div>
                <div className="font-bold">{rpg.rank_name}</div>
                <div className="text-mist text-xs">Nível {rpg.level} · {rpg.xp.toLocaleString('pt-BR')} XP</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-mist">Fase {phase.num}</div>
              <div className="text-sm font-semibold gold-text">{phase.name}</div>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            <div>
              <div className="flex justify-between text-[11px] text-mist mb-1">
                <span>Patente {rpg.next_rank ? `— faltam ${rpg.next_rank.needed} XP para ${rpg.next_rank.name}` : 'máxima'}</span>
                <span>{rpg.rank_progress}%</span>
              </div>
              <Bar value={rpg.rank_progress} />
            </div>
            <div>
              <div className="flex justify-between text-[11px] text-mist mb-1">
                <span>Fase {phase.num} — {phase.name}</span>
                <span>{phase.weeks_done}/{phase.weeks_total} semanas</span>
              </div>
              <Bar value={phase.progress} />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-gold-soft/90">
            <Sparkles className="w-3.5 h-3.5" />
            {next_reward.achievement
              ? `Próxima recompensa: ${next_reward.achievement.title} (+${next_reward.achievement.xp} XP)`
              : 'Patente máxima alcançada — a cidade é sua.'}
          </div>
        </Glass>
      </motion.div>

      {/* Continuar estudos */}
      {continue_study && !crisis.active && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <button
            onClick={completeItem}
            className="w-full text-left glass rounded-2xl p-4 flex items-center gap-3 hover:border-gold/50 transition-colors gold-glow"
          >
            <div className="w-12 h-12 rounded-xl bg-gold/15 border border-gold/40 flex items-center justify-center text-gold shrink-0">
              <Play className="w-5 h-5 fill-gold" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] uppercase tracking-widest text-mist">Continuar estudos</div>
              <div className="font-semibold text-sm truncate">{continue_study.title}</div>
            </div>
            <ChevronRight className="text-mist w-5 h-5 shrink-0" />
          </button>
        </motion.div>
      )}

      {/* Missão diária */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-bold uppercase tracking-widest text-gold-soft flex items-center gap-2">
            <Target className="w-4 h-4" /> Missões do dia
          </div>
          <Link to="/missoes" className="text-xs text-mist hover:text-white">ver todas →</Link>
        </div>
        <div className="space-y-2">
          {daily.map((m) => (
            <Glass key={m.id} className="p-3 flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${m.completed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gold/12 text-gold'}`}>
                {m.completed ? <CheckCircle2 className="w-4 h-4" /> : m.progress}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate">{m.title}</div>
                <Bar value={(m.progress / m.target) * 100} className="mt-1.5 h-1.5" />
              </div>
              <span className="text-xs text-gold whitespace-nowrap">+{m.reward_xp}</span>
            </Glass>
          ))}
        </div>
      </motion.div>

      {/* Resumo do dia */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-bold uppercase tracking-widest text-gold-soft flex items-center gap-2">
            <Clock className="w-4 h-4" /> Hoje
          </div>
          <Link to="/estatisticas" className="text-xs text-mist hover:text-white">estatísticas →</Link>
        </div>
        <Glass className="p-4 grid grid-cols-3 gap-3 text-center">
          <Stat label="Horas" value={(summary.minutes / 60).toFixed(1).replace('.', ',')} />
          <Stat label="Pomodoros" value={String(summary.pomodoros)} />
          <Stat label="Questões" value={String(summary.questions)} />
          <Stat label="Redações" value={String(summary.redacoes)} />
          <Stat label="Flashcards" value={String(summary.flashcards_due)} warn={summary.flashcards_due > 0} />
          <Stat label="Revisões" value={String(summary.revisions_due)} warn={summary.revisions_due > 0} />
        </Glass>
      </motion.div>

      {/* Semana atual */}
      {week.id && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Link to="/cronograma">
            <Glass className="p-4 hover:border-gold/40 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-bold flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-gold" /> {week.title}
                </div>
                <span className="text-xs text-gold font-semibold">{week.progress}%</span>
              </div>
              <Bar value={week.progress} />
              <div className="text-xs text-mist mt-2 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                {week.items.filter((i) => i.status === 'concluida').length}/{week.items.length} tarefas da semana concluídas
              </div>
            </Glass>
          </Link>
        </motion.div>
      )}

      {/* Frase */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
        <Glass className="p-4 border-gold/25 relative overflow-hidden">
          <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
          <div className="text-2xl leading-none gold-text font-serif absolute -top-1 left-3 opacity-40">"</div>
          <p className="text-sm leading-relaxed text-gold-soft/95 pl-4">{quote}</p>
          <div className="text-[10px] uppercase tracking-widest text-mist mt-2 pl-4">— Comando da Operação</div>
        </Glass>
      </motion.div>
    </div>
  )
}

function Stat({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="text-center">
      <div className={`text-xl font-black ${warn ? 'text-gold' : 'text-white'}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-mist mt-0.5">{label}</div>
    </div>
  )
}
