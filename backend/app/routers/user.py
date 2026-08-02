from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import User

router = APIRouter(prefix="/api", tags=["user"])


class UserIn(BaseModel):
    name: str | None = None
    avatar: str | None = None
    objective: str | None = None
    university: str | None = None
    course: str | None = None
    theme: str | None = None
    pomodoro_focus: int | None = None
    pomodoro_break: int | None = None
    ambient_sound: str | None = None
    notifications_enabled: bool | None = None


@router.put("/user")
def update_user(data: UserIn, db: Session = Depends(get_db)):
    user = db.query(User).first()
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(user, k, v)
    db.commit()
    return {"ok": True, "name": user.name}
