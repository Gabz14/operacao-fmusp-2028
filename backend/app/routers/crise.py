from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import User
from ..services import scheduler
from ..services import xp as xp_svc

router = APIRouter(prefix="/api", tags=["crise"])


class GoalIn(BaseModel):
    goal_id: str


@router.get("/crise")
def crise(db: Session = Depends(get_db)):
    user = db.query(User).first()
    active = scheduler.check_crisis(db)
    return {
        "active": active,
        "goals": scheduler.CRISIS_GOALS,
        "quote": user.crisis_quote,
        "days_since": (date_today() - (user.last_study_date or date_today())).days,
    }


@router.post("/crise/complete")
def complete_goal(data: GoalIn, db: Session = Depends(get_db)):
    user = db.query(User).first()
    if data.goal_id == "flashcards":
        xp_svc.mission_progress(db, "flashcards", 5)
    elif data.goal_id == "questoes":
        xp_svc.mission_progress(db, "questoes", 3)
    elif data.goal_id == "minutos":
        xp_svc.mission_progress(db, "minutos", 10)
    xp_svc.touch_streak(db, user)
    result = scheduler.complete_crisis_goal(db, data.goal_id)
    user.crisis = False
    db.commit()
    return result


def date_today():
    from datetime import date
    return date.today()
