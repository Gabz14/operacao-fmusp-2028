"""Criação do banco e seed inicial."""
from datetime import date
from sqlalchemy.orm import Session
from . import db as dbmod
from .models import (
    User, Subject, Topic, Achievement, Card, Quote, Week, Revision,
)
from . import curriculum
from .services.scheduler import generate_all, generate_week


def init_db() -> None:
    dbmod.Base.metadata.create_all(dbmod.engine)
    db = dbmod.SessionLocal()
    try:
        seed(db)
    finally:
        db.close()


def seed(db: Session) -> None:
    if not db.query(User).first():
        db.add(User(
            name="Gabi", avatar="agente",
            objective="Aprovação em Medicina na FMUSP",
            university="FMUSP", course="Medicina",
        ))
        db.flush()

    if not db.query(Subject).first():
        for slug, name, icon, color, order in curriculum.SUBJECTS:
            db.add(Subject(slug=slug, name=name, icon=icon, color=color, order=order))
        db.flush()
        subs = {s.slug: s for s in db.query(Subject).all()}
        for slug, topics in curriculum.TOPICS.items():
            for i, t in enumerate(topics):
                db.add(Topic(subject_id=subs[slug].id, name=t, order=i,
                             weight=curriculum.SUBJECT_WEIGHT.get(slug, 3)))
        db.flush()

    if not db.query(Achievement).first():
        for slug, title, desc, xp in curriculum.ACHIEVEMENTS:
            db.add(Achievement(slug=slug, title=title, description=desc, xp=xp))

    if not db.query(Card).first():
        for i, (slug, name, rarity, desc, hist, phase) in enumerate(curriculum.CARDS):
            db.add(Card(slug=slug, name=name, rarity=rarity, description=desc,
                        history=hist, phase_unlock=phase, art_seed=i))

    if not db.query(Quote).first():
        for occasion, pool in curriculum.QUOTES.items():
            if isinstance(pool, dict):
                continue
            for text in pool:
                db.add(Quote(text=text, occasion=occasion))
        for slug, text in curriculum.QUOTES.get("rank", {}).items():
            db.add(Quote(text=text, occasion=f"rank:{slug}"))

    if not db.query(Week).first():
        from .services.scheduler import monday_of
        start = monday_of(curriculum.PHASES[0]["start"])
        end = curriculum.PHASES[-1]["end"]
        d = start
        week_index = 0
        while d <= end:
            generate_week(db, d, week_index)
            d += timedelta(days=7)
            week_index += 1

    db.commit()


def timedelta(days: int):
    from datetime import timedelta as td
    return td(days=days)
