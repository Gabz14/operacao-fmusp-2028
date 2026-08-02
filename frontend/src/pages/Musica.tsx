import { useState } from 'react'
import { Music, Play, Pause } from 'lucide-react'
import { Glass } from '../components/ui'

const PLAYLISTS = [
  { id: 'lofi', name: 'Lo-fi para estudar', desc: 'foco suave', playlist: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX8Uebhn9wzrS' },
  { id: 'piano', name: 'Piano calmo', desc: 'concentração profunda', playlist: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX4sWSpwq3LiO' },
  { id: 'chuva', name: 'Sons de chuva', desc: 'ambiente aconchegante', playlist: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX8tZskA7C4hU' },
  { id: 'ruido', name: 'Ruído branco', desc: 'bloqueio de distrações', playlist: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX2QxDLupKJcw' },
  { id: 'foco', name: 'Deep Focus', desc: 'intensidade total', playlist: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX3Ogo9pFvBkY' },
]

export default function Musica() {
  const [active, setActive] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-extrabold">Trilha da <span className="gold-text">Operação</span></h1>
        <p className="text-mist text-sm mt-1">Playlists do Spotify para cada tipo de foco.</p>
      </header>

      <div className="space-y-2">
        {PLAYLISTS.map((p) => (
          <Glass key={p.id} className={`p-3 flex items-center gap-3 ${active === p.id ? 'border-gold/50' : ''}`}>
            <button
              onClick={() => {
                setActive(active === p.id ? null : p.id)
              }}
              className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                active === p.id ? 'bg-gold text-black' : 'bg-gold/12 border border-gold/30 text-gold'
              }`}
            >
              {active === p.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
            </button>
            <div className="flex-1">
              <div className="font-bold text-sm">{p.name}</div>
              <div className="text-[11px] text-mist">{p.desc}</div>
            </div>
            <Music className="w-4 h-4 text-mist" />
          </Glass>
        ))}
      </div>

      {active && (
        <Glass strong className="p-3 overflow-hidden">
          <iframe
            src={PLAYLISTS.find((p) => p.id === active)?.playlist + '?theme=0'}
            className="w-full rounded-xl"
            style={{ height: 352, border: 0 }}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            title="playlist"
          />
        </Glass>
      )}

      <p className="text-center text-[11px] text-mist pb-2">
        Quer outra playlist? A IA te ajuda a escolher o clima do dia — e o Spotify toca o resto.
      </p>
    </div>
  )
}
