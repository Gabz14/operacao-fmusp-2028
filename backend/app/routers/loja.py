import json
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import User

router = APIRouter(prefix="/api/loja", tags=["loja"])

ITEMS = {
    "tema_ouro": {"name": "Tema Ouro Neon", "desc": "Brilho dourado mais intenso em toda a interface.", "price": 300, "icon": "✨", "category": "tema"},
    "tema_noite": {"name": "Tema Noite Profunda", "desc": "Preto absoluto com contraste dourado.", "price": 250, "icon": "🌑", "category": "tema"},
    "avatar_lenda": {"name": "Avatar Lenda Urbana", "desc": "Avatar exclusivo para patentes Elite+.", "price": 800, "icon": "🦅", "category": "avatar"},
    "moldura_ouro": {"name": "Moldura Imperial", "desc": "Moldura dourada no seu cartão de perfil.", "price": 500, "icon": "🖼️", "category": "moldura"},
    "moldura_neon": {"name": "Moldura Neon", "desc": "Borda cibernética pulsante.", "price": 400, "icon": "🟡", "category": "moldura"},
    "card_secreto": {"name": "Carta Secreta da Cidade", "desc": "Uma carta lendária exclusiva da loja.", "price": 1500, "icon": "🗝️", "category": "cartao"},
    "wallpaper_cidade": {"name": "Wallpaper Cidade Dourada", "desc": "Plano de fundo da cidade acesa.", "price": 600, "icon": "🏙️", "category": "wallpaper"},
    "wallpaper_noite": {"name": "Wallpaper Noite do Portão", "desc": "O portão da FMUSP sob a lua.", "price": 600, "icon": "🌌", "category": "wallpaper"},
}


def owned_list(user: User) -> list[str]:
    try:
        return list(json.loads(user.owned_items or "[]"))
    except Exception:
        return []


@router.get("/items")
def items(db: Session = Depends(get_db)):
    user = db.query(User).first()
    return {"xp": user.xp, "owned": owned_list(user), "items": ITEMS}


class BuyIn(BaseModel):
    item_id: str


@router.post("/buy")
def buy(data: BuyIn, db: Session = Depends(get_db)):
    user = db.query(User).first()
    item = ITEMS.get(data.item_id)
    if not item:
        return {"ok": False, "message": "item não existe"}
    owned = owned_list(user)
    if data.item_id in owned:
        return {"ok": False, "message": "item já adquirido"}
    if user.xp < item["price"]:
        return {"ok": False, "message": f"faltam {item['price'] - user.xp} XP"}
    user.xp -= item["price"]
    owned.append(data.item_id)
    user.owned_items = json.dumps(owned)
    db.commit()
    return {"ok": True, "item": item, "xp": user.xp}
