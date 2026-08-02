import { useApp } from '../store'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, FileText, Link2, Plus, Trash2, Video, StickyNote, Sparkles } from 'lucide-react'
import { api } from '../lib/api'
import { Glass } from '../components/ui'

interface Subject { id: number; slug: string; name: string; icon: string; color: string; notes: number }
interface Note { id: number; subject_id: number | null; title: string; content: string; note_type: string; source_file: string; created_at: string }

const TYPE_ICON: Record<string, typeof BookOpen> = {
  texto: StickyNote, pdf: FileText, link: Link2, video: Video, resumo: BookOpen,
}

export default function Biblioteca() {
  const [data, setData] = useState<{ subjects: Subject[]; notes: Note[] } | null>(null)
  const [active, setActive] = useState<number | null>(null)
  const [adding, setAdding] = useState(false)
  const toast = useApp((s) => s.toast)

  const load = async () => setData(await api.get('/api/biblioteca'))
  useEffect(() => { load() }, [])

  if (!data) return null
  const filtered = active ? data.notes.filter((n) => n.subject_id === active) : data.notes

  const create = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    await api.post('/api/biblioteca/notes', {
      subject_id: Number(fd.get('subject_id')) || null,
      title: fd.get('title'), content: fd.get('content'),
      note_type: fd.get('note_type'),
      source_file: fd.get('source_file') || '',
    })
    toast({ title: 'Adicionado à biblioteca', kind: 'info' })
    setAdding(false)
    load()
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold"><span className="gold-text">Biblioteca</span> da Operação</h1>
          <p className="text-mist text-sm mt-1">Livros, PDFs, resumos, fórmulas, obras FUVEST — tudo por matéria.</p>
        </div>
        <button onClick={() => setAdding((a) => !a)} className="text-xs text-gold border border-gold/40 rounded-full px-3 py-1.5 flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" /> adicionar
        </button>
      </header>

      {adding && (
        <Glass className="p-4">
          <form onSubmit={create} className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2.5">
              <select name="subject_id" className="bg-black/30 rounded-lg px-3 py-2.5 text-sm border border-white/10">
                <option value="">Geral</option>
                {data.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <select name="note_type" className="bg-black/30 rounded-lg px-3 py-2.5 text-sm border border-white/10">
                <option value="texto">Nota</option>
                <option value="resumo">Resumo</option>
                <option value="pdf">PDF</option>
                <option value="link">Link</option>
                <option value="video">Vídeo</option>
              </select>
            </div>
            <input name="title" placeholder="Título" required className="w-full bg-black/30 rounded-lg px-3 py-2.5 text-sm border border-white/10" />
            <input name="source_file" placeholder="Fonte (arquivo ou URL)" className="w-full bg-black/30 rounded-lg px-3 py-2.5 text-sm border border-white/10" />
            <textarea name="content" placeholder="Conteúdo / resumo / fórmulas…" rows={4} className="w-full bg-black/30 rounded-lg px-3 py-2.5 text-sm border border-white/10" />
            <button className="w-full rounded-xl bg-gold text-black font-bold py-2.5 text-sm">Salvar</button>
          </form>
        </Glass>
      )}

      {/* Matérias */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
        <button
          onClick={() => setActive(null)}
          className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold border transition-colors ${active === null ? 'bg-gold/18 text-gold border-gold/50' : 'bg-white/4 text-mist border-white/10'}`}
        >
          Todas
        </button>
        {data.subjects.map((s) => (
          <button
            key={s.id}
            onClick={() => setActive(active === s.id ? null : s.id)}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold border transition-colors ${active === s.id ? 'text-black' : 'text-mist border-white/10'}`}
            style={active === s.id ? { background: s.color, borderColor: s.color } : undefined}
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* Notas */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <Glass className="p-6 text-center text-mist text-sm">
            Nenhum item ainda. Adicione resumos, links e materiais para construir seu arsenal.
          </Glass>
        )}
        {filtered.map((n) => {
          const Icon = TYPE_ICON[n.note_type] ?? StickyNote
          const subj = data.subjects.find((s) => s.id === n.subject_id)
          return (
            <motion.div key={n.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Glass className="p-3.5">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gold/12 border border-gold/25 flex items-center justify-center text-gold shrink-0">
                    <Icon className="w-4.5 h-4.5 w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm truncate">{n.title}</span>
                      {subj && <span className="text-[10px] shrink-0" style={{ color: subj.color }}>{subj.name}</span>}
                    </div>
                    {n.content && <p className="text-xs text-mist mt-1 leading-relaxed whitespace-pre-line line-clamp-3">{n.content}</p>}
                    {n.source_file && <p className="text-[11px] text-gold/70 mt-1 truncate">{n.source_file}</p>}
                  </div>
                  <button
                    onClick={async () => { await api.del(`/api/biblioteca/notes/${n.id}`); load() }}
                    className="text-mist hover:text-red-400 shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </Glass>
            </motion.div>
          )
        })}
      </div>

      <button
        onClick={() => toast({ title: 'Importação inteligente', body: 'PDF, DOCX, PPTX, imagens e links — importação e resumo automático chegam com o Scanner.', kind: 'info' })}
        className="w-full rounded-xl border border-dashed border-gold/30 text-gold/80 py-3 text-sm flex items-center justify-center gap-2 hover:border-gold/60"
      >
        <Sparkles className="w-4 h-4" /> Importar PDF / DOCX / PPTX / imagem
      </button>
    </div>
  )
}


