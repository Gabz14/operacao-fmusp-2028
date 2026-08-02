import { motion, AnimatePresence } from 'framer-motion'
import { X, Sparkles, Trophy, Flame, AlertTriangle } from 'lucide-react'
import { useApp } from '../store'

export function Glass({ children, className = '', strong = false, onClick }: {
  children: React.ReactNode; className?: string; strong?: boolean; onClick?: () => void
}) {
  return (
    <div onClick={onClick} className={`${strong ? 'glass-strong' : 'glass'} rounded-2xl ${className}`}>
      {children}
    </div>
  )
}

export function Bar({ value, className = '', barClass = 'bg-gradient-to-r from-gold-dim via-gold to-gold-soft' }: {
  value: number; className?: string; barClass?: string
}) {
  const v = Math.max(0, Math.min(100, value))
  return (
    <div className={`h-2 rounded-full bg-white/8 overflow-hidden ${className}`}>
      <motion.div
        className={`h-full rounded-full ${barClass}`}
        initial={{ width: 0 }}
        animate={{ width: `${v}%` }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      />
    </div>
  )
}

export function Tag({ children, tone = 'gold' }: { children: React.ReactNode; tone?: 'gold' | 'gray' | 'green' }) {
  const tones = {
    gold: 'bg-gold/12 text-gold border-gold/30',
    gray: 'bg-white/6 text-mist border-white/15',
    green: 'bg-emerald-500/12 text-emerald-400 border-emerald-500/30',
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${tones[tone]}`}>
      {children}
    </span>
  )
}

export function Toasts() {
  const { toasts, dismissToast } = useApp()
  const icons = {
    xp: <Sparkles className="w-4 h-4 text-gold" />,
    info: <Flame className="w-4 h-4 text-gold-soft" />,
    gold: <Trophy className="w-4 h-4 text-gold" />,
    alert: <AlertTriangle className="w-4 h-4 text-red-400" />,
  }
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-[92%] max-w-sm pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.96 }}
            className="glass-strong rounded-xl px-4 py-3 flex items-start gap-3 pointer-events-auto"
          >
            <div className="mt-0.5 shrink-0">{icons[t.kind ?? 'xp']}</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-gold-soft">{t.title}</div>
              {t.body && <div className="text-xs text-mist mt-0.5 leading-relaxed">{t.body}</div>}
            </div>
            <button onClick={() => dismissToast(t.id)} className="text-mist hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

export function Num({ n, suffix = '' }: { n: number; suffix?: string }) {
  return (
    <span className="font-bold text-gold">{n.toLocaleString('pt-BR')}{suffix}</span>
  )
}
