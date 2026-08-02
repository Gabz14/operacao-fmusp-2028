import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Flame, Timer, Target } from 'lucide-react'
import { api } from '../lib/api'
import type { DashboardData } from '../store'
import { Glass, Bar } from '../components/ui'

export default function Widget() {
  const [dash, setDash] = useState<DashboardData | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        setDash(await api.get('/api/dashboard'))
      } catch { /* sem servidor */ }
    }
    load()
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
  }, [])

  if (!dash) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-mist text-sm">
        Widget sem dados — inicie a operação no app principal.
      </div>
    )
  }

  const daily = dash.missions.diaria[0]

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-extrabold">Widget de <span className="gold-text">Missão</span></h1>
        <p className="text-mist text-sm mt-1">Painel compacto — deixe aberto ao lado do seu cronômetro.</p>
      </header>

      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
        <Glass strong className="p-5 relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-gold/10 blur-2xl" />
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-mist">Missão do dia</div>
              <div className="font-bold text-sm mt-0.5">{daily?.title ?? 'Sem missões'}</div>
              {daily && <Bar value={(daily.progress / daily.target) * 100} className="mt-2 h-1.5" />}
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 text-gold"><Flame className="w-4 h-4" /> {dash.rpg.streak}</div>
              <div className="text-xs gold-text font-black mt-1">{dash.rpg.xp} XP</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4 text-center">
            <div><Timer className="w-4 h-4 text-gold mx-auto mb-0.5" /><div className="text-[11px] text-mist">pomodoros</div><div className="font-bold">{dash.summary.pomodoros}</div></div>
            <div><Target className="w-4 h-4 text-gold mx-auto mb-0.5" /><div className="text-[11px] text-mist">questões</div><div className="font-bold">{dash.summary.questions}</div></div>
            <div><span className="text-gold font-black">✍</span><div className="text-[11px] text-mist">redações</div><div className="font-bold">{dash.summary.redacoes}</div></div>
          </div>
          <div className="mt-3 text-center">
            <Link to="/foco" className="text-xs font-bold bg-gold text-black rounded-full px-4 py-2 inline-block">iniciar pomodoro</Link>
          </div>
        </Glass>
      </motion.div>

      <Glass className="p-3 text-center text-xs text-mist">
        Este painel espelha o dashboard em tempo real. Em celulares, o widget nativo de tela inicial só existe em Android nativo — por isso este modo de painel compacto.
      </Glass>
    </div>
  )
}
