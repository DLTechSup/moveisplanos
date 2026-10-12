"""Classe Vista: escala automática, retângulos com veio, cotas e puxadores.

Todo o desenho usa unidades lógicas de 0,1 mm (uma folha A3 = 4200 × 2970), assim o mesmo
código desenha na tela, no PDF e no PNG.
"""
from __future__ import annotations

import random

from PySide6.QtCore import QPointF, QRectF, Qt
from PySide6.QtGui import QBrush, QColor, QFont, QFontMetricsF, QPainter, QPainterPath, QPen, QPolygonF

from ..formato import fmt_cm

AZUL_COTA = QColor("#14285A")
CONTORNO = QColor("#2B2B2B")
OCULTO = QColor("#7A7A7A")
PASSO_COTA = 105.0      # distância entre níveis de cota
AFASTA_COTA = 75.0      # distância do desenho à primeira cota
TAM_TEXTO = 30          # altura padrão do texto das cotas


def cor_padrao(cat, nome: str) -> QColor:
    return QColor(cat.padrao(nome)["cor"])


def fonte(tam: float, negrito: bool = False, italico: bool = False) -> QFont:
    f = QFont("Arial")
    f.setPixelSize(max(1, int(round(tam))))
    f.setBold(negrito)
    f.setItalic(italico)
    return f


def texto(pt: QPainter, x: float, y: float, s: str, tam: float = TAM_TEXTO, cor=CONTORNO,
          negrito: bool = False, alinh: str = "e", italico: bool = False) -> float:
    """Escreve `s` com a linha de base em y. alinh: e (esquerda), c (centro), d (direita). Devolve a largura."""
    pt.save()
    pt.setFont(fonte(tam, negrito, italico))
    pt.setPen(QColor(cor))
    larg = QFontMetricsF(pt.font()).horizontalAdvance(s)
    if alinh == "c":
        x -= larg / 2
    elif alinh == "d":
        x -= larg
    pt.drawText(QPointF(x, y), s)
    pt.restore()
    return larg


def texto_quebrado(pt: QPainter, x: float, y: float, largura: float, s: str, tam: float = TAM_TEXTO,
                   cor=CONTORNO, entrelinha: float = 1.25) -> float:
    """Escreve texto com quebra de linha; devolve o y final."""
    pt.save()
    pt.setFont(fonte(tam))
    fm = QFontMetricsF(pt.font())
    pt.restore()
    linhas, atual = [], ""
    for palavra in s.split():
        teste = (atual + " " + palavra).strip()
        if fm.horizontalAdvance(teste) <= largura:
            atual = teste
        else:
            linhas.append(atual)
            atual = palavra
    if atual:
        linhas.append(atual)
    for ln in linhas:
        texto(pt, x, y, ln, tam, cor)
        y += tam * entrelinha
    return y


def veio_em_retangulo(pt: QPainter, r: QRectF, cor: QColor, horizontal: bool, semente: int = 0) -> None:
    """Linhas suaves de veio de madeira, recortadas no retângulo."""
    if r.width() < 6 or r.height() < 6:
        return
    rnd = random.Random(semente)
    pt.save()
    pt.setClipRect(r)
    escuro = QColor(cor).darker(118)
    escuro.setAlpha(110)
    claro = QColor(cor).lighter(112)
    claro.setAlpha(90)
    passo = 22.0
    comprimento = r.width() if horizontal else r.height()
    espalhamento = r.height() if horizontal else r.width()
    n = int(espalhamento / passo) + 1
    for i in range(n):
        pos = i * passo + rnd.uniform(-5, 5)
        pen = QPen(escuro if i % 3 else claro, 2.2 if i % 4 else 3.4)
        pt.setPen(pen)
        # linha levemente ondulada
        path = QPainterPath()
        passos = 6
        amp = rnd.uniform(1.5, 5.5)
        fase = rnd.uniform(0, 6.28)
        for s in range(passos + 1):
            t = comprimento * s / passos
            desloc = amp * (1 if (s + int(fase)) % 2 else -1) * 0.6
            if horizontal:
                p = QPointF(r.left() + t, r.top() + pos + desloc)
            else:
                p = QPointF(r.left() + pos + desloc, r.top() + t)
            if s == 0:
                path.moveTo(p)
            else:
                path.lineTo(p)
        pt.drawPath(path)
    pt.restore()


def desenhar_puxador(pt: QPainter, tipo: str, cor: QColor, cx: float, cy: float, comp: float,
                     vertical: bool, larg_frente: float) -> None:
    """Desenha o puxador no centro (cx, cy) em unidades lógicas (já em escala)."""
    pt.save()
    contorno = QPen(QColor(cor).darker(220), 2)
    if tipo == "barra":
        esp = max(9.0, comp * 0.07)
        esp = min(esp, 22.0)
        pt.setPen(contorno)
        pt.setBrush(QBrush(cor))
        if vertical:
            pt.drawRoundedRect(QRectF(cx - esp / 2, cy - comp / 2, esp, comp), esp / 2, esp / 2)
        else:
            pt.drawRoundedRect(QRectF(cx - comp / 2, cy - esp / 2, comp, esp), esp / 2, esp / 2)
    elif tipo == "concha":
        w, h = (comp * 0.45, comp) if vertical else (comp, comp * 0.45)
        pt.setPen(contorno)
        pt.setBrush(QBrush(cor))
        pt.drawEllipse(QRectF(cx - w / 2, cy - h / 2, w, h))
        pt.setBrush(QBrush(QColor(cor).darker(140)))
        pt.drawEllipse(QRectF(cx - w * 0.3, cy - h * 0.3, w * 0.6, h * 0.6))
    elif tipo == "botao":
        d = max(comp, 24.0)
        pt.setPen(contorno)
        pt.setBrush(QBrush(cor))
        pt.drawEllipse(QRectF(cx - d / 2, cy - d / 2, d, d))
        pt.setBrush(QBrush(QColor(cor).lighter(150)))
        pt.setPen(Qt.NoPen)
        pt.drawEllipse(QRectF(cx - d * 0.2, cy - d * 0.25, d * 0.28, d * 0.28))
    elif tipo == "cava_usinada":
        pt.setPen(QPen(QColor("#000000"), 2))
        pt.setBrush(QBrush(QColor(0, 0, 0, 150)))
        w = comp
        pt.drawRoundedRect(QRectF(cx - w / 2, cy - 12, w, 26), 8, 8)
        pt.setPen(Qt.NoPen)
        pt.setBrush(QBrush(QColor(255, 255, 255, 70)))
        pt.drawRect(QRectF(cx - w / 2 + 6, cy + 6, w - 12, 5))
    elif tipo == "perfil_cava":
        pt.setPen(contorno)
        pt.setBrush(QBrush(cor))
        pt.drawRect(QRectF(cx - comp / 2, cy - 11, comp, 24))
        pt.setPen(Qt.NoPen)
        pt.setBrush(QBrush(QColor(0, 0, 0, 120)))
        pt.drawRect(QRectF(cx - comp / 2 + 2, cy - 3, comp - 4, 7))
    pt.restore()


class Vista:
    """Mapeia coordenadas do móvel (mm, Y para cima) para a área de desenho."""

    def __init__(self, pt: QPainter, area: QRectF, larg_mm: float, alt_mm: float,
                 margem=(330.0, 110.0, 330.0, 330.0), inverter_h: bool = False,
                 escala_max: float | None = None):
        self.pt = pt
        self.area = area
        self.larg = larg_mm
        self.alt = alt_mm
        self.inverter_h = inverter_h
        ml, mt, mr, mb = margem
        util_w = max(area.width() - ml - mr, 10.0)
        util_h = max(area.height() - mt - mb, 10.0)
        self.esc = min(util_w / max(larg_mm, 1.0), util_h / max(alt_mm, 1.0))
        if escala_max:
            self.esc = min(self.esc, escala_max)
        w_px, h_px = larg_mm * self.esc, alt_mm * self.esc
        self.ox = area.left() + ml + (util_w - w_px) / 2
        self.oy = area.top() + mt + (util_h - h_px) / 2 + h_px      # y de tela da linha do chão
        self.px_w, self.px_h = w_px, h_px

    # ---- conversões -----------------------------------------------------------
    def X(self, x: float) -> float:
        if self.inverter_h:
            return self.ox + (self.larg - x) * self.esc
        return self.ox + x * self.esc

    def Y(self, y: float) -> float:
        return self.oy - y * self.esc

    def L(self, v: float) -> float:
        return v * self.esc

    def rect(self, x: float, y: float, w: float, h: float) -> QRectF:
        x1, x2 = self.X(x), self.X(x + w)
        y1, y2 = self.Y(y + h), self.Y(y)
        return QRectF(min(x1, x2), min(y1, y2), abs(x2 - x1), abs(y2 - y1))

    # ---- desenho de peças --------------------------------------------------------
    def peca(self, x: float, y: float, w: float, h: float, cor: QColor, veio: str = "",
             semente: int = 0, tracejado: bool = False, so_contorno: bool = False,
             espessura: float = 3.5) -> QRectF:
        """veio: 'h' linhas horizontais, 'v' linhas verticais, '' sem veio."""
        r = self.rect(x, y, w, h)
        pt = self.pt
        pt.save()
        if so_contorno:
            pt.setBrush(Qt.NoBrush)
        else:
            pt.setBrush(QBrush(cor))
        pen = QPen(OCULTO if tracejado else CONTORNO, 2.5 if tracejado else espessura)
        if tracejado:
            pen.setStyle(Qt.DashLine)
        pt.setPen(Qt.NoPen if (not so_contorno and not tracejado and False) else pen)
        pt.drawRect(r)
        pt.restore()
        if veio and not so_contorno and not tracejado:
            veio_em_retangulo(pt, r, cor, veio == "h", semente)
            pt.save()
            pt.setBrush(Qt.NoBrush)
            pt.setPen(QPen(CONTORNO, espessura))
            pt.drawRect(r)
            pt.restore()
        return r

    def linha(self, x1, y1, x2, y2, cor=CONTORNO, largura=2.5, tracejado=False) -> None:
        pen = QPen(QColor(cor), largura)
        if tracejado:
            pen.setStyle(Qt.DashLine)
        self.pt.save()
        self.pt.setPen(pen)
        self.pt.drawLine(QPointF(self.X(x1), self.Y(y1)), QPointF(self.X(x2), self.Y(y2)))
        self.pt.restore()

    def rotulo(self, x: float, y: float, s: str, tam: float = TAM_TEXTO, cor=CONTORNO,
               negrito: bool = False, alinh: str = "c") -> None:
        texto(self.pt, self.X(x), self.Y(y), s, tam, cor, negrito, alinh)

    # ---- cotas ----------------------------------------------------------------------------
    def _tick(self, p: QPointF) -> None:
        d = 14.0
        self.pt.drawLine(QPointF(p.x() - d, p.y() + d), QPointF(p.x() + d, p.y() - d))

    def cota_h(self, x1: float, x2: float, nivel: int = 1, abaixo: bool = True, valor: float | None = None,
               y_ref: float | None = None, texto_custom: str | None = None) -> None:
        pt = self.pt
        if y_ref is None:
            y_ref = 0.0 if abaixo else self.alt
        yp_ref = self.Y(y_ref)
        yl = (self.Y(0) + AFASTA_COTA + (nivel - 1) * PASSO_COTA) if abaixo else \
             (self.Y(self.alt) - AFASTA_COTA - (nivel - 1) * PASSO_COTA)
        xa, xb = self.X(x1), self.X(x2)
        if xa > xb:
            xa, xb = xb, xa
        pt.save()
        pt.setPen(QPen(AZUL_COTA, 2.2))
        ext = 18.0 if abaixo else -18.0
        pt.drawLine(QPointF(xa, yp_ref + (8 if abaixo else -8)), QPointF(xa, yl + ext))
        pt.drawLine(QPointF(xb, yp_ref + (8 if abaixo else -8)), QPointF(xb, yl + ext))
        pt.drawLine(QPointF(xa, yl), QPointF(xb, yl))
        self._tick(QPointF(xa, yl))
        self._tick(QPointF(xb, yl))
        pt.restore()
        s = texto_custom if texto_custom is not None else fmt_cm(valor if valor is not None else abs(x2 - x1))
        self._texto_cota(QPointF((xa + xb) / 2, yl - 10), s, xb - xa, horizontal=True)

    def cota_v(self, y1: float, y2: float, nivel: int = 1, esquerda: bool = True, valor: float | None = None,
               x_ref: float | None = None, texto_custom: str | None = None) -> None:
        pt = self.pt
        if x_ref is None:
            x_ref = 0.0 if esquerda else self.larg
        xp_ref = self.X(x_ref)
        # esquerda/direita em tela (considera inversão horizontal)
        x_borda_esq = min(self.X(0), self.X(self.larg))
        x_borda_dir = max(self.X(0), self.X(self.larg))
        xl = (x_borda_esq - AFASTA_COTA - (nivel - 1) * PASSO_COTA) if esquerda else \
             (x_borda_dir + AFASTA_COTA + (nivel - 1) * PASSO_COTA)
        ya, yb = self.Y(y1), self.Y(y2)
        if ya < yb:
            ya, yb = yb, ya
        pt.save()
        pt.setPen(QPen(AZUL_COTA, 2.2))
        sentido = -1 if esquerda else 1
        pt.drawLine(QPointF(xp_ref + 8 * sentido, ya), QPointF(xl + 18 * -sentido, ya))
        pt.drawLine(QPointF(xp_ref + 8 * sentido, yb), QPointF(xl + 18 * -sentido, yb))
        pt.drawLine(QPointF(xl, ya), QPointF(xl, yb))
        self._tick(QPointF(xl, ya))
        self._tick(QPointF(xl, yb))
        pt.restore()
        s = texto_custom if texto_custom is not None else fmt_cm(valor if valor is not None else abs(y2 - y1))
        self._texto_cota(QPointF(xl - 10, (ya + yb) / 2), s, ya - yb, horizontal=False)

    def _texto_cota(self, ponto: QPointF, s: str, comprimento_px: float, horizontal: bool) -> None:
        pt = self.pt
        pt.save()
        pt.setFont(fonte(TAM_TEXTO))
        fm = QFontMetricsF(pt.font())
        larg = fm.horizontalAdvance(s)
        pt.setPen(AZUL_COTA)
        if horizontal:
            x = ponto.x() - larg / 2
            y = ponto.y()
            if larg > comprimento_px - 6:     # não cabe: sobe um pouco para não encostar nos traços
                y -= 0
            pt.drawText(QPointF(x, y), s)
        else:
            pt.translate(ponto)
            pt.rotate(-90)
            pt.drawText(QPointF(-larg / 2, 0), s)
        pt.restore()
