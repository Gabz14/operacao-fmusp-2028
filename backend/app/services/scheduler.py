"""Gerador de cronograma inteligente + auto-replanejamento + modo crise."""
from datetime import date, datetime, timedelta
from sqlalchemy.orm import Session
from .. import curriculum
from ..models import (
    User, Subject, Week, WeekItem, Revision, Flashcard, Quote, Notification,
)

DAY_NAMES = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]

# Carga por fase: (slots/dia, questões/slot, flashcards/dia, redação/sem, leitura/sem, simulado cadência semanas)
PHASE_LOAD = {
    1: dict(slots=2, questoes=5, flashcards=5, redacao_week=None, leitura_week=1, simulado_every=4, pages=10),
    2: dict(slots=2, questoes=8, flashcards=10, redacao_week=1, leitura_week=1, simulado_every=3, pages=15),
    3: dict(slots=3, questoes=12, flashcards=15, redacao_week=1, leitura_week=1, simulado_every=2, pages=20),
    4: dict(slots=3, questoes=15, flashcards=20, redacao_week=2, leitura_week=1, simulado_every=1, pages=20),
    5: dict(slots=2, questoes=18, flashcards=25, redacao_week=2, leitura_week=1, simulado_every=1, pages=20),
}

SIMULADO_BANCAS = ["ENEM", "FUVEST", "UNICAMP", "UNESP"]


def monday_of(d: date) -> date:
    return d - timedelta(days=d.weekday())


def current_week(db: Session) -> Week | None:
    today = date.today()
    return (
        db.query(Week)
        .filter(Week.start_date <= today, Week.end_date >= today)
        .order_by(Week.start_date.desc())
        .first()
    )


def phase_for_date(d: date) -> dict:
    for p in curriculum.PHASES:
        if p["start"] <= d <= p["end"]:
            return p
    if d < curriculum.PHASES[0]["start"]:
        return curriculum.PHASES[0]
    return curriculum.PHASES[-1]


def _subjects_sorted(db: Session) -> list[Subject]:
    return db.query(Subject).order_by(Subject.order).all()


def _next_topics(db: Session, subject: Subject, n: int) -> list:
    topics = subject.topics  # já ordenados por order
    start = subject.topic_index
    if start >= len(topics):
        subject.content_finished = True
        return []
    chosen = topics[start:start + n]
    subject.topic_index = min(len(topics), start + n)
    if subject.topic_index >= len(topics):
        subject.content_finished = True
    return chosen


def generate_all(db: Session) -> None:
    """Gera o cronograma completo da Fase 1 até o fim. Idempotente por semana."""
    existing = {w.start_date for w in db.query(Week).all()}
    start = monday_of(curriculum.PHASES[0]["start"])
    end = curriculum.PHASES[-1]["end"]
    week_index = 0
    d = start
    while d <= end:
        if d not in existing:
            generate_week(db, d, week_index)
        d += timedelta(days=7)
        week_index += 1
    db.commit()


def generate_week(db: Session, monday: date, week_index: int) -> Week:
    phase = phase_for_date(monday)
    cfg = PHASE_LOAD[phase["num"]]
    sunday = monday + timedelta(days=6)
    week = Week(
        phase=phase["num"], phase_name=phase["name"],
        start_date=monday, end_date=sunday,
        title=f"Semana {week_index + 1} — {phase['name']}",
    )
    db.add(week)
    db.flush()

    subjects = _subjects_sorted(db)
    n_subjects = len(subjects)
    order = 0
    study_days = 6  # seg a sáb

    def add(day: int, subject: Subject | None, type_: str, title: str, qty: int = 0, detail: str = ""):
        nonlocal order
        db.add(WeekItem(week_id=week.id, day=day, subject_id=subject.id if subject else None,
                        type=type_, title=title, qty=qty, detail=detail, order=order))
        order += 1

    # prioridade: matérias com mais peso e conteúdo restante
    def pick_subjects(day):
        start_idx = (week_index * n_subjects + day) % n_subjects
        pool = [subjects[(start_idx + i) % n_subjects] for i in range(cfg["slots"])]
        return pool

    simulado_week = (week_index % cfg["simulado_every"] == 0)
    banca = SIMULADO_BANCAS[week_index % len(SIMULADO_BANCAS)]

    # redação do mês (fase 1: semanas 4, 8, 12, 16)
    redacao_count = 0
    if cfg["redacao_week"]:
        redacao_count = cfg["redacao_week"]

    for day in range(study_days):
        if phase["num"] == 5:
            # fase final: revisão intensa + provas anteriores
            subjects_today = pick_subjects(day)
            for s in subjects_today:
                if s.content_finished:
                    add(day, s, "revisao", f"Revisão forte — {s.name}", qty=1)
                else:
                    topics = _next_topics(db, s, 1)
                    if topics:
                        add(day, s, "conteudo", f"Conteúdo: {topics[0].name}", detail=f"{s.name} — tópico novo")
                        add(day, s, "questoes", f"Questões — {s.name}", qty=cfg["questoes"])
            add(day, None, "flashcards", "Revisar flashcards pendentes", qty=cfg["flashcards"])
            continue

        slots = pick_subjects(day)
        for i, s in enumerate(slots):
            topics = _next_topics(db, s, 1)
            if topics:
                add(day, s, "conteudo", f"Conteúdo: {topics[0].name}", detail=f"{s.name} — tópico {s.topic_index}")
                add(day, s, "questoes", f"Questões — {s.name}", qty=cfg["questoes"])
            else:
                add(day, s, "revisao", f"Revisão forte — {s.name}", qty=1)
        add(day, None, "flashcards", "Revisar flashcards pendentes", qty=cfg["flashcards"])
        if week_index % 7 == day or day == 0:
            add(day, None, "revisao", "Fazer 1 revisão (SRS)", qty=1)
        if cfg["leitura_week"] and day == 2:
            add(day, None, "leitura", f"Leitura — {cfg['pages']} páginas", qty=cfg["pages"])
        if cfg["leitura_week"] and day == 4 and phase["num"] >= 2:
            add(day, None, "leitura", "Atualidades da semana", qty=1)

    # redações
    if redacao_count:
        add(5, None, "redacao", "Redação da semana", qty=1)
        if redacao_count > 1:
            add(2, None, "redacao", "Redação 2 da semana", qty=1)
    elif week_index % 4 == 3:
        add(5, None, "redacao", "Redação do mês", qty=1)

    # simulado no domingo
    if simulado_week:
        if phase["num"] == 5:
            add(6, None, "simulado", f"Simulado {banca} — prova anterior", qty=1)
        else:
            add(6, None, "simulado", f"Simulado {banca} do cronograma", qty=1)

    return week


def seed_flashcards(db: Session, subject: Subject, topic: str, n: int) -> None:
    """Cria flashcards de recall a partir do tópico estudado."""
    due = date.today()
    if n >= 1:
        db.add(Flashcard(subject_id=subject.id, topic=topic,
                         front=f"O que é {topic}? (defina em 1 frase)",
                         back=f"{topic}. Consulte seu material para a definição essencial — escreva-a aqui depois.", due=due))
    if n >= 2:
        db.add(Flashcard(subject_id=subject.id, topic=topic,
                         front=f"Exemplo prático de {topic} (aplique em um caso real)",
                         back=f"Exemplo de aplicação de {topic} visto na FUVEST/ENEM. Anote o que caiu nas últimas provas.", due=due))


# ---------------------------------------------------------------------------
# Replanejamento
# ---------------------------------------------------------------------------
def replan(db: Session) -> dict:
    """Move pendências de semanas vencidas para o cronograma atual e reordena."""
    today = date.today()
    wk = current_week(db)
    moved = 0
    overdue_weeks = (
        db.query(Week)
        .filter(Week.end_date < today)
        .order_by(Week.start_date)
        .all()
    )
    for week in overdue_weeks:
        pending = [i for i in week.items if i.status == "pendente"]
        week.status = "concluida" if not pending else "vencida"
        if wk and pending:
            # distribui pendências a partir de hoje até o fim da semana
            remaining_days = [wd for wd in range(6) if (week_start_date_of(wk) + timedelta(days=wd)) >= today]
            if not remaining_days:
                remaining_days = [0, 1, 2, 3, 4, 5]
            for idx, item in enumerate(pending):
                day = remaining_days[idx % len(remaining_days)]
                item.week_id = wk.id
                item.day = day
                item.order = 1000 + idx
                moved += 1
    if wk:
        wk.status = "ativa"
    db.commit()
    return {"moved": moved}


def week_start_date_of(wk: Week) -> date:
    return wk.start_date


def finish_item(db: Session, item: WeekItem) -> None:
    item.status = "concluida"
    item.done_at = datetime.now()
    week = item.week
    if week and all(i.status == "concluida" for i in week.items):
        week.status = "concluida"
        db.add(Notification(type="cronograma", title="Semana concluída",
                            body=f"Você fechou a {week.title}. A cidade ficou um pouco mais dourada.", at=datetime.now()))
    if item.type == "conteudo" and item.subject_id:
        subj = db.query(Subject).get(item.subject_id)
        if subj:
            # gera flashcards de recall para o tópico estudado
            topic = item.title.replace("Conteúdo: ", "")
            cfg = PHASE_LOAD.get(item.week.phase, PHASE_LOAD[1])
            seed_flashcards(db, subj, topic, min(3, max(1, cfg["flashcards"] // 10)))
            if subj.content_finished:
                from .xp import unlock_achievement
                user = db.query(User).first()
                slug = {"matematica": "fim_matematica", "biologia": "fim_biologia",
                        "fisica": "fim_fisica", "quimica": "fim_quimica"}.get(subj.slug)
                if slug and user:
                    unlock_achievement(db, user, slug)
            # agenda revisões espaçadas +7 e +21 dias
            base = item.done_at.date() if item.done_at else date.today()
            db.add(Revision(subject_id=subj.id, topic=item.title.replace("Conteúdo: ", ""), due=base + timedelta(days=7), window=7))
            db.add(Revision(subject_id=subj.id, topic=item.title.replace("Conteúdo: ", ""), due=base + timedelta(days=21), window=21))
    db.commit()


# ---------------------------------------------------------------------------
# Modo Crise
# ---------------------------------------------------------------------------
CRISIS_DAYS = 3
CRISIS_GOALS = [
    {"id": "flashcards", "title": "Revisar 5 flashcards", "detail": "O baralho está esperando. 5 cartas, 2 minutos."},
    {"id": "minutos", "title": "10 minutos de foco", "detail": "Um pomodoro curto. Só para lembrar o corpo do ritmo."},
    {"id": "questoes", "title": "Resolver 3 questões", "detail": "Três portas para abrir. A cidade reabre com elas."},
]


def check_crisis(db: Session) -> bool:
    user = db.query(User).first()
    if not user:
        return False
    if user.crisis:
        return True
    if user.last_study_date and (date.today() - user.last_study_date).days >= CRISIS_DAYS:
        user.crisis = True
        user.crisis_start = date.today()
        q = db.query(Quote).filter(Quote.occasion == "crise").all()
        if q:
            user.crisis_quote = q[user.crisis_start.toordinal() % len(q)].text
        else:
            user.crisis_quote = curriculum.QUOTES["crise"][0]
        db.add(Notification(type="crise", title="Modo Crise ativado",
                            body="Três dias de silêncio. Pequenas metas para reacender a cidade.", at=datetime.now()))
        db.commit()
        return True
    return False


def complete_crisis_goal(db: Session, goal_id: str) -> dict:
    user = db.query(User).first()
    user.crisis = False
    user.crisis_start = None
    db.commit()
    return {"crisis": False, "message": curriculum.QUOTES["crise"][1]}
