"""Gera frontend/src/lib/demo.ts com snapshots das rotas GET da API local.

Uso (com o servidor local rodando na 8000):
    python scripts/gen_demo.py
"""
import json
import urllib.request
from datetime import date
from pathlib import Path

API = "http://localhost:8000"
OUT = Path(__file__).resolve().parent.parent.parent / "frontend" / "src" / "lib" / "demo.ts"

ENDPOINTS = [
    "/api/dashboard", "/api/perfil", "/api/cronograma", "/api/cronograma/phases",
    "/api/missoes", "/api/flashcards/overview", "/api/flashcards/due",
    "/api/biblioteca", "/api/redacoes", "/api/provas", "/api/estatisticas",
    "/api/loja/items", "/api/ia/status", "/api/revisions/pending",
]


def main() -> None:
    data = {}
    for ep in ENDPOINTS:
        try:
            with urllib.request.urlopen(API + ep, timeout=10) as r:
                data[ep] = json.loads(r.read().decode())
        except Exception as e:
            print(f"FALHOU {ep}: {e}")
    if not data:
        raise SystemExit("nenhum endpoint respondendo — servidor local está rodando?")

    ts = [
        "// Dados de demonstracao — snapshot gerado em " + date.today().isoformat(),
        "// Usados quando a API nao esta disponivel (ex: Cloudflare Pages sem backend).",
        "// Fonte: backend local. Regenerar com: cd backend && ../.venv/bin/python scripts/gen_demo.py",
        "",
        "export const DEMO_API: Record<string, unknown> = {",
    ]
    for ep in sorted(data):
        ts.append(f'  "{ep}": {json.dumps(data[ep], ensure_ascii=False, indent=1)},')
    ts.append("}")
    OUT.write_text("\n".join(ts))
    print(f"OK — {len(data)} endpoints em {OUT}")


if __name__ == "__main__":
    main()
