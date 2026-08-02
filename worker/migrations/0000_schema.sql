-- Operacao FMUSP 2028 — esquema D1 (portado de backend/app/models.py)
-- Datas/datetimes: TEXT ISO; booleanos: INTEGER 0/1; JSON: TEXT.

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  name TEXT DEFAULT 'Gabi',
  avatar TEXT DEFAULT 'agente',
  objective TEXT DEFAULT 'Aprovação em Medicina na FMUSP',
  university TEXT DEFAULT 'FMUSP',
  course TEXT DEFAULT 'Medicina',
  theme TEXT DEFAULT 'dourado',
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  rank_slug TEXT DEFAULT 'recruta',
  streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  last_study_date TEXT,
  start_date TEXT NOT NULL DEFAULT '2026-07-01',
  enem_date TEXT NOT NULL DEFAULT '2028-11-05',
  fuvest_date1 TEXT NOT NULL DEFAULT '2028-11-26',
  fuvest_date2 TEXT NOT NULL DEFAULT '2028-12-17',
  total_minutes INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 0,
  total_correct INTEGER DEFAULT 0,
  total_flashcards INTEGER DEFAULT 0,
  total_redacoes INTEGER DEFAULT 0,
  total_pomodoros INTEGER DEFAULT 0,
  total_revisoes INTEGER DEFAULT 0,
  total_leituras_pag INTEGER DEFAULT 0,
  pomodoro_focus INTEGER DEFAULT 25,
  pomodoro_break INTEGER DEFAULT 5,
  ambient_sound TEXT DEFAULT 'chuva',
  crisis INTEGER DEFAULT 0,
  crisis_start TEXT,
  crisis_quote TEXT DEFAULT '',
  notifications_enabled INTEGER DEFAULT 1,
  settings_json TEXT DEFAULT '{}',
  owned_items TEXT DEFAULT '[]',
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS subjects (
  id INTEGER PRIMARY KEY,
  slug TEXT UNIQUE,
  name TEXT,
  icon TEXT DEFAULT 'book',
  color TEXT DEFAULT '#f5c518',
  ord INTEGER DEFAULT 0,
  xp INTEGER DEFAULT 0,
  topic_index INTEGER DEFAULT 0,
  content_finished INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS topics (
  id INTEGER PRIMARY KEY,
  subject_id INTEGER,
  name TEXT,
  ord INTEGER DEFAULT 0,
  weight INTEGER DEFAULT 3
);

CREATE TABLE IF NOT EXISTS weeks (
  id INTEGER PRIMARY KEY,
  phase INTEGER,
  phase_name TEXT,
  start_date TEXT,
  end_date TEXT,
  title TEXT,
  status TEXT DEFAULT 'ativa'
);

CREATE TABLE IF NOT EXISTS week_items (
  id INTEGER PRIMARY KEY,
  week_id INTEGER,
  day INTEGER DEFAULT 0,
  subject_id INTEGER,
  type TEXT,
  title TEXT,
  qty INTEGER DEFAULT 0,
  detail TEXT DEFAULT '',
  status TEXT DEFAULT 'pendente',
  ord INTEGER DEFAULT 0,
  done_at TEXT
);

CREATE TABLE IF NOT EXISTS revisions (
  id INTEGER PRIMARY KEY,
  subject_id INTEGER,
  topic TEXT,
  due TEXT,
  window INTEGER DEFAULT 7,
  done INTEGER DEFAULT 0,
  done_at TEXT
);

CREATE TABLE IF NOT EXISTS study_sessions (
  id INTEGER PRIMARY KEY,
  date TEXT,
  minutes INTEGER,
  type TEXT,
  subject_id INTEGER,
  xp INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS pomodoros (
  id INTEGER PRIMARY KEY,
  date TEXT,
  minutes INTEGER,
  mode TEXT DEFAULT '25/5',
  completed INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS question_logs (
  id INTEGER PRIMARY KEY,
  date TEXT,
  subject_id INTEGER,
  topic TEXT DEFAULT '',
  source TEXT DEFAULT '',
  qty INTEGER DEFAULT 1,
  correct INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS flashcards (
  id INTEGER PRIMARY KEY,
  subject_id INTEGER,
  topic TEXT DEFAULT '',
  front TEXT,
  back TEXT,
  ease REAL DEFAULT 2.5,
  interval_days INTEGER DEFAULT 0,
  reps INTEGER DEFAULT 0,
  lapses INTEGER DEFAULT 0,
  due TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS redacoes (
  id INTEGER PRIMARY KEY,
  date TEXT,
  tema TEXT,
  texto TEXT DEFAULT '',
  nota REAL,
  comp1 REAL,
  comp2 REAL,
  comp3 REAL,
  comp4 REAL,
  comp5 REAL,
  correcao TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS missions (
  id INTEGER PRIMARY KEY,
  type TEXT,
  slug TEXT,
  title TEXT,
  target INTEGER,
  progress INTEGER DEFAULT 0,
  reward_xp INTEGER DEFAULT 25,
  period_start TEXT,
  completed INTEGER DEFAULT 0,
  claimed INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS achievements (
  id INTEGER PRIMARY KEY,
  slug TEXT UNIQUE,
  title TEXT,
  description TEXT,
  xp INTEGER DEFAULT 50,
  unlocked_at TEXT
);

CREATE TABLE IF NOT EXISTS cards (
  id INTEGER PRIMARY KEY,
  slug TEXT UNIQUE,
  name TEXT,
  rarity TEXT DEFAULT 'comum',
  description TEXT,
  history TEXT DEFAULT '',
  phase_unlock INTEGER DEFAULT 1,
  unlocked_at TEXT,
  art_seed INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY,
  subject_id INTEGER,
  title TEXT,
  content TEXT DEFAULT '',
  note_type TEXT DEFAULT 'texto',
  source_file TEXT DEFAULT '',
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS quotes (
  id INTEGER PRIMARY KEY,
  text TEXT,
  occasion TEXT DEFAULT 'dia'
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY,
  type TEXT,
  title TEXT,
  body TEXT DEFAULT '',
  at TEXT,
  read INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS exams (
  id INTEGER PRIMARY KEY,
  institution TEXT,
  name TEXT,
  year INTEGER,
  questions_json TEXT DEFAULT '[]',
  suggested_minutes INTEGER DEFAULT 90
);

CREATE TABLE IF NOT EXISTS exam_results (
  id INTEGER PRIMARY KEY,
  exam_id INTEGER,
  date TEXT,
  answers TEXT DEFAULT '{}',
  score INTEGER DEFAULT 0,
  total INTEGER DEFAULT 0,
  seconds INTEGER DEFAULT 0,
  wrong_topics TEXT DEFAULT '[]'
);
