import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ShoppingBag, Check, Lock, Loader2 } from 'lucide-react'
import { api } from '../lib/api'
import { useApp } from '../store'
import { Glass, Tag } from '../components/ui'

interface ShopItem { id: string; name: string; desc: string; price: number; icon: string; category: string }

export default function Loja() {
  const [data, setData] = useState<{ xp: number; owned: string[]; items: Record<string, ShopItem> } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const toast = useApp((s) => s.toast)
  const refresh = useApp((s) => s.refresh)

  const load = async () => setData(await api.get('/api/loja/items'))
  useEffect(() => { load() }, [])

  if (!data) return <div className="py-16 flex justify-center text-mist">carregando a loja…</div>

  const items = Object.entries(data.items).map(([id, item]) => ({ ...item, id }))

  const buy = async (id: string, name: string, price: number) => {
    if (data.xp < price) {
      toast({ title: 'XP insuficiente', body: `Faltam ${price - data.xp} XP para "${name}".`, kind: 'alert' })
      return
    }
    setBusy(id)
    const r = await api.post<{ ok: boolean; message?: string; item?: ShopItem }>('/api/loja/buy', { item_id: id })
    setBusy(null)
    if (r.ok) {
      toast({ title: `${name} adquirido`, body: 'A cidade reconhece seu investimento.', kind: 'gold' })
      load()
      refresh()
    } else {
      toast({ title: 'Loja', body: r.message ?? 'Falha', kind: 'alert' })
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Loja da <span className="gold-text">Cidade</span></h1>
          <p className="text-mist text-sm mt-1">Troque XP por estilo, avatares e artefatos.</p>
        </div>
        <Tag tone="gold"><ShoppingBag className="w-3.5 h-3.5" /> {data.xp.toLocaleString('pt-BR')} XP</Tag>
      </header>

      <div className="grid grid-cols-2 gap-2">
        {items.map((item, i) => {
          const isOwned = data.owned.includes(item.id)
          const canAfford = data.xp >= item.price
          return (
            <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Glass className={`p-3.5 h-full flex flex-col ${isOwned ? 'border-emerald-500/30' : ''}`}>
                <div className="text-3xl mb-2">{item.icon}</div>
                <div className="font-bold text-sm">{item.name}</div>
                <p className="text-[11px] text-mist mt-1 flex-1 leading-snug">{item.desc}</p>
                <div className="mt-2.5">
                  {isOwned ? (
                    <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> adquirido</div>
                  ) : (
                    <button
                      onClick={() => buy(item.id, item.name, item.price)}
                      disabled={!canAfford || busy === item.id}
                      className={`w-full rounded-lg py-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                        canAfford ? 'bg-gold text-black' : 'bg-white/5 text-mist border border-white/10'
                      }`}
                    >
                      {busy === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : canAfford ? <>{item.price} XP</> : <><Lock className="w-3 h-3" /> {item.price} XP</>}
                    </button>
                  )}
                </div>
              </Glass>
            </motion.div>
          )
        })}
      </div>

      <p className="text-center text-[11px] text-mist pb-2">Compras ficam salvas no servidor e acompanham o backup. XP vem de tudo: pomodoros, questões, flashcards, revisões, redações e simulados.</p>
    </div>
  )
}
