import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Home, CalendarDays, Timer, Layers, User } from 'lucide-react'
import { motion } from 'framer-motion'
import { useApp } from './store'
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
  const navigate = useNavigate()

  return (
    <div className="min-h-full relative">
      <div className="fixed inset-0 pointer-events-none bg-grid" />
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
