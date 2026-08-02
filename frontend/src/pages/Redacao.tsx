import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { PenLine, Sparkles, Trash2, ChevronDown } from 'lucide-react'
import { api } from '../lib/api'
import { useApp } from '../store'
import { Glass, Bar, Tag } from '../components/ui'

interface Redacao {
  id: number; date: string; tema: string; nota: number | null
  comp1: number | null; comp2: number | null; comp3: number | null
  comp4: number | null; comp5: number | null; texto: string; correcao: string
}

export default function Redacao() {
  const [redacoes, setRedacoes] = useState<Redacao[]>([])
  const [writing, setWriting] = useState(false)
  const [openId, setOpenId] = useState<number | null>(null)
  const [correcting, setCorrecting] = useState(false)
  const [correction, setCorrection] = useState<{ comp1: number; comp2: number; comp3: number; comp4: number; comp5: number; nota: number; feedback: string } | null>(null)
  const toast = useApp((s) => s.toast)
  const refresh = useApp((s) => s.refresh)

  const load = async () => setRedacoes((await api.get('/api/redacoes')).redacoes)
  useEffect(() => { load() }, [])

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const tema = String(fd.get('tema'))
    const texto = String(fd.get('texto'))
    await api.post<{ id: number }>('/api/redacoes', { tema, texto })
    toast({ title: 'Redação registrada', body: '+50 XP — a pena acendeu.', kind: 'gold' })
    setWriting(false)
    load()
    refresh()
  }

  const corrigirIA = async (id: number) => {
    setCorrecting(true)
    const r = await api.post<{ comp1: number; comp2: number; comp3: number; comp4: number; comp5: number; nota: number; feedback: string }>(
      `/api/ia/corrigir-redacao/${id}`
    )
    setCorrection(r)
    setCorrecting(false)
    load()
  }

  const comps = correction ? [correction.comp1, correction.comp2, correction.comp3, correction.comp4, correction.comp5] : []

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Redação <span className="gold-text">Nota Mil</span></h1>
          <p className="text-mist text-sm mt-1">Histórico, competências 1–5 e correção por IA.</p>
        </div>
        <button onClick={() => setWriting((w) => !w)} className="text-xs text-gold border border-gold/40 rounded-full px-3 py-1.5 flex items-center gap-1">
          <PenLine className="w-3.5 h-3.5" /> escrever
        </button>
      </header>

      {writing && (
        <Glass strong className="p-4">
          <form onSubmit={submit} className="space-y-2.5">
            <input name="tema" placeholder="Tema (ex: Os desafios da inteligência artificial na educação)" required
              className="w-full bg-black/30 rounded-lg px-3 py-2.5 text-sm border border-white/10" />
            <textarea name="texto" placeholder="Sua redação completa…" required rows={10}
              className="w-full bg-black/30 rounded-lg px-3 py-2.5 text-sm border border-white/10 leading-relaxed" />
            <button className="w-full rounded-xl bg-gold text-black font-bold py-2.5 text-sm">Salvar (+50 XP)</button>
          </form>
        </Glass>
      )}

      {correction && (
        <Glass strong className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold">Correção IA</div>
            <div className="text-3xl font-black gold-text">{correction.nota.toFixed(1)}</div>
          </div>
          <div className="grid grid-cols-5 gap-2 text-center">
            {comps.map((c, i) => (
              <div key={i}>
                <div className="text-[10px] text-mist">C{i + 1}</div>
                <div className="text-lg font-black gold-text">{c.toFixed(1)}</div>
                <Bar value={(c / 40) * 100} className="mt-1 h-1" />
              </div>
            ))}
          </div>
          <p className="text-xs text-mist leading-relaxed whitespace-pre-line">{correction.feedback}</p>
          <button onClick={() => setCorrection(null)} className="text-xs text-gold">fechar</button>
        </Glass>
      )}

      <div className="space-y-2">
        {redacoes.length === 0 && (
          <Glass className="p-6 text-center text-mist text-sm">
            Nenhuma redação ainda. A primeira página da sua história espera por você.
          </Glass>
        )}
        {redacoes.map((r) => {
          const open = openId === r.id
          return (
            <Glass key={r.id} className="p-3.5">
              <button className="w-full flex items-center gap-3 text-left" onClick={() => setOpenId(open ? null : r.id)}>
                <div className="w-9 h-9 rounded-lg bg-gold/12 border border-gold/25 flex items-center justify-center text-gold shrink-0">
                  <PenLine className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{r.tema}</div>
                  <div className="text-[11px] text-mist mt-0.5">{r.date}</div>
                </div>
                {r.nota != null ? (
                  <Tag tone={r.nota >= 900 ? 'gold' : 'gray'}>{r.nota.toFixed(0)}</Tag>
                ) : (
                  <Tag tone="gray">sem nota</Tag>
                )}
                <ChevronDown className={`w-4 h-4 text-mist transition-transform ${open ? 'rotate-180' : ''}`} />
              </button>
              {open && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 space-y-2.5">
                  {r.texto && (
                    <p className="text-xs text-mist leading-relaxed whitespace-pre-line max-h-40 overflow-y-auto scrollbar-none">{r.texto}</p>
                  )}
                  {r.comp1 != null && (
                    <div className="flex gap-3 text-[11px] text-mist">
                      <span>C1: <b className="text-gold">{r.comp1}</b></span>
                      <span>C2: <b className="text-gold">{r.comp2}</b></span>
                      <span>C3: <b className="text-gold">{r.comp3}</b></span>
                      <span>C4: <b className="text-gold">{r.comp4}</b></span>
                      <span>C5: <b className="text-gold">{r.comp5}</b></span>
                    </div>
                  )}
                  {r.correcao && <p className="text-[11px] text-gold-soft/80 leading-relaxed">{r.correcao.slice(0, 400)}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={() => corrigirIA(r.id)}
                      disabled={correcting}
                      className="rounded-lg bg-gold/12 border border-gold/35 text-gold text-xs font-bold px-3 py-1.5 flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> {correcting ? 'Corrigindo…' : 'Corrigir com IA'}
                    </button>
                    <button onClick={async () => { await api.del(`/api/redacoes/${r.id}`); load() }} className="rounded-lg text-mist hover:text-red-400 px-2 py-1.5">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}
            </Glass>
          )
        })}
      </div>
    </div>
  )
}
