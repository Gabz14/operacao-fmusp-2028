"""Sistema de repetição espaçada (SM-2 adaptado, estilo Anki)."""
from datetime import date, timedelta
from sqlalchemy.orm import Session
from ..models import Flashcard

RATINGS = {
    "esqueci": 0,
    "dificil": 1,
    "facil": 2,
    "muito_facil": 3,
}


def apply_review(card: Flashcard, rating: str) -> dict:
    g = RATINGS.get(rating, 2)
    card.reps += 1
    if g == 0:
        card.lapses += 1
        card.ease = max(1.3, card.ease - 0.2)
        card.interval_days = 0
        card.reps = 0
        card.due = date.today()
    else:
        if card.reps == 1:
            card.interval_days = 1
        elif card.reps == 2:
            card.interval_days = 3
        else:
            if g == 1:
                card.interval_days = max(1, round(card.interval_days * 1.2))
                card.ease = max(1.3, card.ease - 0.15)
            elif g == 2:
                card.interval_days = max(1, round(card.interval_days * card.ease))
            else:
                card.interval_days = max(1, round(card.interval_days * card.ease * 1.3))
                card.ease = min(3.0, card.ease + 0.15)
        card.due = date.today() + timedelta(days=card.interval_days)
    return {
        "interval_days": card.interval_days,
        "ease": card.ease,
        "reps": card.reps,
        "lapses": card.lapses,
        "due": card.due.isoformat(),
    }
