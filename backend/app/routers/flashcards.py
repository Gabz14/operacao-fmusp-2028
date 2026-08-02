from datetime import date
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import User, Flashcard, Subject, Revision
from ..services import xp as xp_svc
from ..services.srs import apply_review

router = APIRouter(prefix="/api", tags=["flashcards"])


class CardIn(BaseModel):
    subject_id: int
    front: str
    back: str
    topic: str = ""


class ReviewIn(BaseModel):
    rating: str  # muito_facil | facil | dificil | esqueci


def card_dict(c: Flashcard) -> dict:
    return {"id": c.id, "subject_id": c.subject_id, "front": c.front, "back": c.back,
            "topic": c.topic, "ease": round(c.ease, 2), "interval_days": c.interval_days,
            "reps": c.reps, "lapses": c.lapses, "due": c.due.isoformat()}


@router.get("/flashcards/overview")
def overview(db: Session = Depends(get_db)):
    subjects = db.query(Subject).all()
    today = date.today()
    decks = []
    for s in subjects:
        cards = db.query(Flashcard).filter(Flashcard.subject_id == s.id).all()
        decks.append({
            "subject_id": s.id, "slug": s.slug, "name": s.name,
            "icon": s.icon, "color": s.color,
            "total": len(cards),
            "due": sum(1 for c in cards if c.due <= today),
            "new": sum(1 for c in cards if c.reps == 0 and c.due <= today),
        })
    due_total = sum(d["due"] for d in decks)
    return {"decks": decks, "due_total": due_total,
            "today_reviewed": sum(1 for c in db.query(Flashcard).all() if c.due == today and c.reps > 0)}


@router.get("/flashcards/due")
def due_cards(db: Session = Depends(get_db)):
    cards = db.query(Flashcard).filter(Flashcard.due <= date.today()).order_by(Flashcard.due).all()
    return {"cards": [card_dict(c) for c in cards]}


@router.get("/flashcards/{subject_id}")
def deck_cards(subject_id: int, db: Session = Depends(get_db)):
    cards = db.query(Flashcard).filter(Flashcard.subject_id == subject_id).all()
    return {"cards": [card_dict(c) for c in cards]}


@router.post("/flashcards")
def create_card(data: CardIn, db: Session = Depends(get_db)):
    card = Flashcard(subject_id=data.subject_id, front=data.front, back=data.back,
                     topic=data.topic, due=date.today())
    db.add(card)
    db.commit()
    return card_dict(card)


@router.delete("/flashcards/{card_id}")
def delete_card(card_id: int, db: Session = Depends(get_db)):
    card = db.query(Flashcard).get(card_id)
    if card:
        db.delete(card)
        db.commit()
    return {"ok": True}


@router.post("/flashcards/{card_id}/review")
def review_card(card_id: int, data: ReviewIn, db: Session = Depends(get_db)):
    user = db.query(User).first()
    card = db.query(Flashcard).get(card_id)
    if not card:
        return {"error": "card não encontrado"}, 404
    result = apply_review(card, data.rating)
    user.total_flashcards += 1
    xp = xp_svc.XP_FLASHCARD if data.rating != "esqueci" else 0
    xp_svc.touch_streak(db, user)
    xp_svc.award_xp(db, user, xp, "flashcard")
    xp_svc.mission_progress(db, "flashcards", 1)
    xp_svc.unlock_achievement(db, user, "primeiro_flashcard")
    db.commit()
    return {**result, "xp": xp}


@router.get("/revisions/pending")
def pending_revisions(db: Session = Depends(get_db)):
    revs = (
        db.query(Revision)
        .filter(Revision.due <= date.today(), Revision.done == False)  # noqa: E712
        .order_by(Revision.due)
        .all()
    )
    subs = {s.id: s for s in db.query(Subject).all()}
    return {"revisions": [
        {"id": r.id, "subject": subs[r.subject_id].name if r.subject_id in subs else "",
         "topic": r.topic, "due": r.due.isoformat(), "window": r.window}
        for r in revs
    ]}
