import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Layers, Plus, Trash2, Sparkles, Brain, X } from 'lucide-react'
import { api } from '../lib/api'
import { useApp } from '../store'
import { Glass, Tag } from '../components/ui'

interface Deck { subject_id: number; slug: string; name: string; icon: string; color: string; total: number; due: number; new: number }
interface Card { id: number; subject_id: number; front: string; back: string; topic: string; ease: number; interval_days: number; reps: number; lapses?: number }

export default function Flashcards() {
  const [overview, setOverview] = useState<{ decks: Deck[]; due_total: number } | null>(null)
  const [cards, setCards] = useState<Card[]>([])
  const [idx, setIdx] = useState(0)
  const [show, setShow] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [subjectFilter, setSubjectFilter] = useState<number | null>(null)
  const [adding, setAdding] = useState(false)
  const toast = useApp((s) => s.toast)
  const refresh = useApp((s) => s.refresh)

  const load = async () => {
    setOverview(await api.get('/api/flashcards/overview'))
    setCards((await api.get('/api/flashcards/due')).cards)
    setIdx(0)
  }

  useEffect(() => { load() }, [])

  const review = async (rating: string) => {
    const card = cards[idx]
    const r = await api.post<{ interval_days: number; xp: number }>(`/api/flashcards/${card.id}/review`, { rating })
    const label = { muito_facil: 'Muito fácil', facil: 'Fácil', dificil: 'Difícil', esqueci: 'Esqueci' }[rating] ?? 'Revisado'
    toast({ title: label, body: r.xp > 0 ? `+${r.xp} XP · próxima em ${r.interval_days} dia${r.interval_days > 1 ? 's' : ''}` : 'Sem XP — volte a ela hoje.', kind: 'xp' })
    setIdx((i) => i + 1)
    refresh()
    if (idx + 1 >= cards.length) {
      setReviewing(false)
      load()
    }
  }

  const addCard = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    await api.post('/api/flashcards', {
      subject_id: Number(fd.get('subject_id')),
      front: fd.get('front'), back: fd.get('back'), topic: fd.get('topic') ?? '',
    })
    toast({ title: 'Carta criada', kind: 'info' })
    setAdding(false)
    load()
  }

  const startReview = async () => {
    setCards((await api.get('/api/flashcards/due')).cards)
    setIdx(0)
    setShow(false)
    setReviewing(true)
  }

  const current = cards[idx]

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold"><span className="gold-text">Flashcards</span> — Baralho da Memória</h1>
          <p className="text-mist text-sm mt-1">Repetição espaçada: cada carta revisada vira um tijolo da torre.</p>
        </div>
      </header>

      {overview && (
        <Glass className="p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-mist">Pendentes hoje</div>
            <div className="text-3xl font-black gold-text">{overview.due_total}</div>
          </div>
          <button
            onClick={startReview}
            disabled={overview.due_total === 0}
            className="rounded-xl bg-gradient-to-r from-gold to-gold-soft text-black font-bold px-5 py-3 disabled:opacity-40 flex items-center gap-2"
          >
            <Brain className="w-4 h-4" /> Revisar agora
          </button>
        </Glass>
      )}

      {reviewing && current && (
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
          <Glass strong className="p-5 text-center relative min-h-[260px] flex flex-col">
            <div className="text-[11px] uppercase tracking-widest text-mist">
              {idx + 1} de {cards.length} · <span className="text-gold">{current.topic || 'sem tema'}</span>
            </div>
            <div className="flex-1 flex items-center justify-center py-6">
              <AnimatePresence mode="wait">
                {!show ? (
                  <motion.div key="front" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="text-xl font-semibold leading-relaxed">
                    {current.front}
                  </motion.div>
                ) : (
                  <motion.div key="back" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="text-lg leading-relaxed text-gold-soft">
                    {current.back}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {!show ? (
              <button onClick={() => setShow(true)} className="rounded-xl border border-gold/40 text-gold font-bold py-3 hover:bg-gold/10">
                Mostrar resposta
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => review('esqueci')} className="rounded-xl bg-red-500/15 border border-red-500/40 text-red-300 font-bold py-3 text-sm">Esqueci</button>
                <button onClick={() => review('dificil')} className="rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 font-bold py-3 text-sm">Difícil</button>
                <button onClick={() => review('facil')} className="rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-bold py-3 text-sm">Fácil</button>
                <button onClick={() => review('muito_facil')} className="rounded-xl bg-gold/20 border border-gold/50 text-gold font-bold py-3 text-sm">Muito fácil</button>
              </div>
            )}
            <button onClick={() => { setReviewing(false); load() }} className="absolute top-3 right-3 text-mist hover:text-white"><X className="w-4 h-4" /></button>
          </Glass>
        </motion.div>
      )}

      {reviewing && !current && (
        <Glass className="p-8 text-center">
          <div className="text-xl font-bold gold-text">Baralho limpo</div>
          <p className="text-mist text-sm mt-2">Você revisou todas as cartas pendentes de hoje. A memória agradece.</p>
          <button onClick={() => { setReviewing(false); load() }} className="mt-4 text-sm text-gold border border-gold/40 rounded-full px-5 py-2">Voltar aos baralhos</button>
        </Glass>
      )}

      {!reviewing && (
        <>
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold uppercase tracking-widest text-gold-soft flex items-center gap-2">
              <Layers className="w-4 h-4" /> Baralhos por matéria
            </div>
            <button onClick={() => setAdding((a) => !a)} className="text-xs text-gold border border-gold/40 rounded-full px-3 py-1.5 flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> nova carta
            </button>
          </div>

          {adding && (
            <Glass className="p-4">
              <form onSubmit={addCard} className="space-y-2.5">
                <select name="subject_id" className="w-full bg-black/30 rounded-lg px-3 py-2.5 text-sm border border-white/10" defaultValue={subjectFilter ?? 1}>
                  {overview?.decks.map((d) => <option key={d.subject_id} value={d.subject_id}>{d.name}</option>)}
                </select>
                <input name="topic" placeholder="Tópico (ex: Probabilidade)" className="w-full bg-black/30 rounded-lg px-3 py-2.5 text-sm border border-white/10" />
                <input name="front" placeholder="Frente (pergunta)" required className="w-full bg-black/30 rounded-lg px-3 py-2.5 text-sm border border-white/10" />
                <textarea name="back" placeholder="Verso (resposta)" required rows={3} className="w-full bg-black/30 rounded-lg px-3 py-2.5 text-sm border border-white/10" />
                <button className="w-full rounded-xl bg-gold text-black font-bold py-2.5 text-sm">Salvar carta</button>
              </form>
            </Glass>
          )}

          <div className="space-y-2">
            {overview?.decks.filter((d) => !subjectFilter || d.subject_id === subjectFilter).map((d) => (
              <div key={d.subject_id}>
                <button
                  onClick={() => setSubjectFilter(subjectFilter === d.subject_id ? null : d.subject_id)}
                  className="w-full text-left glass rounded-xl p-3 flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-black shrink-0 border" style={{ background: d.color + '1f', borderColor: d.color + '55', color: d.color }}>
                    {d.name.slice(0, 1)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{d.name}</div>
                    <div className="text-[11px] text-mist mt-0.5">{d.total} cartas · {d.new} novas</div>
                  </div>
                  {d.due > 0 ? (
                    <Tag tone="gold">{d.due} pendentes</Tag>
                  ) : (
                    <Tag tone="gray">em dia</Tag>
                  )}
                </button>
                {subjectFilter === d.subject_id && (
                  <div className="mt-1.5 space-y-1">
                    <DeckCards subjectId={d.subject_id} onDeleted={load} />
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={() => toast({ title: 'Geração com IA', body: 'A IA gerará flashcards do seu conteúdo — disponível na aba Assistente.', kind: 'info' })}
            className="w-full rounded-xl border border-dashed border-gold/30 text-gold/80 py-3 text-sm flex items-center justify-center gap-2 hover:border-gold/60"
          >
            <Sparkles className="w-4 h-4" /> Gerar flashcards com IA
          </button>
        </>
      )}
    </div>
  )
}

function DeckCards({ subjectId, onDeleted }: { subjectId: number; onDeleted: () => void }) {
  const [cards, setCards] = useState<Card[]>([])
  useEffect(() => { api.get(`/api/flashcards/${subjectId}`).then((r) => setCards(r.cards)) }, [subjectId])
  if (cards.length === 0) return <div className="text-xs text-mist px-3 py-2">Nenhuma carta ainda.</div>
  return (
    <div className="space-y-1">
      {cards.map((c) => (
        <div key={c.id} className="glass rounded-lg px-3 py-2 flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-[13px] truncate">{c.front}</div>
            <div className="text-[11px] text-mist mt-0.5 flex gap-3">
              <span>intervalo: {c.interval_days}d</span>
              <span>facilidade: {c.ease}</span>
              {(c.lapses ?? 0) > 0 && <span className="text-red-400">{c.lapses} lapsos</span>}
            </div>
          </div>
          <button onClick={async () => { await api.del(`/api/flashcards/${c.id}`); onDeleted() }} className="text-mist hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
        </div>
      ))}
    </div>
  )
}
