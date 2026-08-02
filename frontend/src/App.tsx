import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Home, CalendarDays, Timer, Layers, User } from 'lucide-react'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useApp } from './store'
import { api, isDemo } from './lib/api'
import { Toasts } from './components/ui'
import CrisisOverlay from './pages/Crise'

const TABS = [
  { to: '/', icon: Home, label: 'Início' },
  { to: '/cronograma', icon: CalendarDays, label: 'Cronograma' },
  { to: '/foco', icon: Timer, label: 'Foco' },
  { to: '/flashcards', icon: Layers, label: 'Flashcards' },
  { to: '/perfil', icon: User, label: 'Perfil' },
]

export default function App() {
  const dash = useApp((s) => s.dash)
  const refresh = useApp((s) => s.refresh)
  const toast = useApp((s) => s.toast)
  const navigate = useNavigate()
  const [demo, setDemo] = useState(false)

  useEffect(() => {
    const onDemo = (e: Event) => setDemo((e as CustomEvent<boolean>).detail)
    window.addEventListener('op:demo', onDemo)
    return () => window.removeEventListener('op:demo', onDemo)
  }, [])

  useEffect(() => {
    const onRejection = (e: PromiseRejectionEvent) => {
      e.preventDefault()
      if (isDemo()) toast({ title: 'Modo demonstração', body: 'Esta ação não está disponível sem a API conectada.', kind: 'info' })
    }
    window.addEventListener('unhandledrejection', onRejection)
    return () => window.removeEventListener('unhandledrejection', onRejection)
  }, [toast])

  useEffect(() => {
    const applyThemes = (owned: string[]) => {
      const set = new Set(owned)
      const el = document.documentElement
      el.classList.toggle('theme-noite', set.has('tema_noite'))
      el.classList.toggle('theme-ouro', set.has('tema_ouro'))
      el.classList.toggle('theme-cidade', set.has('wallpaper_cidade'))
      el.classList.toggle('theme-portao', set.has('wallpaper_noite'))
    }
    const cached = localStorage.getItem('loja_owned')
    if (cached) applyThemes(JSON.parse(cached))
    api.get<{ user: { owned_items: string[]; notifications_enabled: boolean } }>('/api/perfil')
      .then((p) => {
        applyThemes(p.user.owned_items ?? [])
        localStorage.setItem('loja_owned', JSON.stringify(p.user.owned_items ?? []))
        localStorage.setItem('notify_enabled', p.user.notifications_enabled ? '1' : '0')
      })
      .catch(() => { /* offline — usa o cache local */ })
  }, [])

  useEffect(() => {
    const onFocus = () => refresh(true)
    const onVis = () => {
      if (document.visibilityState !== 'visible') return
      refresh(true)
      if (document.hasFocus()) return
      const dash = useApp.getState().dash
      if (dash) {
        const pending = dash.summary.revisions_due + dash.summary.flashcards_due
        if (pending > 0 && localStorage.getItem('notify_enabled') === '1') {
          notify('Operação FMUSP', `${pending} pendências esperando: revisões e flashcards.`)
        }
      }
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [refresh])

  return (
    <div className="min-h-full relative">
      <div className="fixed inset-0 pointer-events-none bg-grid" />

      {demo && (
        <button
          onClick={() =>
            toast({
              title: 'Modo demonstração',
              body: 'Você está vendo dados de exemplo. Para salvar e interagir de verdade, a API precisa ser hospedada.',
              kind: 'info',
            })
          }
          className="fixed top-3 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-1.5 rounded-full border border-gold/30 bg-black/60 backdrop-blur px-3 py-1 text-[10px] uppercase tracking-widest text-gold pointer-events-auto"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
          modo demonstração
        </button>
      )}

      <main className="relative mx-auto max-w-lg px-4 pb-28 pt-4">
        <Outlet />
      </main>

      {dash?.crisis.active && <CrisisOverlay />}

      <nav className="fixed bottom-0 left-0 right-0 z-50">
        <div className="mx-auto max-w-lg px-3 pb-3">
          <div className="glass-strong rounded-2xl px-2 py-1.5 flex items-stretch justify-between gap-1">
            {TABS.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `relative flex flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 min-w-[56px] transition-colors ${
                    isActive ? 'text-gold' : 'text-mist hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.div
                        layoutId="tab-glow"
                        className="absolute inset-0 rounded-xl bg-gold/10 border border-gold/25"
                        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                      />
                    )}
                    <Icon className="w-5 h-5 relative" />
                    <span className="text-[10px] font-medium relative">{label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>

      <Toasts />
      <button
        onClick={() => navigate('/ia')}
        className="fixed right-4 bottom-24 z-50 w-13 h-13 p-3.5 rounded-full bg-gradient-to-br from-gold-soft to-gold text-black font-bold shadow-lg gold-glow pulse-gold"
        title="Assistente IA"
      >
        <Sparkle />
      </button>
    </div>
  )
}

function Sparkle() {
  return <span className="text-lg leading-none">✦</span>
}

function notify(title: string, body: string) {
  try {
    if (Notification.permission === 'granted') new Notification(title, { body, icon: '/icons/icon-192.png' })
  } catch { /* noop */ }
}
