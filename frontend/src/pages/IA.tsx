import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Send, BookOpen, Calculator, FileQuestion, Layers, FileText, KeyRound, CheckCircle2 } from 'lucide-react'
import { api } from '../lib/api'
import { useApp } from '../store'
import { Glass } from '../components/ui'

interface Msg { role: 'user' | 'ia'; text: string; kind?: 'explain' | 'solve' | 'exercises' | 'flashcards' | 'exam' }

const ACTIONS = [
  { id: 'explain', icon: BookOpen, label: 'Explicar conteúdo', placeholder: 'Qual matéria e tópico? (ex: Física — Termodinâmica)' },
  { id: 'solve', icon: Calculator, label: 'Resolver questão', placeholder: 'Cole a questão completa…' },
  { id: 'exercises', icon: FileQuestion, label: 'Criar exercícios', placeholder: 'Matéria + tópico (ex: Biologia — Genética)' },
  { id: 'flashcards', icon: Layers, label: 'Criar flashcards', placeholder: 'Matéria + tópico (ex: Química — Tabela Periódica)' },
  { id: 'exam', icon: FileText, label: 'Criar simulado', placeholder: 'Matéria (ex: Matemática)' },
]

export default function IA() {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [available, setAvailable] = useState<boolean | null>(null)
  const [showKey, setShowKey] = useState(false)
  const [key, setKey] = useState('')
  const [extra, setExtra] = useState<{ decks: { subject_id: number; name: string }[]; flashcards: { subject_id: number; topic: string; qty: number }; exam: { subject: string; qty: number } } | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const toast = useApp((s) => s.toast)

  useEffect(() => {
    api.get('/api/ia/status').then((r) => setAvailable(r.available))
    api.get('/api/flashcards/overview').then((o) => {
      const d = o.decks as { subject_id: number; name: string }[]
      setExtra({ decks: d, flashcards: { subject_id: d[0]?.subject_id ?? 1, topic: '', qty: 8 }, exam: { subject: d[0]?.name ?? 'Matemática', qty: 10 } })
    })
  }, [])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const ask = async (prompt: string, kind?: Msg['kind']) => {
    if (!prompt.trim() || busy) return
    setMessages((m) => [...m, { role: 'user', text: prompt }])
    setInput('')
    setBusy(true)
    try {
      const r = await api.post<{ ok: boolean; text?: string; message?: string; created?: number; exam_id?: number }>('/api/ia/chat', { message: prompt })
      setMessages((m) => [...m, {
        role: 'ia',
        text: r.ok ? (r.text ?? '') : (r.message ?? 'Falha'),
        kind,
      }])
      if (!r.ok && (r.message ?? '').includes('chave')) setShowKey(true)
    } catch (e) {
      setMessages((m) => [...m, { role: 'ia', text: String(e).slice(0, 300) }])
    }
    setBusy(false)
  }

  const parseTopic = (s: string): [string, string] => {
    const parts = s.split(/\s*(?:—|–|-|,|:)\s*/)
    if (parts.length >= 2) return [parts[0].trim(), parts.slice(1).join(' ').trim()]
    return ['', s.trim()]
  }

  const runAction = async (id: string, promptOverride?: string) => {
    if (busy) return
    const prompt = promptOverride ?? input
    if (!prompt.trim()) {
      setMessages((m) => [...m, { role: 'ia', text: 'Descreva o que quer na caixa de texto (ex: "Física — Termodinâmica").' }])
      return
    }
    setMessages((m) => [...m, { role: 'user', text: prompt }])
    setInput('')
    setBusy(true)
    try {
      if (id === 'explain') {
        const [subject, topic] = parseTopic(prompt)
        const r = await api.post<{ ok: boolean; text?: string; message?: string }>('/api/ia/explicar', { subject, topic })
        setMessages((m) => [...m, { role: 'ia', text: r.ok ? r.text! : (r.message ?? 'Falha'), kind: 'explain' }])
        if (!r.ok && (r.message ?? '').includes('chave')) setShowKey(true)
      } else if (id === 'solve') {
        const r = await api.post<{ ok: boolean; text?: string; message?: string }>('/api/ia/resolver', { question: prompt })
        setMessages((m) => [...m, { role: 'ia', text: r.ok ? r.text! : (r.message ?? 'Falha'), kind: 'solve' }])
        if (!r.ok && (r.message ?? '').includes('chave')) setShowKey(true)
      } else if (id === 'exercises') {
        const [subject, topic] = parseTopic(prompt)
        const r = await api.post<{ ok: boolean; text?: string; message?: string }>('/api/ia/exercicios', { subject, topic, qty: 5 })
        setMessages((m) => [...m, { role: 'ia', text: r.ok ? r.text! : (r.message ?? 'Falha'), kind: 'exercises' }])
        if (!r.ok && (r.message ?? '').includes('chave')) setShowKey(true)
      } else if (id === 'flashcards') {
        const f = extra!.flashcards
        const [byName, topic] = parseTopic(prompt)
        let subject_id = f.subject_id
        if (byName) {
          const match = extra!.decks.find((d) => d.name.toLowerCase().includes(byName.toLowerCase()))
          if (match) subject_id = match.subject_id
        }
        const r = await api.post<{ ok: boolean; created?: number; message?: string }>('/api/ia/flashcards', { subject_id, topic: topic || f.topic, qty: f.qty })
        if (r.ok) toast({ title: `+${r.created} flashcards gerados`, kind: 'gold' })
        else setMessages((m) => [...m, { role: 'ia', text: r.message ?? 'Falha' }])
        if (!r.ok && (r.message ?? '').includes('chave')) setShowKey(true)
      } else if (id === 'exam') {
        const e = extra!.exam
        const r = await api.post<{ ok: boolean; exam_id?: number; message?: string }>('/api/ia/simulado', { subject: e.subject, qty: e.qty })
        if (r.ok) toast({ title: 'Simulado criado', body: 'Vá em Provas para resolver.', kind: 'gold' })
        else setMessages((m) => [...m, { role: 'ia', text: r.message ?? 'Falha' }])
        if (!r.ok && (r.message ?? '').includes('chave')) setShowKey(true)
      }
    } catch (e) {
      setMessages((m) => [...m, { role: 'ia', text: String(e).slice(0, 300) }])
    }
    setBusy(false)
  }

  const saveKey = async () => {
    await api.post('/api/ia/key', { key })
    setShowKey(false)
    setAvailable(true)
    toast({ title: 'IA conectada', kind: 'gold' })
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-extrabold">Assistente <span className="gold-text">IA</span></h1>
        <p className="text-mist text-sm mt-1">Explica, resolve, gera exercícios, flashcards, simulados e corrige redações.</p>
      </header>

      {available === false && (
        <Glass className="p-4 border-amber-500/30">
          <div className="flex items-start gap-3">
            <div className="text-amber-400 mt-0.5"><KeyRound className="w-5 h-5" /></div>
            <div className="flex-1">
              <div className="font-bold text-sm text-amber-300">IA não configurada</div>
              <p className="text-xs text-mist mt-1 leading-relaxed">
                A IA é gratuita (Google AI Studio). Gere sua chave em aistudio.google.com/apikey e cole abaixo.
                Sem ela, todo o resto da operação funciona normalmente.
              </p>
              <button onClick={() => setShowKey(true)} className="mt-2 text-xs font-bold bg-amber-500/15 border border-amber-500/40 text-amber-300 rounded-full px-3 py-1.5">
                configurar chave
              </button>
            </div>
          </div>
        </Glass>
      )}

      {showKey && (
        <Glass strong className="p-4 space-y-2.5">
          <div className="text-sm font-bold">Chave da IA (Gemini)</div>
          <input
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Cole sua API key aqui"
            className="w-full bg-black/30 rounded-lg px-3 py-2.5 text-sm border border-white/10"
          />
          <button onClick={saveKey} className="w-full rounded-xl bg-gold text-black font-bold py-2.5 text-sm flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Conectar
          </button>
        </Glass>
      )}

      {/* Ações rápidas */}
      <div className="grid grid-cols-2 gap-2">
        {ACTIONS.slice(0, 4).map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => setInput(ACTIONS.find((a) => a.id === id)!.placeholder)}
            className="glass rounded-xl p-3 flex items-center gap-2.5 text-left hover:border-gold/40 transition-colors">
            <Icon className="w-4 h-4 text-gold shrink-0" />
            <span className="text-xs font-semibold">{label}</span>
          </button>
        ))}
        <button onClick={() => setInput(ACTIONS[4].placeholder)} className="glass rounded-xl p-3 flex items-center gap-2.5 text-left hover:border-gold/40 transition-colors">
          <FileText className="w-4 h-4 text-gold shrink-0" />
          <span className="text-xs font-semibold">Criar simulado</span>
        </button>
      </div>

      {/* Chat */}
      <Glass strong className="p-4 min-h-[300px] flex flex-col">
        <div className="flex-1 space-y-3 max-h-[45vh] overflow-y-auto scrollbar-none pr-1">
          {messages.length === 0 && (
            <div className="text-center text-mist text-sm py-10 space-y-2">
              <Sparkles className="w-8 h-8 text-gold/60 mx-auto" />
              <p>Pergunte qualquer coisa sobre seus estudos.<br />A operadora central está de plantão.</p>
            </div>
          )}
          <AnimatePresence>
            {messages.map((m, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className={`max-w-[92%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user' ? 'ml-auto bg-gold/15 border border-gold/25 text-gold-soft' : 'bg-white/5 border border-white/10 text-white/90'
                }`}>
                {m.text}
              </motion.div>
            ))}
          </AnimatePresence>
          {busy && (
            <div className="flex items-center gap-2 text-mist text-xs">
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-3.5 h-3.5 border-2 border-gold/40 border-t-gold rounded-full" />
              pensando…
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="mt-3">
          <button onClick={() => runAction('flashcards', extra?.decks.find((d) => d.subject_id === extra.flashcards.subject_id)?.name ?? 'Matemática')} className="w-full text-[11px] text-gold/80 border border-dashed border-gold/25 rounded-lg py-2 mb-2 hover:border-gold/50">
            ⚡ atalho: gerar flashcards do tópico da semana
          </button>
          <div className="flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && ask(input)}
              placeholder="Escreva sua dúvida…"
              className="flex-1 bg-black/30 rounded-xl px-3.5 py-3 text-sm border border-white/10 focus:border-gold/50 outline-none"
            />
            <button onClick={() => ask(input)} disabled={busy}
              className="w-11 h-11 rounded-xl bg-gradient-to-br from-gold to-gold-soft text-black flex items-center justify-center disabled:opacity-40">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Glass>
    </div>
  )
}
