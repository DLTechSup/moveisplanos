"""Painel de medidas e escolhas (lado esquerdo da janela)."""
from __future__ import annotations

from datetime import date

from PySide6.QtCore import Qt, Signal
from PySide6.QtWidgets import (QCheckBox, QComboBox, QFormLayout, QGroupBox, QHBoxLayout, QLabel, QLineEdit,
                               QPlainTextEdit, QPushButton, QScrollArea, QTableWidget, QTableWidgetItem,
                               QToolButton, QVBoxLayout, QWidget)

from ..catalogo import Catalogo
from ..modelos import Projeto
from ..tipos import PRESETS, aplicar_preset
from .campos import CampoCor, CampoMaterial, spin_decimal, spin_inteiro
from .folgas_painel import FolgasPainel


def _combo(itens: list[tuple[str, str]]) -> QComboBox:
    c = QComboBox()
    for texto, valor in itens:
        c.addItem(texto, valor)
    return c


class Formulario(QScrollArea):
    alterado = Signal()

    def __init__(self, projeto: Projeto, catalogo: Catalogo):
        super().__init__()
        self.projeto = projeto
        self.catalogo = catalogo
        self._carregando = False
        self.setWidgetResizable(True)
        self.setMinimumWidth(400)
        corpo = QWidget()
        self.layout_geral = QVBoxLayout(corpo)
        self.layout_geral.setSpacing(8)
        self.setWidget(corpo)
        self._construir()
        self.carregar(projeto)

    # ------------------------------------------------------------------------------------------
    def _grupo(self, titulo: str) -> tuple[QGroupBox, QFormLayout]:
        g = QGroupBox(titulo)
        f = QFormLayout(g)
        f.setLabelAlignment(Qt.AlignRight)
        f.setFieldGrowthPolicy(QFormLayout.AllNonFixedFieldsGrow)
        self.layout_geral.addWidget(g)
        return g, f

    def _ligar(self, *widgets) -> None:
        for w in widgets:
            if isinstance(w, QComboBox):
                w.currentIndexChanged.connect(self._mudou)
            elif isinstance(w, QLineEdit):
                w.textChanged.connect(self._mudou)
            elif isinstance(w, QPlainTextEdit):
                w.textChanged.connect(self._mudou)
            elif isinstance(w, QCheckBox):
                w.toggled.connect(self._mudou)
            elif hasattr(w, "mudou"):
                w.mudou.connect(self._mudou)
            elif hasattr(w, "valueChanged"):
                w.valueChanged.connect(self._mudou)

    def _mudou(self, *_) -> None:
        if self._carregando:
            return
        self.ler()
        self.alterado.emit()

    # ------------------------------------------------------------------------------------------
    def _construir(self) -> None:
        cat = self.catalogo

        # Projeto
        g, f = self._grupo("Projeto")
        self.nome = QLineEdit()
        self.cliente = QLineEdit()
        self.telefone = QLineEdit()
        self.data = QLineEdit()
        self.obs = QPlainTextEdit()
        self.obs.setFixedHeight(60)
        f.addRow("Nome do projeto", self.nome)
        f.addRow("Cliente", self.cliente)
        f.addRow("Telefone", self.telefone)
        f.addRow("Data", self.data)
        f.addRow("Observações", self.obs)
        self._ligar(self.nome, self.cliente, self.telefone, self.data, self.obs)

        # Tipo
        g, f = self._grupo("Tipo de móvel")
        self.tipo = _combo([(v["nome"], k) for k, v in PRESETS.items()])
        self.tipo.activated.connect(self._trocou_tipo)
        f.addRow("Tipo", self.tipo)
        dica = QLabel("Ao trocar o tipo, as medidas e a divisão são substituídas pelo modelo padrão.")
        dica.setWordWrap(True)
        dica.setStyleSheet("color: #666;")
        f.addRow(dica)

        # Medidas
        g, f = self._grupo("Medidas externas")
        self.largura = spin_decimal(10, 600, 1, 2, " cm")
        self.altura = spin_decimal(10, 300, 1, 2, " cm")
        self.profundidade = spin_decimal(10, 120, 1, 2, " cm")
        f.addRow("Largura", self.largura)
        f.addRow("Altura", self.altura)
        f.addRow("Profundidade", self.profundidade)
        self._ligar(self.largura, self.altura, self.profundidade)

        # Divisão – gavetas
        self.g_gav, f = self._grupo("Divisão (gavetas)")
        self.colunas = spin_inteiro(1, 6)
        self.gavetas = spin_inteiro(1, 12)
        self.distribuicao = _combo([("Iguais", "iguais"), ("Crescente (maiores embaixo)", "crescente")])
        self.alturas_pers = QLineEdit()
        self.alturas_pers.setPlaceholderText("opcional, ex.: 18; 0; 25  (cm, de cima p/ baixo, 0 = automático)")
        self.nicho = spin_decimal(0, 100, 1, 1, " cm")
        self.nicho.setToolTip("Nicho aberto no alto do móvel (0 = sem nicho)")
        f.addRow("Colunas", self.colunas)
        f.addRow("Gavetas por coluna", self.gavetas)
        f.addRow("Distribuição", self.distribuicao)
        f.addRow("Alturas das frentes", self.alturas_pers)
        f.addRow("Nicho superior", self.nicho)
        self._ligar(self.colunas, self.gavetas, self.distribuicao, self.alturas_pers, self.nicho)

        # Divisão – portas
        self.g_por, f = self._grupo("Divisão (portas)")
        self.portas = spin_inteiro(1, 8)
        self.prateleiras = spin_inteiro(0, 12)
        f.addRow("Número de portas", self.portas)
        f.addRow("Prateleiras por vão", self.prateleiras)
        self.dobradica = _combo([(n, n) for n in cat.nomes("dobradicas")])
        f.addRow("Dobradiça", self.dobradica)
        self._ligar(self.portas, self.prateleiras, self.dobradica)

        # Estrutura
        g, f = self._grupo("Estrutura")
        self.est_mat = CampoMaterial(cat)
        self.est_cor = CampoCor(cat)
        self.tampo = _combo([("Sobreposto (cobre as laterais)", "sobreposto"), ("Entre laterais", "entre_laterais")])
        self.base_tipo = _combo([("Rodapé", "rodape"), ("Pés", "pes"), ("Rodízios", "rodizios"), ("Nenhuma", "nenhuma")])
        self.base_altura = spin_decimal(0, 40, 0.5, 1, " cm")
        self.fundo_tipo = _combo([("Em rasgo", "rasgo"), ("Pregado atrás", "pregado")])
        self.fundo_mat = CampoMaterial(cat)
        self.fundo_cor = CampoCor(cat)
        f.addRow("Material", self.est_mat)
        f.addRow("Cor", self.est_cor)
        f.addRow("Tampo", self.tampo)
        f.addRow("Base", self.base_tipo)
        f.addRow("Altura da base", self.base_altura)
        f.addRow("Fundo", self.fundo_tipo)
        f.addRow("Material do fundo", self.fundo_mat)
        f.addRow("Cor do fundo", self.fundo_cor)
        self._ligar(self.est_mat, self.est_cor, self.tampo, self.base_tipo, self.base_altura, self.fundo_tipo,
                    self.fundo_mat, self.fundo_cor)

        # Frentes
        g, f = self._grupo("Frentes e puxadores")
        self.frente_tipo = _combo([("Sobrepostas", "sobrepostas"), ("Embutidas", "embutidas")])
        self.fr_mat = CampoMaterial(cat)
        self.fr_cor = CampoCor(cat)
        self.puxador = _combo([(n, n) for n in cat.nomes("puxadores")])
        self.puxador_pos = _combo([("Centralizado", "centro"), ("Superior", "superior"), ("Lateral (portas)", "lateral")])
        f.addRow("Tipo", self.frente_tipo)
        f.addRow("Material", self.fr_mat)
        f.addRow("Cor", self.fr_cor)
        f.addRow("Puxador", self.puxador)
        f.addRow("Posição", self.puxador_pos)
        self._ligar(self.frente_tipo, self.fr_mat, self.fr_cor, self.puxador, self.puxador_pos)

        # Gavetas (caixa e corrediça)
        self.g_cx, f = self._grupo("Gavetas (caixa e corrediça)")
        self.corredica = _combo([(n, n) for n in cat.nomes("corredicas")])
        self.corredica_comp = _combo([("Automático", "auto")] + [(f"{c} mm", str(c)) for c in range(250, 650, 50)])
        self.cx_mat = CampoMaterial(cat)
        self.cx_cor = CampoCor(cat)
        self.fcx_mat = CampoMaterial(cat)
        f.addRow("Corrediça", self.corredica)
        f.addRow("Comprimento", self.corredica_comp)
        f.addRow("Material da caixa", self.cx_mat)
        f.addRow("Cor da caixa", self.cx_cor)
        f.addRow("Fundo da caixa", self.fcx_mat)
        self._ligar(self.corredica, self.corredica_comp, self.cx_mat, self.cx_cor, self.fcx_mat)

        # Fita
        g, f = self._grupo("Fita de borda")
        self.fita = _combo([(n, n) for n in cat.nomes("fitas")])
        f.addRow("Modelo", self.fita)
        self._ligar(self.fita)

        # Folgas
        g, lay = self._grupo("Folgas (mm)")
        self.folgas = FolgasPainel()
        self.folgas.alterado.connect(self.alterado.emit)
        lay.addRow(self.folgas)

        # Orçamento
        g, f = self._grupo("Orçamento")
        self.mao_obra = spin_decimal(0, 1_000_000, 50, 2, " R$")
        self.margem = spin_decimal(0, 500, 1, 1, " %")
        f.addRow("Mão de obra", self.mao_obra)
        f.addRow("Margem", self.margem)
        self.tab_extras = QTableWidget(0, 3)
        self.tab_extras.setHorizontalHeaderLabels(["Item extra (LED, fechadura, vidro…)", "Qtd", "Preço un."])
        self.tab_extras.horizontalHeader().setStretchLastSection(False)
        self.tab_extras.setColumnWidth(0, 190)
        self.tab_extras.setColumnWidth(1, 45)
        self.tab_extras.setColumnWidth(2, 70)
        self.tab_extras.setFixedHeight(130)
        self.tab_extras.cellChanged.connect(self._mudou)
        botoes = QHBoxLayout()
        add = QPushButton("+ item")
        rem = QPushButton("− item")
        add.clicked.connect(self._add_extra)
        rem.clicked.connect(self._rem_extra)
        botoes.addWidget(add)
        botoes.addWidget(rem)
        botoes.addStretch(1)
        f.addRow(self.tab_extras)
        f.addRow(botoes)
        self._ligar(self.mao_obra, self.margem)

        self.layout_geral.addStretch(1)

        # cores criadas num campo aparecem nos demais
        self._campos_cor = [self.est_cor, self.fundo_cor, self.fr_cor, self.cx_cor]
        for c in self._campos_cor:
            c.cor_criada.connect(self._recarregar_cores)

    def _recarregar_cores(self) -> None:
        self._carregando = True
        for c in self._campos_cor:
            c.recarregar()
        self._carregando = False

    # ------------------------------------------------------------------------------------------
    def _add_extra(self) -> None:
        self.tab_extras.blockSignals(True)
        r = self.tab_extras.rowCount()
        self.tab_extras.insertRow(r)
        self.tab_extras.setItem(r, 0, QTableWidgetItem(""))
        self.tab_extras.setItem(r, 1, QTableWidgetItem("1"))
        self.tab_extras.setItem(r, 2, QTableWidgetItem("0"))
        self.tab_extras.blockSignals(False)
        self.tab_extras.editItem(self.tab_extras.item(r, 0))

    def _rem_extra(self) -> None:
        r = self.tab_extras.currentRow()
        if r >= 0:
            self.tab_extras.removeRow(r)
            self._mudou()

    def _trocou_tipo(self, _indice: int) -> None:
        tipo = self.tipo.currentData()
        data, nome, cliente, tel, obs = (self.projeto.data, self.projeto.nome, self.projeto.cliente,
                                         self.projeto.telefone, self.projeto.observacoes)
        aplicar_preset(self.projeto, tipo)
        self.projeto.data, self.projeto.cliente, self.projeto.telefone, self.projeto.observacoes = data, cliente, tel, obs
        self.carregar(self.projeto)
        self.alterado.emit()

    # ------------------------------------------------------------------------------------------
    def definir_projeto(self, projeto: Projeto) -> None:
        self.projeto = projeto
        self.carregar(projeto)

    def recarregar_catalogo(self) -> None:
        """Depois de editar o catálogo: atualiza as listas mantendo as escolhas."""
        p = self.projeto
        self._carregando = True
        for c in (self.est_cor, self.fundo_cor, self.fr_cor, self.cx_cor):
            c.recarregar()
        for m in (self.est_mat, self.fundo_mat, self.fr_mat, self.cx_mat, self.fcx_mat):
            m.recarregar()
        for combo, secao in ((self.puxador, "puxadores"), (self.corredica, "corredicas"),
                             (self.fita, "fitas"), (self.dobradica, "dobradicas")):
            atual = combo.currentData()
            combo.clear()
            for n in self.catalogo.nomes(secao):
                combo.addItem(n, n)
            i = combo.findData(atual)
            combo.setCurrentIndex(max(i, 0))
        self._carregando = False
        self.carregar(p)
        self.ler()

    def carregar(self, p: Projeto) -> None:
        self._carregando = True
        self.nome.setText(p.nome)
        self.cliente.setText(p.cliente)
        self.telefone.setText(p.telefone)
        self.data.setText(p.data or date.today().strftime("%d/%m/%Y"))
        self.obs.setPlainText(p.observacoes)
        self.tipo.setCurrentIndex(max(self.tipo.findData(p.tipo), 0))
        self.largura.setValue(p.largura)
        self.altura.setValue(p.altura)
        self.profundidade.setValue(p.profundidade)
        self.colunas.setValue(p.colunas)
        self.gavetas.setValue(p.gavetas_por_coluna)
        self.distribuicao.setCurrentIndex(max(self.distribuicao.findData(p.distribuicao), 0))
        self.alturas_pers.setText("; ".join(f"{v:g}" for v in p.alturas_personalizadas))
        self.nicho.setValue(p.nicho)
        self.portas.setValue(p.portas)
        self.prateleiras.setValue(p.prateleiras)
        self._definir_combo(self.dobradica, p.dobradica)
        self.est_mat.definir(p.estrutura_material, p.estrutura_esp)
        self.est_cor.definir(p.estrutura_padrao)
        self._definir_combo(self.tampo, p.tampo)
        self._definir_combo(self.base_tipo, p.base_tipo)
        self.base_altura.setValue(p.base_altura)
        self._definir_combo(self.fundo_tipo, p.fundo_tipo)
        self.fundo_mat.definir(p.fundo_material, p.fundo_esp)
        self.fundo_cor.definir(p.fundo_padrao)
        self._definir_combo(self.frente_tipo, p.frente_tipo)
        self.fr_mat.definir(p.frente_material, p.frente_esp)
        self.fr_cor.definir(p.frente_padrao)
        self._definir_combo(self.puxador, p.puxador)
        self._definir_combo(self.puxador_pos, p.puxador_posicao)
        self._definir_combo(self.corredica, p.corredica)
        self._definir_combo(self.corredica_comp, str(p.corredica_comp))
        self.cx_mat.definir(p.caixa_material, p.caixa_esp)
        self.cx_cor.definir(p.caixa_padrao)
        self.fcx_mat.definir(p.fundo_caixa_material, p.fundo_caixa_esp)
        self._definir_combo(self.fita, p.fita)
        self.mao_obra.setValue(p.mao_de_obra)
        self.margem.setValue(p.margem)
        self.tab_extras.blockSignals(True)
        self.tab_extras.setRowCount(0)
        for ex in p.extras:
            r = self.tab_extras.rowCount()
            self.tab_extras.insertRow(r)
            self.tab_extras.setItem(r, 0, QTableWidgetItem(str(ex.get("descricao", ""))))
            self.tab_extras.setItem(r, 1, QTableWidgetItem(str(ex.get("qtd", 1))))
            self.tab_extras.setItem(r, 2, QTableWidgetItem(str(ex.get("preco", 0))))
        self.tab_extras.blockSignals(False)
        self.folgas.definir_projeto(p)
        self._visibilidade(p.motor)
        self._carregando = False

    @staticmethod
    def _definir_combo(combo: QComboBox, valor) -> None:
        i = combo.findData(valor)
        combo.setCurrentIndex(max(i, 0))

    def _visibilidade(self, motor: str) -> None:
        self.g_gav.setVisible(motor == "gavetas")
        self.g_cx.setVisible(motor == "gavetas")
        self.g_por.setVisible(motor == "portas")

    def ler(self) -> None:
        """Copia os valores da tela para o projeto."""
        p = self.projeto
        p.nome, p.cliente, p.telefone = self.nome.text(), self.cliente.text(), self.telefone.text()
        p.data, p.observacoes = self.data.text(), self.obs.toPlainText()
        p.tipo = self.tipo.currentData()
        p.largura, p.altura, p.profundidade = self.largura.value(), self.altura.value(), self.profundidade.value()
        p.colunas, p.gavetas_por_coluna = self.colunas.value(), self.gavetas.value()
        p.distribuicao = self.distribuicao.currentData()
        p.alturas_personalizadas = self._ler_alturas()
        p.nicho = self.nicho.value()
        p.portas, p.prateleiras = self.portas.value(), self.prateleiras.value()
        p.dobradica = self.dobradica.currentData() or p.dobradica
        p.estrutura_material, p.estrutura_esp = self.est_mat.valor()
        p.estrutura_padrao = self.est_cor.valor()
        p.tampo = self.tampo.currentData()
        p.base_tipo = self.base_tipo.currentData()
        p.base_altura = self.base_altura.value()
        p.fundo_tipo = self.fundo_tipo.currentData()
        p.fundo_material, p.fundo_esp = self.fundo_mat.valor()
        p.fundo_padrao = self.fundo_cor.valor()
        p.frente_tipo = self.frente_tipo.currentData()
        p.frente_material, p.frente_esp = self.fr_mat.valor()
        p.frente_padrao = self.fr_cor.valor()
        p.puxador = self.puxador.currentData() or p.puxador
        p.puxador_posicao = self.puxador_pos.currentData()
        p.corredica = self.corredica.currentData() or p.corredica
        p.corredica_comp = self.corredica_comp.currentData()
        p.caixa_material, p.caixa_esp = self.cx_mat.valor()
        p.caixa_padrao = self.cx_cor.valor()
        p.fundo_caixa_material, p.fundo_caixa_esp = self.fcx_mat.valor()
        p.fita = self.fita.currentData() or p.fita
        p.mao_de_obra, p.margem = self.mao_obra.value(), self.margem.value()
        p.extras = self._ler_extras()
        self._visibilidade(p.motor)

    def _ler_alturas(self) -> list[float]:
        texto = self.alturas_pers.text().replace(",", ".")
        valores = []
        for parte in texto.replace(";", " ").split():
            try:
                valores.append(float(parte))
            except ValueError:
                pass
        return valores

    def _ler_extras(self) -> list[dict]:
        extras = []
        for r in range(self.tab_extras.rowCount()):
            def celula(c):
                it = self.tab_extras.item(r, c)
                return it.text().strip() if it else ""
            def numero(c, padrao):
                try:
                    return float(celula(c).replace(",", "."))
                except ValueError:
                    return padrao
            extras.append({"descricao": celula(0), "qtd": numero(1, 1.0), "preco": numero(2, 0.0)})
        return extras
