from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import User, Notification

router = APIRouter(prefix="/api", tags=["config"])


class DatesIn(BaseModel):
    enem_date: str | None = None
    fuvest_date1: str | None = None
    fuvest_date2: str | None = None
    start_date: str | None = None


class NotifIn(BaseModel):
    type: str
    title: str
    body: str


@router.get("/notificacoes")
def notificacoes(db: Session = Depends(get_db)):
    from datetime import datetime
    items = db.query(Notification).order_by(Notification.at.desc()).limit(30).all()
    return {"notifications": [
        {"id": n.id, "type": n.type, "title": n.title, "body": n.body,
         "at": n.at.isoformat(), "read": n.read}
        for n in items
    ]}


@router.post("/notificacoes/read")
def mark_read(db: Session = Depends(get_db)):
    from datetime import datetime, timedelta
    db.query(Notification).filter(Notification.at >= datetime.now() - timedelta(days=7)).update({"read": True})
    db.commit()
    return {"ok": True}


@router.post("/notificacoes")
def add_notification(data: NotifIn, db: Session = Depends(get_db)):
    from datetime import datetime
    db.add(Notification(type=data.type, title=data.title, body=data.body, at=datetime.now()))
    db.commit()
    return {"ok": True}


@router.put("/datas")
def set_dates(data: DatesIn, db: Session = Depends(get_db)):
    from datetime import date
    user = db.query(User).first()
    if data.enem_date:
        user.enem_date = date.fromisoformat(data.enem_date)
    if data.fuvest_date1:
        user.fuvest_date1 = date.fromisoformat(data.fuvest_date1)
    if data.fuvest_date2:
        user.fuvest_date2 = date.fromisoformat(data.fuvest_date2)
    if data.start_date:
        user.start_date = date.fromisoformat(data.start_date)
    db.commit()
    return {"ok": True}
