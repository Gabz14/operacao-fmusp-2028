"""Testes da degradação graciosa da IA (sem chave configurada)."""
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


class TestIA:
    def setup_method(self):
        db = reset_db()
        seed_minimal(db)
        self.client = TestClient(fastapi_app)

    def test_status_sem_chave(self):
        r = self.client.get("/api/ia/status")
        assert r.json()["available"] is False
        assert "aistudio" in r.json()["hint"]

    def test_chat_sem_chave_responde_ok_false(self):
        r = self.client.post("/api/ia/chat", json={"message": "oi"})
        body = r.json()
        assert body["ok"] is False
        assert "chave" in body["message"]

    def test_endpoints_sem_chave_nao_quebram(self):
        endpoints = [
            ("/api/ia/explicar", {"subject": "Física", "topic": "Cinemática"}),
            ("/api/ia/resolver", {"question": "2+2?"}),
            ("/api/ia/exercicios", {"subject": "Física", "topic": "Cinemática", "qty": 3}),
            ("/api/ia/flashcards", {"subject_id": 1, "topic": "teste", "qty": 3}),
            ("/api/ia/simulado", {"subject": "Física", "qty": 3}),
            ("/api/ia/plano-revisao", {"wrong_topics": [{"topic": "x", "subject": "y"}]}),
        ]
        for path, body in endpoints:
            r = self.client.post(path, json=body)
            assert r.json()["ok"] is False, f"{path} deveria falhar sem chave"

    def test_corrigir_redacao_inexistente(self):
        r = self.client.post("/api/ia/corrigir-redacao/999")
        assert r.json()["ok"] is False
        assert "não encontrada" in r.json()["message"]

    def test_scan_sem_chave(self):
        r = self.client.post("/api/ia/scan", json={"image_b64": "AAAA", "intent": "resumo"})
        body = r.json()
        assert body.get("ok") is False
        assert "chave" in body.get("message", "")
