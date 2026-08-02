from datetime import date
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import User, Redacao
from ..services import xp as xp_svc

router = APIRouter(prefix="/api", tags=["redacao"])


class RedacaoIn(BaseModel):
    tema: str
    texto: str = ""
    nota: float | None = None
    comp1: float | None = None
    comp2: float | None = None
    comp3: float | None = None
    comp4: float | None = None
    comp5: float | None = None


@router.get("/redacoes")
def list_redacoes(db: Session = Depends(get_db)):
    reds = db.query(Redacao).order_by(Redacao.date.desc()).all()
    return {"redacoes": [
        {"id": r.id, "date": r.date.isoformat(), "tema": r.tema, "nota": r.nota,
         "comp1": r.comp1, "comp2": r.comp2, "comp3": r.comp3, "comp4": r.comp4,
         "comp5": r.comp5, "texto": r.texto, "correcao": r.correcao}
        for r in reds
    ]}


@router.post("/redacoes")
def create_redacao(data: RedacaoIn, db: Session = Depends(get_db)):
    user = db.query(User).first()
    r = Redacao(date=date.today(), tema=data.tema, texto=data.texto, nota=data.nota,
                comp1=data.comp1, comp2=data.comp2, comp3=data.comp3,
                comp4=data.comp4, comp5=data.comp5)
    db.add(r)
    db.flush()
    user.total_redacoes += 1
    xp_svc.touch_streak(db, user)
    xp_svc.award_xp(db, user, xp_svc.XP_REDACAO, "redacao")
    xp_svc.mission_progress(db, "redacao", 1)
    xp_svc.unlock_achievement(db, user, "primeira_redacao")
    db.commit()
    return {"id": r.id, "xp": xp_svc.XP_REDACAO}


@router.delete("/redacoes/{redacao_id}")
def delete_redacao(redacao_id: int, db: Session = Depends(get_db)):
    r = db.query(Redacao).get(redacao_id)
    if r:
        db.delete(r)
        db.commit()
    return {"ok": True}
