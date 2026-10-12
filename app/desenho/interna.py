"""Vistas internas (sem frentes): sem gavetas e com gavetas."""
from __future__ import annotations

from PySide6.QtCore import QRectF
from PySide6.QtGui import QColor

from ..formato import fmt_cm
from .comum import CAIXA, desenhar_bloco_frontal, ordenar_por_profundidade
from .vista import Vista, texto


def desenhar_interna(pt, area: QRectF, calc, com_gavetas: bool, cotas: bool = True) -> Vista:
    res = calc.resultado
    m = res.medidas
    L, H = m["L"], m["H"]
    v = Vista(pt, area, L, H, margem=(380, 90, 380, 400 if cotas else 100))

    excluir = {"frente", "porta"}
    if not com_gavetas:
        excluir |= CAIXA
    blocos = [b for b in res.blocos if b.grupo not in excluir]
    for b in ordenar_por_profundidade(blocos):
        desenhar_bloco_frontal(v, calc, b, 1.12 if b.grupo == "rodape" else 1.0)

    if com_gavetas and calc.projeto.motor == "gavetas":
        c = m["caixa"]
        for b in res.blocos:
            if b.grupo == "caixa_frente" and b.nome == "Frente da caixa" and b.gaveta == 0:
                v.rotulo(b.x + b.dx / 2, b.y + b.dy / 2 - 10,
                         f"{fmt_cm(c['larg'])} × {fmt_cm(b.dy)}", 28, "#222222", True)

    if cotas:
        _cotas(v, calc, com_gavetas)
    return v


def _cotas(v: Vista, calc, com_gavetas: bool) -> None:
    res = calc.resultado
    m = res.medidas
    e, L, H = m["e"], m["L"], m["H"]
    vao = m["vao"]
    cols = m["colunas"]
    xs = [e + k * (vao + e) for k in range(cols)]
    for x in xs:
        v.cota_h(x, x + vao, 1)
    if com_gavetas and calc.projeto.motor == "gavetas":
        c = m["caixa"]
        for x in xs:
            xc = x + (vao - c["larg"]) / 2
            v.cota_h(xc, xc + c["larg"], 2)
        v.cota_h(0, L, 3)
    else:
        v.cota_h(0, L, 2)

    # vãos de gaveta / prateleiras à esquerda
    if calc.projeto.motor == "gavetas":
        y = m["ytop_int"] - m.get("nicho", 0) - (m["e"] if m.get("nicho", 0) else 0)
        for h in m["vaos_gaveta"]:
            v.cota_v(y - h, y, 1, True, x_ref=0)
            y -= h
    else:
        ys = [m["ybase_int"]] + [y + m["e"] for y in m.get("prateleiras_y", [])]
        topos = list(m.get("prateleiras_y", [])) + [m["ytop_int"]]
        for a, b in zip(ys, topos):
            v.cota_v(a, b, 1, True, x_ref=0)
    v.cota_v(m["ybase_int"], m["ytop_int"], 2, True)
    v.cota_v(0, H, 1, False)
