"""Caixa da gaveta (frontal e lateral) e vista da porta."""
from __future__ import annotations

from PySide6.QtCore import QRectF
from PySide6.QtGui import QColor

from ..formato import fmt_cm
from .comum import cor_do_bloco, direcao_veio
from .vista import Vista, cor_padrao, desenhar_puxador, texto


def _extensao(blocos, eixo):
    if eixo == "x":
        return min(b.x for b in blocos), max(b.x2 for b in blocos)
    if eixo == "y":
        return min(b.y for b in blocos), max(b.y2 for b in blocos)
    return min(b.z for b in blocos), max(b.z2 for b in blocos)


def desenhar_caixa(pt, area: QRectF, calc) -> None:
    """Desenha frontal (esquerda) e lateral (direita) da caixa da gaveta."""
    blocos = calc.resultado.caixa_modelo
    if not blocos:
        texto(pt, area.center().x(), area.center().y(), "Sem gavetas neste móvel", 40, "#555555", alinh="c")
        return
    c = calc.resultado.medidas["caixa"]
    metade = area.width() / 2
    a1 = QRectF(area.left(), area.top(), metade, area.height())
    a2 = QRectF(area.left() + metade, area.top(), metade, area.height())

    # --- frontal ---
    x0, x1 = _extensao(blocos, "x")
    y0, y1 = _extensao(blocos, "y")
    v = Vista(pt, a1, x1 - x0, y1 - y0, margem=(120, 100, 120, 330))
    ordem = sorted(blocos, key=lambda b: (round(b.z2, 3), 0 if b.grupo == "corredica" else 1))
    for b in ordem:
        cor = cor_do_bloco(calc, b)
        v.peca(b.x - x0, b.y - y0, b.dx, b.dy, cor, direcao_veio(calc, b, "xy"), b.peca * 5 + 1)
    larg = c["larg"]
    ec = calc.projeto.caixa_esp
    v.cota_h(-x0, -x0 + larg, 1)
    v.cota_h(-x0 + ec, -x0 + larg - ec, 2)
    v.cota_v(-y0, -y0 + max(b.dy for b in blocos if b.grupo == "caixa_lateral"), 1, False)
    texto(pt, a1.center().x(), a1.top() + 60, "Vista frontal da caixa", 34, "#222222", True, "c")

    # --- lateral (vista pela esquerda: frente à direita) ---
    z0, z1 = _extensao(blocos, "z")
    w = Vista(pt, a2, z1 - z0, y1 - y0, margem=(120, 100, 120, 330))
    ordem2 = sorted(blocos, key=lambda b: (-b.x, 0))
    for b in ordem2:
        if b.grupo == "caixa_fundo":
            continue
        cor = cor_do_bloco(calc, b)
        w.peca(b.z - z0, b.y - y0, b.dz, b.dy, cor, direcao_veio(calc, b, "zy"), b.peca * 7 + 2)
    for b in blocos:
        if b.grupo == "caixa_fundo":
            w.peca(b.z - z0, b.y - y0, b.dz, b.dy, QColor("white"), "", tracejado=True)
    w.cota_h(0, z1 - z0, 1)
    w.cota_h(0, c["comp_corredica"], 2, texto_custom=f"corrediça {fmt_cm(c['comp_corredica'])}")
    w.cota_v(-y0, -y0 + max(b.dy for b in blocos if b.grupo == "caixa_lateral"), 1, False)
    texto(pt, a2.center().x(), a2.top() + 60, "Vista lateral da caixa", 34, "#222222", True, "c")


def desenhar_porta(pt, area: QRectF, calc) -> None:
    """Porta com posição das dobradiças e puxador."""
    res = calc.resultado
    m = res.medidas
    if not res.dobradicas:
        texto(pt, area.center().x(), area.center().y(), "Sem portas neste móvel", 40, "#555555", alinh="c")
        return
    larg, alt = m["porta_larg"], m["porta_alt"]
    v = Vista(pt, area, larg, alt, margem=(330, 100, 330, 200))
    cor = cor_padrao(calc.catalogo, calc.projeto.frente_padrao)
    bloco0 = next(b for b in res.blocos if b.grupo == "porta")
    v.peca(0, 0, larg, alt, cor, direcao_veio(calc, bloco0, "xy"), 11)
    esq = m["portas_lado"][0] == "esq"
    ys = res.dobradicas[0]
    xd = 22.0 if esq else larg - 22.0
    for y in ys:
        r = v.rect(xd - 17.5, y - 17.5, 35, 35)
        pt.save()
        pt.setBrush(QColor("#D9DCE0"))
        pt.drawEllipse(r)
        pt.restore()
    pu = next((p for p in res.puxadores), None)
    if pu is not None:
        px = calc.catalogo.puxador(calc.projeto.puxador)
        desenhar_puxador(pt, pu.tipo, QColor(px["cor"]), v.X(pu.x - bloco0.x), v.Y(pu.y - bloco0.y),
                         v.L(pu.comp), pu.vertical, v.L(larg))
    # cotas
    v.cota_h(0, larg, 1)
    v.cota_v(0, alt, 1, esq)
    lado_cota = esq is False
    anterior = 0.0
    for y in ys:
        v.cota_v(anterior, y, 1, lado_cota, x_ref=xd)
        anterior = y
    v.cota_v(ys[-1], alt, 1, lado_cota, x_ref=xd)
    texto(pt, area.center().x(), area.top() + 50, f"Porta — {m['dobradicas_por_porta']} dobradiças", 34,
          "#222222", True, "c")
