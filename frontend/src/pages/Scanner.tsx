import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Camera, Sparkles, Layers, FileQuestion, Loader2 } from 'lucide-react'
import { api } from '../lib/api'
import { useApp } from '../store'
import { Glass } from '../components/ui'

export default function Scanner() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [streaming, setStreaming] = useState(false)
  const [photo, setPhoto] = useState<string | null>(null)
  const [intent, setIntent] = useState('resumo')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState('')
  const toast = useApp((s) => s.toast)

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setStreaming(true)
    } catch {
      toast({ title: 'Câmera indisponível', body: 'Permita acesso à câmera ou use um dispositivo com câmera.', kind: 'alert' })
    }
  }

  const capture = () => {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')!.drawImage(video, 0, 0)
    const b64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1]
    ;(video.srcObject as MediaStream)?.getTracks().forEach((t) => t.stop())
    setStreaming(false)
    setPhoto(canvas.toDataURL('image/jpeg', 0.85))
    setResult('')
    scan(b64)
  }

  const scan = async (b64: string) => {
    setBusy(true)
    const r = await api.post<{ ok: boolean; text?: string; message?: string }>('/api/ia/scan', { image_b64: b64, intent })
    setBusy(false)
    if (r.ok) setResult(r.text ?? '')
    else toast({ title: 'Scanner', body: r.message ?? 'Falha', kind: 'alert' })
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-extrabold">Scanner <span className="gold-text">de Estudos</span></h1>
        <p className="text-mist text-sm mt-1">Fotografe caderno, livro ou quadro — a IA converte em resumo, flashcards ou questões.</p>
      </header>

      <div className="grid grid-cols-3 gap-2">
        {[{ id: 'resumo', label: 'Resumo' }, { id: 'flashcards', label: 'Flashcards' }, { id: 'questoes', label: 'Questões' }].map((o) => (
          <button
            key={o.id}
            onClick={() => setIntent(o.id)}
            className={`rounded-xl py-2.5 text-xs font-bold border transition-colors ${
              intent === o.id ? 'bg-gold/18 text-gold border-gold/50' : 'bg-white/4 text-mist border-white/10'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      <Glass strong className="p-3">
        {streaming ? (
          <div className="relative">
            <video ref={videoRef} className="w-full rounded-xl bg-black aspect-[4/3] object-cover" playsInline />
            <button onClick={capture} className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-gold text-black font-bold px-6 py-2.5 text-sm gold-glow">
              📸 Capturar
            </button>
          </div>
        ) : photo ? (
          <div className="relative">
            <img src={photo} className="w-full rounded-xl aspect-[4/3] object-cover" alt="captura" />
            <div className="absolute inset-0 flex items-center justify-center gap-2">
              {busy ? (
                <div className="glass-strong rounded-xl px-4 py-2.5 text-sm text-gold flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> convertendo…
                </div>
              ) : (
                <button onClick={() => setPhoto(null)} className="glass-strong rounded-xl px-4 py-2.5 text-sm text-white">nova foto</button>
              )}
            </div>
          </div>
        ) : (
          <button onClick={start} className="w-full py-14 flex flex-col items-center gap-3 text-mist hover:text-white">
            <div className="w-16 h-16 rounded-full bg-gold/12 border border-gold/35 flex items-center justify-center text-gold">
              <Camera className="w-7 h-7" />
            </div>
            <span className="text-sm font-bold">Abrir câmera</span>
            <span className="text-xs">caderno · livro · quadro branco</span>
          </button>
        )}
      </Glass>

      {busy && (
        <Glass className="p-4 flex items-center gap-3 text-sm text-gold">
          <Sparkles className="w-5 h-5 animate-pulse" /> A IA está lendo seu material…
        </Glass>
      )}

      {result && !busy && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Glass strong className="p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-gold-soft mb-2">
              {intent === 'resumo' ? <Sparkles className="w-4 h-4" /> : intent === 'flashcards' ? <Layers className="w-4 h-4" /> : <FileQuestion className="w-4 h-4" />}
              {intent === 'resumo' ? 'Resumo gerado' : intent === 'flashcards' ? 'Flashcards sugeridos' : 'Questões sugeridas'}
            </div>
            <p className="text-sm text-white/90 leading-relaxed whitespace-pre-wrap max-h-[45vh] overflow-y-auto scrollbar-none">{result}</p>
            {intent === 'flashcards' && (
              <p className="text-[11px] text-mist mt-2">Dica: use a aba Assistente (✦) com "gerar flashcards" para salvá-los no baralho.</p>
            )}
          </Glass>
        </motion.div>
      )}
    </div>
  )
}
