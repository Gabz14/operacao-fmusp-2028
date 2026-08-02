from datetime import date, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import (
    User, StudySession, Pomodoro, QuestionLog, Flashcard, Revision,
    Redacao, Mission, Week, WeekItem,
)
from ..services import xp as xp_svc
from ..services import scheduler
from .. import curriculum

router = APIRouter(prefix="/api", tags=["dashboard"])


@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db)):
    user = db.query(User).first()
    scheduler.replan(db)
    xp_svc.ensure_missions(db)
    crisis_active = scheduler.check_crisis(db)
    xp_svc.unlock_cards_for_phase(db, scheduler.phase_for_date(date.today())["num"])
    db.refresh(user)

    today = date.today()

    def days_until(d: date) -> int:
        return (d - today).days

    # fase atual
    wk = scheduler.current_week(db)
    phase = scheduler.phase_for_date(today)
    weeks_in_phase = [w for w in db.query(Week).filter(Week.phase == phase["num"]).all()]
    done_weeks = sum(1 for w in weeks_in_phase if w.end_date < today)
    phase_progress = min(100, round(done_weeks / max(1, len(weeks_in_phase)) * 100))

    # próximas recompensas
    nxt_rank = curriculum.next_rank(user.xp)
    from ..models import Achievement
    next_ach = (
        db.query(Achievement)
        .filter(Achievement.unlocked_at.is_(None))
        .order_by(Achievement.id)
        .first()
    )
    rank_progress = 0
    if nxt_rank:
        prev = max(t for _, _, t in curriculum.RANKS if t <= user.xp)
        span = nxt_rank["threshold"] - prev
        rank_progress = min(100, round((user.xp - prev) / max(1, span) * 100))

    # missões de hoje
    daily_missions = (
        db.query(Mission)
        .filter(Mission.type == "diaria", Mission.period_start == today)
        .all()
    )
    weekly_missions = (
        db.query(Mission)
        .filter(Mission.type == "semanal",
                Mission.period_start == today - timedelta(days=today.weekday()))
        .all()
    )
    monthly_missions = (
        db.query(Mission)
        .filter(Mission.type == "mensal", Mission.period_start == today.replace(day=1))
        .all()
    )

    # resumo de hoje
    today_minutes = db.query(StudySession).filter(StudySession.date == today).all()
    minutes = sum(s.minutes for s in today_minutes)
    pomodoros = db.query(Pomodoro).filter(Pomodoro.date == today, Pomodoro.completed == True).count()  # noqa: E712
    questions_today = db.query(QuestionLog).filter(QuestionLog.date == today).all()
    questions = sum(q.qty for q in questions_today)
    redacoes_today = db.query(Redacao).filter(Redacao.date == today).count()
    flashcards_due = db.query(Flashcard).filter(Flashcard.due <= today).count()
    revisions_due = db.query(Revision).filter(Revision.due <= today, Revision.done == False).count()  # noqa: E712

    # continuar estudos: pendências de hoje (ou próximas)
    today_items = (
        db.query(WeekItem)
        .filter(WeekItem.week_id == wk.id, WeekItem.day == today.weekday(),
                WeekItem.status == "pendente")
        .order_by(WeekItem.order)
        .all()
    ) if wk else []
    # fallback: primeira pendência do cronograma
    continue_item = None
    if today_items:
        continue_item = {
            "id": today_items[0].id, "type": today_items[0].type,
            "title": today_items[0].title, "qty": today_items[0].qty,
            "subject": today_items[0].subject_id,
        }
    else:
        nxt = (
            db.query(WeekItem)
            .filter(WeekItem.status == "pendente")
            .order_by(Week.phase, Week.start_date, WeekItem.day, WeekItem.order)
            .join(Week)
            .first()
        )
        if nxt:
            continue_item = {"id": nxt.id, "type": nxt.type, "title": nxt.title,
                             "qty": nxt.qty, "subject": nxt.subject_id}

    # desempenho por matéria (para distritos mais tarde)
    by_subject = {}
    from ..models import Subject
    for s in db.query(Subject).all():
        q = db.query(QuestionLog).filter(QuestionLog.subject_id == s.id).all()
        by_subject[s.slug] = {"questions": sum(x.qty for x in q), "correct": sum(x.correct for x in q)}

    week_progress = 0
    if wk:
        done = sum(1 for i in wk.items if i.status == "concluida")
        week_progress = min(100, round(done / max(1, len(wk.items)) * 100))

    return {
        "greeting": {
            "name": user.name,
            "date": today.isoformat(),
            "weekday": ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"][today.weekday()],
            "time": date.strftime(today, "%d/%m/%Y"),
        },
        "days": {
            "enem": days_until(user.enem_date),
            "fuvest": days_until(user.fuvest_date1),
            "fuvest2": days_until(user.fuvest_date2),
        },
        "rpg": {
            "xp": user.xp, "level": user.level, "rank": user.rank_slug,
            "rank_name": curriculum.rank_for_xp(user.xp)[1],
            "next_rank": nxt_rank, "rank_progress": rank_progress,
            "streak": user.streak, "best_streak": user.best_streak,
        },
        "phase": {
            "num": phase["num"], "name": phase["name"],
            "weeks_done": done_weeks, "weeks_total": len(weeks_in_phase),
            "progress": phase_progress,
        },
        "next_reward": {
            "rank": nxt_rank,
            "achievement": {"slug": next_ach.slug, "title": next_ach.title, "xp": next_ach.xp} if next_ach else None,
        },
        "missions": {
            "diaria": [{"id": m.id, "slug": m.slug, "title": m.title, "target": m.target,
                        "progress": m.progress, "completed": m.completed, "reward_xp": m.reward_xp}
                       for m in daily_missions],
            "semanal": [{"id": m.id, "slug": m.slug, "title": m.title, "target": m.target,
                         "progress": m.progress, "completed": m.completed, "reward_xp": m.reward_xp}
                        for m in weekly_missions],
            "mensal": [{"id": m.id, "slug": m.slug, "title": m.title, "target": m.target,
                        "progress": m.progress, "completed": m.completed, "reward_xp": m.reward_xp}
                       for m in monthly_missions],
        },
        "summary": {
            "minutes": minutes, "pomodoros": pomodoros, "questions": questions,
            "redacoes": redacoes_today, "flashcards_due": flashcards_due,
            "revisions_due": revisions_due,
        },
        "week": {
            "id": wk.id if wk else None,
            "title": wk.title if wk else "",
            "start": wk.start_date.isoformat() if wk else "",
            "end": wk.end_date.isoformat() if wk else "",
            "progress": week_progress,
            "items": [
                {"id": i.id, "day": i.day, "type": i.type, "title": i.title,
                 "qty": i.qty, "status": i.status, "subject": i.subject_id}
                for i in (wk.items if wk else [])
            ] if wk else [],
        },
        "continue_study": continue_item,
        "by_subject": by_subject,
        "quote": xp_svc.quote_of(db, "dia"),
        "crisis": {
            "active": crisis_active,
            "goals": scheduler.CRISIS_GOALS,
            "quote": user.crisis_quote or scheduler.CRISIS_GOALS[0]["title"],
            "days_since": (today - (user.last_study_date or today)).days,
        },
    }
