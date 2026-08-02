"""Testes do núcleo da Operação FMUSP 2028."""
import os
import tempfile
from datetime import date, timedelta

import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ["FMUSP_DB"] = os.path.join(tempfile.gettempdir(), "fmusp_test.db")
if os.path.exists(os.environ["FMUSP_DB"]):
    os.remove(os.environ["FMUSP_DB"])

from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402

from app import db as dbmod  # noqa: E402
from app import curriculum  # noqa: E402
import app.models  # noqa: E402,F401  (registra as tabelas no metadata)


def reset_db():
    dbmod.engine.dispose()
    if os.path.exists(os.environ["FMUSP_DB"]):
        os.remove(os.environ["FMUSP_DB"])
    dbmod.engine = create_engine(
        f"sqlite:///{os.environ['FMUSP_DB']}", connect_args={"check_same_thread": False}
    )
    dbmod.SessionLocal = sessionmaker(bind=dbmod.engine, autoflush=False, expire_on_commit=False)
    dbmod.Base.metadata.create_all(dbmod.engine)
    return dbmod.SessionLocal()


def seed_minimal(db):
    from app.models import User, Subject, Topic
    if not db.query(User).first():
        db.add(User(name="Gabi"))
    if not db.query(Subject).first():
        for slug, name, icon, color, order in curriculum.SUBJECTS:
            db.add(Subject(slug=slug, name=name, icon=icon, color=color, order=order))
        db.flush()
        subs = {s.slug: s for s in db.query(Subject).all()}
        for slug, topics in curriculum.TOPICS.items():
            for i, t in enumerate(topics[:40]):
                db.add(Topic(subject_id=subs[slug].id, name=t, order=i,
                             weight=curriculum.SUBJECT_WEIGHT.get(slug, 3)))
    db.commit()


class TestScheduler:
    def setup_method(self):
        db = reset_db()
        seed_minimal(db)
        from app.services.scheduler import generate_all
        generate_all(db)
        self.db = db

    def test_weeks_coverage(self):
        from app.models import Week
        weeks = self.db.query(Week).all()
        assert len(weeks) >= 120
        first = weeks[0].start_date
        last = weeks[-1].end_date
        assert first == date(2026, 7, 6)
        assert last >= curriculum.PHASES[-1]["end"] - timedelta(days=7)

    def test_phase_boundaries(self):
        from app.models import Week
        weeks = self.db.query(Week).all()
        assert weeks[0].phase == 1
        assert weeks[-1].phase == 5
        for a, b in zip(weeks, weeks[1:]):
            assert a.end_date + timedelta(days=1) == b.start_date

    def test_week_has_items(self):
        from app.models import WeekItem
        count = self.db.query(WeekItem).count()
        assert count > 1000

    def test_simulado_presence(self):
        from app.models import WeekItem
        sims = self.db.query(WeekItem).filter(WeekItem.type == "simulado").count()
        assert sims > 20

    def test_redacoes_phase2_plus(self):
        from app.models import WeekItem
        reds = self.db.query(WeekItem).filter(WeekItem.type == "redacao").count()
        assert reds > 20

    def test_replan_moves_overdue(self):
        from app.models import Week, WeekItem
        from app.services.scheduler import replan, current_week
        wk = current_week(self.db)
        pending = sum(1 for w in self.db.query(Week).filter(Week.end_date < date.today()).all()
                      for i in w.items if i.status == "pendente")
        if pending:
            moved = replan(self.db)["moved"]
            assert moved == pending
            assert sum(1 for i in wk.items if i.status == "pendente") >= pending

    def test_content_consumes_all_topics(self):
        from app.models import Subject
        for s in self.db.query(Subject).all():
            assert s.topic_index <= len(s.topics)


class TestSRS:
    def setup_method(self):
        db = reset_db()
        from app.models import User, Subject, Flashcard
        db.add(User(name="Gabi"))
        db.add(Subject(slug="mat", name="Matemática", order=1))
        db.commit()
        self.db = db
        self.subj = db.query(Subject).first()
        self.card = Flashcard(subject_id=self.subj.id, front="P", back="R", due=date.today())
        db.add(self.card)
        db.commit()

    def test_intervals_grow(self):
        from app.services.srs import apply_review
        apply_review(self.card, "muito_facil")
        assert self.card.interval_days == 1
        apply_review(self.card, "muito_facil")
        assert self.card.interval_days == 3
        apply_review(self.card, "muito_facil")
        assert self.card.interval_days >= 4
        before = self.card.interval_days
        apply_review(self.card, "facil")
        assert self.card.interval_days >= before

    def test_lapse_resets(self):
        from app.services.srs import apply_review
        apply_review(self.card, "muito_facil")
        apply_review(self.card, "muito_facil")
        apply_review(self.card, "muito_facil")
        apply_review(self.card, "esqueci")
        assert self.card.lapses == 1
        assert self.card.interval_days == 0
        assert self.card.due == date.today()

    def test_ratings_map(self):
        from app.services.srs import RATINGS
        assert RATINGS["esqueci"] == 0
        assert RATINGS["dificil"] == 1
        assert RATINGS["facil"] == 2
        assert RATINGS["muito_facil"] == 3


class TestAPI:
    def setup_method(self):
        reset_db()
        from app.seed import init_db
        init_db()
        from app.main import app
        self.client = TestClient(app)
        self.client.__enter__()

    def teardown_method(self):
        try:
            self.client.__exit__(None, None, None)
        except Exception:
            pass

    def test_health(self):
        r = self.client.get("/api/health")
        assert r.status_code == 200
        assert r.json()["status"] == "operacao-ativa"

    def test_dashboard_shape(self):
        r = self.client.get("/api/dashboard")
        assert r.status_code == 200
        d = r.json()
        assert d["greeting"]["name"] == "Gabi"
        assert "enem" in d["days"] and "fuvest" in d["days"]
        assert d["rpg"]["rank_name"] == "Recruta"
        assert d["phase"]["num"] == 1
        assert len(d["missions"]["diaria"]) >= 3
        assert d["week"]["id"] is not None

    def test_xp_flow(self):
        r = self.client.post("/api/pomodoros", json={"minutes": 25, "mode": "25/5"})
        assert r.json()["xp"] == 10
        r = self.client.post("/api/questions", json={"subject_id": 1, "qty": 30, "correct": 25})
        assert r.json()["total_questions"] == 30
        d = self.client.get("/api/dashboard").json()
        assert d["rpg"]["xp"] >= 10
        assert d["rpg"]["streak"] == 1

    def test_cronograma_endpoint(self):
        r = self.client.get("/api/cronograma")
        assert r.status_code == 200
        assert len(r.json()["weeks"]) >= 120

    def test_complete_item(self):
        d = self.client.get("/api/dashboard").json()
        item_id = d["week"]["items"][0]["id"]
        r = self.client.post(f"/api/cronograma/items/{item_id}/complete")
        assert r.status_code == 200
        assert r.json()["xp"] >= 0

    def test_redacao(self):
        r = self.client.post("/api/redacoes", json={"tema": "Inteligência artificial e educação"})
        assert r.json()["xp"] == 50

    def test_prova_submit(self):
        r = self.client.post("/api/provas/1/submit", json={"answers": {"1": "B", "2": "C"}, "seconds": 120})
        d = r.json()
        assert d["total"] == 5
        assert 0 <= d["score"] <= 5

    def test_flashcards_flow(self):
        r = self.client.post("/api/flashcards", json={"subject_id": 1, "front": "Q", "back": "A", "topic": "t"})
        cid = r.json()["id"]
        r = self.client.post(f"/api/flashcards/{cid}/review", json={"rating": "facil"})
        assert r.json()["interval_days"] == 1
        r = self.client.get("/api/flashcards/overview")
        assert r.json()["due_total"] >= 0

    def test_perfil(self):
        r = self.client.get("/api/perfil")
        d = r.json()
        assert d["user"]["name"] == "Gabi"
        assert len(d["achievements"]) >= 10
        assert len(d["cards"]) >= 10

    def test_estatisticas(self):
        r = self.client.get("/api/estatisticas")
        d = r.json()
        assert "minutes_by_day" in d
        assert "top_subject" in d
