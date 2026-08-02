"""Economia de XP: patentes, níveis, conquistas, missões e notificações."""
from datetime import date, datetime, timedelta
from sqlalchemy.orm import Session
from .. import curriculum
from ..models import (
    User, Achievement, Mission, Quote, Notification,
)

XP_POMODORO = 10
XP_QUESTAO = 2
XP_ACERTO = 1
XP_FLASHCARD = 1
XP_REVISAO = 5
XP_LEITURA_PAG = 1
XP_REDACAO = 50
XP_SIMULADO = 100


def quote_of(db: Session, occasion: str) -> str:
    pool = curriculum.QUOTES.get(occasion) or curriculum.QUOTES["dia"]
    day_seed = date.today().toordinal()
    return pool[day_seed % len(pool)]


def update_rank(db: Session, user: User) -> dict | None:
    slug, name, _ = curriculum.rank_for_xp(user.xp)
    promoted = None
    if user.rank_slug != slug:
        old = curriculum.RANKS[0]
        for s, n, t in curriculum.RANKS:
            if s == user.rank_slug:
                old = (s, n, t)
                break
        user.rank_slug = slug
        msg = curriculum.QUOTES["rank"].get(slug, f"Patente promovida: {name}.")
        db.add(Notification(type="rank", title=f"Patente promovida: {name}", body=msg, at=datetime.now()))
        promoted = {"slug": slug, "name": name}
    return promoted


def update_level(db: Session, user: User) -> bool:
    new_level = curriculum.level_for_xp(user.xp)
    if new_level > user.level:
        user.level = new_level
        db.add(Notification(type="level", title=f"Nível {new_level} alcançado", body="Seu nível subiu. A cidade percebeu.", at=datetime.now()))
        unlock_achievement(db, user, "nivel10") if new_level >= 10 else None
        if new_level >= 10:
            unlock_achievement(db, user, "nivel10")
        return True
    return False


def unlock_achievement(db: Session, user: User, slug: str) -> dict | None:
    ach = db.query(Achievement).filter(Achievement.slug == slug).first()
    if ach and ach.unlocked_at is None:
        ach.unlocked_at = datetime.now()
        user.xp += ach.xp
        update_level(db, user)
        update_rank(db, user)
        db.add(Notification(
            type="conquista",
            title=f"Conquista: {ach.title}",
            body=f"+{ach.xp} XP — {ach.description}",
            at=datetime.now(),
        ))
        db.commit()
        return {"slug": ach.slug, "title": ach.title, "xp": ach.xp}
    return None


def touch_streak(db: Session, user: User) -> None:
    today = date.today()
    if user.last_study_date == today:
        return
    if user.last_study_date == today - timedelta(days=1):
        user.streak += 1
    else:
        user.streak = 1
    user.last_study_date = today
    user.best_streak = max(user.best_streak, user.streak)
    if user.streak == 30:
        unlock_achievement(db, user, "d30")
    if user.streak == 100:
        unlock_achievement(db, user, "d100")


def mission_progress(db: Session, metric: str, amount: int = 1) -> None:
    """Atualiza missões por métrica e entrega XP das completas."""
    user = db.query(User).first()
    if not user:
        return
    today = date.today()
    missions = (
        db.query(Mission)
        .filter(Mission.period_start == today, Mission.completed == False)  # noqa: E712
        .all()
    )
    for m in missions:
        if m.slug in ("m_dias25",) and metric == "minutos" and amount > 0:
            continue
        if metric == "dias" and m.slug != "m_dias25":
            continue
        if m.slug == "m_dias25" and metric == "dias":
            m.progress = min(m.progress + amount, m.target)
        elif metric in ("minutos", "questoes", "pomodoro", "flashcards", "redacao", "leitura", "revisao", "simulado", "precisao"):
            m.progress = min(m.progress + amount, m.target)
        if m.progress >= m.target and not m.completed:
            m.completed = True
            user.xp += m.reward_xp
            update_level(db, user)
            update_rank(db, user)
            db.add(Notification(
                type="missao",
                title="Missão cumprida",
                body=f"{m.title} — +{m.reward_xp} XP",
                at=datetime.now(),
            ))
    db.commit()


def award_xp(db: Session, user: User, amount: int, reason: str = "") -> int:
    user.xp += amount
    update_level(db, user)
    update_rank(db, user)
    db.commit()
    return user.xp


def ensure_missions(db: Session) -> None:
    """Garante as missões de hoje/semana/mês existirem."""
    today = date.today()
    user = db.query(User).first()
    if not user:
        return
    has_daily = db.query(Mission).filter(Mission.type == "diaria", Mission.period_start == today).count()
    if not has_daily:
        day_seed = today.toordinal()
        for i, (slug, title, target, metric, xp) in enumerate(curriculum.MISSIONS_DAILY):
            db.add(Mission(type="diaria", slug=slug, title=title, target=target,
                           reward_xp=xp, period_start=today))
    monday = today - timedelta(days=today.weekday())
    has_weekly = db.query(Mission).filter(Mission.type == "semanal", Mission.period_start == monday).count()
    if not has_weekly:
        for slug, title, target, metric, xp in curriculum.MISSIONS_WEEKLY:
            db.add(Mission(type="semanal", slug=slug, title=title, target=target,
                           reward_xp=xp, period_start=monday))
    month_start = today.replace(day=1)
    has_monthly = db.query(Mission).filter(Mission.type == "mensal", Mission.period_start == month_start).count()
    if not has_monthly:
        for slug, title, target, metric, xp in curriculum.MISSIONS_MONTHLY:
            db.add(Mission(type="mensal", slug=slug, title=title, target=target,
                           reward_xp=xp, period_start=month_start))
    db.commit()
