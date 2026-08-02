"""Assistente IA — Google Gemini (camada gratuita do AI Studio).

Sem chave configurada, todas as funções retornam orientação amigável
(sem quebrar o app).
"""
import json
import re
import urllib.request
import urllib.error
from datetime import date

MODEL = "gemini-2.0-flash"
BASE = "https://generativelanguage.googleapis.com/v1beta/models"
TIMEOUT = 90

SYSTEM_PROMPT = """Você é a operadora central da "Operação FMUSP 2028", um sistema de estudos
de uma estudante brasileira (Gabi) rumo à aprovação em Medicina na FMUSP (ENEM 2028 e FUVEST 2028).
Estilo: direto, técnico e motivador, em português brasileiro, sem frases genéricas.
Use linguagem de "cidade/operação" (distritos, missões, mapa) só quando natural.
Responda com profundidade, clareza e passo a passo quando pedido."""


def get_key(db=None) -> str:
    import os
    key = os.environ.get("GEMINI_API_KEY", "")
    if not key and db is not None:
        from ..models import User
        user = db.query(User).first()
        if user:
            import json as _json
            try:
                settings = _json.loads(user.settings_json or "{}")
                key = settings.get("gemini_key", "")
            except Exception:
                key = ""
    return key


def set_key(db, key: str) -> None:
    import json as _json
    from ..models import User
    user = db.query(User).first()
    if user:
        settings = _json.loads(user.settings_json or "{}")
        settings["gemini_key"] = key.strip()
        user.settings_json = _json.dumps(settings, ensure_ascii=False)
        db.commit()


def available(db) -> bool:
    return bool(get_key(db))


def _call(db, prompt: str, temperature: float = 0.6, json_mode: bool = False) -> str:
    key = get_key(db)
    if not key:
        return ""
    url = f"{BASE}/{MODEL}:generateContent?key={key}"
    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": temperature,
            "maxOutputTokens": 8192,
        },
    }
    if json_mode:
        body["generationConfig"]["responseMimeType"] = "application/json"
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            data = json.loads(resp.read().decode())
        parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
        return "".join(p.get("text", "") for p in parts).strip()
    except urllib.error.HTTPError as e:
        detail = e.read().decode()[:300]
        raise RuntimeError(f"IA indisponível ({e.code}): {detail}")
    except Exception as e:
        raise RuntimeError(f"Falha de conexão com a IA: {e}")


def _json_response(db, prompt: str) -> dict:
    text = _call(db, prompt, temperature=0.4, json_mode=True)
    if not text:
        return {}
    try:
        return json.loads(text)
    except Exception:
        m = re.search(r"\{.*\}", text, re.S)
        if m:
            return json.loads(m.group(0))
        return {"raw": text}


def no_key_message() -> dict:
    return {
        "ok": False,
        "message": ("O Assistente IA precisa de uma chave gratuita do Google AI Studio.\n\n"
                    "1. Acesse aistudio.google.com/apikey\n"
                    "2. Crie uma API key (camada gratuita)\n"
                    "3. Configure em Perfil → configurar IA (ou envie GEMINI_API_KEY no servidor).\n\n"
                    "Sem a chave, todo o resto da operação continua funcionando."),
    }


def chat(db, message: str, context: str = "") -> str:
    prompt = f"""{SYSTEM_PROMPT}

CONTEXTO DA OPERAÇÃO (dados atuais):
{context[:2000]}

GABI PERGUNTOU: {message}"""
    return _call(db, prompt, temperature=0.7) or "..."

def explain_topic(db, subject: str, topic: str) -> str:
    prompt = f"""{SYSTEM_PROMPT}

Explique de forma clara e completa o conteúdo: {topic} (matéria: {subject}),
no nível do ENEM e da FUVEST. Inclua:
- ideia central em 1 frase
- explicação detalhada com exemplos
- o que mais cai em prova
- 2 exercícios rápidos com resolução passo a passo"""
    return _call(db, prompt) or "..."

def solve_step_by_step(db, question: str) -> str:
    prompt = f"""{SYSTEM_PROMPT}

Resolva passo a passo a questão abaixo, explicando o raciocínio em cada etapa
e indicando a resposta final. Se houver alternativas, mostre por que as erradas são erradas.

QUESTÃO: {question}"""
    return _call(db, prompt) or "..."

def generate_exercises(db, subject: str, topic: str, qty: int = 5) -> dict:
    data = _json_response(db, f"""{SYSTEM_PROMPT}
Gere {qty} questões de múltipla escolha estilo ENEM/FUVEST sobre "{topic}" (matéria: {subject}).
Retorne APENAS JSON no formato:
{{"questions": [{{"topic": "...", "text": "...", "options": ["A", "B", "C", "D", "E"], "answer": "A", "explanation": "..."}}]}}
Todas as opções corretas e plausíveis; answer deve ser a letra correta.""")
    qs = data.get("questions", [])
    for q in qs:
        if "subject" not in q:
            q["subject"] = subject
    return {"ok": True, "questions": qs}

def generate_flashcards(db, subject: str, topic: str, qty: int = 8) -> list:
    data = _json_response(db, f"""{SYSTEM_PROMPT}
Crie {qty} flashcards de estudo de alta qualidade sobre "{topic}" (matéria: {subject}).
Regra: frente = pergunta/conceito curto; verso = resposta precisa e completa.
Retorne APENAS JSON: {{"cards": [{{"front": "...", "back": "..."}}]}}""")
    return data.get("cards", [])

def generate_exam(db, subject: str, qty: int = 10) -> dict:
    data = _json_response(db, f"""{SYSTEM_PROMPT}
Crie um minisimulado estilo ENEM/FUVEST com {qty} questões de "{subject}".
Retorne APENAS JSON:
{{"name": "título", "questions": [{{"topic": "...", "text": "...", "options": ["A","B","C","D","E"], "answer": "A"}}]}}""")
    qs = data.get("questions", [])
    for q in qs:
        q["subject"] = subject
        q["id"] = q.get("id", abs(hash(q["text"])) % 10_000_000)
    return {"ok": True, "name": data.get("name", f"Simulado IA — {subject}"), "questions": qs}

def build_review_plan(db, wrong_topics: list[dict]) -> str:
    prompt = f"""{SYSTEM_PROMPT}

Monte um plano de revisão de 7 dias para recuperar os assuntos abaixo (errados em simulado):
{json.dumps(wrong_topics[:15], ensure_ascii=False)}
Para cada assunto: técnica de estudo sugerida, quantas questões por dia, quando revisar (dia X).
Formato: lista simples e prática, direta."""
    return _call(db, prompt) or "..."

def correct_redacao(db, tema: str, texto: str) -> dict:
    data = _json_response(db, f"""{SYSTEM_PROMPT}
Você é corretor oficial da redação do ENEM. Corrija a redação abaixo sobre: "{tema}"

REDAÇÃO:
{texto[:4500]}

Avalie cada competência de 0 a 200 e retorne APENAS JSON:
{{"comp1": 0-200, "comp2": 0-200, "comp3": 0-200, "comp4": 0-200, "comp5": 0-200,
 "nota": soma, "feedback": "análise detalhada: pontos fortes, problemas por competência, o que fazer para subir a nota"}}""")
    comps = [data.get("comp1"), data.get("comp2"), data.get("comp3"), data.get("comp4"), data.get("comp5")]
    if all(isinstance(c, (int, float)) for c in comps):
        data["nota"] = data.get("nota") or sum(comps)
        return {"ok": True, **data}
    return {"ok": False, "message": "A IA não conseguiu avaliar esta redação. Tente novamente.", "nota": 0}

def motivate(db) -> str:
    from .xp import quote_of
    return quote_of(db, "dia")

def scan_image(db, b64_image: str, intent: str = "resumo") -> dict:
    """Foto de caderno/livro/quadro → resumo, flashcards ou questões (Gemini vision)."""
    prompt = f"""{SYSTEM_PROMPT}
A imagem abaixo é uma foto de material de estudo (caderno, livro ou quadro).
Converta o conteúdo em: {"um resumo organizado por tópicos" if intent == "resumo" else "10 flashcards de estudo"}.
Responda em português, mantendo fidelidade ao conteúdo da imagem."""
    key = get_key(db)
    if not key:
        return no_key_message()
    url = f"{BASE}/{MODEL}:generateContent?key={key}"
    body = {
        "contents": [{
            "parts": [
                {"text": prompt},
                {"inline_data": {"mime_type": "image/jpeg", "data": b64_image}},
            ]
        }],
        "generationConfig": {"temperature": 0.3, "maxOutputTokens": 4096},
    }
    req = urllib.request.Request(url, data=json.dumps(body).encode(), headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            data = json.loads(resp.read().decode())
        parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
        text = "".join(p.get("text", "") for p in parts).strip()
        return {"ok": True, "text": text}
    except urllib.error.HTTPError as e:
        return {"ok": False, "message": f"IA indisponível ({e.code})"}
    except Exception as e:
        return {"ok": False, "message": f"Falha: {e}"}
