import json
from datetime import date
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import User, Exam, ExamResult, Subject
from ..services import xp as xp_svc

router = APIRouter(prefix="/api", tags=["provas"])


class ResultIn(BaseModel):
    answers: dict[str, str]
    seconds: int = 0


@router.get("/provas")
def provas(db: Session = Depends(get_db)):
    exams = db.query(Exam).all()
    results = db.query(ExamResult).all()
    return {
        "exams": [{"id": e.id, "institution": e.institution, "name": e.name,
                   "year": e.year, "questions": len(json.loads(e.questions_json)),
                   "suggested_minutes": e.suggested_minutes} for e in exams],
        "results": [{"id": r.id, "exam_id": r.exam_id, "date": r.date.isoformat(),
                     "score": r.score, "total": r.total,
                     "seconds": r.seconds, "wrong_topics": json.loads(r.wrong_topics)}
                    for r in results],
    }


@router.get("/provas/{exam_id}")
def exam_detail(exam_id: int, db: Session = Depends(get_db)):
    e = db.query(Exam).get(exam_id)
    if not e:
        return {"error": "prova não encontrada"}, 404
    questions = json.loads(e.questions_json)
    subjects = {s.id: s for s in db.query(Subject).all()}
    return {
        "id": e.id, "institution": e.institution, "name": e.name, "year": e.year,
        "suggested_minutes": e.suggested_minutes,
        "questions": [{
            "id": q["id"], "subject": q.get("subject"), "topic": q.get("topic"),
            "text": q["text"], "options": q["options"],
            "subject_name": subjects.get(q.get("subject_id"), "").name if q.get("subject_id") else q.get("subject", ""),
        } for q in questions],
    }


@router.post("/provas/{exam_id}/submit")
def submit(exam_id: int, data: ResultIn, db: Session = Depends(get_db)):
    e = db.query(Exam).get(exam_id)
    if not e:
        return {"error": "prova não encontrada"}, 404
    user = db.query(User).first()
    questions = json.loads(e.questions_json)
    score = 0
    wrong = []
    by_q = {str(q["id"]): q for q in questions}
    for qid, opt in data.answers.items():
        q = by_q.get(str(qid))
        if not q:
            continue
        if opt == q["answer"]:
            score += 1
        else:
            wrong.append({"topic": q.get("topic", ""), "subject": q.get("subject", ""),
                          "correct": q["answer"], "you": opt})
    total = len(questions)
    xp = xp_svc.XP_SIMULADO + score * 5
    result = ExamResult(exam_id=exam_id, date=date.today(),
                        answers=json.dumps(data.answers), score=score, total=total,
                        seconds=data.seconds, wrong_topics=json.dumps(wrong))
    db.add(result)
    user.total_questions += total
    user.total_correct += score
    xp_svc.touch_streak(db, user)
    xp_svc.award_xp(db, user, xp, "simulado")
    xp_svc.mission_progress(db, "simulado", 1)
    xp_svc.mission_progress(db, "questoes", total)
    db.commit()
    return {"score": score, "total": total, "xp": xp,
            "percent": round(score / max(1, total) * 100, 1),
            "wrong": wrong,
            "message": "Simulado registrado. As questões erradas viraram alvos da sua próxima revisão."}
