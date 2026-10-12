"""Preview em abas: cada aba mostra uma folha A3 (ou uma vista) com zoom por Ctrl + roda do mouse."""
from __future__ import annotations

from PySide6.QtCore import QPoint, QRect, QSize, Qt, QTimer
from PySide6.QtGui import QColor, QImage, QPainter, QPen
from PySide6.QtWidgets import (QHBoxLayout, QLabel, QScrollArea, QSpinBox, QTabWidget, QVBoxLayout, QWidget)

from ..desenho.prancha import ALT, LARG, NOMES_VISTAS, Pagina, folha_vista, montar_paginas, paginas_chapas
from ..exportar import preparar_painter


class Folha(QWidget):
    """Desenha uma página A3 (4200 × 2970) no tamanho atual, com cache da imagem."""

    def __init__(self, fornecedor):
        super().__init__()
        self.fornecedor = fornecedor      # callable() -> Pagina | None
        self._cache: QImage | None = None
        self._sujo = True
        self.zoom = 1.0
        self.base_largura = 900
        self._aplicar_tamanho()

    def invalidar(self) -> None:
        self._sujo = True
        self.update()

    def definir_base(self, largura_visivel: int, altura_visivel: int) -> None:
        por_largura = largura_visivel
        por_altura = altura_visivel * LARG / ALT
        nova = max(300, int(min(por_largura, por_altura)))
        if nova != self.base_largura:
            self.base_largura = nova
            self._aplicar_tamanho()

    def definir_zoom(self, zoom: float) -> None:
        self.zoom = max(0.3, min(zoom, 3.0))
        self._aplicar_tamanho()

    def _aplicar_tamanho(self) -> None:
        w = int(self.base_largura * self.zoom)
        self.setFixedSize(w, int(w * ALT / LARG))
        self._sujo = True
        self.update()

    def paintEvent(self, evento) -> None:
        dpr = self.devicePixelRatioF()
        tam = QSize(int(self.width() * dpr), int(self.height() * dpr))
        if self._sujo or self._cache is None or self._cache.size() != tam:
            img = QImage(tam, QImage.Format_RGB32)
            img.fill(Qt.white)
            pagina = self.fornecedor()
            if pagina is not None:
                pt = QPainter(img)
                preparar_painter(pt, tam.width(), tam.height())
                try:
                    pagina.desenhar(pt)
                finally:
                    pt.end()
            img.setDevicePixelRatio(dpr)
            self._cache = img
            self._sujo = False
        p = QPainter(self)
        p.drawImage(0, 0, self._cache)
        p.setPen(QPen(QColor("#B0B0B0"), 1))
        p.drawRect(0, 0, self.width() - 1, self.height() - 1)
        p.end()


class AreaFolha(QScrollArea):
    """Área rolável com a folha; Ctrl + roda faz zoom, arrastar com o botão do meio move."""

    def __init__(self, fornecedor):
        super().__init__()
        self.folha = Folha(fornecedor)
        self.setWidget(self.folha)
        self.setAlignment(Qt.AlignCenter)
        self.setStyleSheet("QScrollArea { background: #6E7480; }")
        self._arrasto: QPoint | None = None

    def invalidar(self) -> None:
        self.folha.invalidar()

    def resizeEvent(self, e) -> None:
        super().resizeEvent(e)
        vp = self.viewport().size()
        self.folha.definir_base(vp.width() - 24, vp.height() - 24)

    def wheelEvent(self, e) -> None:
        if e.modifiers() & Qt.ControlModifier:
            passo = 1.15 if e.angleDelta().y() > 0 else 1 / 1.15
            self.folha.definir_zoom(self.folha.zoom * passo)
            e.accept()
        else:
            super().wheelEvent(e)

    def mousePressEvent(self, e) -> None:
        if e.button() == Qt.MiddleButton:
            self._arrasto = e.pos()
            self.setCursor(Qt.ClosedHandCursor)
        super().mousePressEvent(e)

    def mouseMoveEvent(self, e) -> None:
        if self._arrasto is not None:
            d = e.pos() - self._arrasto
            self._arrasto = e.pos()
            self.horizontalScrollBar().setValue(self.horizontalScrollBar().value() - d.x())
            self.verticalScrollBar().setValue(self.verticalScrollBar().value() - d.y())
        super().mouseMoveEvent(e)

    def mouseReleaseEvent(self, e) -> None:
        if e.button() == Qt.MiddleButton:
            self._arrasto = None
            self.unsetCursor()
        super().mouseReleaseEvent(e)

    def mouseDoubleClickEvent(self, e) -> None:
        self.folha.definir_zoom(1.0)
        super().mouseDoubleClickEvent(e)


class AbaChapas(QWidget):
    """Plano de chapas com seletor de página."""

    def __init__(self, preview: "Preview"):
        super().__init__()
        self.preview = preview
        self.area = AreaFolha(self._pagina)
        self.seletor = QSpinBox()
        self.seletor.setMinimum(1)
        self.seletor.valueChanged.connect(lambda _: self.area.invalidar())
        self.rotulo = QLabel("")
        barra = QHBoxLayout()
        barra.setContentsMargins(6, 4, 6, 2)
        barra.addWidget(QLabel("Página de chapas:"))
        barra.addWidget(self.seletor)
        barra.addWidget(self.rotulo)
        barra.addStretch(1)
        lay = QVBoxLayout(self)
        lay.setContentsMargins(0, 0, 0, 0)
        lay.addLayout(barra)
        lay.addWidget(self.area, 1)

    def _paginas(self):
        calc = self.preview.calc
        if not calc:
            return []
        return paginas_chapas(calc, 3, len(montar_paginas(calc, True)))

    def _pagina(self):
        paginas = self._paginas()
        if not paginas:
            return None
        i = min(self.seletor.value(), len(paginas)) - 1
        return paginas[i]

    def invalidar(self) -> None:
        n = max(len(self._paginas()), 1)
        self.seletor.setMaximum(n)
        self.rotulo.setText(f"de {n}")
        self.area.invalidar()


class Preview(QTabWidget):
    def __init__(self):
        super().__init__()
        self.calc = None
        self.abas: list[tuple[str, object]] = []
        self.setDocumentMode(True)

        def fixa(indice):
            def fornecedor():
                if self.calc is None:
                    return None
                paginas = montar_paginas(self.calc, True)
                return paginas[indice] if indice < len(paginas) else None
            return fornecedor

        def vista(nome):
            return lambda: None if self.calc is None else Pagina(nome, lambda pt: folha_vista(pt, self.calc, nome))

        def cliente():
            if self.calc is None:
                return None
            return montar_paginas(self.calc, True, somente_cliente=True)[0]

        self._criar("Prancha", AreaFolha(fixa(0)))
        self._criar("Corte e materiais", AreaFolha(fixa(1)))
        self._criar("Chapas", AbaChapas(self))
        self._criar("Frontal", AreaFolha(vista("frontal")))
        self._criar("Lateral", AreaFolha(vista("lateral")))
        self._criar("Interna", AreaFolha(vista("interna")))
        self._criar("Interna com gavetas", AreaFolha(vista("interna_gavetas")))
        self._criar("Gaveta", AreaFolha(vista("caixa")))
        self._criar("3D", AreaFolha(vista("3d")))
        self._criar("Explodida", AreaFolha(vista("explodida")))
        self._criar("Cliente", AreaFolha(cliente))
        self.currentChanged.connect(lambda _: self._pintar_atual())

    def _criar(self, titulo: str, widget) -> None:
        self.addTab(widget, titulo)
        self.abas.append((titulo, widget))

    def atualizar(self, calc) -> None:
        self.calc = calc
        gav = calc.projeto.motor == "gavetas"
        self.setTabText(6, "Interna com gavetas" if gav else "Interna (prateleiras)")
        self.setTabText(7, "Gaveta" if gav else "Porta")
        self._pintar_atual()

    def _pintar_atual(self) -> None:
        atual = self.currentWidget()
        for _, w in self.abas:
            if w is atual:
                w.invalidar()
            else:
                # abas escondidas redesenham quando forem mostradas
                if hasattr(w, "area"):
                    w.area.folha._sujo = True
                else:
                    w.folha._sujo = True
