"""Motores de cálculo: transformam um Projeto em um Resultado."""
from __future__ import annotations

from math import ceil

from ..catalogo import Catalogo
from ..folgas import DEFINICOES, Folgas
from ..modelos import Projeto, Resultado
from .base import construir_estrutura
from .gavetas import calcular_gavetas
from .portas import calcular_portas


def calcular(p: Projeto, cat: Catalogo) -> Resultado:
    res = Resultado()
    cor = cat.corredica(p.corredica)
    fo = Folgas(p.folgas_travadas, cor["folga_lado"])
    if p.motor == "portas":
        colunas = max(1, ceil(max(1, p.portas) / 2))
    else:
        colunas = max(1, int(p.colunas))
    E = construir_estrutura(p, cat, fo, res, colunas)
    if p.motor == "portas":
        calcular_portas(p, cat, fo, res, E)
    else:
        calcular_gavetas(p, cat, fo, res, E)
    _folgas_efetivas(p, fo, res)
    _avisos_gerais(p, res, E)
    return res


def _folgas_efetivas(p: Projeto, fo: Folgas, res: Resultado) -> None:
    vaos = res.medidas.get("vaos_gaveta") or []
    menor = min(vaos) if vaos else None
    for d in DEFINICOES:
        ctx = {"vao_gaveta": menor} if d.chave == "topo_caixa" else {}
        valor = fo.valor(d.chave, **ctx)
        res.folgas[d.chave] = {
            "valor": valor, "auto": fo.automatico(d.chave, **ctx),
            "travada": fo.travada(d.chave), "fora": fo.fora_da_faixa(d.chave, valor),
        }
        if res.folgas[d.chave]["fora"]:
            res.aviso("aviso", f"Folga '{d.nome}' fora da faixa permitida ({d.minimo:g}–{d.maximo:g} mm).")


def _avisos_gerais(p: Projeto, res: Resultado, E) -> None:
    if E.Hi <= 0:
        res.aviso("erro", "Altura interna inválida: aumente a altura do móvel ou reduza a base.")
    if E.vao <= 0:
        res.aviso("erro", "Largura útil inválida para o número de colunas.")
    if E.Dint <= 0:
        res.aviso("erro", "Profundidade útil inválida.")
