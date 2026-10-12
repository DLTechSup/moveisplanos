"""Campos de formulário reutilizáveis: cor com amostra, material + espessura, números em pt-BR."""
from __future__ import annotations

from PySide6.QtCore import QLocale, Qt, Signal
from PySide6.QtWidgets import (QColorDialog, QComboBox, QDoubleSpinBox, QHBoxLayout, QInputDialog, QSpinBox,
                               QToolButton, QWidget)

from ..catalogo import Catalogo
from .icones import icone_cor

LOCAL = QLocale(QLocale.Portuguese, QLocale.Brazil)


def spin_decimal(minimo: float, maximo: float, passo: float = 1.0, decimais: int = 1, sufixo: str = "") -> QDoubleSpinBox:
    s = QDoubleSpinBox()
    s.setLocale(LOCAL)
    s.setRange(minimo, maximo)
    s.setSingleStep(passo)
    s.setDecimals(decimais)
    if sufixo:
        s.setSuffix(sufixo)
    s.setKeyboardTracking(False)
    s.setButtonSymbols(QDoubleSpinBox.UpDownArrows)
    return s


def spin_inteiro(minimo: int, maximo: int) -> QSpinBox:
    s = QSpinBox()
    s.setRange(minimo, maximo)
    s.setKeyboardTracking(False)
    return s


class CampoCor(QWidget):
    """Lista de cores do catálogo com amostra e botão para criar uma cor personalizada."""
    mudou = Signal()
    cor_criada = Signal()      # avisa o formulário para recarregar os outros campos de cor

    def __init__(self, catalogo: Catalogo):
        super().__init__()
        self.catalogo = catalogo
        self.combo = QComboBox()
        self.combo.setMaxVisibleItems(18)
        self.botao = QToolButton()
        self.botao.setText("+ cor")
        self.botao.setToolTip("Criar uma cor personalizada e adicioná-la ao catálogo")
        lay = QHBoxLayout(self)
        lay.setContentsMargins(0, 0, 0, 0)
        lay.addWidget(self.combo, 1)
        lay.addWidget(self.botao)
        self.recarregar()
        self.combo.currentIndexChanged.connect(lambda _: self.mudou.emit())
        self.botao.clicked.connect(self._nova_cor)

    def recarregar(self) -> None:
        atual = self.valor()
        self.combo.blockSignals(True)
        self.combo.clear()
        for pad in self.catalogo.dados["padroes"]:
            self.combo.addItem(icone_cor(pad["cor"]), pad["nome"], pad["nome"])
        if atual:
            self.definir(atual)
        self.combo.blockSignals(False)

    def valor(self) -> str:
        return self.combo.currentData() or ""

    def definir(self, nome: str) -> None:
        i = self.combo.findData(nome)
        if i < 0:
            i = 0
        self.combo.blockSignals(True)
        self.combo.setCurrentIndex(i)
        self.combo.blockSignals(False)

    def _nova_cor(self) -> None:
        cor = QColorDialog.getColor(parent=self, title="Escolher cor")
        if not cor.isValid():
            return
        nome, ok = QInputDialog.getText(self, "Nome da cor", "Nome para esta cor:", text=f"Personalizada {cor.name().upper()}")
        if not ok or not nome.strip():
            return
        self.catalogo.adicionar_padrao(nome.strip(), cor.name().upper(), False)
        try:
            self.catalogo.salvar()
        except OSError:
            pass
        self.cor_criada.emit()
        self.recarregar()
        self.definir(nome.strip())
        self.mudou.emit()


class CampoMaterial(QWidget):
    """Material + espessura (mm)."""
    mudou = Signal()

    def __init__(self, catalogo: Catalogo):
        super().__init__()
        self.catalogo = catalogo
        self.mat = QComboBox()
        self.esp = QComboBox()
        lay = QHBoxLayout(self)
        lay.setContentsMargins(0, 0, 0, 0)
        lay.addWidget(self.mat, 1)
        lay.addWidget(self.esp)
        self.recarregar()
        self.mat.currentIndexChanged.connect(self._trocou_material)
        self.esp.currentIndexChanged.connect(lambda _: self.mudou.emit())

    def recarregar(self) -> None:
        atual = self.valor()
        self.mat.blockSignals(True)
        self.mat.clear()
        self.mat.addItems(self.catalogo.materiais())
        self.mat.blockSignals(False)
        if atual[0]:
            self.definir(*atual)
        else:
            self._preencher_esp(None)

    def _preencher_esp(self, esp):
        self.esp.blockSignals(True)
        self.esp.clear()
        for e in self.catalogo.espessuras(self.mat.currentText()):
            self.esp.addItem(f"{e:g} mm", float(e))
        if esp is not None:
            i = self.esp.findData(float(esp))
            if i >= 0:
                self.esp.setCurrentIndex(i)
        self.esp.blockSignals(False)

    def _trocou_material(self):
        anterior = self.esp.currentData()
        self._preencher_esp(anterior)
        self.mudou.emit()

    def valor(self) -> tuple[str, float]:
        return self.mat.currentText(), float(self.esp.currentData() or 0)

    def definir(self, material: str, esp: float) -> None:
        i = self.mat.findText(material)
        self.mat.blockSignals(True)
        self.mat.setCurrentIndex(max(i, 0))
        self.mat.blockSignals(False)
        self._preencher_esp(esp)
