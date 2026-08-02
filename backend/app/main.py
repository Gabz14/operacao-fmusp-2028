import json
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from . import db as dbmod
from .seed import init_db
from .routers import (
    dashboard, user, cronograma, flashcards, estudo,
    estatisticas, biblioteca, redacao, provas, rpg, crise, config, ia, backup,
)

FRONTEND_DIST = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    seed_sample_exam()
    yield


def seed_sample_exam():
    """Prova de exemplo (5 questões) para o módulo Provas funcionar desde o início."""
    from .models import Exam
    db = dbmod.SessionLocal()
    try:
        if db.query(Exam).count() == 0:
            questions = [
                {
                    "id": 1, "subject": "Matemática", "topic": "Probabilidade",
                    "text": "Uma urna contém 4 bolas vermelhas e 6 bolas azuis. Retirando uma bola ao acaso, qual a probabilidade de ela ser vermelha?",
                    "options": ["20%", "40%", "60%", "80%", "100%"], "answer": "B",
                },
                {
                    "id": 2, "subject": "Biologia", "topic": "Ecologia",
                    "text": "Em uma cadeia alimentar, os organismos que produzem seu próprio alimento por fotossíntese são chamados de:",
                    "options": ["Consumidores primários", "Decompositores", "Produtores", "Consumidores secundários", "Predadores de topo"], "answer": "C",
                },
                {
                    "id": 3, "subject": "Física", "topic": "Cinemática",
                    "text": "Um carro parte do repouso com aceleração constante de 4 m/s². Qual a velocidade após 5 segundos?",
                    "options": ["5 m/s", "10 m/s", "15 m/s", "20 m/s", "25 m/s"], "answer": "D",
                },
                {
                    "id": 4, "subject": "Química", "topic": "Estequiometria",
                    "text": "Qual é a massa molar aproximada da água (H₂O)? Dados: H = 1 g/mol; O = 16 g/mol.",
                    "options": ["16 g/mol", "17 g/mol", "18 g/mol", "19 g/mol", "20 g/mol"], "answer": "C",
                },
                {
                    "id": 5, "subject": "Português", "topic": "Interpretação de texto",
                    "text": "Na frase 'A cidade acordou dourada esta manhã', a palavra 'dourada' tem função de:",
                    "options": ["Substantivo", "Verbo", "Advérbio", "Adjetivo", "Pronome"], "answer": "D",
                },
            ]
            db.add(Exam(institution="ENEM", name="Simulado de Exemplo — ENEM", year=2026,
                        questions_json=json.dumps(questions, ensure_ascii=False), suggested_minutes=30))
            db.commit()
    finally:
        db.close()


app = FastAPI(title="Operação FMUSP 2028", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (dashboard, user, cronograma, flashcards, estudo, estatisticas,
          biblioteca, redacao, provas, rpg, crise, config, ia, backup):
    app.include_router(r.router)


@app.get("/api/health")
def health():
    return {"status": "operacao-ativa", "nome": "Operação FMUSP 2028"}


if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{full_path:path}")
    def spa(full_path: str):
        if FRONTEND_DIST.exists():
            candidate = FRONTEND_DIST / full_path
            if full_path and candidate.is_file():
                return FileResponse(candidate)
            return FileResponse(FRONTEND_DIST / "index.html")
        return {"error": "frontend não compilado"}
