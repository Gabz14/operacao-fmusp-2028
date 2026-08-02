import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Lock } from 'lucide-react'
import { api } from '../lib/api'
import { Glass } from '../components/ui'

interface Ach { slug: string; title: string; description: string; xp: number; unlocked: boolean }

const ICONS: Record<string, string> = {
  primeira_questao: '📝', primeiro_pomodoro: '⏱️', primeiro_flashcard: '🗂️',
  primeira_redacao: '✍️', primeira_semana: '📅', q100: '💯', q1000: '🏅',
  h100: '⏳', h500: '🔥', d30: '🗓️', d100: '👑', ano1: '🎂',
  fim_matematica: '📐', fim_biologia: '🧬', fim_fisica: '⚛️', fim_quimica: '🧪',
  fim_cronograma: '🏆', nivel10: '⭐', patente_especialista: '🎖️',
}

export default function Conquistas() {
  const [list, setList] = useState<Ach[]>([])
  useEffect(() => { api.get('/api/perfil').then((r) => setList(r.achievements)) }, [])

  const unlocked = list.filter((a) => a.unlocked).length

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-extrabold">Conquistas da <span className="gold-text">Operação</span></h1>
        <p className="text-mist text-sm mt-1">{unlocked}/{list.length} desbloqueadas · cada uma vale XP</p>
      </header>
      <div className="grid grid-cols-2 gap-2">
        {list.map((a, i) => (
          <motion.div key={a.slug} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.02 }}>
            <Glass className={`p-3 h-full ${a.unlocked ? 'border-gold/35' : 'opacity-50'}`}>
              <div className="flex items-start gap-2.5">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0 ${a.unlocked ? 'bg-gold/15 border border-gold/40' : 'bg-white/5 border border-white/10'}`}>
                  {a.unlocked ? (ICONS[a.slug] ?? '🏅') : <Lock className="w-4 h-4 text-mist" />}
                </div>
                <div className="min-w-0">
                  <div className={`text-[13px] font-bold ${a.unlocked ? 'gold-text' : 'text-mist'}`}>{a.title}</div>
                  <div className="text-[11px] text-mist leading-snug mt-0.5">{a.description}</div>
                  {a.unlocked && <div className="text-[10px] text-gold mt-1">+{a.xp} XP</div>}
                </div>
              </div>
            </Glass>
          </motion.div>
        ))}
      </div>
      <div className="text-center text-xs text-mist pb-2 flex items-center justify-center gap-1.5">
        <Trophy className="w-3.5 h-3.5 text-gold" /> A cidade registra cada marco.
      </div>
    </div>
  )
}
