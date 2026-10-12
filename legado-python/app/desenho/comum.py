"""Funções compartilhadas pelas vistas."""
from __future__ import annotations

from PySide6.QtCore import QRectF, Qt
from PySide6.QtGui import QColor

from ..modelos import Bloco
from .vista import Vista, cor_padrao, desenhar_puxador

COR_FERRAGEM = QColor("#9AA0A8")
INTERIOR = {"divisoria", "base", "fundo", "prateleira", "caixa_lateral", "caixa_frente", "caixa_fundo",
            "corredica"}
CAIXA = {"caixa_lateral", "caixa_frente", "caixa_fundo"}


def cor_do_bloco(calc, b: Bloco) -> QColor:
    p, cat = calc.projeto, calc.catalogo
    nome = {
        "estrutura": p.estrutura_padrao, "frente": p.frente_padrao,
        "caixa": p.caixa_padrao, "fundo": p.fundo_padrao,
    }.get(b.cor)
    if nome is None:
        return QColor(COR_FERRAGEM)
    return cor_padrao(cat, nome)


def direcao_veio(calc, b: Bloco, plano: str) -> str:
    """'h', 'v' ou '' conforme o veio do bloco no plano ('xy' ou 'zy')."""
    nome = {"estrutura": calc.projeto.estrutura_padrao, "frente": calc.projeto.frente_padrao,
            "caixa": calc.projeto.caixa_padrao, "fundo": calc.projeto.fundo_padrao}.get(b.cor)
    if nome is None or not calc.catalogo.padrao(nome).get("veio"):
        return ""
    horizontal = "x" if plano == "xy" else "z"
    if b.veio == horizontal:
        return "h"
    if b.veio == "y":
        return "v"
    return ""


def desenhar_bloco_frontal(v: Vista, calc, b: Bloco, escurecer: float = 1.0, tracejado: bool = False) -> None:
    cor = cor_do_bloco(calc, b)
    if escurecer != 1.0:
        cor = cor.darker(int(100 * escurecer))
    if b.grupo == "rodizio":
        _rodizio(v, b)
        return
    v.peca(b.x, b.y, b.dx, b.dy, cor, direcao_veio(calc, b, "xy"), semente=b.peca * 31 + b.gaveta + 7,
           tracejado=tracejado)


def desenhar_bloco_lateral(v: Vista, calc, b: Bloco, tracejado: bool = False) -> None:
    cor = cor_do_bloco(calc, b)
    v.peca(b.z, b.y, b.dz, b.dy, cor, direcao_veio(calc, b, "zy"), semente=b.peca * 17 + 3,
           tracejado=tracejado)


def _rodizio(v: Vista, b: Bloco) -> None:
    pt = v.pt
    r = v.rect(b.x, b.y, b.dx, b.dy)
    pt.save()
    pt.setPen(Qt.NoPen)
    pt.setBrush(QColor("#555555"))
    pt.drawRect(QRectF(r.left() + r.width() * 0.2, r.top(), r.width() * 0.6, r.height() * 0.3))
    d = min(r.width(), r.height() * 0.75)
    pt.setPen(QColor("#222222"))
    pt.setBrush(QColor("#2B2B2B"))
    pt.drawEllipse(QRectF(r.center().x() - d / 2, r.bottom() - d, d, d))
    pt.restore()


def desenhar_puxadores(v: Vista, calc) -> None:
    px_cat = calc.catalogo.puxador(calc.projeto.puxador)
    cor = QColor(px_cat["cor"])
    for pu in calc.resultado.puxadores:
        desenhar_puxador(v.pt, pu.tipo, cor, v.X(pu.x), v.Y(pu.y), v.L(pu.comp), pu.vertical, v.L(pu.frente_w))


def ordenar_por_profundidade(blocos: list[Bloco]) -> list[Bloco]:
    """Do mais ao fundo (menor Z) para o mais próximo, desempate por grupo."""
    prioridade = {"fundo": 0, "base": 1, "divisoria": 1, "lateral": 2, "prateleira": 2, "corredica": 3,
                  "caixa_fundo": 3, "caixa_lateral": 4, "caixa_frente": 5, "tampo": 6, "rodape": 6,
                  "frente": 7, "porta": 7}
    return sorted(blocos, key=lambda b: (round(b.z2, 3), prioridade.get(b.grupo, 5), b.x))
