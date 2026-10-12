"""Folgas automáticas (e travadas pelo usuário)."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Callable


@dataclass(frozen=True)
class FolgaDef:
    chave: str
    nome: str
    minimo: float
    maximo: float
    auto: Callable[[dict], float]
    dica: str = ""


def _topo_caixa(ctx: dict) -> float:
    vao = ctx.get("vao_gaveta")
    if vao is not None and vao < 150:
        return 15.0
    return 25.0


DEFINICOES: list[FolgaDef] = [
    FolgaDef("entre_frentes", "Entre frentes", 1, 6, lambda c: 3.0),
    FolgaDef("contorno_embutida", "Frente embutida (contorno)", 1, 5, lambda c: 2.0),
    FolgaDef("lateral_corredica", "Lateral da corrediça (por lado)", 0, 30,
             lambda c: c.get("lateral_corredica", 12.7), "vem do catálogo"),
    FolgaDef("topo_caixa", "Topo da caixa no vão", 10, 60, _topo_caixa,
             "25 mm (vãos ≥ 150 mm) ou 15 mm"),
    FolgaDef("fundo_caixa", "Fundo da caixa no vão", 5, 40, lambda c: 15.0),
    FolgaDef("traseira_corredica", "Traseira da corrediça", 5, 50, lambda c: 10.0),
    FolgaDef("rasgo_prof", "Rasgo do fundo (profundidade)", 5, 12, lambda c: 8.0),
    FolgaDef("rasgo_dist", "Rasgo do fundo (distância da traseira)", 5, 30, lambda c: 10.0),
    FolgaDef("rasgo_sobra", "Encaixe do fundo no rasgo (sobra)", 0, 3, lambda c: 1.0),
    FolgaDef("prat_largura", "Prateleira solta (largura)", 0, 5, lambda c: 2.0),
    FolgaDef("prat_recuo", "Prateleira (recuo frontal)", 0, 80, lambda c: 20.0),
    FolgaDef("recuo_rodape", "Recuo do rodapé", 0, 100, lambda c: 30.0),
    FolgaDef("kerf", "Serra (kerf) no otimizador", 2, 6, lambda c: 4.0),
    FolgaDef("refilo", "Refilo da chapa (por borda)", 0, 20, lambda c: 10.0),
]

POR_CHAVE = {d.chave: d for d in DEFINICOES}


class Folgas:
    """Resolve cada folga: valor travado pelo usuário ou cálculo automático."""

    def __init__(self, travadas: dict | None = None, lateral_corredica: float = 12.7):
        self.travadas = dict(travadas or {})
        self.ctx_base = {"lateral_corredica": lateral_corredica}

    def automatico(self, chave: str, **ctx) -> float:
        return POR_CHAVE[chave].auto({**self.ctx_base, **ctx})

    def travada(self, chave: str) -> bool:
        return chave in self.travadas

    def valor(self, chave: str, **ctx) -> float:
        if chave in self.travadas:
            return float(self.travadas[chave])
        return self.automatico(chave, **ctx)

    def __getitem__(self, chave: str) -> float:
        return self.valor(chave)

    @staticmethod
    def fora_da_faixa(chave: str, valor: float) -> bool:
        d = POR_CHAVE[chave]
        return valor < d.minimo - 1e-9 or valor > d.maximo + 1e-9
