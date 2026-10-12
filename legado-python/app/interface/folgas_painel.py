"""Painel de folgas: valor automático ou travado (cadeado), com aviso fora da faixa."""
from __future__ import annotations

from PySide6.QtCore import Qt, Signal
from PySide6.QtWidgets import QGridLayout, QLabel, QPushButton, QToolButton, QVBoxLayout, QWidget

from ..folgas import DEFINICOES
from ..modelos import Projeto
from .campos import spin_decimal
from .icones import icone_cadeado


class FolgasPainel(QWidget):
    alterado = Signal()

    def __init__(self):
        super().__init__()
        self.projeto: Projeto | None = None
        self._atualizando = False
        self.linhas = {}
        grade = QGridLayout()
        grade.setContentsMargins(0, 0, 0, 0)
        grade.setColumnStretch(0, 1)
        for i, d in enumerate(DEFINICOES):
            rotulo = QLabel(d.nome)
            rotulo.setToolTip(d.dica or f"Faixa permitida: {d.minimo:g} a {d.maximo:g} mm")
            spin = spin_decimal(0, 500, 0.5, 2, " mm")
            cad = QToolButton()
            cad.setCheckable(True)
            cad.setIconSize(cad.iconSize().expandedTo(cad.iconSize()))
            cad.setToolTip("Cadeado fechado: o valor fica fixo.\nAberto: recalcula sozinho.")
            rest = QToolButton()
            rest.setText("auto")
            rest.setToolTip("Restaurar o valor automático")
            grade.addWidget(rotulo, i, 0)
            grade.addWidget(spin, i, 1)
            grade.addWidget(cad, i, 2)
            grade.addWidget(rest, i, 3)
            self.linhas[d.chave] = (rotulo, spin, cad, rest)
            spin.valueChanged.connect(lambda v, k=d.chave: self._editou(k, v))
            cad.toggled.connect(lambda marcado, k=d.chave: self._cadeado(k, marcado))
            rest.clicked.connect(lambda _=False, k=d.chave: self._restaurar(k))
            cad.setIcon(icone_cadeado(False))
        todos = QPushButton("Restaurar todas as folgas automáticas")
        todos.clicked.connect(self._restaurar_todas)
        lay = QVBoxLayout(self)
        lay.setContentsMargins(0, 0, 0, 0)
        lay.addLayout(grade)
        lay.addWidget(todos)

    def definir_projeto(self, projeto: Projeto) -> None:
        self.projeto = projeto

    # --- atualização a partir do resultado do cálculo -----------------------------------
    def atualizar(self, folgas: dict) -> None:
        self._atualizando = True
        for chave, (rotulo, spin, cad, rest) in self.linhas.items():
            info = folgas.get(chave)
            if not info:
                continue
            spin.blockSignals(True)
            spin.setValue(info["valor"])
            spin.blockSignals(False)
            cad.blockSignals(True)
            cad.setChecked(info["travada"])
            cad.setIcon(icone_cadeado(info["travada"]))
            cad.blockSignals(False)
            rest.setEnabled(info["travada"])
            estilo = ""
            if info["fora"]:
                estilo = "color: #C00000; font-weight: bold;"
            elif not info["travada"]:
                estilo = "color: #666666;"
            spin.setStyleSheet(estilo)
            rotulo.setStyleSheet("color: #C00000;" if info["fora"] else "")
        self._atualizando = False

    # --- interação ----------------------------------------------------------------------------
    def _editou(self, chave: str, valor: float) -> None:
        if self._atualizando or self.projeto is None:
            return
        self.projeto.folgas_travadas[chave] = float(valor)    # editar trava automaticamente
        self.alterado.emit()

    def _cadeado(self, chave: str, marcado: bool) -> None:
        if self._atualizando or self.projeto is None:
            return
        if marcado:
            self.projeto.folgas_travadas[chave] = float(self.linhas[chave][1].value())
        else:
            self.projeto.folgas_travadas.pop(chave, None)
        self.alterado.emit()

    def _restaurar(self, chave: str) -> None:
        if self.projeto is None:
            return
        self.projeto.folgas_travadas.pop(chave, None)
        self.alterado.emit()

    def _restaurar_todas(self) -> None:
        if self.projeto is None:
            return
        self.projeto.folgas_travadas.clear()
        self.alterado.emit()
