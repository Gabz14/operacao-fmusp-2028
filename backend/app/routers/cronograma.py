from datetime import date
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import User, Week, WeekItem, Subject, Revision
from ..services import scheduler
from ..services import xp as xp_svc

router = APIRouter(prefix="/api", tags=["cronograma"])

DAY_NAMES = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]


def item_dict(i: WeekItem) -> dict:
    return {"id": i.id, "day": i.day, "day_name": DAY_NAMES[i.day], "type": i.type,
            "title": i.title, "qty": i.qty, "status": i.status, "subject": i.subject_id}


@router.get("/cronograma/phases")
def phases(db: Session = Depends(get_db)):
    from .. import curriculum
    result = []
    for p in curriculum.PHASES:
        weeks = db.query(Week).filter(Week.phase == p["num"]).all()
        done = sum(1 for w in weeks if w.status in ("concluida", "vencida") and w.end_date < date.today())
        total = len(weeks)
        result.append({
            "num": p["num"], "name": p["name"], "start": p["start"].isoformat(),
            "end": p["end"].isoformat(), "weeks_done": done, "weeks_total": total,
            "progress": min(100, round(done / max(1, total) * 100)),
        })
    return {"phases": result}


@router.get("/cronograma")
def cronograma(db: Session = Depends(get_db)):
    scheduler.replan(db)
    weeks = db.query(Week).order_by(Week.start_date).all()
    subs = {s.id: s for s in db.query(Subject).all()}
    today = date.today()
    result = []
    for w in weeks:
        items = db.query(WeekItem).filter(WeekItem.week_id == w.id).order_by(WeekItem.order).all()
        done = sum(1 for i in items if i.status == "concluida")
        total = len(items)
        if w.start_date <= today <= w.end_date:
            status = "ativa"
        elif w.end_date < today:
            status = "concluida" if total and done == total else "vencida"
        else:
            status = "futura"
        result.append({
            "id": w.id, "phase": w.phase, "phase_name": w.phase_name,
            "start": w.start_date.isoformat(), "end": w.end_date.isoformat(),
            "title": w.title, "status": status, "progress": min(100, round(done / max(1, total) * 100)),
            "items": [{
                **item_dict(i),
                "subject_name": subs[i.subject_id].name if i.subject_id and i.subject_id in subs else None,
                "subject_color": subs[i.subject_id].color if i.subject_id and i.subject_id in subs else None,
            } for i in items],
        })
    return {"weeks": result, "today": today.isoformat()}


@router.post("/cronograma/items/{item_id}/complete")
def complete_item(item_id: int, db: Session = Depends(get_db)):
    user = db.query(User).first()
    item = db.query(WeekItem).get(item_id)
    if not item:
        return {"error": "item não encontrado"}, 404
    if item.status == "concluida":
        return {"xp": 0, "already": True}
    xp = 0
    if item.type == "questoes":
        xp = item.qty * xp_svc.XP_QUESTAO
    elif item.type == "conteudo":
        xp = 15
    elif item.type == "revisao":
        xp = xp_svc.XP_REVISAO
    elif item.type == "flashcards":
        xp = item.qty * xp_svc.XP_FLASHCARD
    elif item.type == "leitura":
        xp = max(5, item.qty // 2)
    elif item.type == "redacao":
        xp = xp_svc.XP_REDACAO
        user.total_redacoes += 1
    elif item.type == "simulado":
        xp = xp_svc.XP_SIMULADO
    scheduler.finish_item(db, item)
    xp_svc.touch_streak(db, user)
    xp_svc.award_xp(db, user, xp, f"item:{item.type}")
    if item.type == "questoes":
        xp_svc.mission_progress(db, "questoes", item.qty)
    elif item.type == "revisao":
        xp_svc.mission_progress(db, "revisao", 1)
    elif item.type == "redacao":
        xp_svc.mission_progress(db, "redacao", 1)
        xp_svc.unlock_achievement(db, user, "primeira_redacao")
    elif item.type == "simulado":
        xp_svc.mission_progress(db, "simulado", 1)
    elif item.type == "leitura":
        xp_svc.mission_progress(db, "leitura", item.qty)
    # semana completa
    week = item.week
    if week and week.status == "concluida":
        from ..models import Week as W
        w = db.query(W).get(week.id)
        if w and all(i.status == "concluida" for i in w.items):
            xp_svc.unlock_achievement(db, user, "primeira_semana")
    db.commit()
    return {"xp": xp, "status": item.status}
