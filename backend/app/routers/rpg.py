from datetime import date, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import User, Mission, Achievement, Card, Quote

router = APIRouter(prefix="/api", tags=["rpg"])


@router.get("/perfil")
def perfil(db: Session = Depends(get_db)):
    user = db.query(User).first()
    from .. import curriculum
    rank = curriculum.rank_for_xp(user.xp)
    nxt = curriculum.next_rank(user.xp)
    achievements = db.query(Achievement).order_by(Achievement.id).all()
    cards = db.query(Card).all()
    return {
        "user": {
            "name": user.name, "avatar": user.avatar, "objective": user.objective,
            "university": user.university, "course": user.course,
            "xp": user.xp, "level": user.level,
            "rank": rank[0], "rank_name": rank[1],
            "next_rank": nxt,
            "streak": user.streak, "best_streak": user.best_streak,
            "start_date": user.start_date.isoformat(),
            "enem_date": user.enem_date.isoformat(),
            "fuvest_date1": user.fuvest_date1.isoformat(),
            "fuvest_date2": user.fuvest_date2.isoformat(),
            "total_minutes": user.total_minutes,
            "total_questions": user.total_questions,
            "total_correct": user.total_correct,
            "total_flashcards": user.total_flashcards,
            "total_redacoes": user.total_redacoes,
            "total_pomodoros": user.total_pomodoros,
            "total_revisoes": user.total_revisoes,
            "pomodoro_focus": user.pomodoro_focus,
            "pomodoro_break": user.pomodoro_break,
            "ambient_sound": user.ambient_sound,
            "theme": user.theme,
            "notifications_enabled": user.notifications_enabled,
            "crisis": user.crisis,
        },
        "achievements": [
            {"id": a.id, "slug": a.slug, "title": a.title, "description": a.description,
             "xp": a.xp, "unlocked": a.unlocked_at is not None}
            for a in achievements
        ],
        "cards": [
            {"id": c.id, "slug": c.slug, "name": c.name, "rarity": c.rarity,
             "description": c.description, "history": c.history,
             "phase_unlock": c.phase_unlock, "art_seed": c.art_seed,
             "unlocked": c.unlocked_at is not None}
            for c in cards
        ],
    }


@router.get("/missoes")
def missoes(db: Session = Depends(get_db)):
    today = date.today()
    monday = today - timedelta(days=today.weekday())
    month = today.replace(day=1)
    groups = {}
    for t, p in (("diaria", today), ("semanal", monday), ("mensal", month)):
        ms = db.query(Mission).filter(Mission.type == t, Mission.period_start == p).all()
        groups[t] = [{"id": m.id, "slug": m.slug, "title": m.title, "target": m.target,
                      "progress": m.progress, "completed": m.completed,
                      "reward_xp": m.reward_xp} for m in ms]
    return groups


@router.get("/frase/{occasion}")
def frase(occasion: str, db: Session = Depends(get_db)):
    quotes = db.query(Quote).filter(Quote.occasion == occasion).all()
    if not quotes:
        quotes = db.query(Quote).filter(Quote.occasion == "dia").all()
    q = quotes[date.today().toordinal() % len(quotes)]
    return {"text": q.text}
