"""Perspectiva oblíqua (3D) e vista explodida."""
from __future__ import annotations

import copy
from math import cos, radians, sin

from PySide6.QtCore import QPointF, QRectF, Qt
from PySide6.QtGui import QColor, QPainterPath, QPen, QPolygonF

from ..modelos import Bloco
from .comum import cor_do_bloco, direcao_veio
from .vista import CONTORNO, texto, veio_em_retangulo

ANGULO = 38.0
PROFUNDIDADE = 0.55
EXTERNOS = {"tampo", "lateral", "frente", "porta", "rodape", "pe", "rodizio"}


class Projecao:
    """Projeção oblíqua: frente em verdadeira grandeza, profundidade recuando para cima e à direita."""

    def __init__(self, blocos: list[Bloco], area: QRectF, margem=(60, 60, 60, 60), reserva_dir: float = 0):
        self.kx = PROFUNDIDADE * cos(radians(ANGULO))
        self.ky = PROFUNDIDADE * sin(radians(ANGULO))
        self.zmax = max(b.z2 for b in blocos)
        xs = [b.x for b in blocos] + [b.x2 for b in blocos]
        ys = [b.y for b in blocos] + [b.y2 for b in blocos]
        zs = [b.z for b in blocos] + [b.z2 for b in blocos]
        pts = [self._bruto(x, y, z) for x in (min(xs), max(xs)) for y in (min(ys), max(ys))
               for z in (min(zs), max(zs))]
        self.minx = min(p[0] for p in pts)
        self.maxx = max(p[0] for p in pts)
        self.miny = min(p[1] for p in pts)
        self.maxy = max(p[1] for p in pts)
        ml, mt, mr, mb = margem
        util_w = area.width() - ml - mr - reserva_dir
        util_h = area.height() - mt - mb
        self.esc = min(util_w / (self.maxx - self.minx), util_h / (self.maxy - self.miny))
        self.ox = area.left() + ml + (util_w - (self.maxx - self.minx) * self.esc) / 2
        self.oy = area.top() + mt + (util_h - (self.maxy - self.miny) * self.esc) / 2 + (self.maxy - self.miny) * self.esc

    def _bruto(self, x, y, z):
        d = self.zmax - z
        return x + d * self.kx, y + d * self.ky

    def p(self, x, y, z) -> QPointF:
        bx, by = self._bruto(x, y, z)
        return QPointF(self.ox + (bx - self.minx) * self.esc, self.oy - (by - self.miny) * self.esc)


def _ordem(blocos: list[Bloco]) -> list[Bloco]:
    """Ordenação topológica de trás para frente (pintor)."""
    eps = 0.01
    n = len(blocos)
    antes = [set() for _ in range(n)]   # antes[j] = blocos que precisam ser desenhados antes de j
    for i in range(n):
        for j in range(n):
            if i == j:
                continue
            a, b = blocos[i], blocos[j]
            if a.z2 <= b.z + eps:
                antes[j].add(i)
            elif a.x2 <= b.x + eps and not (b.z2 <= a.z + eps):
                antes[j].add(i)
            elif a.y2 <= b.y + eps and not (b.z2 <= a.z + eps) and not (b.x2 <= a.x + eps):
                antes[j].add(i)
    chave = [(round(b.z2, 2), round(b.x2, 2), round(b.y2, 2)) for b in blocos]
    pendentes = set(range(n))
    saida = []
    while pendentes:
        livres = [i for i in pendentes if not (antes[i] & pendentes)]
        candidatos = livres or list(pendentes)
        escolhido = min(candidatos, key=lambda i: chave[i])
        saida.append(blocos[escolhido])
        pendentes.discard(escolhido)
    return saida


def _face(pt, pr: Projecao, a, u, v, cor: QColor, grao: str, semente: int):
    """Quadrilátero A, A+U, A+U+V, A+V (em coordenadas do móvel). grao: 'u', 'v' ou ''."""
    A = pr.p(*a)
    B = pr.p(a[0] + u[0], a[1] + u[1], a[2] + u[2])
    C = pr.p(a[0] + u[0] + v[0], a[1] + u[1] + v[1], a[2] + u[2] + v[2])
    D = pr.p(a[0] + v[0], a[1] + v[1], a[2] + v[2])
    poli = QPolygonF([A, B, C, D])
    pt.save()
    pt.setBrush(cor)
    pt.setPen(QPen(CONTORNO, 2.6))
    pt.drawPolygon(poli)
    if grao:
        pt.setClipPath(_caminho(poli))
        escuro = QColor(cor).darker(118)
        escuro.setAlpha(105)
        pt.setPen(QPen(escuro, 2.0))
        n = 7
        for i in range(1, n):
            t = i / n
            if grao == "u":     # linhas paralelas a U
                p1 = QPointF(A.x() + (D.x() - A.x()) * t, A.y() + (D.y() - A.y()) * t)
                p2 = QPointF(B.x() + (C.x() - B.x()) * t, B.y() + (C.y() - B.y()) * t)
            else:
                p1 = QPointF(A.x() + (B.x() - A.x()) * t, A.y() + (B.y() - A.y()) * t)
                p2 = QPointF(D.x() + (C.x() - D.x()) * t, D.y() + (C.y() - D.y()) * t)
            pt.drawLine(p1, p2)
    pt.restore()


def _caminho(poli: QPolygonF) -> QPainterPath:
    c = QPainterPath()
    c.addPolygon(poli)
    c.closeSubpath()
    return c


def _desenhar_bloco(pt, pr: Projecao, calc, b: Bloco) -> None:
    cor = cor_do_bloco(calc, b)
    horizontal_x = direcao_veio(calc, b, "xy")
    veio = b.veio if direcao_veio(calc, b, "xy") or direcao_veio(calc, b, "zy") else ""
    x, y, z, dx, dy, dz = b.x, b.y, b.z, b.dx, b.dy, b.dz
    # frente (z+): U = x, V = y
    g_frente = "" if not veio else ("u" if veio == "x" else "v" if veio == "y" else "")
    _face(pt, pr, (x, y, z + dz), (dx, 0, 0), (0, dy, 0), cor, g_frente, b.peca)
    # direita (x+): U = z, V = y
    g_dir = "" if not veio else ("u" if veio == "z" else "v" if veio == "y" else "")
    _face(pt, pr, (x + dx, y, z + dz), (0, 0, -dz), (0, dy, 0), QColor(cor).darker(122), g_dir, b.peca)
    # topo (y+): U = x, V = z (para trás)
    g_topo = "" if not veio else ("u" if veio == "x" else "v" if veio == "z" else "")
    _face(pt, pr, (x, y + dy, z + dz), (dx, 0, 0), (0, 0, -dz), QColor(cor).lighter(108), g_topo, b.peca)


def _poligonos(pr: Projecao, b: Bloco) -> list[QPolygonF]:
    x, y, z, x2, y2, z2 = b.x, b.y, b.z, b.x2, b.y2, b.z2
    p = pr.p
    return [
        QPolygonF([p(x, y, z2), p(x2, y, z2), p(x2, y2, z2), p(x, y2, z2)]),     # frente
        QPolygonF([p(x2, y, z2), p(x2, y, z), p(x2, y2, z), p(x2, y2, z2)]),     # direita
        QPolygonF([p(x, y2, z2), p(x2, y2, z2), p(x2, y2, z), p(x, y2, z)]),     # topo
    ]


def _ponto_visivel(pr: Projecao, b: Bloco, depois: list[Bloco]) -> QPointF:
    """Procura um ponto da peça que não esteja coberto pelas peças desenhadas depois dela."""
    cobertores = [poli for o in depois for poli in _poligonos(pr, o)]
    candidatos = []
    for fx in (0.5, 0.25, 0.75, 0.1, 0.9):
        for fy in (0.5, 0.25, 0.75, 0.1, 0.9):
            candidatos.append(pr.p(b.x + b.dx * fx, b.y + b.dy * fy, b.z2))
            candidatos.append(pr.p(b.x + b.dx * fx, b.y2, b.z2 - b.dz * fy))
            candidatos.append(pr.p(b.x2, b.y + b.dy * fy, b.z2 - b.dz * fx))
    for c in candidatos:
        if not any(poli.containsPoint(c, Qt.OddEvenFill) for poli in cobertores):
            return c
    return candidatos[0]


def _puxadores_3d(pt, pr: Projecao, calc, deslocamentos=None) -> None:
    from .vista import desenhar_puxador
    cat = calc.catalogo
    px = cat.puxador(calc.projeto.puxador)
    cor = QColor(px["cor"])
    for pu in calc.resultado.puxadores:
        c = pr.p(pu.x, pu.y, pu.z)
        comp = pu.comp * pr.esc
        desenhar_puxador(pt, pu.tipo, cor, c.x(), c.y(), comp, pu.vertical, pu.frente_w * pr.esc)


def desenhar_3d(pt, area: QRectF, calc) -> None:
    blocos = [b for b in calc.resultado.blocos if b.grupo in EXTERNOS]
    pr = Projecao(blocos, area)
    # sombra no chão
    c = pr.p
    sombra = QPolygonF([c(0, 0, 0), c(calc.resultado.medidas["L"], 0, 0),
                        c(calc.resultado.medidas["L"] + 40, 0, calc.resultado.medidas["P"] + 10),
                        c(-20, 0, calc.resultado.medidas["P"] + 10)])
    pt.save()
    pt.setPen(Qt.NoPen)
    pt.setBrush(QColor(0, 0, 0, 40))
    pt.drawPolygon(sombra)
    pt.restore()
    for b in _ordem(blocos):
        if b.grupo == "rodizio":
            pt.save()
            pt.setBrush(QColor("#333333"))
            pt.setPen(QPen(CONTORNO, 2.5))
            r = QRectF(pr.p(b.x, b.y, b.z2).x(), pr.p(b.x, b.y2, b.z2).y(),
                       b.dx * pr.esc, b.dy * pr.esc)
            pt.drawEllipse(r)
            pt.restore()
            continue
        _desenhar_bloco(pt, pr, calc, b)
    _puxadores_3d(pt, pr, calc)


def _explodir(blocos: list[Bloco], m: dict) -> list[Bloco]:
    L, H, P = m["L"], m["H"], m["P"]
    S = 0.16 * max(L, H, P)
    cx = L / 2
    saida = []
    for b in blocos:
        n = copy.copy(b)
        dx = dy = dz = 0.0
        if b.grupo == "lateral":
            dx = -S * 1.1 if (b.x + b.dx / 2) < cx else S * 1.1
        elif b.grupo == "tampo":
            dy = S * 2.1
        elif b.grupo == "rodape":
            dy = -S * 1.5
            dz = S * 0.3
        elif b.grupo in ("pe", "rodizio"):
            dy = -S * 1.5
        elif b.grupo == "base":
            dy = -S * 0.9
        elif b.grupo == "fundo" and b.nome == "Fundo":
            dz = -S * 1.1
        elif b.grupo in ("frente", "porta"):
            dz = S * 2.3
            dy = -S * 0.45
        elif b.grupo in ("caixa_lateral", "caixa_frente", "caixa_fundo", "corredica"):
            dz = S * 1.0
        elif b.grupo == "divisoria":
            dy = S * 1.0
        elif b.grupo == "prateleira":
            dy = 0.0
        n.x, n.y, n.z = b.x + dx, b.y + dy, b.z + dz
        saida.append(n)
    return saida


def desenhar_explodida(pt, area: QRectF, calc) -> None:
    res = calc.resultado
    reserva = min(760.0, area.width() * 0.34)
    blocos = _explodir(res.blocos, res.medidas)
    pr = Projecao(blocos, area, margem=(60, 80, 60, 60), reserva_dir=reserva)
    ordem = [b for b in _ordem(blocos) if b.grupo != "rodizio"]
    for b in ordem:
        _desenhar_bloco(pt, pr, calc, b)
    alvo = {}
    for i, b in enumerate(ordem):
        if b.peca and b.grupo != "corredica":
            alvo[b.peca] = i              # o último desenhado é o mais visível
    rotulos = [(_ponto_visivel(pr, ordem[i], ordem[i + 1:]), n) for n, i in alvo.items()]
    for centro, num in rotulos:
        pt.save()
        pt.setBrush(QColor("#FFFFFF"))
        pt.setPen(QPen(QColor("#14285A"), 2.5))
        pt.drawEllipse(centro, 21, 21)
        pt.restore()
        texto(pt, centro.x(), centro.y() + 10, str(num), 26, "#14285A", True, "c")
    # legenda
    x = area.right() - reserva + 30
    y = area.top() + 110
    tam = 28 if reserva > 600 else 22
    texto(pt, x, y, "Legenda das peças", tam + 6, "#222222", True)
    y += tam * 2
    for pc in res.pecas:
        texto(pt, x, y, f"{pc.id:>2}  {pc.nome} ({pc.qtd}x)", tam, "#222222")
        y += tam * 1.45
