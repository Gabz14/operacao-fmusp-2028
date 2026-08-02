from datetime import date, datetime
from sqlalchemy import String, Integer, Float, Boolean, Date, DateTime, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .db import Base

ITEM_TYPES = ("conteudo", "questoes", "revisao", "flashcards", "redacao", "leitura", "simulado")


def today() -> date:
    return date.today()


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(60), default="Gabi")
    avatar: Mapped[str] = mapped_column(String(40), default="agente")
    objective: Mapped[str] = mapped_column(String(200), default="Aprovação em Medicina na FMUSP")
    university: Mapped[str] = mapped_column(String(60), default="FMUSP")
    course: Mapped[str] = mapped_column(String(60), default="Medicina")
    theme: Mapped[str] = mapped_column(String(40), default="dourado")

    xp: Mapped[int] = mapped_column(Integer, default=0)
    level: Mapped[int] = mapped_column(Integer, default=1)
    rank_slug: Mapped[str] = mapped_column(String(40), default="recruta")

    streak: Mapped[int] = mapped_column(Integer, default=0)
    best_streak: Mapped[int] = mapped_column(Integer, default=0)
    last_study_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    start_date: Mapped[date] = mapped_column(Date, default=date(2026, 7, 1))
    enem_date: Mapped[date] = mapped_column(Date, default=date(2028, 11, 5))
    fuvest_date1: Mapped[date] = mapped_column(Date, default=date(2028, 11, 26))
    fuvest_date2: Mapped[date] = mapped_column(Date, default=date(2028, 12, 17))

    total_minutes: Mapped[int] = mapped_column(Integer, default=0)
    total_questions: Mapped[int] = mapped_column(Integer, default=0)
    total_correct: Mapped[int] = mapped_column(Integer, default=0)
    total_flashcards: Mapped[int] = mapped_column(Integer, default=0)
    total_redacoes: Mapped[int] = mapped_column(Integer, default=0)
    total_pomodoros: Mapped[int] = mapped_column(Integer, default=0)
    total_revisoes: Mapped[int] = mapped_column(Integer, default=0)
    total_leituras_pag: Mapped[int] = mapped_column(Integer, default=0)

    pomodoro_focus: Mapped[int] = mapped_column(Integer, default=25)
    pomodoro_break: Mapped[int] = mapped_column(Integer, default=5)
    ambient_sound: Mapped[str] = mapped_column(String(30), default="chuva")

    crisis: Mapped[bool] = mapped_column(Boolean, default=False)
    crisis_start: Mapped[date | None] = mapped_column(Date, nullable=True)
    crisis_quote: Mapped[str] = mapped_column(Text, default="")

    notifications_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    settings_json: Mapped[str] = mapped_column(Text, default="{}")
    owned_items: Mapped[str] = mapped_column(Text, default="[]")

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Subject(Base):
    __tablename__ = "subjects"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(40), unique=True)
    name: Mapped[str] = mapped_column(String(60))
    icon: Mapped[str] = mapped_column(String(40), default="book")
    color: Mapped[str] = mapped_column(String(20), default="#f5c518")
    order: Mapped[int] = mapped_column(Integer, default=0)
    xp: Mapped[int] = mapped_column(Integer, default=0)
    topic_index: Mapped[int] = mapped_column(Integer, default=0)
    content_finished: Mapped[bool] = mapped_column(Boolean, default=False)

    topics: Mapped[list["Topic"]] = relationship(back_populates="subject", order_by="Topic.order")


class Topic(Base):
    __tablename__ = "topics"

    id: Mapped[int] = mapped_column(primary_key=True)
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id"))
    name: Mapped[str] = mapped_column(String(120))
    order: Mapped[int] = mapped_column(Integer, default=0)
    weight: Mapped[int] = mapped_column(Integer, default=3)

    subject: Mapped[Subject] = relationship(back_populates="topics")


class Week(Base):
    __tablename__ = "weeks"

    id: Mapped[int] = mapped_column(primary_key=True)
    phase: Mapped[int] = mapped_column(Integer)
    phase_name: Mapped[str] = mapped_column(String(60))
    start_date: Mapped[date] = mapped_column(Date)
    end_date: Mapped[date] = mapped_column(Date)
    title: Mapped[str] = mapped_column(String(120))
    status: Mapped[str] = mapped_column(String(20), default="ativa")

    items: Mapped[list["WeekItem"]] = relationship(back_populates="week", order_by="WeekItem.order")


class WeekItem(Base):
    __tablename__ = "week_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    week_id: Mapped[int] = mapped_column(ForeignKey("weeks.id"))
    day: Mapped[int] = mapped_column(Integer, default=0)
    subject_id: Mapped[int | None] = mapped_column(ForeignKey("subjects.id"), nullable=True)
    type: Mapped[str] = mapped_column(String(20))
    title: Mapped[str] = mapped_column(String(200))
    qty: Mapped[int] = mapped_column(Integer, default=0)
    detail: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(20), default="pendente")
    order: Mapped[int] = mapped_column(Integer, default=0)
    done_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    week: Mapped[Week] = relationship(back_populates="items")


class Revision(Base):
    __tablename__ = "revisions"

    id: Mapped[int] = mapped_column(primary_key=True)
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id"))
    topic: Mapped[str] = mapped_column(String(200))
    due: Mapped[date] = mapped_column(Date)
    window: Mapped[int] = mapped_column(Integer, default=7)
    done: Mapped[bool] = mapped_column(Boolean, default=False)
    done_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class StudySession(Base):
    __tablename__ = "study_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    date: Mapped[date] = mapped_column(Date)
    minutes: Mapped[int] = mapped_column(Integer)
    type: Mapped[str] = mapped_column(String(30))
    subject_id: Mapped[int | None] = mapped_column(ForeignKey("subjects.id"), nullable=True)
    xp: Mapped[int] = mapped_column(Integer, default=0)


class Pomodoro(Base):
    __tablename__ = "pomodoros"

    id: Mapped[int] = mapped_column(primary_key=True)
    date: Mapped[date] = mapped_column(Date)
    minutes: Mapped[int] = mapped_column(Integer)
    mode: Mapped[str] = mapped_column(String(30), default="25/5")
    completed: Mapped[bool] = mapped_column(Boolean, default=True)


class QuestionLog(Base):
    __tablename__ = "question_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    date: Mapped[date] = mapped_column(Date)
    subject_id: Mapped[int | None] = mapped_column(ForeignKey("subjects.id"), nullable=True)
    topic: Mapped[str] = mapped_column(String(200), default="")
    source: Mapped[str] = mapped_column(String(120), default="")
    qty: Mapped[int] = mapped_column(Integer, default=1)
    correct: Mapped[int] = mapped_column(Integer, default=0)


class Flashcard(Base):
    __tablename__ = "flashcards"

    id: Mapped[int] = mapped_column(primary_key=True)
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id"))
    topic: Mapped[str] = mapped_column(String(200), default="")
    front: Mapped[str] = mapped_column(Text)
    back: Mapped[str] = mapped_column(Text)
    ease: Mapped[float] = mapped_column(Float, default=2.5)
    interval_days: Mapped[int] = mapped_column(Integer, default=0)
    reps: Mapped[int] = mapped_column(Integer, default=0)
    lapses: Mapped[int] = mapped_column(Integer, default=0)
    due: Mapped[date] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Redacao(Base):
    __tablename__ = "redacoes"

    id: Mapped[int] = mapped_column(primary_key=True)
    date: Mapped[date] = mapped_column(Date)
    tema: Mapped[str] = mapped_column(String(200))
    texto: Mapped[str] = mapped_column(Text, default="")
    nota: Mapped[float | None] = mapped_column(Float, nullable=True)
    comp1: Mapped[float | None] = mapped_column(Float, nullable=True)
    comp2: Mapped[float | None] = mapped_column(Float, nullable=True)
    comp3: Mapped[float | None] = mapped_column(Float, nullable=True)
    comp4: Mapped[float | None] = mapped_column(Float, nullable=True)
    comp5: Mapped[float | None] = mapped_column(Float, nullable=True)
    correcao: Mapped[str] = mapped_column(Text, default="")


class Mission(Base):
    __tablename__ = "missions"

    id: Mapped[int] = mapped_column(primary_key=True)
    type: Mapped[str] = mapped_column(String(10))  # diaria / semanal / mensal
    slug: Mapped[str] = mapped_column(String(60))
    title: Mapped[str] = mapped_column(String(160))
    target: Mapped[int] = mapped_column(Integer)
    progress: Mapped[int] = mapped_column(Integer, default=0)
    reward_xp: Mapped[int] = mapped_column(Integer, default=25)
    period_start: Mapped[date] = mapped_column(Date)
    completed: Mapped[bool] = mapped_column(Boolean, default=False)
    claimed: Mapped[bool] = mapped_column(Boolean, default=False)


class Achievement(Base):
    __tablename__ = "achievements"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(60), unique=True)
    title: Mapped[str] = mapped_column(String(120))
    description: Mapped[str] = mapped_column(String(300))
    xp: Mapped[int] = mapped_column(Integer, default=50)
    unlocked_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class Card(Base):
    __tablename__ = "cards"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(60), unique=True)
    name: Mapped[str] = mapped_column(String(120))
    rarity: Mapped[str] = mapped_column(String(20), default="comum")
    description: Mapped[str] = mapped_column(String(400))
    history: Mapped[str] = mapped_column(Text, default="")
    phase_unlock: Mapped[int] = mapped_column(Integer, default=1)
    unlocked_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    art_seed: Mapped[int] = mapped_column(Integer, default=0)


class Note(Base):
    __tablename__ = "notes"

    id: Mapped[int] = mapped_column(primary_key=True)
    subject_id: Mapped[int | None] = mapped_column(ForeignKey("subjects.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(200))
    content: Mapped[str] = mapped_column(Text, default="")
    note_type: Mapped[str] = mapped_column(String(30), default="texto")
    source_file: Mapped[str] = mapped_column(String(200), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Quote(Base):
    __tablename__ = "quotes"

    id: Mapped[int] = mapped_column(primary_key=True)
    text: Mapped[str] = mapped_column(Text)
    occasion: Mapped[str] = mapped_column(String(40), default="dia")  # dia / crise / fase1..5 / rank


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True)
    type: Mapped[str] = mapped_column(String(30))
    title: Mapped[str] = mapped_column(String(160))
    body: Mapped[str] = mapped_column(Text, default="")
    at: Mapped[datetime] = mapped_column(DateTime)
    read: Mapped[bool] = mapped_column(Boolean, default=False)


class Exam(Base):
    __tablename__ = "exams"

    id: Mapped[int] = mapped_column(primary_key=True)
    institution: Mapped[str] = mapped_column(String(20))  # ENEM / FUVEST / UNICAMP / UNESP
    name: Mapped[str] = mapped_column(String(160))
    year: Mapped[int] = mapped_column(Integer)
    questions_json: Mapped[str] = mapped_column(Text, default="[]")
    suggested_minutes: Mapped[int] = mapped_column(Integer, default=90)


class ExamResult(Base):
    __tablename__ = "exam_results"

    id: Mapped[int] = mapped_column(primary_key=True)
    exam_id: Mapped[int] = mapped_column(ForeignKey("exams.id"))
    date: Mapped[date] = mapped_column(Date)
    answers: Mapped[str] = mapped_column(Text, default="{}")  # {question_id: option}
    score: Mapped[int] = mapped_column(Integer, default=0)
    total: Mapped[int] = mapped_column(Integer, default=0)
    seconds: Mapped[int] = mapped_column(Integer, default=0)
    wrong_topics: Mapped[str] = mapped_column(Text, default="[]")
