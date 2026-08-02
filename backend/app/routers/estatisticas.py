from datetime import date, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import (
    User, StudySession, Pomodoro, QuestionLog, Flashcard, Redacao, Revision,
    Subject, Week, WeekItem,
)

router = APIRouter(prefix="/api", tags=["estatisticas"])


@router.get("/estatisticas")
def estatisticas(db: Session = Depends(get_db)):
    user = db.query(User).first()
    today = date.today()

    days = 60
    start = today - timedelta(days=days - 1)
    minutes_by_day = {}
    pomos_by_day = {}
    questions_by_day = {}
    accuracy_by_day = {}
    for i in range(days):
        d = start + timedelta(days=i)
        minutes_by_day[d.isoformat()] = 0
        pomos_by_day[d.isoformat()] = 0
        questions_by_day[d.isoformat()] = 0
        accuracy_by_day[d.isoformat()] = 0
    for s in db.query(StudySession).filter(StudySession.date >= start).all():
        minutes_by_day[s.date.isoformat()] = minutes_by_day.get(s.date.isoformat(), 0) + s.minutes
    for p in db.query(Pomodoro).filter(Pomodoro.date >= start, Pomodoro.completed == True).all():  # noqa: E712
        pomos_by_day[p.date.isoformat()] = pomos_by_day.get(p.date.isoformat(), 0) + 1
    for q in db.query(QuestionLog).filter(QuestionLog.date >= start).all():
        questions_by_day[q.date.isoformat()] = questions_by_day.get(q.date.isoformat(), 0) + q.qty

    # por matéria (últimos 30 dias)
    subj_start = today - timedelta(days=30)
    minutes_by_subject = {}
    q_by_subject = {}
    correct_by_subject = {}
    for s in db.query(Subject).all():
        minutes_by_subject[s.name] = 0
        q_by_subject[s.name] = 0
        correct_by_subject[s.name] = 0
    for s in db.query(StudySession).filter(StudySession.date >= subj_start).all():
        if s.subject_id:
            subj = db.query(Subject).get(s.subject_id)
            if subj:
                minutes_by_subject[subj.name] = minutes_by_subject.get(subj.name, 0) + s.minutes
    for q in db.query(QuestionLog).filter(QuestionLog.date >= subj_start).all():
        if q.subject_id:
            subj = db.query(Subject).get(q.subject_id)
            if subj:
                q_by_subject[subj.name] = q_by_subject.get(subj.name, 0) + q.qty
                correct_by_subject[subj.name] = correct_by_subject.get(subj.name, 0) + q.correct

    # redações (evolução)
    redacoes = db.query(Redacao).order_by(Redacao.date).all()
    redacao_evolution = [{"date": r.date.isoformat(), "nota": r.nota or 0} for r in redacoes]

    # flashcards por matéria
    fc_by_subject = {}
    for s in db.query(Subject).all():
        fc_by_subject[s.name] = db.query(Flashcard).filter(Flashcard.subject_id == s.id).count()

    # média semanal de minutos
    total_days = max(1, (today - (user.start_date if user.start_date else today)).days)
    avg = user.total_minutes / total_days * 7 if total_days else 0

    top_subject = max(minutes_by_subject, key=minutes_by_subject.get) if any(minutes_by_subject.values()) else "—"

    return {
        "totals": {
            "minutes": user.total_minutes, "hours": round(user.total_minutes / 60, 1),
            "streak": user.streak, "best_streak": user.best_streak,
            "questions": user.total_questions, "correct": user.total_correct,
            "accuracy": round(user.total_correct / max(1, user.total_questions) * 100, 1),
            "flashcards": user.total_flashcards, "pomodoros": user.total_pomodoros,
            "redacoes": user.total_redacoes, "revisoes": user.total_revisoes,
            "avg_week_minutes": round(avg, 1),
        },
        "minutes_by_day": minutes_by_day,
        "pomos_by_day": pomos_by_day,
        "questions_by_day": questions_by_day,
        "minutes_by_subject": minutes_by_subject,
        "questions_by_subject": q_by_subject,
        "accuracy_by_subject": {k: round(v / max(1, q_by_subject.get(k, 0)) * 100, 1) for k, v in correct_by_subject.items()},
        "top_subject": top_subject,
        "redacao_evolution": redacao_evolution,
        "flashcards_by_subject": fc_by_subject,
        "pomodoro_avg_daily": round(user.total_pomodoros / max(1, total_days), 1),
    }
