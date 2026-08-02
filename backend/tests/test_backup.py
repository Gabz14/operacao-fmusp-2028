"""Testes do módulo de backup (export/import/relatório)."""
import json
import os
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ["FMUSP_DB"] = os.path.join(tempfile.gettempdir(), "fmusp_test.db")
if os.path.exists(os.environ["FMUSP_DB"]):
    os.remove(os.environ["FMUSP_DB"])

from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402

from app.main import app as fastapi_app  # noqa: E402
from app import db as dbmod  # noqa: E402
from app import curriculum  # noqa: E402
import app.models  # noqa: E402,F401


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


class TestBackup:
    def setup_method(self):
        db = reset_db()
        seed_minimal(db)
        from app.services.scheduler import generate_all
        generate_all(db)
        self.client = TestClient(fastapi_app)

    def test_export_contem_todas_as_tabelas(self):
        subj_id = self.client.get("/api/flashcards/overview").json()["decks"][0]["subject_id"]
        self.client.post("/api/flashcards", json={
            "subject_id": subj_id, "front": "Q?", "back": "A!", "topic": "teste",
        })
        out = self.client.get("/api/backup/export").json()
        assert out["app"] == "operacao-fmusp-2028"
        for table in ("users", "subjects", "topics", "weeks", "week_items", "flashcards"):
            assert table in out["tables"]

    def test_roundtrip_restaura_estado(self):
        out = self.client.get("/api/backup/export").json()
        xp_antes = out["tables"]["users"][0]["xp"]

        weeks = self.client.get("/api/cronograma").json()["weeks"]
        item = next(w["items"] for w in weeks if w["items"])[0]
        r = self.client.post(f"/api/cronograma/items/{item['id']}/complete")
        assert r.json()["xp"] > 0
        xp_depois = self.client.get("/api/perfil").json()["user"]["xp"]
        assert xp_depois != xp_antes

        r = self.client.post("/api/backup/import", json={"data": json.dumps(out)})
        assert r.json() == {"ok": True}

        user = self.client.get("/api/perfil").json()["user"]
        assert user["xp"] == xp_antes

    def test_import_rejeita_arquivo_invalido(self):
        r = self.client.post("/api/backup/import", json={"data": '{"app": "outro-app"}'})
        assert r.json()["ok"] is False
        r2 = self.client.post("/api/backup/import", json={"data": "nao-json"})
        assert r2.json()["ok"] is False

    def test_relatorio_gera_html(self):
        r = self.client.get("/api/backup/relatorio")
        assert r.status_code == 200
        assert "<h2>" in r.json()["html"]
        assert "Gabi" in r.json()["html"]
