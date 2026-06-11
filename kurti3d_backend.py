"""
Kurti 3D — Backend Mirror (FastAPI)
====================================
Espelho lógico da calculadora de custos e do estoque de filamentos.
Lê e salva arquivos JSON locais (produtos.json, vendas.json, filamentos.json).
Futuro: conectar ao Supabase.

Run:
    pip install fastapi uvicorn
    uvicorn kurti3d_backend:app --reload --port 8080
"""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ─── App setup ──────────────────────────────────────────────────────────────

app = FastAPI(title="Kurti 3D Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(exist_ok=True)

PRODUTOS_FILE = DATA_DIR / "produtos.json"
VENDAS_FILE = DATA_DIR / "vendas.json"
FILAMENTOS_FILE = DATA_DIR / "filamentos.json"

# ─── Constants (Bambu Lab A1) ───────────────────────────────────────────────

CONSUMO_A1_KW = 0.095  # Consumo da impressora em kW
TARIFA_ENERGIA = 0.75  # R$ por kWh
DEPRECIACAO_HORA = 0.70  # R$ por hora de uso
CUSTO_FIXO_UNIDADE = 0.20  # Correntes + cola

# ─── Pydantic models ────────────────────────────────────────────────────────


class ProjetoInput(BaseModel):
    nome: str = Field(..., min_length=1, max_length=100)
    categoria: str
    custo_rol_o: float = Field(..., gt=0, description="Custo do rolo em R$")
    peso_rolo: float = Field(..., gt=0, description="Peso do rolo em gramas")
    peso_peca: float = Field(..., gt=0, description="Peso da peça em gramas")
    tempo_min: float = Field(..., ge=0, description="Tempo de impressão em minutos")
    quantidade: int = Field(..., ge=1)
    preco_venda: float = Field(..., ge=0)
    filamento_id: Optional[str] = None


class Projeto(ProjetoInput):
    id: str


class Venda(BaseModel):
    id: str
    order_id: str
    project: str
    client: str
    valor: float
    custo: float
    depreciacao: float
    data: str


class Filamento(BaseModel):
    id: str
    nome: str
    peso_inicial: float
    peso_atual: float
    preco_pago: float


class CustoResultado(BaseModel):
    custo_filamento: float
    custo_energia: float
    custo_depreciacao: float
    custo_fixo: float
    custo_unidade: float
    custo_lote: float
    receita_total: float
    lucro_liquido: float


# ─── JSON helpers ───────────────────────────────────────────────────────────


def _load_json(path: Path, default: list) -> list:
    if path.exists():
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return default


def _save_json(path: Path, data: list) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def _load_produtos() -> list[dict]:
    return _load_json(PRODUTOS_FILE, [])


def _save_produtos(data: list[dict]) -> None:
    _save_json(PRODUTOS_FILE, data)


def _load_vendas() -> list[dict]:
    return _load_json(VENDAS_FILE, [])


def _save_vendas(data: list[dict]) -> None:
    _save_json(VENDAS_FILE, data)


def _seed_filamentos() -> list[dict]:
    return [
        {"id": "cyan", "nome": "Filamento PLA Cyan", "peso_inicial": 1000, "peso_atual": 1000, "preco_pago": 120.00},
        {"id": "magenta", "nome": "Filamento PLA Magenta", "peso_inicial": 1000, "peso_atual": 1000, "preco_pago": 120.00},
        {"id": "yellow", "nome": "Filamento PLA Yellow", "peso_inicial": 1000, "peso_atual": 1000, "preco_pago": 120.00},
    ]


def _load_filamentos() -> list[dict]:
    data = _load_json(FILAMENTOS_FILE, [])
    if not data:
        data = _seed_filamentos()
        _save_filamentos(data)
    return data


def _save_filamentos(data: list[dict]) -> None:
    _save_json(FILAMENTOS_FILE, data)


# ─── Calculator (mirror of store.ts calc) ───────────────────────────────────


def calcular_custo(
    custo_rolo: float,
    peso_rolo: float,
    peso_peca: float,
    tempo_min: float,
    quantidade: int,
    preco_venda: float,
) -> dict:
    """
    Calcula custos reais da Bambu Lab A1.

    Custo do Filamento = (custo_rolo / peso_rolo) * peso_peca
    Custo de Energia    = (tempo_min / 60) * 0.095 * 0.75
    Custo de Depreciacao= (tempo_min / 60) * 0.70
    Custo Fixo          = 0.20 (correntes + cola)
    """
    custo_filamento = (custo_rolo / peso_rolo) * peso_peca if peso_rolo > 0 else 0.0
    custo_energia = (tempo_min / 60) * CONSUMO_A1_KW * TARIFA_ENERGIA
    custo_depreciacao = (tempo_min / 60) * DEPRECIACAO_HORA
    custo_fixo = CUSTO_FIXO_UNIDADE

    custo_unidade = custo_filamento + custo_energia + custo_depreciacao + custo_fixo
    custo_lote = custo_unidade * quantidade
    receita_total = preco_venda * quantidade
    lucro_liquido = receita_total - custo_lote

    return {
        "custo_filamento": round(custo_filamento, 4),
        "custo_energia": round(custo_energia, 4),
        "custo_depreciacao": round(custo_depreciacao, 4),
        "custo_fixo": custo_fixo,
        "custo_unidade": round(custo_unidade, 4),
        "custo_lote": round(custo_lote, 4),
        "receita_total": round(receita_total, 4),
        "lucro_liquido": round(lucro_liquido, 4),
    }


# ─── Routes: Produtos (Portfólio) ───────────────────────────────────────────


@app.get("/api/produtos", response_model=list[Projeto])
def listar_produtos():
    """Lista todos os projetos salvos no portfólio."""
    return _load_produtos()


@app.post("/api/produtos", response_model=Projeto, status_code=201)
def salvar_projeto(input: ProjetoInput):
    """
    Salva um novo projeto no portfólio.
    Abate o estoque de filamento (peso_peca * quantidade) e retorna o cálculo completo.
    """
    # Calculate costs
    calc = calcular_custo(
        input.custo_rol_o, input.peso_rolo, input.peso_peca,
        input.tempo_min, input.quantidade, input.preco_venda,
    )

    # Deduct filament stock
    if input.filamento_id:
        filamentos = _load_filamentos()
        gramas = input.peso_peca * input.quantidade
        for f in filamentos:
            if f["id"] == input.filamento_id:
                f["peso_atual"] = max(0, f["peso_atual"] - gramas)
                break
        _save_filamentos(filamentos)

    # Save project
    project = {
        "id": str(uuid.uuid4()),
        "nome": input.nome,
        "categoria": input.categoria,
        "custo_rol_o": input.custo_rol_o,
        "peso_rolo": input.peso_rolo,
        "peso_peca": input.peso_peca,
        "tempo_min": input.tempo_min,
        "quantidade": input.quantidade,
        "preco_venda": input.preco_venda,
        "filamento_id": input.filamento_id,
    }
    produtos = _load_produtos()
    produtos.insert(0, project)
    _save_produtos(produtos)

    return project


@app.delete("/api/produtos/{projeto_id}")
def remover_projeto(projeto_id: str):
    """Remove um projeto do portfólio."""
    produtos = _load_produtos()
    filtered = [p for p in produtos if p["id"] != projeto_id]
    if len(filtered) == len(produtos):
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    _save_produtos(filtered)
    return {"ok": True}


# ─── Routes: Vendas ─────────────────────────────────────────────────────────


@app.get("/api/vendas", response_model=list[Venda])
def listar_vendas():
    """Lista o histórico de vendas."""
    return _load_vendas()


@app.post("/api/vendas", response_model=Venda, status_code=201)
def registrar_venda(order_id: str, project: str, client: str, valor: float):
    """
    Registra uma venda. Calcula custo estimado e armazena depreciacao separada.
    """
    tempo_h = 1.0  # Default estimate: 1 hour
    energia = tempo_h * CONSUMO_A1_KW * TARIFA_ENERGIA
    depreciacao = tempo_h * DEPRECIACAO_HORA
    filamento = (120 / 1000) * 5 * 1  # Assume 1 unit, 5g, R$120/kg
    fixo = 0.20
    custo = filamento + energia + depreciacao + fixo

    venda = {
        "id": str(uuid.uuid4()),
        "order_id": order_id,
        "project": project,
        "client": client,
        "valor": valor,
        "custo": round(custo, 4),
        "depreciacao": round(depreciacao, 4),
        "data": datetime.now(timezone.utc).isoformat(),
    }
    vendas = _load_vendas()
    vendas.insert(0, venda)
    _save_vendas(vendas)
    return venda


# ─── Routes: Filamentos (Estoque) ───────────────────────────────────────────


@app.get("/api/filamentos", response_model=list[Filamento])
def listar_filamentos():
    """Lista o estoque atual de filamentos."""
    return _load_filamentos()


@app.post("/api/filamentos/abater")
def abater_estoque(filamento_id: str, gramas: float):
    """
    Subtrai gramas do peso_atual do filamento especificado.
    Espelha a função abaterEstoqueFilamento do store.ts.
    """
    filamentos = _load_filamentos()
    found = False
    for f in filamentos:
        if f["id"] == filamento_id:
            f["peso_atual"] = max(0, f["peso_atual"] - gramas)
            found = True
            break
    if not found:
        raise HTTPException(status_code=404, detail="Filamento não encontrado")
    _save_filamentos(filamentos)
    return {"ok": True, "filamento_id": filamento_id, "gramas_abatidas": gramas}


@app.post("/api/filamentos", status_code=201)
def adicionar_filamento(nome: str, peso_inicial: float = 1000, preco_pago: float = 120.00):
    """Adiciona um novo rolo de filamento ao estoque."""
    filamentos = _load_filamentos()
    novo = {
        "id": str(uuid.uuid4())[:8],
        "nome": nome,
        "peso_inicial": peso_inicial,
        "peso_atual": peso_inicial,
        "preco_pago": preco_pago,
    }
    filamentos.append(novo)
    _save_filamentos(filamentos)
    return novo


# ─── Routes: Calculadora (standalone) ───────────────────────────────────────


@app.post("/api/calcular", response_model=CustoResultado)
def calcular(input: ProjetoInput):
    """
    Endpoint standalone da calculadora.
    Retorna todos os custos sem salvar nada.
    """
    result = calcular_custo(
        input.custo_rol_o, input.peso_rolo, input.peso_peca,
        input.tempo_min, input.quantidade, input.preco_venda,
    )
    return result


# ─── Routes: Dashboard ──────────────────────────────────────────────────────


@app.get("/api/dashboard")
def dashboard():
    """
    Resumo geral — espelho do Painel admin.
    """
    vendas = _load_vendas()
    filamentos = _load_filamentos()

    receita = sum(v["valor"] for v in vendas)
    custo_total = sum(v["custo"] for v in vendas)
    lucro = receita - custo_total
    depreciacao_acumulada = sum(v["depreciacao"] for v in vendas)

    return {
        "receita": round(receita, 2),
        "custo_total": round(custo_total, 2),
        "lucro": round(lucro, 2),
        "depreciacao_acumulada": round(depreciacao_acumulada, 2),
        "total_vendas": len(vendas),
        "filamentos": filamentos,
    }


# ─── Health check ───────────────────────────────────────────────────────────


@app.get("/health")
def health():
    return {"status": "ok", "app": "Kurti 3D Backend", "version": "0.1.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080, reload=True)
