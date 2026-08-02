import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Clock, CheckCircle2, Sparkles } from 'lucide-react'
import { api } from '../lib/api'
import { useApp } from '../store'
import { Glass, Bar, Tag } from '../components/ui'

interface Exam { id: number; institution: string; name: string; year: number; questions: number; suggested_minutes: number }
interface ExamResult { id: number; exam_id: number; date: string; score: number; total: number; seconds: number; percent?: number; wrong_topics: { topic: string; subject: string; correct: string; you: string }[] }
interface Question { id: number; subject_name: string; topic: string; text: string; options: string[] }

const BANCA_COLOR: Record<string, string> = { ENEM: '#34d399', FUVEST: '#f5c518', UNICAMP: '#60a5fa', UNESP: '#f87171' }

export default function Provas() {
  const [exams, setExams] = useState<Exam[]>([])
  const [results, setResults] = useState<ExamResult[]>([])
  const [solving, setSolving] = useState<{ id: number; name: string; questions: Question[]; started: number } | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [result, setResult] = useState<ExamResult | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [subjects, setSubjects] = useState<{ subject_id: number; name: string }[]>([])
  const [aiForm, setAiForm] = useState(false)
  const [aiBusy, setAiBusy] = useState(false)
  const [plan, setPlan] = useState<string | null>(null)
  const [planBusy, setPlanBusy] = useState(false)
  const toast = useApp((s) => s.toast)
  const refresh = useApp((s) => s.refresh)

  const load = async () => {
    const d = await api.get<{ exams: Exam[]; results: ExamResult[] }>('/api/provas')
    setExams(d.exams)
    setResults(d.results)
  }
  useEffect(() => { load() }, [])
  useEffect(() => {
    api.get('/api/flashcards/overview').then((o) => setSubjects((o.decks as { subject_id: number; name: string }[]) ?? []))
  }, [])

  useEffect(() => {
    if (!solving) return
    const t = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(t)
  }, [solving])

  const start = async (id: number, name: string) => {
    const d = await api.get<{ questions: Question[] }>(`/api/provas/${id}`)
    setSolving({ id, name, questions: d.questions, started: Date.now() })
    setAnswers({})
    setResult(null)
    setElapsed(0)
  }

  const submit = async () => {
    if (!solving) return
    const secs = Math.floor((Date.now() - solving.started) / 1000)
    const r = await api.post<{ score: number; total: number; xp: number; percent: number; wrong: ExamResult['wrong_topics'] }>(
      `/api/provas/${solving.id}/submit`, { answers, seconds: secs }
    )
    setResult({ ...r, id: 0, exam_id: solving.id, date: new Date().toISOString().slice(0, 10), seconds: secs, wrong_topics: r.wrong })
    toast({ title: `Simulado corrigido: ${r.percent}%`, body: `+${r.xp} XP · ${r.total - r.score} erradas viram revisão.`, kind: 'gold' })
    setSolving(null)
    setPlan(null)
    load()
    refresh()
  }

  const makePlan = async () => {
    if (!result) return
    setPlanBusy(true)
    const r = await api.post<{ ok: boolean; text?: string; message?: string }>('/api/ia/plano-revisao', { wrong_topics: result.wrong_topics })
    setPlanBusy(false)
    if (r.ok) setPlan(r.text ?? '')
    else toast({ title: 'IA indisponível', body: r.message ?? 'Falha', kind: 'alert' })
  }

  const genAI = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setAiBusy(true)
    const r = await api.post<{ ok: boolean; exam_id?: number; message?: string }>('/api/ia/simulado', {
      subject: String(fd.get('subject') ?? '').trim(),
      qty: Number(fd.get('qty') ?? 10),
    })
    setAiBusy(false)
    if (r.ok) {
      toast({ title: 'Simulado IA criado', body: 'Já está na lista abaixo — boa sorte.', kind: 'gold' })
      setAiForm(false)
      load()
      refresh()
    } else {
      toast({ title: 'IA indisponível', body: r.message ?? 'Falha ao gerar', kind: 'alert' })
    }
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-extrabold">Banco de <span className="gold-text">Provas</span></h1>
        <p className="text-mist text-sm mt-1">Resolva com cronômetro, corrija automaticamente e ataque os assuntos errados.</p>
      </header>

      {/* Prova em andamento */}
      {solving && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Glass strong className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-bold text-sm">{solving.name}</div>
                <div className="text-[11px] text-mist">{solving.questions.length} questões · respondidas {Object.keys(answers).length}</div>
              </div>
              <div className="text-2xl font-black gold-text tabular-nums">
                {String(Math.floor(elapsed / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}
              </div>
            </div>
            <div className="space-y-3 max-h-[55vh] overflow-y-auto scrollbar-none pr-1">
              {solving.questions.map((q, i) => (
                <div key={q.id} className="rounded-xl bg-black/25 border border-white/8 p-3">
                  <div className="text-[11px] text-gold mb-1.5">Q{i + 1} · {q.subject_name} {q.topic && `· ${q.topic}`}</div>
                  <p className="text-sm leading-relaxed mb-2">{q.text}</p>
                  <div className="space-y-1">
                    {q.options.map((opt, oi) => {
                      const letter = String.fromCharCode(65 + oi)
                      const selected = answers[String(q.id)] === letter
                      return (
                        <button
                          key={oi}
                          onClick={() => setAnswers((a) => ({ ...a, [String(q.id)]: letter }))}
                          className={`w-full text-left rounded-lg px-3 py-2 text-[13px] border transition-colors ${
                            selected ? 'bg-gold/18 border-gold/50 text-gold' : 'bg-white/3 border-white/10 text-white/90 hover:border-white/25'
                          }`}
                        >
                          <b>{letter}.</b> {opt}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={submit}
              disabled={Object.keys(answers).length < solving.questions.length}
              className="w-full mt-3 rounded-xl bg-gold text-black font-bold py-3 disabled:opacity-40 flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" /> Corrigir prova
            </button>
          </Glass>
        </motion.div>
      )}

      {/* Resultado */}
      {result && (
        <Glass strong className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-bold">Desempenho</div>
              <div className="text-[11px] text-mist">{result.score}/{result.total} acertos · {Math.floor(result.seconds / 60)}min</div>
            </div>
            <div className="text-4xl font-black gold-text">{result.percent ?? Math.round((result.score / result.total) * 100)}%</div>
          </div>
            <Bar value={result.percent ?? Math.round((result.score / result.total) * 100)} />
          {result.wrong_topics.length > 0 && (
            <div>
              <div className="text-xs font-bold text-gold-soft mb-1.5">Assuntos errados → próximas revisões</div>
          <div className="flex flex-wrap gap-1.5">
            {result.wrong_topics.map((w, i) => (
              <span key={i} className="text-[11px] bg-red-500/12 border border-red-500/30 text-red-300 rounded-full px-2.5 py-1">
                {w.subject}: {w.topic || '—'}
              </span>
            ))}
          </div>
        </div>
      )}
      {result.wrong_topics.length > 0 && (
        <>
          <button onClick={makePlan} disabled={planBusy}
            className="w-full rounded-xl bg-gold/15 border border-gold/40 text-gold font-bold py-2.5 text-sm disabled:opacity-50 flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4" /> {planBusy ? 'montando plano…' : plan ? 'regerar plano de ataque' : 'gerar plano de ataque (IA)'}
          </button>
          {plan && (
            <div className="rounded-xl bg-black/25 border border-gold/25 p-3.5">
              <div className="text-xs font-bold text-gold-soft mb-1.5">Plano de revisão da IA</div>
              <p className="text-[13px] leading-relaxed whitespace-pre-wrap text-white/90">{plan}</p>
            </div>
          )}
        </>
      )}
      <button onClick={() => setResult(null)} className="text-xs text-gold">fechar</button>
        </Glass>
      )}

      {/* Lista de provas */}
      <div className="space-y-2">
        {exams.map((e) => (
          <Glass key={e.id} className="p-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-black border shrink-0" style={{ background: (BANCA_COLOR[e.institution] ?? '#f5c518') + '1f', borderColor: (BANCA_COLOR[e.institution] ?? '#f5c518') + '55', color: BANCA_COLOR[e.institution] ?? '#f5c518' }}>
              {e.institution.slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate">{e.name}</div>
              <div className="text-[11px] text-mist mt-0.5 flex items-center gap-2">
                <Clock className="w-3 h-3" /> {e.suggested_minutes} min · {e.questions} questões
              </div>
            </div>
            <button onClick={() => start(e.id, e.name)} className="text-xs font-bold bg-gold/15 border border-gold/40 text-gold rounded-full px-3.5 py-2 whitespace-nowrap">
              Resolver
            </button>
          </Glass>
        ))}
      </div>

      {/* Histórico */}
      {results.length > 0 && (
        <div>
          <div className="text-sm font-bold uppercase tracking-widest text-gold-soft mb-2">Histórico</div>
          <div className="space-y-1.5">
            {results.map((r) => (
              <div key={r.id} className="glass rounded-lg px-3 py-2 flex items-center gap-3">
                <span className="text-xs text-mist flex-1">{r.date}</span>
                <span className="text-[11px] text-mist">{r.score}/{r.total}</span>
                <Tag tone={r.score / r.total >= 0.7 ? 'green' : 'gray'}>{Math.round((r.score / r.total) * 100)}%</Tag>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => setAiForm((a) => !a)}
        className="w-full rounded-xl border border-dashed border-gold/30 text-gold/80 py-3 text-sm flex items-center justify-center gap-2 hover:border-gold/60"
      >
        <Sparkles className="w-4 h-4" /> Gerar simulado com IA
      </button>

      {aiForm && (
        <Glass className="p-4">
          <form onSubmit={genAI} className="space-y-2.5">
            <select name="subject" className="w-full bg-black/30 rounded-lg px-3 py-2.5 text-sm border border-white/10" defaultValue={subjects[0]?.name ?? 'Matemática'}>
              {subjects.map((s) => <option key={s.subject_id} value={s.name}>{s.name}</option>)}
            </select>
            <select name="qty" className="w-full bg-black/30 rounded-lg px-3 py-2.5 text-sm border border-white/10" defaultValue="10">
              <option value="5">5 questões</option>
              <option value="10">10 questões</option>
              <option value="15">15 questões</option>
            </select>
            <button disabled={aiBusy} className="w-full rounded-xl bg-gold text-black font-bold py-2.5 text-sm disabled:opacity-40">
              {aiBusy ? 'gerando…' : 'Gerar agora'}
            </button>
          </form>
        </Glass>
      )}
    </div>
  )
}
