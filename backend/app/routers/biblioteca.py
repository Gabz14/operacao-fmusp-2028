from datetime import date
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import Note, Subject

router = APIRouter(prefix="/api", tags=["biblioteca"])


class NoteIn(BaseModel):
    subject_id: int | None = None
    title: str
    content: str = ""
    note_type: str = "texto"
    source_file: str = ""


@router.get("/biblioteca")
def biblioteca(db: Session = Depends(get_db)):
    subjects = db.query(Subject).all()
    notes = db.query(Note).order_by(Note.created_at.desc()).all()
    return {
        "subjects": [{"id": s.id, "slug": s.slug, "name": s.name, "icon": s.icon,
                      "color": s.color, "notes": sum(1 for n in notes if n.subject_id == s.id)}
                     for s in subjects],
        "notes": [{"id": n.id, "subject_id": n.subject_id, "title": n.title,
                   "content": n.content, "note_type": n.note_type,
                   "source_file": n.source_file,
                   "created_at": n.created_at.isoformat() if n.created_at else ""}
                  for n in notes],
    }


@router.post("/biblioteca/notes")
def create_note(data: NoteIn, db: Session = Depends(get_db)):
    n = Note(subject_id=data.subject_id, title=data.title, content=data.content,
             note_type=data.note_type, source_file=data.source_file)
    db.add(n)
    db.commit()
    return {"id": n.id}


@router.delete("/biblioteca/notes/{note_id}")
def delete_note(note_id: int, db: Session = Depends(get_db)):
    n = db.query(Note).get(note_id)
    if n:
        db.delete(n)
        db.commit()
    return {"ok": True}
