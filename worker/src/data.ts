export const PHASES = [
  { num: 1, name: 'Construção do Hábito', start: '2026-07-06', end: '2026-10-25' },
  { num: 2, name: 'Base', start: '2026-10-26', end: '2027-04-25' },
  { num: 3, name: 'Aprofundamento', start: '2027-04-26', end: '2027-10-31' },
  { num: 4, name: 'Nível FUVEST', start: '2027-11-01', end: '2028-08-28' },
  { num: 5, name: 'Aprovação', start: '2028-08-29', end: '2028-12-17' },
]

export const RANKS: [string, string, number][] = [
  ['recruta', 'Recruta', 0],
  ['cadete', 'Cadete', 500],
  ['investigadora', 'Investigadora', 1500],
  ['analista', 'Analista', 3000],
  ['especialista', 'Especialista', 6000],
  ['elite', 'Elite', 10000],
  ['veterana', 'Veterana', 16000],
  ['operadora', 'Operadora', 24000],
  ['agente_fmusp', 'Agente FMUSP', 35000],
]

export const LEVEL_XP = 100

export function level_for_xp(xp: number) {
  return Math.floor(xp / LEVEL_XP) + 1
}

export function rank_for_xp(xp: number): [string, string, number] {
  let current = RANKS[0]
  for (const r of RANKS) {
    if (xp >= r[2]) current = r
    else break
  }
  return current
}

export function next_rank(xp: number) {
  for (const [slug, name, threshold] of RANKS) {
    if (xp < threshold) return { slug, name, threshold, needed: threshold - xp }
  }
  return null
}

export const XP_POMODORO = 10
export const XP_QUESTAO = 2
export const XP_ACERTO = 1
export const XP_FLASHCARD = 1
export const XP_REVISAO = 5
export const XP_LEITURA_PAG = 1
export const XP_REDACAO = 50
export const XP_SIMULADO = 100

export const PHASE_LOAD: Record<number, { slots: number; questoes: number; flashcards: number; redacao_week: number | null; leitura_week: number | null; simulado_every: number; pages: number }> = {
  1: { slots: 2, questoes: 5, flashcards: 5, redacao_week: null, leitura_week: 1, simulado_every: 4, pages: 10 },
  2: { slots: 2, questoes: 8, flashcards: 10, redacao_week: 1, leitura_week: 1, simulado_every: 3, pages: 15 },
  3: { slots: 3, questoes: 12, flashcards: 15, redacao_week: 1, leitura_week: 1, simulado_every: 2, pages: 20 },
  4: { slots: 3, questoes: 15, flashcards: 20, redacao_week: 2, leitura_week: 1, simulado_every: 1, pages: 20 },
  5: { slots: 2, questoes: 18, flashcards: 25, redacao_week: 2, leitura_week: 1, simulado_every: 1, pages: 20 },
}

export const CRISIS_GOALS = [
  { id: 'flashcards', title: 'Revisar 5 flashcards', detail: 'O baralho está esperando. 5 cartas, 2 minutos.' },
  { id: 'minutos', title: '10 minutos de foco', detail: 'Um pomodoro curto. Só para lembrar o corpo do ritmo.' },
  { id: 'questoes', title: 'Resolver 3 questões', detail: 'Três portas para abrir. A cidade reabre com elas.' },
]

export const LOJA_ITEMS: Record<string, { name: string; desc: string; price: number; icon: string; category: string }> = {
  tema_ouro: { name: 'Tema Ouro Neon', desc: 'Brilho dourado mais intenso em toda a interface.', price: 300, icon: '✨', category: 'tema' },
  tema_noite: { name: 'Tema Noite Profunda', desc: 'Preto absoluto com contraste dourado.', price: 250, icon: '🌑', category: 'tema' },
  avatar_lenda: { name: 'Avatar Lenda Urbana', desc: 'Avatar exclusivo para patentes Elite+.', price: 800, icon: '🦅', category: 'avatar' },
  moldura_ouro: { name: 'Moldura Imperial', desc: 'Moldura dourada no seu cartão de perfil.', price: 500, icon: '🖼️', category: 'moldura' },
  moldura_neon: { name: 'Moldura Neon', desc: 'Borda cibernética pulsante.', price: 400, icon: '🟡', category: 'moldura' },
  card_secreto: { name: 'Carta Secreta da Cidade', desc: 'Uma carta lendária exclusiva da loja.', price: 1500, icon: '🗝️', category: 'cartao' },
  wallpaper_cidade: { name: 'Wallpaper Cidade Dourada', desc: 'Plano de fundo da cidade acesa.', price: 600, icon: '🏙️', category: 'wallpaper' },
  wallpaper_noite: { name: 'Wallpaper Noite do Portão', desc: 'O portão da FMUSP sob a lua.', price: 600, icon: '🌌', category: 'wallpaper' },
}

export const QUOTES_RANK: Record<string, string> = {
  cadete: 'Patente promovida: Cadete. A cidade reconhece os primeiros passos.',
  investigadora: 'Patente promovida: Investigadora. Você já sabe onde procurar as respostas.',
  analista: 'Patente promovida: Analista. Nenhum assunto escapa da sua análise.',
  especialista: 'Patente promovida: Especialista. Você é referência no distrito.',
  elite: 'Patente promovida: Elite. Os holofotes da cidade encontram você.',
  veterana: 'Patente promovida: Veterana. Os veteranos não tremem em dia de prova.',
  operadora: 'Patente promovida: Operadora. A operação agora opera com você no comando.',
  agente_fmusp: 'Patente máxima: Agente FMUSP. A torre já reservou sua cadeira.',
}

export const MISSIONS_DAILY: [string, string, number, string, number][] = [
  ['q30', 'Resolver 30 questões', 30, 'questoes', 30],
  ['q15', 'Resolver 15 questões', 15, 'questoes', 20],
  ['pomodoro3', 'Fazer 3 pomodoros', 3, 'pomodoro', 25],
  ['pomodoro2', 'Fazer 2 pomodoros', 2, 'pomodoro', 15],
  ['flashcards10', 'Revisar 10 flashcards', 10, 'flashcards', 20],
  ['flashcards5', 'Revisar 5 flashcards', 5, 'flashcards', 10],
  ['leitura20', 'Ler 20 páginas', 20, 'leitura', 20],
  ['revisao1', 'Fazer 1 revisão', 1, 'revisao', 15],
  ['estudo90', 'Estudar 90 minutos', 90, 'minutos', 30],
  ['estudo60', 'Estudar 60 minutos', 60, 'minutos', 25],
  ['acertos80', 'Acertar 80% das questões de hoje', 80, 'precisao', 20],
  ['redacao1', 'Escrever 1 redação', 1, 'redacao', 40],
]

export const MISSIONS_WEEKLY: [string, string, number, string, number][] = [
  ['w_questoes100', 'Resolver 100 questões na semana', 100, 'questoes', 80],
  ['w_pomodoro15', '15 pomodoros na semana', 15, 'pomodoro', 60],
  ['w_flashcards50', 'Revisar 50 flashcards', 50, 'flashcards', 50],
  ['w_redacao2', '2 redações na semana', 2, 'redacao', 80],
  ['w_leitura100', 'Ler 100 páginas', 100, 'leitura', 60],
  ['w_simulado1', '1 simulado na semana', 1, 'simulado', 100],
]

export const MISSIONS_MONTHLY: [string, string, number, string, number][] = [
  ['m_questoes400', '400 questões no mês', 400, 'questoes', 300],
  ['m_horas30', '30 horas no mês', 30 * 60, 'minutos', 300],
  ['m_redacao8', '8 redações no mês', 8, 'redacao', 300],
  ['m_simulado4', '4 simulados no mês', 4, 'simulado', 400],
  ['m_flashcards150', '150 flashcards no mês', 150, 'flashcards', 200],
  ['m_dias25', 'Estudar 25 dias no mês', 25, 'dias', 350],
]
