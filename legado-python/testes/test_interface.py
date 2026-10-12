"""Testes de fumaça da interface e da exportação (rodam sem tela, com Qt offscreen)."""
import pytest

pytest.importorskip("PySide6")

from PySide6.QtWidgets import QApplication

from app.calculo import calcular_projeto
from app.catalogo import Catalogo
from app.exportar import exportar_pdf, exportar_png, abrir_projeto, salvar_projeto
from app.modelos import Projeto
from app.tipos import PRESETS, aplicar_preset


@pytest.fixture(scope="module")
def qapp():
    return QApplication.instance() or QApplication([])


@pytest.mark.parametrize("tipo", list(PRESETS))
def test_todos_os_presets_calculam_sem_erro(tipo):
    p = Projeto()
    aplicar_preset(p, tipo)
    calc = calcular_projeto(p, Catalogo())
    assert calc.resultado.pecas
    assert not [a for a in calc.resultado.avisos if a.nivel == "erro"], calc.resultado.avisos


def test_pdf_da_comoda_tem_pelo_menos_3_paginas(qapp, tmp_path):
    p = Projeto()
    calc = calcular_projeto(p, Catalogo())
    destino = tmp_path / "comoda.pdf"
    n = exportar_pdf(calc, destino)
    assert n >= 3
    dados = destino.read_bytes()
    assert dados.startswith(b"%PDF")
    assert dados.count(b"/Type /Page\n") + dados.count(b"/Type /Page ") >= 3 or n >= 3


def test_pdf_do_cliente_tem_uma_pagina(qapp, tmp_path):
    calc = calcular_projeto(Projeto(), Catalogo())
    assert exportar_pdf(calc, tmp_path / "c.pdf", "cliente") == 1


def test_png_por_pagina(qapp, tmp_path):
    calc = calcular_projeto(Projeto(), Catalogo())
    arquivos = exportar_png(calc, tmp_path / "proj", "tecnico", largura_px=800)
    assert len(arquivos) >= 3 and all(a.exists() and a.stat().st_size > 1000 for a in arquivos)


def test_salvar_e_abrir_projeto(tmp_path):
    p = Projeto()
    p.largura = 123.5
    p.folgas_travadas = {"entre_frentes": 4}
    salvar_projeto(p, tmp_path / "a.pmv")
    q = abrir_projeto(tmp_path / "a.pmv")
    assert q.largura == 123.5 and q.folgas_travadas == {"entre_frentes": 4}


def test_catalogo_criado_na_primeira_execucao_e_relido(tmp_path):
    caminho = tmp_path / "pasta" / "catalogo.json"
    assert not caminho.exists()
    c1 = Catalogo.carregar(caminho)
    assert caminho.exists()
    c1.adicionar_padrao("Cor de teste", "#123456")
    c1.salvar(caminho)
    c2 = Catalogo.carregar(caminho)
    assert c2.padrao("Cor de teste")["cor"] == "#123456"
    assert "Carvalho claro" in c2.nomes("padroes")


def test_janela_principal_atualiza_ao_mudar_a_largura(qapp, tmp_path, monkeypatch):
    monkeypatch.setenv("PROJETA_DADOS", str(tmp_path))
    from app.interface.janela import JanelaPrincipal
    j = JanelaPrincipal(Catalogo.carregar())
    antes = [x for x in j.calc.resultado.pecas if x.nome == "Tampo"][0].comp
    j.formulario.largura.setValue(160)
    j.recalcular()
    depois = [x for x in j.calc.resultado.pecas if x.nome == "Tampo"][0].comp
    assert antes == 1400 and depois == 1600
    # editar uma folga a trava
    j.formulario.folgas.linhas["entre_frentes"][1].setValue(5)
    assert j.projeto.folgas_travadas["entre_frentes"] == 5
    j.recalcular()
    assert j.calc.resultado.folgas["entre_frentes"]["travada"]
    j.formulario.folgas._restaurar("entre_frentes")
    assert "entre_frentes" not in j.projeto.folgas_travadas
    # trocar de tipo
    j.formulario.tipo.setCurrentIndex(j.formulario.tipo.findData("armario_2_portas"))
    j.formulario._trocou_tipo(0)
    j.recalcular()
    assert j.projeto.motor == "portas" and j.calc.resultado.dobradicas
    # todas as abas desenham
    for i in range(j.preview.count()):
        j.preview.setCurrentIndex(i)
        j.preview.currentWidget().grab()
