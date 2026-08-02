import { StrictMode, Suspense, lazy, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { useApp } from './store'
import Home from './pages/Home'
import './index.css'

const Cronograma = lazy(() => import('./pages/Cronograma'))
const Foco = lazy(() => import('./pages/Foco'))
const Flashcards = lazy(() => import('./pages/Flashcards'))
const Perfil = lazy(() => import('./pages/Perfil'))
const Missoes = lazy(() => import('./pages/Missoes'))
const Biblioteca = lazy(() => import('./pages/Biblioteca'))
const Redacao = lazy(() => import('./pages/Redacao'))
const Provas = lazy(() => import('./pages/Provas'))
const Estatisticas = lazy(() => import('./pages/Estatisticas'))
const IA = lazy(() => import('./pages/IA'))
const Conquistas = lazy(() => import('./pages/Conquistas'))
const Cartas = lazy(() => import('./pages/Cartas'))
const Mapa = lazy(() => import('./pages/Mapa'))
const Loja = lazy(() => import('./pages/Loja'))
const Musica = lazy(() => import('./pages/Musica'))
const Scanner = lazy(() => import('./pages/Scanner'))
const Backup = lazy(() => import('./pages/Backup'))
const Widget = lazy(() => import('./pages/Widget'))

registerSW({ immediate: true })

function Loading() {
  return (
    <div className="py-16 flex flex-col items-center gap-3">
      <div className="w-10 h-10 rounded-full border-2 border-gold/20 border-t-gold pulse-gold" />
      <div className="text-mist text-xs">abrindo os portões…</div>
    </div>
  )
}

function Boot() {
  const refresh = useApp((s) => s.refresh)
  const loading = useApp((s) => s.loading)
  const navigate = useNavigate()

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (!loading) navigate(window.location.pathname === '/' ? '/' : window.location.pathname, { replace: true })
  }, [loading])

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-void">
        <div className="w-16 h-16 rounded-full border-2 border-gold/20 border-t-gold pulse-gold" />
        <div className="gold-text font-bold tracking-widest text-sm">OPERAÇÃO FMUSP 2028</div>
        <div className="text-mist text-xs">abrindo os portões da cidade…</div>
      </div>
    )
  }
  return null
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<App />}>
          <Route path="/" element={<Home />} />
          <Route path="/cronograma" element={<Suspense fallback={<Loading />}><Cronograma /></Suspense>} />
          <Route path="/foco" element={<Suspense fallback={<Loading />}><Foco /></Suspense>} />
          <Route path="/flashcards" element={<Suspense fallback={<Loading />}><Flashcards /></Suspense>} />
          <Route path="/perfil" element={<Suspense fallback={<Loading />}><Perfil /></Suspense>} />
          <Route path="/missoes" element={<Suspense fallback={<Loading />}><Missoes /></Suspense>} />
          <Route path="/biblioteca" element={<Suspense fallback={<Loading />}><Biblioteca /></Suspense>} />
          <Route path="/redacao" element={<Suspense fallback={<Loading />}><Redacao /></Suspense>} />
          <Route path="/provas" element={<Suspense fallback={<Loading />}><Provas /></Suspense>} />
          <Route path="/estatisticas" element={<Suspense fallback={<Loading />}><Estatisticas /></Suspense>} />
          <Route path="/ia" element={<Suspense fallback={<Loading />}><IA /></Suspense>} />
          <Route path="/conquistas" element={<Suspense fallback={<Loading />}><Conquistas /></Suspense>} />
          <Route path="/cartas" element={<Suspense fallback={<Loading />}><Cartas /></Suspense>} />
          <Route path="/mapa" element={<Suspense fallback={<Loading />}><Mapa /></Suspense>} />
          <Route path="/loja" element={<Suspense fallback={<Loading />}><Loja /></Suspense>} />
          <Route path="/musica" element={<Suspense fallback={<Loading />}><Musica /></Suspense>} />
          <Route path="/scanner" element={<Suspense fallback={<Loading />}><Scanner /></Suspense>} />
          <Route path="/backup" element={<Suspense fallback={<Loading />}><Backup /></Suspense>} />
          <Route path="/widget" element={<Suspense fallback={<Loading />}><Widget /></Suspense>} />
        </Route>
      </Routes>
      <Boot />
    </BrowserRouter>
  </StrictMode>
)
