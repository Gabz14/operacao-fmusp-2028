import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { useApp } from './store'
import Home from './pages/Home'
import Cronograma from './pages/Cronograma'
import Foco from './pages/Foco'
import Flashcards from './pages/Flashcards'
import Perfil from './pages/Perfil'
import Missoes from './pages/Missoes'
import Biblioteca from './pages/Biblioteca'
import Redacao from './pages/Redacao'
import Provas from './pages/Provas'
import Estatisticas from './pages/Estatisticas'
import IA from './pages/IA'
import Conquistas from './pages/Conquistas'
import Cartas from './pages/Cartas'
import Mapa from './pages/Mapa'
import Loja from './pages/Loja'
import Musica from './pages/Musica'
import Scanner from './pages/Scanner'
import Backup from './pages/Backup'
import Widget from './pages/Widget'
import './index.css'

registerSW({ immediate: true })

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
          <Route path="/cronograma" element={<Cronograma />} />
          <Route path="/foco" element={<Foco />} />
          <Route path="/flashcards" element={<Flashcards />} />
          <Route path="/perfil" element={<Perfil />} />
          <Route path="/missoes" element={<Missoes />} />
          <Route path="/biblioteca" element={<Biblioteca />} />
          <Route path="/redacao" element={<Redacao />} />
          <Route path="/provas" element={<Provas />} />
          <Route path="/estatisticas" element={<Estatisticas />} />
          <Route path="/ia" element={<IA />} />
          <Route path="/conquistas" element={<Conquistas />} />
          <Route path="/cartas" element={<Cartas />} />
          <Route path="/mapa" element={<Mapa />} />
          <Route path="/loja" element={<Loja />} />
          <Route path="/musica" element={<Musica />} />
          <Route path="/scanner" element={<Scanner />} />
          <Route path="/backup" element={<Backup />} />
          <Route path="/widget" element={<Widget />} />
        </Route>
      </Routes>
      <Boot />
    </BrowserRouter>
  </StrictMode>
)
