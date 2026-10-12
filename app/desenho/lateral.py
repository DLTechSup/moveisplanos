"""Vista lateral (esquerda): profundidade, perfil das frentes, fundo tracejado."""
from __future__ import annotations

from PySide6.QtCore import QRectF

from .comum import desenhar_bloco_lateral
from .vista import Vista


def desenhar_lateral(pt, area: QRectF, calc, cotas: bool = True) -> Vista:
    res = calc.resultado
    m = res.medidas
    P, H = m["P"], m["H"]
    v = Vista(pt, area, P, H, margem=(260, 90, 260, 300 if cotas else 100))
    embutidas = calc.projeto.frente_tipo == "embutidas"

    # peças ocultas (tracejadas) por baixo da lateral
    ocultas = [b for b in res.blocos if b.grupo in ("fundo", "rodape")]
    if embutidas:
        ocultas += [b for b in res.blocos if b.grupo in ("frente", "porta")]
    visiveis = [b for b in res.blocos if b.grupo in ("tampo", "pe", "rodizio")]
    if not embutidas:
        visiveis += [b for b in res.blocos if b.grupo in ("frente", "porta")]
    lat = [b for b in res.blocos if b.grupo == "lateral" and b.x < 1]

    for b in lat + visiveis:
        desenhar_bloco_lateral(v, calc, b)
    vistos = set()
    for b in ocultas:
        chave = (b.grupo, round(b.z, 1), round(b.y, 1), round(b.dz, 1), round(b.dy, 1))
        if chave in vistos:
            continue
        vistos.add(chave)
        desenhar_bloco_lateral(v, calc, b, tracejado=True)

    if cotas:
        z0 = m["z_lat0"]
        v.cota_h(z0, z0 + m["Dlat"], 1)
        v.cota_h(0, P, 2)
        v.cota_v(0, H, 1, False)
        base = m["rod"] or m["y0"]
        if base > 0:
            v.cota_v(0, base, 1, True)
    return v
