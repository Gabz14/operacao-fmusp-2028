import json
from datetime import date
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import User, Subject, Flashcard, Exam, Redacao, WeekItem, Week
from ..services import ai as ai_svc
from ..services import xp as xp_svc

router = APIRouter(prefix="/api/ia", tags=["ia"])


class KeyIn(BaseModel):
    key: str


class ChatIn(BaseModel):
    message: str


class ExplainIn(BaseModel):
    subject: str
    topic: str


class SolveIn(BaseModel):
    question: str


class ExercisesIn(BaseModel):
    subject: str
    topic: str
    qty: int = 5


class FlashcardsIn(BaseModel):
    subject_id: int
    topic: str
    qty: int = 8


class ExamIn(BaseModel):
    subject: str
    qty: int = 10


class ScanIn(BaseModel):
    image_b64: str
    intent: str = "resumo"


class PlanIn(BaseModel):
    wrong_topics: list[dict]


def _context(db: Session) -> str:
    user = db.query(User).first()
    wk = None
    from ..services.scheduler import current_week
    wk = current_week(db)
    pending = 0
    if wk:
        pending = sum(1 for i in wk.items if i.status == "pendente")
    today = date.today()
    return (
        f"Data: {today}. Dias até ENEM: {(user.enem_date - today).days}; até FUVEST: {(user.fuvest_date1 - today).days}. "
        f"XP: {user.xp} (nível {user.level}). Patente: {user.rank_slug}. Sequência: {user.streak} dias. "
        f"Questões resolvidas: {user.total_questions}. Horas: {round(user.total_minutes / 60, 1)}. "
        f"Redações: {user.total_redacoes}. Pendências da semana atual: {pending}."
    )


@router.get("/status")
def status(db: Session = Depends(get_db)):
    return {"available": ai_svc.available(db),
            "hint": "Configure a chave gratuita em aistudio.google.com/apikey"}


@router.post("/key")
def set_key(data: KeyIn, db: Session = Depends(get_db)):
    ai_svc.set_key(db, data.key)
    return {"ok": True, "available": ai_svc.available(db)}


@router.post("/chat")
def chat(data: ChatIn, db: Session = Depends(get_db)):
    if not ai_svc.available(db):
        return ai_svc.no_key_message()
    try:
        text = ai_svc.chat(db, data.message, _context(db))
        return {"ok": True, "text": text}
    except RuntimeError as e:
        return {"ok": False, "message": str(e)}


@router.post("/explicar")
def explicar(data: ExplainIn, db: Session = Depends(get_db)):
    if not ai_svc.available(db):
        return ai_svc.no_key_message()
    try:
        return {"ok": True, "text": ai_svc.explain_topic(db, data.subject, data.topic)}
    except RuntimeError as e:
        return {"ok": False, "message": str(e)}


@router.post("/resolver")
def resolver(data: SolveIn, db: Session = Depends(get_db)):
    if not ai_svc.available(db):
        return ai_svc.no_key_message()
    try:
        return {"ok": True, "text": ai_svc.solve_step_by_step(db, data.question)}
    except RuntimeError as e:
        return {"ok": False, "message": str(e)}


@router.post("/exercicios")
def exercicios(data: ExercisesIn, db: Session = Depends(get_db)):
    if not ai_svc.available(db):
        return ai_svc.no_key_message()
    try:
        return ai_svc.generate_exercises(db, data.subject, data.topic, data.qty)
    except RuntimeError as e:
        return {"ok": False, "message": str(e)}


@router.post("/flashcards")
def gerar_flashcards(data: FlashcardsIn, db: Session = Depends(get_db)):
    user = db.query(User).first()
    if not ai_svc.available(db):
        return ai_svc.no_key_message()
    subj = db.query(Subject).get(data.subject_id)
    if not subj:
        return {"ok": False, "message": "matéria não encontrada"}
    try:
        cards = ai_svc.generate_flashcards(db, subj.name, data.topic, data.qty)
        created = 0
        for c in cards:
            if c.get("front") and c.get("back"):
                db.add(Flashcard(subject_id=subj.id, front=c["front"], back=c["back"],
                                 topic=data.topic, due=date.today()))
                created += 1
        if created:
            xp = created * 2
            user.total_flashcards += 0
            xp_svc.award_xp(db, user, xp, "ia_flashcards")
        db.commit()
        return {"ok": True, "created": created, "xp": created * 2}
    except RuntimeError as e:
        return {"ok": False, "message": str(e)}


@router.post("/simulado")
def gerar_simulado(data: ExamIn, db: Session = Depends(get_db)):
    user = db.query(User).first()
    if not ai_svc.available(db):
        return ai_svc.no_key_message()
    try:
        result = ai_svc.generate_exam(db, data.subject, data.qty)
        exam = Exam(institution="IA", name=result.get("name", f"Simulado IA — {data.subject}"),
                    year=date.today().year,
                    questions_json=json.dumps(result["questions"], ensure_ascii=False),
                    suggested_minutes=data.qty * 3)
        db.add(exam)
        xp_svc.award_xp(db, user, 15, "ia_simulado")
        db.commit()
        return {"ok": True, "exam_id": exam.id, "xp": 15}
    except RuntimeError as e:
        return {"ok": False, "message": str(e)}


@router.post("/plano-revisao")
def plano_revisao(data: PlanIn, db: Session = Depends(get_db)):
    if not ai_svc.available(db):
        return ai_svc.no_key_message()
    try:
        return {"ok": True, "text": ai_svc.build_review_plan(db, data.wrong_topics)}
    except RuntimeError as e:
        return {"ok": False, "message": str(e)}


@router.post("/corrigir-redacao/{redacao_id}")
def corrigir_redacao(redacao_id: int, db: Session = Depends(get_db)):
    r = db.query(Redacao).get(redacao_id)
    if not r:
        return {"ok": False, "message": "redação não encontrada"}
    if not ai_svc.available(db):
        return ai_svc.no_key_message()
    try:
        result = ai_svc.correct_redacao(db, r.tema, r.texto)
        if result.get("ok"):
            r.comp1 = result["comp1"]; r.comp2 = result["comp2"]; r.comp3 = result["comp3"]
            r.comp4 = result["comp4"]; r.comp5 = result["comp5"]
            r.nota = result["nota"]
            r.correcao = result["feedback"]
            db.commit()
        return result
    except RuntimeError as e:
        return {"ok": False, "message": str(e)}


@router.post("/scan")
def scan(data: ScanIn, db: Session = Depends(get_db)):
    return ai_svc.scan_image(db, data.image_b64, data.intent)
