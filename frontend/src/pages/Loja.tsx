import { useState } from 'react'
import { motion } from 'framer-motion'
import { ShoppingBag, Check, Lock } from 'lucide-react'
import { useApp } from '../store'
import { Glass, Tag } from '../components/ui'

interface ShopItem {
  id: string; name: string; desc: string; price: number; icon: string
  category: 'tema' | 'avatar' | 'moldura' | 'cartao' | 'wallpaper'
  content: string
}

const SHOP: ShopItem[] = [
  { id: 'tema_ouro', name: 'Tema Ouro Neon', desc: 'Brilho dourado mais intenso em toda a interface.', price: 300, icon: '✨', category: 'tema', content: 'ouro-neon' },
  { id: 'tema_noite', name: 'Tema Noite Profunda', desc: 'Preto absoluto com contraste dourado.', price: 250, icon: '🌑', category: 'tema', content: 'noite' },
  { id: 'avatar_lenda', name: 'Avatar Lenda Urbana', desc: 'Avatar exclusivo para patentes Elite+.', price: 800, icon: '🦅', category: 'avatar', content: 'lenda' },
  { id: 'moldura_ouro', name: 'Moldura Imperial', desc: 'Moldura dourada no seu cartão de perfil.', price: 500, icon: '🖼️', category: 'moldura', content: 'imperial' },
  { id: 'moldura_neon', name: 'Moldura Neon', desc: 'Borda cibernética pulsante.', price: 400, icon: '🟡', category: 'moldura', content: 'neon' },
  { id: 'card_secreto', name: 'Carta Secreta da Cidade', desc: 'Uma carta lendária exclusiva da loja.', price: 1500, icon: '🗝️', category: 'cartao', content: 'carta_secreta' },
  { id: 'wallpaper_cidade', name: 'Wallpaper Cidade Dourada', desc: 'Plano de fundo da cidade acesa.', price: 600, icon: '🏙️', category: 'wallpaper', content: 'cidade' },
  { id: 'wallpaper_noite', name: 'Wallpaper Noite do Portão', desc: 'O portão da FMUSP sob a lua.', price: 600, icon: '🌌', category: 'wallpaper', content: 'portao' },
]

export default function Loja() {
  const dash = useApp((s) => s.dash)
  const toast = useApp((s) => s.toast)
  const [owned, setOwned] = useState<Set<string>>(new Set(JSON.parse(localStorage.getItem('loja_owned') ?? '[]')))

  const xp = dash?.rpg.xp ?? 0

  const buy = (item: ShopItem) => {
    if (xp < item.price) {
      toast({ title: 'XP insuficiente', body: `Faltam ${item.price - xp} XP para "${item.name}".`, kind: 'alert' })
      return
    }
    const next = new Set(owned).add(item.id)
    setOwned(next)
    localStorage.setItem('loja_owned', JSON.stringify([...next]))
    toast({ title: `${item.name} adquirido`, body: 'A cidade reconhece seu investimento.', kind: 'gold' })
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Loja da <span className="gold-text">Cidade</span></h1>
          <p className="text-mist text-sm mt-1">Troque XP por estilo, avatares e artefatos.</p>
        </div>
        <Tag tone="gold"><ShoppingBag className="w-3.5 h-3.5" /> {xp.toLocaleString('pt-BR')} XP</Tag>
      </header>

      <div className="grid grid-cols-2 gap-2">
        {SHOP.map((item, i) => {
          const isOwned = owned.has(item.id)
          const canAfford = xp >= item.price
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
                      onClick={() => buy(item)}
                      disabled={!canAfford}
                      className={`w-full rounded-lg py-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                        canAfford ? 'bg-gold text-black' : 'bg-white/5 text-mist border border-white/10'
                      }`}
                    >
                      {canAfford ? <>{item.price} XP</> : <><Lock className="w-3 h-3" /> {item.price} XP</>}
                    </button>
                  )}
                </div>
              </Glass>
            </motion.div>
          )
        })}
      </div>

      <p className="text-center text-[11px] text-mist pb-2">XP vem de tudo: pomodoros, questões, flashcards, revisões, redações e simulados.</p>
    </div>
  )
}
