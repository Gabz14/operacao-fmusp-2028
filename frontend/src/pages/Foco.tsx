import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Play, Pause, RotateCcw, Flame, BellOff, AudioLines, Droplets, Wind, Music, Settings2 } from 'lucide-react'
import { api } from '../lib/api'
import { useApp } from '../store'
import { Glass, Tag } from '../components/ui'

type Mode = { label: string; focus: number; rest: number }
const MODES: Mode[] = [
  { label: '25/5', focus: 25, rest: 5 },
  { label: '50/10', focus: 50, rest: 10 },
  { label: '60/15', focus: 60, rest: 15 },
]

const AMBIENTS = [
  { id: 'off', name: 'Silêncio', icon: Music },
  { id: 'chuva', name: 'Chuva', icon: Droplets },
  { id: 'ruido', name: 'Ruído branco', icon: Wind },
  { id: 'mar', name: 'Mar', icon: AudioLines },
]

function soundEngine() {
  let ctx: AudioContext | null = null
  let nodes: { stop: () => void }[] = []
  const ensure = () => {
    if (!ctx) ctx = new AudioContext()
    return ctx
  }
  const stopAll = () => { nodes.forEach((n) => n.stop()); nodes = [] }
  const whiteNoise = () => {
    const c = ensure()
    const size = c.sampleRate * 2
    const buf = c.createBuffer(1, size, c.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < size; i++) d[i] = Math.random() * 2 - 1
    const src = c.createBufferSource()
    src.buffer = buf
    src.loop = true
    const gain = c.createGain()
    gain.gain.value = 0.04
    const filter = c.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 1200
    src.connect(filter).connect(gain).connect(c.destination)
    src.start()
    nodes.push({ stop: () => { try { src.stop() } catch { } } })
  }
  const rain = () => {
    const c = ensure()
    const size = c.sampleRate * 2
    const buf = c.createBuffer(1, size, c.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < size; i++) d[i] = Math.random() * 2 - 1
    const src = c.createBufferSource()
    src.buffer = buf
    src.loop = true
    const gain = c.createGain()
    gain.gain.value = 0.06
    const filter = c.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.value = 2500
    src.connect(filter).connect(gain).connect(c.destination)
    src.start()
    nodes.push({ stop: () => { try { src.stop() } catch { } } })
  }
  const sea = () => {
    const c = ensure()
    const size = c.sampleRate * 4
    const buf = c.createBuffer(1, size, c.sampleRate)
    const d = buf.getChannelData(0)
    let last = 0
    for (let i = 0; i < size; i++) {
      const t = i / c.sampleRate
      last = last * 0.9998 + (Math.random() - 0.5) * 0.02
      d[i] = (last * 6 + (Math.random() * 2 - 1) * 0.25) * (0.5 + 0.5 * Math.sin(t * 0.6))
    }
    const src = c.createBufferSource()
    src.buffer = buf
    src.loop = true
    const gain = c.createGain()
    gain.gain.value = 0.12
    src.connect(gain).connect(c.destination)
    src.start()
    nodes.push({ stop: () => { try { src.stop() } catch { } } })
  }
  const start = (id: string) => {
    stopAll()
    if (id === 'chuva') rain()
    if (id === 'ruido') whiteNoise()
    if (id === 'mar') sea()
  }
  return { start, stopAll, ensure }
}

export default function Foco() {
  const [mode, setMode] = useState<Mode>(MODES[0])
  const [custom, setCustom] = useState<Mode | null>(null)
  const [phase, setPhase] = useState<'focus' | 'rest'>('focus')
  const [secondsLeft, setSecondsLeft] = useState(MODES[0].focus * 60)
  const [running, setRunning] = useState(false)
  const [extreme, setExtreme] = useState(false)
  const [ambient, setAmbient] = useState('off')
  const [today, setToday] = useState(0)
  const sound = useRef(soundEngine())
  const toast = useApp((s) => s.toast)
  const refresh = useApp((s) => s.refresh)

  const active = custom ?? mode

  useEffect(() => {
    if (running) {
      const t = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            clearInterval(t)
            finishPhase()
            return 0
          }
          return s - 1
        })
      }, 1000)
      return () => clearInterval(t)
    }
  }, [running, phase])

  const finishPhase = async () => {
    setRunning(false)
    if (phase === 'focus') {
      await api.post('/api/pomodoros', { minutes: active.focus, mode: active.label })
      toast({ title: 'Pomodoro completo', body: `+${Math.max(1, Math.round(active.focus / 25)) * 10} XP — foco de ${active.focus} min registrado.`, kind: 'gold' })
      refresh()
      setToday((t) => t + 1)
      setPhase('rest')
      setSecondsLeft(active.rest * 60)
      notify('Descanso', `Pausa de ${active.rest} minutos.`)
    } else {
      setPhase('focus')
      setSecondsLeft(active.focus * 60)
      notify('De volta ao foco', 'A cidade está esperando você terminar o distrito.')
    }
  }

  const toggle = () => {
    sound.current.ensure()
    if (!running && secondsLeft <= 0) {
      setSecondsLeft(active.focus * 60)
      setPhase('focus')
    }
    setRunning((r) => !r)
  }

  const reset = () => {
    setRunning(false)
    setPhase('focus')
    setSecondsLeft(active.focus * 60)
  }

  const pickMode = (m: Mode, isCustom = false) => {
    setRunning(false)
    setPhase('focus')
    if (isCustom) setCustom(m)
    else { setCustom(null); setMode(m) }
    setSecondsLeft(m.focus * 60)
  }

  const mins = Math.floor(secondsLeft / 60)
  const secs = String(secondsLeft % 60).padStart(2, '0')
  const progress = 1 - secondsLeft / ((phase === 'focus' ? active.focus : active.rest) * 60)
  const R = 118
  const CIRC = 2 * Math.PI * R

  useEffect(() => {
    if (extreme) {
      document.body.style.overflow = 'hidden'
      document.title = `${mins}:${secs} — FOCO TOTAL`
    } else {
      document.body.style.overflow = ''
      document.title = 'Operação FMUSP 2028'
    }
    return () => {
      document.body.style.overflow = ''
      document.title = 'Operação FMUSP 2028'
    }
  }, [extreme, mins, secs])

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Modo <span className="gold-text">Foco</span></h1>
          <p className="text-mist text-sm mt-1">A cidade silencia quando o cronômetro acende.</p>
        </div>
        <Tag tone={extreme ? 'gold' : 'gray'}>{today} hoje</Tag>
      </header>

      {/* Modos */}
      <div className="grid grid-cols-4 gap-2">
        {MODES.map((m) => (
          <button
            key={m.label}
            onClick={() => pickMode(m)}
            className={`rounded-xl py-2.5 text-sm font-bold border transition-colors ${
              !custom && mode.label === m.label ? 'bg-gold/18 text-gold border-gold/50' : 'bg-white/4 text-mist border-white/10 hover:text-white'
            }`}
          >
            {m.label}
          </button>
        ))}
        <button
          onClick={() => pickMode({ label: 'Custom', focus: custom?.focus ?? 30, rest: custom?.rest ?? 10 }, true)}
          className={`rounded-xl py-2.5 text-sm font-bold border flex items-center justify-center gap-1 transition-colors ${
            custom ? 'bg-gold/18 text-gold border-gold/50' : 'bg-white/4 text-mist border-white/10'
          }`}
        >
          <Settings2 className="w-3.5 h-3.5" /> Custom
        </button>
      </div>

      {custom && (
        <Glass className="p-3 grid grid-cols-2 gap-3">
          <label className="text-xs text-mist">Foco (min)
            <input type="number" min={1} max={180} value={custom.focus}
              onChange={(e) => pickMode({ ...custom, focus: Number(e.target.value) || 25 }, true)}
              className="w-full mt-1 bg-black/30 rounded-lg px-3 py-2 text-white text-sm border border-white/10" />
          </label>
          <label className="text-xs text-mist">Pausa (min)
            <input type="number" min={1} max={60} value={custom.rest}
              onChange={(e) => pickMode({ ...custom, rest: Number(e.target.value) || 5 }, true)}
              className="w-full mt-1 bg-black/30 rounded-lg px-3 py-2 text-white text-sm border border-white/10" />
          </label>
        </Glass>
      )}

      {/* Timer */}
      <Glass strong className="p-6 flex flex-col items-center relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-60" />
        <div className="relative flex flex-col items-center">
          <div className="relative w-60 h-60">
            <svg viewBox="0 0 260 260" className="w-full h-full -rotate-90">
              <circle cx="130" cy="130" r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10" />
              <motion.circle
                cx="130" cy="130" r={R} fill="none"
                stroke="url(#goldGrad)" strokeWidth="10" strokeLinecap="round"
                strokeDasharray={CIRC} animate={{ strokeDashoffset: CIRC * (1 - progress) }}
                transition={{ ease: 'linear', duration: 0.4 }}
              />
              <defs>
                <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffe08a" />
                  <stop offset="50%" stopColor="#f5c518" />
                  <stop offset="100%" stopColor="#b8860b" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className={`text-[11px] uppercase tracking-[0.3em] ${phase === 'focus' ? 'text-gold' : 'text-emerald-400'}`}>
                {phase === 'focus' ? 'Foco' : 'Descanso'}
              </div>
              <div className="text-6xl font-black tabular-nums tracking-tight">
                {mins}:{secs}
              </div>
              <div className="text-xs text-mist mt-1">{active.label} · {active.focus} min</div>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-5">
            <button onClick={toggle} className="w-16 h-16 rounded-full bg-gradient-to-br from-gold-soft to-gold text-black font-black flex items-center justify-center gold-glow">
              {running ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 fill-black" />}
            </button>
            <button onClick={reset} className="w-11 h-11 rounded-full bg-white/6 border border-white/10 text-mist flex items-center justify-center">
              <RotateCcw className="w-5 h-5" />
            </button>
            <button
              onClick={() => setExtreme((e) => !e)}
              className={`w-11 h-11 rounded-full border flex items-center justify-center transition-colors ${
                extreme ? 'bg-red-500/15 text-red-400 border-red-500/40' : 'bg-white/6 text-mist border-white/10'
              }`}
              title="Foco extremo"
            >
              <BellOff className="w-5 h-5" />
            </button>
          </div>
        </div>
      </Glass>

      {extreme && (
        <div className="fixed inset-0 z-[90] bg-black/90 flex flex-col items-center justify-center gap-6 backdrop-blur-md">
          <div className="text-[11px] uppercase tracking-[0.4em] text-gold">Foco extremo — sem distrações</div>
          <div className="text-8xl font-black tabular-nums gold-text">{mins}:{secs}</div>
          <button onClick={() => setExtreme(false)} className="text-xs text-mist border border-white/15 rounded-full px-5 py-2 hover:text-white">
            sair do modo
          </button>
        </div>
      )}

      {/* Sons ambiente */}
      <div>
        <div className="text-sm font-bold uppercase tracking-widest text-gold-soft mb-2">Som ambiente</div>
        <div className="grid grid-cols-4 gap-2">
          {AMBIENTS.map((a) => {
            const Icon = a.icon
            const on = ambient === a.id
            return (
              <button
                key={a.id}
                onClick={() => { setAmbient(a.id); sound.current.start(a.id) }}
                className={`rounded-xl py-3 flex flex-col items-center gap-1.5 border transition-colors ${
                  on ? 'bg-gold/15 text-gold border-gold/50' : 'bg-white/4 text-mist border-white/10'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[11px]">{a.name}</span>
              </button>
            )
          })}
        </div>
      </div>

      <Glass className="p-3 flex items-center gap-2 text-xs text-mist">
        <Flame className="w-4 h-4 text-gold" />
        Pomodoro concluído gera XP, conta para a sequência e para as missões diárias.
      </Glass>
    </div>
  )
}

function notify(title: string, body: string) {
  try {
    if (Notification.permission === 'granted') new Notification(title, { body, icon: '/icons/icon-192.png' })
  } catch { /* noop */ }
}
