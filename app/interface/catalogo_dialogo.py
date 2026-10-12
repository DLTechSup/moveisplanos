"""Tela de edição do catálogo: abas com tabelas editáveis, adicionar/remover linha e seletor de cor."""
from __future__ import annotations

import copy

from PySide6.QtCore import Qt
from PySide6.QtGui import QBrush, QColor
from PySide6.QtWidgets import (QAbstractItemView, QColorDialog, QDialog, QDialogButtonBox, QHBoxLayout, QLabel,
                               QMessageBox, QPushButton, QTableWidget, QTableWidgetItem, QTabWidget, QVBoxLayout,
                               QWidget)

from ..catalogo import Catalogo, catalogo_padrao

# (campo, título, tipo, largura, extras)   tipos: texto, int, float, bool, cor, lista, escolha
SECOES = {
    "chapas": ("Chapas", [
        ("material", "Material", "texto", 140), ("espessura", "Espessura (mm)", "float", 100),
        ("comprimento", "Comprimento (mm)", "float", 110), ("largura", "Largura (mm)", "float", 100),
        ("preco", "Preço (R$)", "float", 90), ("unidade", "Cobrança", "escolha:chapa,m2", 90)],
        "Cada linha é um material + espessura. Cobrança 'm2' é para madeira maciça (preço por m²)."),
    "padroes": ("Cores e madeiras", [
        ("nome", "Nome", "texto", 200), ("tipo", "Tipo", "escolha:amadeirado,unicolor", 110),
        ("cor", "Cor (duplo clique)", "cor", 150), ("veio", "Tem veio", "bool", 80)],
        "A cor aparece nos desenhos. 'Tem veio' desenha linhas de madeira e impede girar a peça no plano de corte."),
    "puxadores": ("Puxadores", [
        ("nome", "Nome", "texto", 200),
        ("tipo", "Tipo", "escolha:barra,cava_usinada,perfil_cava,botao,concha,toque", 120),
        ("comprimento", "Comprimento (mm)", "float", 120), ("entre_furos", "Entre furos (mm)", "float", 120),
        ("cor", "Cor (duplo clique)", "cor", 130), ("preco", "Preço (R$)", "float", 80)], ""),
    "corredicas": ("Corrediças", [
        ("nome", "Nome", "texto", 190), ("tipo", "Tipo", "escolha:telescopica,oculta,roldana", 110),
        ("comprimentos", "Comprimentos (mm)", "lista", 230), ("folga_lado", "Folga por lado (mm)", "float", 120),
        ("altura_min_caixa", "Altura mín. caixa (mm)", "float", 130), ("amortecimento", "Amortec.", "bool", 80),
        ("preco", "Preço do par (R$)", "float", 110)], ""),
    "fitas": ("Fitas de borda", [
        ("nome", "Nome", "texto", 220), ("largura", "Largura (mm)", "float", 100),
        ("espessura", "Espessura (mm)", "float", 110), ("preco_metro", "Preço por metro (R$)", "float", 140)], ""),
    "dobradicas": ("Dobradiças", [
        ("nome", "Nome", "texto", 240), ("tipo", "Tipo", "escolha:reta,curva,supercurva", 110),
        ("amortecimento", "Amortec.", "bool", 80), ("preco", "Preço (R$)", "float", 90)], ""),
    "insumos": ("Insumos e pés", [
        ("chave", "Código", "texto", 100), ("nome", "Nome", "texto", 240), ("unidade", "Unidade", "texto", 80),
        ("preco", "Preço (R$)", "float", 90)],
        "Códigos usados pelo programa: pe, rodizio, parafuso, cavilha, cola (não altere o código)."),
}


class TabelaCatalogo(QWidget):
    def __init__(self, chave: str, dados: list[dict]):
        super().__init__()
        self.chave = chave
        _, self.colunas, ajuda = SECOES[chave]
        self.tabela = QTableWidget(0, len(self.colunas))
        self.tabela.setHorizontalHeaderLabels([c[1] for c in self.colunas])
        for i, c in enumerate(self.colunas):
            self.tabela.setColumnWidth(i, c[3])
        self.tabela.setSelectionBehavior(QAbstractItemView.SelectRows)
        self.tabela.setAlternatingRowColors(True)
        self.tabela.cellDoubleClicked.connect(self._duplo_clique)
        for linha in dados:
            self._add_linha(linha)

        add = QPushButton("Adicionar linha")
        dup = QPushButton("Duplicar")
        rem = QPushButton("Remover")
        rest = QPushButton("Restaurar padrão desta aba")
        add.clicked.connect(self._adicionar)
        dup.clicked.connect(self._duplicar)
        rem.clicked.connect(self._remover)
        rest.clicked.connect(self._restaurar)
        botoes = QHBoxLayout()
        for b in (add, dup, rem):
            botoes.addWidget(b)
        botoes.addStretch(1)
        botoes.addWidget(rest)
        lay = QVBoxLayout(self)
        if ajuda:
            r = QLabel(ajuda)
            r.setWordWrap(True)
            r.setStyleSheet("color: #555;")
            lay.addWidget(r)
        lay.addWidget(self.tabela, 1)
        lay.addLayout(botoes)

    # ---- linhas -----------------------------------------------------------------------------
    def _add_linha(self, dados: dict | None = None) -> None:
        r = self.tabela.rowCount()
        self.tabela.insertRow(r)
        dados = dados or {}
        for c, (campo, _, tipo, _) in enumerate(self.colunas):
            valor = dados.get(campo)
            item = QTableWidgetItem()
            if tipo == "bool":
                item.setFlags(Qt.ItemIsUserCheckable | Qt.ItemIsEnabled | Qt.ItemIsSelectable)
                item.setCheckState(Qt.Checked if valor else Qt.Unchecked)
            elif tipo == "cor":
                self._pintar_cor(item, valor or "#CCCCCC")
                item.setFlags(Qt.ItemIsEnabled | Qt.ItemIsSelectable)
            elif tipo == "lista":
                item.setText(", ".join(f"{v:g}" for v in (valor or [])))
            elif tipo.startswith("escolha"):
                item.setText(str(valor if valor is not None else tipo.split(":")[1].split(",")[0]))
            elif tipo in ("float", "int"):
                item.setText("" if valor is None else f"{valor:g}".replace(".", ","))
                item.setTextAlignment(Qt.AlignRight | Qt.AlignVCenter)
            else:
                item.setText("" if valor is None else str(valor))
            self.tabela.setItem(r, c, item)

    @staticmethod
    def _pintar_cor(item: QTableWidgetItem, hex_cor: str) -> None:
        item.setText(hex_cor.upper())
        cor = QColor(hex_cor)
        item.setBackground(QBrush(cor))
        item.setForeground(QBrush(QColor("white" if cor.lightness() < 130 else "black")))

    def _duplo_clique(self, linha: int, coluna: int) -> None:
        if self.colunas[coluna][2] != "cor":
            return
        item = self.tabela.item(linha, coluna)
        nova = QColorDialog.getColor(QColor(item.text()), self, "Escolher cor")
        if nova.isValid():
            self._pintar_cor(item, nova.name())

    def _adicionar(self) -> None:
        padrao = {c[0]: None for c in self.colunas}
        for campo, _, tipo, _ in self.colunas:
            if tipo in ("float", "int"):
                padrao[campo] = 0
            elif tipo == "texto":
                padrao[campo] = "Novo"
            elif tipo == "lista":
                padrao[campo] = [250, 300, 350, 400, 450, 500, 550]
        self._add_linha(padrao)
        self.tabela.scrollToBottom()
        self.tabela.setCurrentCell(self.tabela.rowCount() - 1, 0)
        self.tabela.editItem(self.tabela.item(self.tabela.rowCount() - 1, 0))

    def _duplicar(self) -> None:
        r = self.tabela.currentRow()
        if r < 0:
            return
        self._add_linha(self._ler_linha(r))

    def _remover(self) -> None:
        r = self.tabela.currentRow()
        if r >= 0:
            self.tabela.removeRow(r)

    def _restaurar(self) -> None:
        if QMessageBox.question(self, "Restaurar", "Voltar esta aba aos valores padrão do programa?") != QMessageBox.Yes:
            return
        self.tabela.setRowCount(0)
        for linha in catalogo_padrao()[self.chave]:
            self._add_linha(linha)

    # ---- leitura ----------------------------------------------------------------------------
    @staticmethod
    def _numero(texto: str) -> float:
        try:
            return float(texto.strip().replace(".", "").replace(",", ".")) if texto.count(",") and texto.count(".") \
                else float(texto.strip().replace(",", "."))
        except ValueError:
            return 0.0

    def _ler_linha(self, r: int) -> dict:
        linha = {}
        for c, (campo, _, tipo, _) in enumerate(self.colunas):
            item = self.tabela.item(r, c)
            if tipo == "bool":
                linha[campo] = item.checkState() == Qt.Checked
            elif tipo == "float":
                linha[campo] = self._numero(item.text())
            elif tipo == "int":
                linha[campo] = int(self._numero(item.text()))
            elif tipo == "lista":
                valores = []
                for p in item.text().replace(";", ",").split(","):
                    p = p.strip()
                    if p:
                        valores.append(self._numero(p))
                linha[campo] = valores
            else:
                linha[campo] = item.text().strip()
        return linha

    def dados(self) -> list[dict]:
        return [self._ler_linha(r) for r in range(self.tabela.rowCount())
                if self.tabela.item(r, 0) and self.tabela.item(r, 0).text().strip()]


class CatalogoDialogo(QDialog):
    def __init__(self, catalogo: Catalogo, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Catálogo de materiais, cores, ferragens e preços")
        self.resize(980, 600)
        self.catalogo = catalogo
        self.abas = QTabWidget()
        self.tabelas: dict[str, TabelaCatalogo] = {}
        for chave, (titulo, _, _) in SECOES.items():
            t = TabelaCatalogo(chave, copy.deepcopy(catalogo.dados[chave]))
            self.tabelas[chave] = t
            self.abas.addTab(t, titulo)
        botoes = QDialogButtonBox(QDialogButtonBox.Save | QDialogButtonBox.Cancel)
        botoes.button(QDialogButtonBox.Save).setText("Salvar catálogo")
        botoes.button(QDialogButtonBox.Cancel).setText("Cancelar")
        botoes.accepted.connect(self._salvar)
        botoes.rejected.connect(self.reject)
        lay = QVBoxLayout(self)
        lay.addWidget(self.abas)
        lay.addWidget(botoes)

    def _salvar(self) -> None:
        for chave, tabela in self.tabelas.items():
            novos = tabela.dados()
            if not novos:
                QMessageBox.warning(self, "Catálogo", f"A aba '{SECOES[chave][0]}' não pode ficar vazia.")
                return
            self.catalogo.dados[chave] = novos
        try:
            self.catalogo.salvar()
        except OSError as erro:
            QMessageBox.warning(self, "Catálogo", f"Não foi possível salvar o arquivo:\n{erro}")
            return
        self.accept()
