import json
from datetime import date, datetime
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import (
    User, Subject, Topic, Week, WeekItem, Revision, Flashcard, Redacao,
    QuestionLog, StudySession, Pomodoro, Note, Card, Achievement,
)
from .. import curriculum

router = APIRouter(prefix="/api/backup", tags=["backup"])

TABLES = [User, Subject, Topic, Week, WeekItem, Revision, Flashcard,
          Redacao, QuestionLog, StudySession, Pomodoro, Note, Card, Achievement]


@router.get("/export")
def export_backup(db: Session = Depends(get_db)):
    data = {"app": "operacao-fmusp-2028", "version": 1, "exported": date.today().isoformat(), "tables": {}}
    for model in TABLES:
        rows = [serialize(r) for r in db.query(model).all()]
        if rows:
            data["tables"][model.__tablename__] = rows
    return data


class ImportIn(BaseModel):
    data: str


@router.post("/import")
def import_backup(data: ImportIn, db: Session = Depends(get_db)):
    try:
        payload = json.loads(data.data)
    except Exception:
        return {"ok": False, "message": "arquivo de backup inválido"}
    if payload.get("app") != "operacao-fmusp-2028":
        return {"ok": False, "message": "arquivo não é um backup da Operação FMUSP 2028"}
    try:
        for model in TABLES:
            table = model.__tablename__
            rows = payload.get("tables", {}).get(table, [])
            db.query(model).delete()
            datetime_cols = {c.name: c.type.python_type for c in model.__table__.columns
                             if c.type.python_type in (datetime, date)}
            for row in rows:
                clean = {k: v for k, v in row.items() if k in model.__table__.columns.keys()}
                for col, pytype in datetime_cols.items():
                    if col in clean and clean[col] is not None:
                        clean[col] = datetime.fromisoformat(clean[col])
                        if pytype is date:
                            clean[col] = clean[col].date()
                db.add(model(**clean))
        db.commit()
        return {"ok": True}
    except Exception as e:
        db.rollback()
        return {"ok": False, "message": f"falha ao restaurar: {e}"}


@router.get("/relatorio")
def relatorio(db: Session = Depends(get_db)):
    user = db.query(User).first()
    subs = db.query(Subject).all()
    rows = []
    for s in subs:
        q = db.query(QuestionLog).filter(QuestionLog.subject_id == s.id).all()
        fc = db.query(Flashcard).filter(Flashcard.subject_id == s.id).count()
        rows.append(f"<tr><td>{s.name}</td><td>{sum(x.qty for x in q)}</td>"
                    f"<td>{sum(x.correct for x in q)}</td><td>{fc}</td></tr>")
    html = f"""
    <h2>Resumo da operação</h2>
    <p>Estudante: <b>{user.name}</b> · Objetivo: {user.objective} · XP: {user.xp} · Patente: {user.rank_slug}</p>
    <table>
      <tr><th>Matéria</th><th>Questões</th><th>Acertos</th><th>Flashcards</th></tr>
      {''.join(rows)}
    </table>
    <p class="gold">Horas totais: {round(user.total_minutes / 60, 1)} · Streak: {user.streak} dias ·
    Precisão geral: {round(user.total_correct / max(1, user.total_questions) * 100, 1)}%</p>
    """
    return {"html": html}


def serialize(obj):
    from sqlalchemy.orm import class_mapper
    cols = class_mapper(obj.__class__).columns.keys()
    out = {}
    for c in cols:
        v = getattr(obj, c)
        if hasattr(v, "isoformat"):
            v = v.isoformat()
        out[c] = v
    return out
