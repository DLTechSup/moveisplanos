"""Cálculo completo de um projeto: peças, plano de chapas e orçamento."""
from __future__ import annotations

from dataclasses import dataclass

from .catalogo import Catalogo
from .materiais import Orcamento, montar_orcamento
from .modelos import Projeto, Resultado
from .motores import calcular
from .otimizador import Plano, otimizar


@dataclass
class Calculo:
    projeto: Projeto
    catalogo: Catalogo
    resultado: Resultado
    plano: Plano
    orcamento: Orcamento


def calcular_projeto(projeto: Projeto, catalogo: Catalogo) -> Calculo:
    res = calcular(projeto, catalogo)
    kerf = res.folgas["kerf"]["valor"]
    refilo = res.folgas["refilo"]["valor"]
    plano = otimizar(res, catalogo, kerf, refilo)
    orc = montar_orcamento(projeto, res, plano, catalogo)
    return Calculo(projeto, catalogo, res, plano, orc)
