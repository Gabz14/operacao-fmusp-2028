import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Trophy, Layers, Map as MapIcon, ShoppingBag, Target, PenLine,
  Library, FileText, BarChart3, Music, Camera, Save, Settings, Sparkles,
} from 'lucide-react'
import { api } from '../lib/api'
import { useApp } from '../store'
import { Glass, Bar, Tag } from '../components/ui'

interface Profile {
  user: {
    name: string; avatar: string; objective: string; university: string; course: string
    xp: number; level: number; rank: string; rank_name: string
    next_rank: { slug: string; name: string; threshold: number; needed: number } | null
    streak: number; best_streak: number
    total_minutes: number; total_questions: number; total_correct: number
    total_flashcards: number; total_redacoes: number; total_pomodoros: number
    total_revisoes: number; theme: string; notifications_enabled: boolean
    enem_date: string; fuvest_date1: string; fuvest_date2: string
  }
  achievements: { slug: string; title: string; unlocked: boolean }[]
  cards: { slug: string; name: string; rarity: string; unlocked: boolean }[]
}

const AVATARS = ['agente', 'analista', 'operadora', 'veterana', 'elite', 'cadete', 'recruta', 'investigadora']
const AVATAR_GLYPH: Record<string, string> = {
  agente: '🕶️', analista: '🔍', operadora: '🎖️', veterana: '⭐',
  elite: '💎', cadete: '🎓', recruta: '🪖', investigadora: '🗂️',
}

const LINKS = [
  { to: '/missoes', icon: Target, label: 'Missões', desc: 'diárias · semanais · mensais' },
  { to: '/conquistas', icon: Trophy, label: 'Conquistas', desc: '19 medalhas da operação' },
  { to: '/cartas', icon: Layers, label: 'Cartas colecionáveis', desc: 'comum → lendária' },
  { to: '/mapa', icon: MapIcon, label: 'Mapa da cidade', desc: 'distritos por matéria' },
  { to: '/loja', icon: ShoppingBag, label: 'Loja', desc: 'troque XP por itens' },
  { to: '/redacao', icon: PenLine, label: 'Redação', desc: 'histórico e correção IA' },
  { to: '/biblioteca', icon: Library, label: 'Biblioteca', desc: 'notas, PDFs, resumos' },
  { to: '/provas', icon: FileText, label: 'Provas', desc: 'ENEM · FUVEST · UNICAMP · UNESP' },
  { to: '/estatisticas', icon: BarChart3, label: 'Estatísticas', desc: 'gráficos e produtividade' },
  { to: '/musica', icon: Music, label: 'Música', desc: 'lo-fi · piano · chuva' },
  { to: '/scanner', icon: Camera, label: 'Scanner', desc: 'foto → resumo e flashcards' },
  { to: '/backup', icon: Save, label: 'Backup', desc: 'exportar e restaurar' },
]

export default function Perfil() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [editing, setEditing] = useState(false)
  const toast = useApp((s) => s.toast)
  const refresh = useApp((s) => s.refresh)

  const load = async () => setProfile(await api.get('/api/perfil'))
  useEffect(() => { load() }, [])

  if (!profile) return null
  const u = profile.user
  const unlockedCards = profile.cards.filter((c) => c.unlocked).length

  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const notifications = fd.get('notifications') === 'on'
    if (notifications) {
      try { if (Notification.permission === 'default') await Notification.requestPermission() } catch { /* noop */ }
    }
    localStorage.setItem('notify_enabled', notifications ? '1' : '0')
    await api.put('/api/user', {
      name: fd.get('name'), avatar: fd.get('avatar'),
      objective: fd.get('objective'), university: fd.get('university'),
      course: fd.get('course'),
      notifications_enabled: notifications,
    })
    setEditing(false)
    toast({ title: 'Perfil atualizado', kind: 'gold' })
    load()
    refresh()
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Central de <span className="gold-text">Operação</span></h1>
        <button onClick={() => setEditing((e) => !e)} className="text-xs text-gold border border-gold/40 rounded-full px-3 py-1.5 flex items-center gap-1">
          <Settings className="w-3.5 h-3.5" /> personalizar
        </button>
      </header>

      {editing ? (
        <Glass strong className="p-4">
          <form onSubmit={save} className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2.5">
              <label className="text-xs text-mist">Nome
                <input name="name" defaultValue={u.name} className="w-full mt-1 bg-black/30 rounded-lg px-3 py-2.5 text-sm border border-white/10" />
              </label>
              <label className="text-xs text-mist">Avatar
                <select name="avatar" defaultValue={u.avatar} className="w-full mt-1 bg-black/30 rounded-lg px-3 py-2.5 text-sm border border-white/10">
                  {AVATARS.map((a) => <option key={a} value={a}>{AVATAR_GLYPH[a]} {a}</option>)}
                </select>
              </label>
              <label className="text-xs text-mist">Objetivo
                <input name="objective" defaultValue={u.objective} className="w-full mt-1 bg-black/30 rounded-lg px-3 py-2.5 text-sm border border-white/10" />
              </label>
              <label className="text-xs text-mist">Universidade
                <input name="university" defaultValue={u.university} className="w-full mt-1 bg-black/30 rounded-lg px-3 py-2.5 text-sm border border-white/10" />
              </label>
              <label className="text-xs text-mist">Curso
                <input name="course" defaultValue={u.course} className="w-full mt-1 bg-black/30 rounded-lg px-3 py-2.5 text-sm border border-white/10" />
              </label>
              <label className="text-xs text-mist flex items-end gap-2 pb-2">
                <input type="checkbox" name="notifications" defaultChecked={u.notifications_enabled} className="w-4 h-4 accent-gold" /> Notificações
              </label>
            </div>
            <button className="w-full rounded-xl bg-gold text-black font-bold py-2.5 text-sm">Salvar</button>
          </form>
        </Glass>
      ) : (
        <Glass strong className="p-4 relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-gold/10 blur-2xl" />
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gold/15 border border-gold/40 flex items-center justify-center text-3xl float-slow">
              {AVATAR_GLYPH[u.avatar] ?? '🕶️'}
            </div>
            <div className="flex-1">
              <div className="text-xl font-extrabold">{u.name}</div>
              <div className="text-xs text-mist mt-0.5">{u.objective}</div>
              <Tag tone="gold" >{u.rank_name} · Nível {u.level}</Tag>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-[11px] text-mist">
              <span>{u.xp.toLocaleString('pt-BR')} XP</span>
              {u.next_rank ? <span>faltam {u.next_rank.needed} para {u.next_rank.name}</span> : <span>patente máxima</span>}
            </div>
            <Bar value={u.next_rank ? Math.min(100, (u.xp / u.next_rank.threshold) * 100) : 100} />
            <div className="grid grid-cols-4 gap-2 pt-2 text-center">
              <MiniStat label="streak" value={u.streak} />
              <MiniStat label="melhor" value={u.best_streak} />
              <MiniStat label="conquistas" value={profile.achievements.filter((a) => a.unlocked).length} />
              <MiniStat label="cartas" value={`${unlockedCards}/${profile.cards.length}`} />
            </div>
          </div>
        </Glass>
      )}

      <Glass className="p-4 grid grid-cols-3 gap-3 text-center">
        <MiniStat label="horas" value={(u.total_minutes / 60).toFixed(1).replace('.', ',')} big />
        <MiniStat label="questões" value={u.total_questions.toLocaleString('pt-BR')} big />
        <MiniStat label="precisão" value={`${Math.round((u.total_correct / Math.max(1, u.total_questions)) * 100)}%`} big />
        <MiniStat label="flashcards" value={u.total_flashcards.toLocaleString('pt-BR')} big />
        <MiniStat label="pomodoros" value={String(u.total_pomodoros)} big />
        <MiniStat label="redações" value={String(u.total_redacoes)} big />
      </Glass>

      <div>
        <div className="text-sm font-bold uppercase tracking-widest text-gold-soft mb-2">Módulos</div>
        <div className="grid grid-cols-2 gap-2">
          {LINKS.map(({ to, icon: Icon, label, desc }) => (
            <Link key={to} to={to}>
              <Glass className="p-3 flex items-center gap-3 hover:border-gold/40 transition-colors h-full">
                <Icon className="w-5 h-5 text-gold shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{label}</div>
                  <div className="text-[10px] text-mist truncate">{desc}</div>
                </div>
              </Glass>
            </Link>
          ))}
        </div>
      </div>

      <Glass className="p-3 text-center text-xs text-mist">
        <Sparkles className="w-3.5 h-3.5 inline mr-1 text-gold" />
        ENEM: {u.enem_date} · FUVEST 1ª fase: {u.fuvest_date1} · 2ª fase: {u.fuvest_date2}
      </Glass>
    </div>
  )
}

function MiniStat({ label, value, big = false }: { label: string; value: string | number; big?: boolean }) {
  return (
    <div>
      <div className={`font-black ${big ? 'text-lg' : 'text-base'} gold-text`}>{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-mist mt-0.5">{label}</div>
    </div>
  )
}
