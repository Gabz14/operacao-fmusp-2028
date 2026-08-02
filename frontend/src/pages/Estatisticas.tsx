import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { CalendarDays, Flame, Target, TrendingUp } from 'lucide-react'
import { api } from '../lib/api'
import { Glass, Bar } from '../components/ui'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, Line, LineChart, CartesianGrid, BarChart, Bar as RBar } from 'recharts'

interface Stats {
  totals: {
    minutes: number; hours: number; streak: number; best_streak: number
    questions: number; correct: number; accuracy: number
    flashcards: number; pomodoros: number; redacoes: number; revisoes: number
    avg_week_minutes: number
  }
  minutes_by_day: Record<string, number>
  pomos_by_day: Record<string, number>
  questions_by_day: Record<string, number>
  minutes_by_subject: Record<string, number>
  questions_by_subject: Record<string, number>
  accuracy_by_subject: Record<string, number>
  top_subject: string
  redacao_evolution: { date: string; nota: number }[]
  flashcards_by_subject: Record<string, number>
}

const GOLD = '#f5c518'

export default function Estatisticas() {
  const [stats, setStats] = useState<Stats | null>(null)
  useEffect(() => { api.get('/api/estatisticas').then(setStats) }, [])

  if (!stats) return null
  const t = stats.totals

  const minutesData = Object.entries(stats.minutes_by_day).map(([date, value]) => ({ date: date.slice(5), value }))
  const subjectData = Object.entries(stats.minutes_by_subject)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name: name.slice(0, 9), value }))
    .sort((a, b) => b.value - a.value)
  const cardsData = Object.entries(stats.flashcards_by_subject)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name: name.slice(0, 9), value }))
    .sort((a, b) => b.value - a.value)

  const heat = Object.entries(stats.minutes_by_day)

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-extrabold">Estatísticas da <span className="gold-text">Operação</span></h1>
        <p className="text-mist text-sm mt-1">Dados não mentem: a cidade cresce a cada hora registrada.</p>
      </header>

      <div className="grid grid-cols-3 gap-2">
        <StatCard label="Horas" value={t.hours.toFixed(1).replace('.', ',')} />
        <StatCard label="Streak" value={String(t.streak)} />
        <StatCard label="Precisão" value={t.accuracy.toFixed(0) + '%'} />
        <StatCard label="Questões" value={t.questions.toLocaleString('pt-BR')} />
        <StatCard label="Flashcards" value={t.flashcards.toLocaleString('pt-BR')} />
        <StatCard label="Pomodoros" value={String(t.pomodoros)} />
        <StatCard label="Redações" value={String(t.redacoes)} />
        <StatCard label="Revisões" value={String(t.revisoes)} />
        <StatCard label="Semana" value={(t.avg_week_minutes / 60).toFixed(1).replace('.', ',') + 'h'} />
      </div>

      {/* Mapa de calor 60 dias */}
      <Glass className="p-4">
        <div className="text-sm font-bold mb-3 flex items-center gap-2"><CalendarDays className="w-4 h-4 text-gold" /> Últimos 60 dias (min)</div>
        <div className="grid grid-cols-12 gap-1">
          {heat.map(([date, value], i) => (
            <motion.div
              key={date}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.004 }}
              title={`${date}: ${value} min`}
              className="aspect-square rounded-[3px]"
              style={{
                background: value === 0 ? 'rgba(255,255,255,0.05)' : `rgba(245,197,24,${Math.min(1, 0.15 + value / 90)})`,
                boxShadow: value > 60 ? '0 0 8px rgba(245,197,24,0.35)' : undefined,
              }}
            />
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-mist mt-2">
          <span>0 min</span><span>90+ min</span>
        </div>
      </Glass>

      {/* Minutos por dia */}
      <Glass className="p-4">
        <div className="text-sm font-bold mb-3">Minutos por dia</div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={minutesData}>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 9 }} interval={5} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip contentStyle={{ background: '#181823', border: '1px solid rgba(245,197,24,0.3)', borderRadius: 12, fontSize: 12 }} />
            <RBar dataKey="value" radius={[3, 3, 0, 0]}>
              {minutesData.map((_, i) => <Cell key={i} fill={GOLD} fillOpacity={0.85} />)}
            </RBar>
          </BarChart>
        </ResponsiveContainer>
      </Glass>

      {/* Por matéria */}
      <div className="grid grid-cols-1 gap-3">
        <Glass className="p-4">
          <div className="text-sm font-bold mb-1 flex items-center gap-2"><Target className="w-4 h-4 text-gold" /> Matéria mais estudada (30d)</div>
          <div className="text-2xl font-black gold-text mb-3">{stats.top_subject}</div>
          {subjectData.length > 0 && (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={subjectData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                  {subjectData.map((_, i) => <Cell key={i} fill={subjectData[i].value === subjectData[0].value ? GOLD : 'rgba(245,197,24,0.35)'} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#181823', border: '1px solid rgba(245,197,24,0.3)', borderRadius: 12, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {subjectData.slice(0, 6).map((s) => (
              <span key={s.name} className="text-[10px] text-mist bg-white/5 border border-white/10 rounded-full px-2.5 py-1">{s.name}: {s.value}min</span>
            ))}
          </div>
        </Glass>

        {cardsData.length > 0 && (
          <Glass className="p-4">
            <div className="text-sm font-bold mb-2">Flashcards por matéria</div>
            <div className="space-y-2">
              {cardsData.map((s) => (
                <div key={s.name}>
                  <div className="flex justify-between text-xs text-mist mb-0.5"><span>{s.name}</span><span>{s.value}</span></div>
                  <Bar value={(s.value / cardsData[0].value) * 100} className="h-1.5" />
                </div>
              ))}
            </div>
          </Glass>
        )}
      </div>

      {/* Evolução de redações */}
      {stats.redacao_evolution.length > 0 && (
        <Glass className="p-4">
          <div className="text-sm font-bold mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-gold" /> Evolução das redações</div>
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={stats.redacao_evolution}>
              <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 1000]} hide />
              <Tooltip contentStyle={{ background: '#181823', border: '1px solid rgba(245,197,24,0.3)', borderRadius: 12, fontSize: 12 }} />
              <Line type="monotone" dataKey="nota" stroke={GOLD} strokeWidth={2.5} dot={{ fill: GOLD, r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </Glass>
      )}

      <div className="text-center text-xs text-mist flex items-center justify-center gap-1.5 pb-2">
        <Flame className="w-3.5 h-3.5 text-gold" /> Melhor streak: {t.best_streak} dias · {t.revisoes} revisões espaçadas cumpridas
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Glass className="p-3 text-center">
      <div className="text-xl font-black gold-text">{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-mist mt-0.5">{label}</div>
    </Glass>
  )
}
