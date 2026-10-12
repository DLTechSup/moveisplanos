"""Vista frontal (móvel fechado)."""
from __future__ import annotations

from PySide6.QtCore import QRectF
from PySide6.QtGui import QColor

from .comum import INTERIOR, desenhar_bloco_frontal, desenhar_puxadores, ordenar_por_profundidade
from .vista import Vista


def desenhar_frontal(pt, area: QRectF, calc, cotas: bool = True) -> Vista:
    res = calc.resultado
    m = res.medidas
    L, H = m["L"], m["H"]
    v = Vista(pt, area, L, H, margem=(330, 90, 330, 330 if cotas else 100))

    nicho = m.get("nicho", 0)
    # fundo escuro atrás das frentes (mostra as frestas)
    if calc.projeto.frente_tipo == "sobrepostas":
        pt.save()
        pt.setBrush(QColor("#303030"))
        topo = m.get("topo_frentes", m["topo_lat"])
        r = v.rect(0, m["y0"] + m["rod"], L, topo - m["y0"] - m["rod"])
        pt.drawRect(r)
        pt.restore()
    else:
        r = v.rect(m["e"], m["ybase_int"], L - 2 * m["e"], m["Hi"])
        pt.save()
        pt.setBrush(QColor("#303030"))
        pt.drawRect(r)
        pt.restore()

    visiveis = [b for b in res.blocos
                if b.grupo not in INTERIOR or (nicho and b.grupo in ("fundo", "prateleira") and b.nome != "Fundo da gaveta")]
    for b in ordenar_por_profundidade(visiveis):
        escurecer = 1.12 if b.grupo == "rodape" else 1.0
        desenhar_bloco_frontal(v, calc, b, escurecer)
    desenhar_puxadores(v, calc)

    if cotas:
        _cotas(v, calc)
    return v


def _cotas(v: Vista, calc) -> None:
    res = calc.resultado
    m = res.medidas
    L, H = m["L"], m["H"]
    larg = m.get("frente_largura", 0)
    # largura de cada frente / porta (nível 1) e total (nível 2)
    if calc.projeto.motor == "portas":
        n = m["n_portas"]
        x0 = m["porta_x0"]
        g = res.folgas["entre_frentes"]["valor"]
        for i in range(n):
            xa = x0 + i * (larg + g)
            v.cota_h(xa, xa + larg, 1)
    else:
        for xa in m["gaveta_xs"]:
            v.cota_h(xa, xa + larg, 1)
    v.cota_h(0, L, 2)
    # alturas das frentes (primeira coluna) à esquerda
    if calc.projeto.motor == "portas":
        v.cota_v(m["porta_y"], m["porta_y"] + m["porta_alt"], 1, True)
    else:
        for y, h in zip(m["frentes_y"], m["frentes_altura"]):
            v.cota_v(y, y + h, 1, True)
    v.cota_v(0, H, 2, True)
    # base: rodapé ou pés
    base = m["rod"] or m["y0"]
    if base > 0:
        v.cota_v(0, base, 1, False)
    v.cota_v(0, H, 2, False)
