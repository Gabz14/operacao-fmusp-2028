import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Lock } from 'lucide-react'
import { api } from '../lib/api'
import { Glass } from '../components/ui'

interface CardItem {
  slug: string; name: string; rarity: string; description: string; history: string
  phase_unlock: number; art_seed: number; unlocked: boolean
}

const RARITY_COLOR: Record<string, string> = {
  comum: '#9ca3af', rara: '#38bdf8', épica: '#a78bfa', lendária: '#f5c518',
}

export default function Cartas() {
  const [cards, setCards] = useState<CardItem[]>([])
  useEffect(() => { api.get('/api/perfil').then((r) => setCards(r.cards)) }, [])

  const byRarity = (r: string) => cards.filter((c) => c.rarity === r)
  const order = ['lendária', 'épica', 'rara', 'comum']

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-extrabold">Cartas <span className="gold-text">Colecionáveis</span></h1>
        <p className="text-mist text-sm mt-1">Cada fase da operação desbloqueia novas cartas da cidade.</p>
      </header>

      {order.map((rarity) => {
        const group = byRarity(rarity)
        if (group.length === 0) return null
        const color = RARITY_COLOR[rarity]
        return (
          <div key={rarity}>
            <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color }}>
              {rarity} · {group.filter((c) => c.unlocked).length}/{group.length}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {group.map((c, i) => (
                <motion.div key={c.slug} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <Glass className={`p-3 relative overflow-hidden h-full ${c.unlocked ? '' : 'opacity-60'}`}>
                    <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ background: `radial-gradient(120px 90px at 30% 20%, ${color}, transparent 70%)` }} />
                    <div className="relative">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest" style={{ color }}>{rarity}</span>
                        {!c.unlocked && <Lock className="w-3.5 h-3.5 text-mist" />}
                      </div>
                      <CardArt seed={c.art_seed} rarity={c.rarity} />
                      <div className="text-[13px] font-bold mt-2 leading-tight">{c.name}</div>
                      {c.unlocked ? (
                        <>
                          <p className="text-[11px] text-mist mt-1 leading-snug">{c.description}</p>
                          <p className="text-[10px] text-gold-soft/70 mt-1.5 leading-snug italic">{c.history}</p>
                        </>
                      ) : (
                        <p className="text-[11px] text-mist mt-1">Desbloqueada na fase {c.phase_unlock}</p>
                      )}
                    </div>
                  </Glass>
                </motion.div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function CardArt({ seed, rarity }: { seed: number; rarity: string }) {
  const colors: Record<string, [string, string]> = { comum: ['#3a3a46', '#9ca3af'], rara: ['#0e2a3a', '#38bdf8'], épica: ['#2a1a4a', '#a78bfa'], lendária: ['#3a2e0a', '#f5c518'] }
  const [c1, c2] = colors[rarity] ?? colors.comum
  const r = (n: number) => seed * n % 100
  const shapes = Array.from({ length: 5 }, (_, i) => {
    const x = 18 + r(i + 3) * 0.64
    const y = 22 + r(i + 7) * 0.56
    const s = 10 + r(i + 11) * 12
    return { x, y, s }
  })
  return (
    <div className="relative rounded-lg border border-white/10 overflow-hidden aspect-[4/3]" style={{ background: `linear-gradient(150deg, ${c1}, #101018)` }}>
      <div className="absolute inset-0 bg-grid opacity-50" />
      <svg viewBox="0 0 100 75" className="absolute inset-0 w-full h-full">
        {shapes.map((s, i) => (
          <rect key={i} x={s.x} y={s.y} width={s.s} height={s.s * 0.6} rx={2} fill={c2} opacity={0.25 + (i % 3) * 0.2} transform={`rotate(${r(i + 2)} ${s.x + s.s / 2} ${s.y + s.s / 3})`} />
        ))}
        <circle cx={78} cy={14} r={5} fill={c2} opacity={0.7}>
          <animate attributeName="r" values="4;6;4" dur="3s" repeatCount="indefinite" />
        </circle>
      </svg>
      <div className="absolute bottom-1.5 right-2 text-[8px] font-black uppercase tracking-widest" style={{ color: c2 }}>Ops·FMUSP</div>
    </div>
  )
}
