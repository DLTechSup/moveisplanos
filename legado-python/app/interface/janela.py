"""Janela principal: formulário à esquerda, preview em abas à direita."""
from __future__ import annotations

from pathlib import Path

from PySide6.QtCore import QSettings, Qt, QTimer
from PySide6.QtGui import QAction, QKeySequence
from PySide6.QtWidgets import (QApplication, QButtonGroup, QDialog, QFileDialog, QLabel, QMainWindow, QMessageBox,
                               QRadioButton, QSplitter, QToolBar, QVBoxLayout, QDialogButtonBox)

from ..calculo import calcular_projeto
from ..catalogo import Catalogo
from ..exportar import abrir_projeto, exportar_pdf, exportar_png, salvar_projeto
from ..formato import fmt_brl
from ..modelos import Projeto
from .catalogo_dialogo import CatalogoDialogo
from .formulario import Formulario
from .icones import icone_app
from .preview import Preview

FILTRO_PROJETO = "Projeto Projeta Móveis (*.pmv)"


class DialogoModo(QDialog):
    """Pergunta o que exportar: projeto completo, só técnico ou só a página do cliente."""

    OPCOES = [("completo", "Projeto completo (desenho técnico, corte, chapas e página do cliente)"),
              ("tecnico", "Somente técnico para o marceneiro (sem página do cliente)"),
              ("cliente", "Somente a página do cliente (3D, frontal, cores, medidas e valor)")]

    def __init__(self, parent, titulo: str, padrao: str = "completo"):
        super().__init__(parent)
        self.setWindowTitle(titulo)
        lay = QVBoxLayout(self)
        lay.addWidget(QLabel("O que deseja exportar?"))
        self.grupo = QButtonGroup(self)
        self.botoes = {}
        for chave, texto in self.OPCOES:
            b = QRadioButton(texto)
            b.setChecked(chave == padrao)
            self.grupo.addButton(b)
            self.botoes[chave] = b
            lay.addWidget(b)
        bb = QDialogButtonBox(QDialogButtonBox.Ok | QDialogButtonBox.Cancel)
        bb.accepted.connect(self.accept)
        bb.rejected.connect(self.reject)
        lay.addWidget(bb)

    def modo(self) -> str:
        return next(k for k, b in self.botoes.items() if b.isChecked())


class JanelaPrincipal(QMainWindow):
    def __init__(self, catalogo: Catalogo):
        super().__init__()
        self.catalogo = catalogo
        self.projeto = Projeto()
        self.caminho: Path | None = None
        self.modificado = False
        self.calc = None
        self.setWindowIcon(icone_app())
        self.resize(1500, 900)

        self.formulario = Formulario(self.projeto, catalogo)
        self.preview = Preview()
        divisor = QSplitter(Qt.Horizontal)
        divisor.addWidget(self.formulario)
        divisor.addWidget(self.preview)
        divisor.setStretchFactor(0, 0)
        divisor.setStretchFactor(1, 1)
        divisor.setSizes([440, 1060])
        self.setCentralWidget(divisor)

        self.barra_avisos = QLabel()
        self.barra_avisos.setMargin(6)
        self.barra_avisos.setWordWrap(True)
        self.total = QLabel()
        self.total.setStyleSheet("font-weight: bold; padding-right: 8px;")
        self.statusBar().addWidget(self.barra_avisos, 1)
        self.statusBar().addPermanentWidget(self.total)

        self._criar_acoes()
        self.timer = QTimer(self)
        self.timer.setSingleShot(True)
        self.timer.setInterval(150)
        self.timer.timeout.connect(self.recalcular)
        self.formulario.alterado.connect(self._alterado)
        self.recalcular()
        self._atualizar_titulo()

    # ---- ações -----------------------------------------------------------------------------
    def _criar_acoes(self) -> None:
        barra = QToolBar("Principal")
        barra.setMovable(False)
        barra.setToolButtonStyle(Qt.ToolButtonTextOnly)
        self.addToolBar(barra)

        def acao(texto, atalho, funcao, dica=""):
            a = QAction(texto, self)
            if atalho:
                a.setShortcut(QKeySequence(atalho))
            a.setToolTip(dica or texto)
            a.triggered.connect(funcao)
            barra.addAction(a)
            self.addAction(a)
            return a

        acao("Novo", "Ctrl+N", self.novo)
        acao("Abrir", "Ctrl+O", self.abrir)
        acao("Salvar", "Ctrl+S", self.salvar)
        acao("Salvar como", "Ctrl+Shift+S", self.salvar_como)
        barra.addSeparator()
        acao("Exportar PDF", "Ctrl+E", self.exportar_pdf, "Gera o PDF A3 (Ctrl+E)")
        acao("Exportar imagem", "Ctrl+Shift+E", self.exportar_imagem, "Gera uma imagem PNG por página")
        acao("PDF para o cliente", "", lambda: self.exportar_pdf("cliente"), "PDF só com a apresentação ao cliente")
        barra.addSeparator()
        acao("Catálogo", "Ctrl+K", self.editar_catalogo, "Materiais, cores, puxadores, corrediças e preços")

    # ---- fluxo de edição ----------------------------------------------------------------------
    def _alterado(self) -> None:
        self.modificado = True
        self._atualizar_titulo()
        self.timer.start()

    def recalcular(self) -> None:
        try:
            self.calc = calcular_projeto(self.projeto, self.catalogo)
        except Exception as erro:     # nunca deixa a janela quebrar por causa de um valor estranho
            self.barra_avisos.setText(f"Não foi possível calcular: {erro}")
            self.barra_avisos.setStyleSheet("background:#F8D7DA; color:#842029;")
            return
        self.formulario.folgas.atualizar(self.calc.resultado.folgas)
        self.preview.atualizar(self.calc)
        self._mostrar_avisos()

    def _mostrar_avisos(self) -> None:
        avisos = self.calc.resultado.avisos
        if not avisos:
            self.barra_avisos.setText("Sem avisos.")
            self.barra_avisos.setStyleSheet("background:#E8F3EA; color:#1F5D2B;")
        else:
            tem_erro = any(a.nivel == "erro" for a in avisos)
            self.barra_avisos.setText("  •  ".join(a.texto for a in avisos))
            self.barra_avisos.setStyleSheet("background:#F8D7DA; color:#842029;" if tem_erro
                                            else "background:#FFF3CD; color:#664D03;")
        orc = self.calc.orcamento
        self.total.setText(f"Total: {fmt_brl(orc.total)}" if orc.total > 0 else "Total: preencha os preços no Catálogo")

    def _atualizar_titulo(self) -> None:
        nome = self.caminho.name if self.caminho else "sem título"
        self.setWindowTitle(f"Projeta Móveis — {nome}{' *' if self.modificado else ''}")

    # ---- arquivos --------------------------------------------------------------------------------
    def _confirmar_descarte(self) -> bool:
        if not self.modificado:
            return True
        r = QMessageBox.question(self, "Projeto não salvo", "Há alterações não salvas. Salvar antes de continuar?",
                                 QMessageBox.Save | QMessageBox.Discard | QMessageBox.Cancel)
        if r == QMessageBox.Save:
            return self.salvar()
        return r == QMessageBox.Discard

    def novo(self) -> None:
        if not self._confirmar_descarte():
            return
        self._carregar_projeto(Projeto(), None)

    def abrir(self) -> None:
        if not self._confirmar_descarte():
            return
        caminho, _ = QFileDialog.getOpenFileName(self, "Abrir projeto", "", FILTRO_PROJETO)
        if not caminho:
            return
        try:
            projeto = abrir_projeto(caminho)
        except (OSError, ValueError, TypeError) as erro:
            QMessageBox.warning(self, "Abrir", f"Não foi possível abrir o arquivo:\n{erro}")
            return
        self._carregar_projeto(projeto, Path(caminho))

    def _carregar_projeto(self, projeto: Projeto, caminho: Path | None) -> None:
        self.projeto = projeto
        self.caminho = caminho
        self.formulario.definir_projeto(projeto)
        self.formulario.ler()
        self.modificado = False
        self.recalcular()
        self._atualizar_titulo()

    def salvar(self) -> bool:
        if self.caminho is None:
            return self.salvar_como()
        return self._gravar(self.caminho)

    def salvar_como(self) -> bool:
        sugestao = (self.projeto.nome or "projeto").replace("/", "-") + ".pmv"
        caminho, _ = QFileDialog.getSaveFileName(self, "Salvar projeto", sugestao, FILTRO_PROJETO)
        if not caminho:
            return False
        if not caminho.lower().endswith(".pmv"):
            caminho += ".pmv"
        return self._gravar(Path(caminho))

    def _gravar(self, caminho: Path) -> bool:
        try:
            salvar_projeto(self.projeto, caminho)
        except OSError as erro:
            QMessageBox.warning(self, "Salvar", f"Não foi possível salvar:\n{erro}")
            return False
        self.caminho = caminho
        self.modificado = False
        self._atualizar_titulo()
        self.statusBar().showMessage(f"Projeto salvo em {caminho}", 4000)
        return True

    # ---- exportação ------------------------------------------------------------------------------
    def _nome_base(self, sufixo: str = "") -> str:
        base = (self.projeto.nome or "projeto").strip().replace("/", "-")
        if self.projeto.cliente:
            base += f" - {self.projeto.cliente.strip()}"
        return base + sufixo

    def exportar_pdf(self, modo: str | None = None) -> None:
        self.recalcular()
        if modo is None:
            d = DialogoModo(self, "Exportar PDF")
            if d.exec() != QDialog.Accepted:
                return
            modo = d.modo()
        sufixo = " (cliente)" if modo == "cliente" else ""
        pasta = str(self.caminho.parent) if self.caminho else ""
        caminho, _ = QFileDialog.getSaveFileName(self, "Exportar PDF", str(Path(pasta) / (self._nome_base(sufixo) + ".pdf")),
                                                 "PDF (*.pdf)")
        if not caminho:
            return
        if not caminho.lower().endswith(".pdf"):
            caminho += ".pdf"
        QApplication.setOverrideCursor(Qt.WaitCursor)
        try:
            n = exportar_pdf(self.calc, caminho, modo)
        except Exception as erro:
            QApplication.restoreOverrideCursor()
            QMessageBox.warning(self, "Exportar PDF", f"Falha ao gerar o PDF:\n{erro}")
            return
        QApplication.restoreOverrideCursor()
        self.statusBar().showMessage(f"PDF com {n} página(s) salvo em {caminho}", 6000)

    def exportar_imagem(self) -> None:
        self.recalcular()
        d = DialogoModo(self, "Exportar imagem")
        if d.exec() != QDialog.Accepted:
            return
        modo = d.modo()
        sufixo = " (cliente)" if modo == "cliente" else ""
        pasta = str(self.caminho.parent) if self.caminho else ""
        caminho, _ = QFileDialog.getSaveFileName(self, "Exportar imagem (um PNG por página)",
                                                 str(Path(pasta) / (self._nome_base(sufixo) + ".png")), "Imagem PNG (*.png)")
        if not caminho:
            return
        QApplication.setOverrideCursor(Qt.WaitCursor)
        try:
            arquivos = exportar_png(self.calc, caminho, modo)
        except Exception as erro:
            QApplication.restoreOverrideCursor()
            QMessageBox.warning(self, "Exportar imagem", f"Falha ao gerar as imagens:\n{erro}")
            return
        QApplication.restoreOverrideCursor()
        self.statusBar().showMessage(f"{len(arquivos)} imagem(ns) salva(s) em {arquivos[0].parent}", 6000)

    # ---- catálogo -------------------------------------------------------------------------------------
    def editar_catalogo(self) -> None:
        d = CatalogoDialogo(self.catalogo, self)
        if d.exec() == QDialog.Accepted:
            self.formulario.recarregar_catalogo()
            self.modificado = True
            self._atualizar_titulo()
            self.recalcular()

    def closeEvent(self, evento) -> None:
        if self._confirmar_descarte():
            evento.accept()
        else:
            evento.ignore()
