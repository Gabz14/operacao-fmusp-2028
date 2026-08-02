# Operação FMUSP 2028

Sistema inteligente de estudos para aprovação em **Medicina na FMUSP** — três anos
de preparação (julho/2026 → FUVEST 2028) organizados como uma operação urbana:
cronograma que decide o que estudar por você, RPG de progressão, repetição
espaçada, modo crise e assistente IA (Gemini, gratuito).

> Em desenvolvimento — atualmente na **Fase A** (núcleo funcional completo).

---

## Walkthrough rápido (como rodar)

### 1. Backend (API + banco SQLite)

```bash
cd backend
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python -c "from app.seed import init_db; init_db()"   # cria data/app.db + cronograma completo
.venv/bin/uvicorn app.main:app --port 8000                      # API em http://localhost:8000
```

Na primeira execução o banco é criado automaticamente com:

- **128 semanas** de cronograma (Fase 1 Hábito → Fase 2 Base → Fase 3 Aprofundamento
  → Fase 4 Nível FUVEST → Fase 5 Aprovação) e **~2.200 tarefas** geradas a partir
  de **340 tópicos** de 12 matérias;
- usuário padrão **Gabi**, 19 conquistas, 15 cartas colecionáveis, 38 frases
  motivacionais exclusivas e banco de missões diárias/semanais/mensais.

### 2. Frontend (web app)

```bash
cd frontend
npm install
npm run dev          # dev em http://localhost:5173 (proxy /api → :8000)
npm run build        # produção → dist/ servido pelo próprio FastAPI
```

### 3. Testes

```bash
cd backend && ../.venv/bin/python -m pytest tests/ -q   # 20 testes (scheduler, SRS, API)
```

---

## O que já está funcionando (Fase A)

| Módulo | O que faz |
|---|---|
| **Dashboard** | Bom dia, Gabi · dias até ENEM 2028 e FUVEST 2028 · streak · XP · nível · patente · fase atual · barra de progresso · próxima recompensa · missão do dia · resumo do dia · botão continuar estudos |
| **Cronograma Inteligente** | Gera a semana inteira (conteúdo, questões, flashcards, revisões, leitura, redação, simulado) a partir do currículo ENEM/FUVEST. **Auto-replanejamento**: pendências de semanas vencidas são movidas automaticamente para a semana atual |
| **Revisão espaçada** | Ao concluir um conteúdo, agenda revisões **+7 e +21 dias** e gera flashcards de recall ativo |
| **Flashcards (SRS)** | SM-2 adaptado estilo Anki: Muito fácil / Fácil / Difícil / Esqueci · intervalos 1→3→8+ dias · por matéria |
| **Pomodoro** | 25/5, 50/10, 60/15, personalizado · gera XP · conta para missões e streak |
| **RPG** | XP em toda atividade · níveis · patentes: Recruta → Cadete → Investigadora → Analista → Especialista → Elite → Veterana → Operadora → Agente FMUSP · streak diário |
| **Missões** | Diárias (30 questões, 3 pomodoros, 10 flashcards…), semanais e mensais com recompensas em XP |
| **Conquistas** | 19 conquistas (primeira redação, 100/1000 questões, 100/500 horas, 30/100 dias, matérias dominadas, cronograma completo…) |
| **Modo Crise** | 3+ dias sem estudar ativa micro-metas (5 flashcards · 10 min · 3 questões) com mensagem exclusiva |
| **Redação** | Registro de redações com tema, notas por competência 1–5 e evolução |
| **Provas** | Banco de provas (ENEM/FUVEST/UNICAMP/UNESP) com simulado de exemplo, resolução cronometrada, correção automática e erros → plano de revisão |
| **Estatísticas** | 60 dias de minutos/pomodoros/questões, por matéria, precisão, evolução de redações |
| **Biblioteca** | Notas por matéria (PDFs, links, resumos, fórmulas, obras FUVEST) |
| **Perfil/Config** | Personalização (nome, avatar, tema), datas ENEM/FUVEST editáveis |

## Em desenvolvimento (Fases B e C)

- **Assistente IA (Gemini grátis)** — explicações, resolução passo a passo,
  geração de exercícios/flashcards/simulados, correção de redações por
  competências ENEM (chave configurável em `config`; sem chave o app segue
  100% funcional)
- **Cartas colecionáveis** (arte procedural SVG) · **Loja** (XP → temas,
  avatares, molduras) · **Mapa da cidade** (distritos por matéria)
- **Scanner** (foto → resumo/flashcards via IA) · **revisão por voz** (TTS)
- **Música** (embeds Spotify) · **backup/export** (JSON + PDF) · **widget**

## Estrutura

```
backend/
  app/
    curriculum.py          # fases, matérias, 340 tópicos, patentes, cartas, frases
    models.py              # schema SQLAlchemy (SQLite)
    seed.py                # seed inicial do banco
    services/
      scheduler.py         # gerador de cronograma + replanejamento + modo crise
      srs.py               # repetição espaçada SM-2
      xp.py                # XP, patentes, conquistas, missões, streak
    routers/               # API REST (/api/*)
    main.py                # FastAPI + serve do frontend buildado
  tests/test_core.py       # 20 testes
frontend/                  # React + Vite + Tailwind (PWA)
```

## API principal

| Rota | Descrição |
|---|---|
| `GET /api/dashboard` | payload completo da tela inicial (dispara replanejamento) |
| `GET /api/cronograma` | todas as semanas com tarefas e status |
| `POST /api/cronograma/items/{id}/complete` | conclui tarefa + XP |
| `GET /api/flashcards/due` · `POST /api/flashcards/{id}/review` | baralho e revisão SRS |
| `POST /api/pomodoros` · `POST /api/questions` · `POST /api/sessions` | registro de estudo |
| `GET /api/perfil` · `GET /api/estatisticas` · `GET /api/missoes` | RPG e dados |
| `POST /api/redacoes` · `GET/POST /api/provas` | redação e provas |
| `GET /api/crise` · `POST /api/crise/complete` | modo crise |
