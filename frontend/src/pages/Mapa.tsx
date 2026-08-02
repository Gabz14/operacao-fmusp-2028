import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { MapPin, Lock } from 'lucide-react'
import { useApp } from '../store'
import { Glass } from '../components/ui'

interface District { slug: string; name: string; icon: string; color: string; questions: number; correct: number }

const POS: Record<string, [number, number]> = {
  matematica: [12, 12], biologia: [38, 8], quimica: [64, 12], fisica: [86, 18],
  portugues: [18, 32], historia: [46, 28], geografia: [76, 36],
  literatura: [12, 52], ingles: [40, 52], redacao: [66, 56], atualidades: [84, 52], obras: [50, 76],
}

export default function Mapa() {
  const dash = useApp((s) => s.dash)
  const [districts, setDistricts] = useState<District[]>([])
  const [selected, setSelected] = useState<District | null>(null)

  useEffect(() => {
    if (!dash) return
    const names: Record<string, string> = {
      matematica: 'Matemática', biologia: 'Biologia', quimica: 'Química', fisica: 'Física',
      portugues: 'Português', historia: 'História', geografia: 'Geografia', literatura: 'Literatura',
      ingles: 'Inglês', redacao: 'Redação', atualidades: 'Atualidades', obras: 'Obras FUVEST',
    }
    const colors: Record<string, string> = {
      matematica: '#f5c518', biologia: '#34d399', quimica: '#60a5fa', fisica: '#f87171',
      portugues: '#a78bfa', historia: '#fbbf24', geografia: '#4ade80', literatura: '#f472b6',
      ingles: '#22d3ee', redacao: '#e879f9', atualidades: '#fb923c', obras: '#facc15',
    }
    const list = Object.entries(dash.by_subject).map(([slug, v]) => ({
      slug, name: names[slug] ?? slug, icon: slug.slice(0, 2), color: colors[slug] ?? '#f5c518',
      questions: v.questions, correct: v.correct,
    }))
    setDistricts(list)
  }, [dash])

  if (!dash) return null
  const totalQ = districts.reduce((s, d) => s + d.questions, 0)
  const unlockedCount = districts.filter((d) => d.questions > 0 || d.slug === 'matematica').length

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-extrabold">Mapa da <span className="gold-text">Cidade</span></h1>
        <p className="text-mist text-sm mt-1">Cada distrito é uma matéria. Estude para acender a cidade inteira.</p>
      </header>

      <Glass strong className="p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid" />
        <div className="relative h-[430px]">
          {districts.map((d, i) => {
            const [x, y] = POS[d.slug] ?? [30 + i * 7, 40]
            const unlocked = d.questions > 0
            return (
              <motion.button
                key={d.slug}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 20 }}
                onClick={() => setSelected(unlocked ? d : null)}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${x}%`, top: `${y}%` }}
              >
                <div
                  className="w-14 h-14 rounded-xl border-2 flex flex-col items-center justify-center backdrop-blur-md transition-transform hover:scale-110"
                  style={{
                    background: unlocked ? d.color + '22' : 'rgba(255,255,255,0.04)',
                    borderColor: unlocked ? d.color + '88' : 'rgba(255,255,255,0.12)',
                    boxShadow: unlocked ? `0 0 18px ${d.color}44` : undefined,
                  }}
                >
                  {unlocked ? (
                    <>
                      <span className="text-[10px] font-black uppercase" style={{ color: d.color }}>{d.slug.slice(0, 4)}</span>
                      <span className="text-[9px] text-mist">{d.questions}Q</span>
                    </>
                  ) : (
                    <Lock className="w-4 h-4 text-mist" />
                  )}
                </div>
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 text-[9px] whitespace-nowrap" style={{ color: unlocked ? d.color : '#6b7280' }}>
                  {d.name}
                </div>
              </motion.button>
            )
          })}
          {/* Torre central */}
          <div className="absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2 text-center">
            <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 4 }} className="gold-glow rounded-full w-16 h-16 bg-gradient-to-b from-gold-soft to-gold flex items-center justify-center">
              <MapPin className="w-7 h-7 text-black" />
            </motion.div>
            <div className="text-[10px] font-black gold-text mt-1 uppercase tracking-widest">Torre FMUSP</div>
          </div>
        </div>
      </Glass>

      <Glass className="p-4">
        <div className="flex justify-between text-sm">
          <span className="text-mist">Distritos acesos</span>
          <span className="font-bold gold-text">{unlockedCount}/{districts.length}</span>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {districts.map((d) => (
            <span key={d.slug} className="text-[10px] px-2 py-1 rounded-full border"
              style={{ color: d.questions > 0 ? d.color : '#6b7280', borderColor: d.questions > 0 ? d.color + '55' : 'rgba(255,255,255,0.1)', background: d.questions > 0 ? d.color + '14' : undefined }}>
              {d.name}
            </span>
          ))}
        </div>
        {totalQ === 0 && <p className="text-xs text-mist mt-3">Resolva a primeira questão de cada matéria para acender o distrito.</p>}
      </Glass>

      {selected && (
        <Glass strong className="p-4">
          <div className="font-bold" style={{ color: selected.color }}>Distrito {selected.name}</div>
          <div className="text-xs text-mist mt-1.5">Questões: {selected.questions} · Acertos: {selected.correct} · Precisão: {Math.round((selected.correct / Math.max(1, selected.questions)) * 100)}%</div>
        </Glass>
      )}
    </div>
  )
}
