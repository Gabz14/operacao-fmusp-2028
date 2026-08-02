from datetime import date
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import User, StudySession, Pomodoro, QuestionLog, Flashcard, Revision
from ..services import xp as xp_svc

router = APIRouter(prefix="/api", tags=["estudo"])


class SessionIn(BaseModel):
    minutes: int
    type: str
    subject_id: int | None = None


class PomodoroIn(BaseModel):
    minutes: int
    mode: str = "25/5"
    completed: bool = True


class QuestionsIn(BaseModel):
    subject_id: int | None = None
    qty: int = 1
    correct: int = 0
    topic: str = ""
    source: str = ""


class RevisionDoneIn(BaseModel):
    revision_id: int


@router.post("/sessions")
def log_session(data: SessionIn, db: Session = Depends(get_db)):
    user = db.query(User).first()
    xp = 0
    if data.type == "pomodoro":
        xp = xp_svc.XP_POMODORO * max(1, data.minutes // 25)
    elif data.type == "questoes":
        xp = data.minutes // 10
    elif data.type == "flashcards":
        xp = data.minutes // 10
    elif data.type == "redacao":
        xp = xp_svc.XP_REDACAO
    elif data.type == "simulado":
        xp = xp_svc.XP_SIMULADO
    elif data.type == "leitura":
        xp = max(1, data.minutes // 10)
    else:
        xp = max(1, data.minutes // 25)
    db.add(StudySession(date=date.today(), minutes=data.minutes,
                        type=data.type, subject_id=data.subject_id, xp=xp))
    user.total_minutes += data.minutes
    xp_svc.touch_streak(db, user)
    xp_svc.award_xp(db, user, xp, f"session:{data.type}")
    xp_svc.mission_progress(db, "minutos", data.minutes)
    if user.total_minutes >= 100 * 60:
        xp_svc.unlock_achievement(db, user, "h100")
    if user.total_minutes >= 500 * 60:
        xp_svc.unlock_achievement(db, user, "h500")
    if user.total_minutes >= 60 * 60 * 24 * 365 * 0.01:
        pass
    if (date.today() - user.start_date).days >= 365:
        xp_svc.unlock_achievement(db, user, "ano1")
    db.commit()
    return {"xp": xp, "total_minutes": user.total_minutes, "level": user.level}


@router.post("/pomodoros")
def log_pomodoro(data: PomodoroIn, db: Session = Depends(get_db)):
    user = db.query(User).first()
    db.add(Pomodoro(date=date.today(), minutes=data.minutes, mode=data.mode, completed=data.completed))
    if data.completed:
        user.total_pomodoros += 1
        xp_svc.touch_streak(db, user)
        xp_svc.mission_progress(db, "pomodoro", 1)
        xp_svc.mission_progress(db, "minutos", data.minutes)
        xp_svc.unlock_achievement(db, user, "primeiro_pomodoro")
        xp = xp_svc.XP_POMODORO * max(1, data.minutes // 25)
        xp_svc.award_xp(db, user, xp, "pomodoro")
        db.add(StudySession(date=date.today(), minutes=data.minutes, type="pomodoro", xp=xp))
        user.total_minutes += data.minutes
        if user.total_minutes >= 100 * 60:
            xp_svc.unlock_achievement(db, user, "h100")
        if user.total_minutes >= 500 * 60:
            xp_svc.unlock_achievement(db, user, "h500")
        db.commit()
        return {"xp": xp, "pomodoros": user.total_pomodoros}
    db.commit()
    return {"xp": 0}


@router.post("/questions")
def log_questions(data: QuestionsIn, db: Session = Depends(get_db)):
    user = db.query(User).first()
    db.add(QuestionLog(date=date.today(), subject_id=data.subject_id, qty=data.qty,
                       correct=data.correct, topic=data.topic, source=data.source))
    user.total_questions += data.qty
    user.total_correct += data.correct
    xp = data.qty * xp_svc.XP_QUESTAO + data.correct * xp_svc.XP_ACERTO
    xp_svc.touch_streak(db, user)
    xp_svc.award_xp(db, user, xp, "questoes")
    xp_svc.mission_progress(db, "questoes", data.qty)
    if data.qty and data.correct / data.qty >= 0.8:
        xp_svc.mission_progress(db, "precisao", 80)
    xp_svc.unlock_achievement(db, user, "primeira_questao")
    if user.total_questions >= 100:
        xp_svc.unlock_achievement(db, user, "q100")
    if user.total_questions >= 1000:
        xp_svc.unlock_achievement(db, user, "q1000")
    db.commit()
    return {"xp": xp, "total_questions": user.total_questions}


@router.post("/revisions/{revision_id}/done")
def done_revision(revision_id: int, db: Session = Depends(get_db)):
    user = db.query(User).first()
    rev = db.query(Revision).get(revision_id)
    if not rev:
        return {"error": "revisão não encontrada"}, 404
    if rev.done:
        return {"xp": 0, "already": True}
    rev.done = True
    rev.done_at = date.today()
    user.total_revisoes += 1
    xp = xp_svc.XP_REVISAO
    xp_svc.touch_streak(db, user)
    xp_svc.award_xp(db, user, xp, "revisao")
    xp_svc.mission_progress(db, "revisao", 1)
    db.commit()
    return {"xp": xp, "total_revisoes": user.total_revisoes}
