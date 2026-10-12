"""Caso de referência da seção 7.7 do PLANO.md: a cômoda 140 × 80 × 52 cm."""
import pytest

from app.catalogo import Catalogo
from app.modelos import Projeto
from app.motores import calcular


@pytest.fixture(scope="module")
def cat():
    return Catalogo()


def projeto_referencia() -> Projeto:
    p = Projeto()
    p.estrutura_padrao = p.frente_padrao = p.caixa_padrao = p.fundo_padrao = "Branco"
    return p


@pytest.fixture(scope="module")
def res(cat):
    return calcular(projeto_referencia(), cat)


def peca(res, nome):
    achadas = [x for x in res.pecas if x.nome == nome]
    assert len(achadas) == 1, f"{nome}: {len(achadas)} linhas"
    return achadas[0]


ESPERADO = [
    # nome, qtd, comp (mm), larg (mm)
    ("Tampo", 1, 1400, 520),
    ("Lateral", 2, 785, 505),
    ("Divisória", 1, 720, 489),
    ("Base", 1, 1370, 505),
    ("Rodapé", 1, 1370, 50),
    ("Frente de gaveta", 6, 698.5, 243),
    ("Lateral da gaveta", 12, 450, 200),
    ("Frente/traseira da gaveta", 12, 622, 200),
    ("Fundo da gaveta", 6, 636, 434),
    ("Fundo do móvel", 1, 1384, 734),
]


@pytest.mark.parametrize("nome,qtd,comp,larg", ESPERADO)
def test_pecas_da_referencia(res, nome, qtd, comp, larg):
    x = peca(res, nome)
    assert x.qtd == qtd
    assert x.comp == pytest.approx(comp, abs=1e-6)
    assert x.larg == pytest.approx(larg, abs=1e-6)


def test_materiais_da_referencia(res):
    assert peca(res, "Fundo do móvel").material == "HDF"
    assert peca(res, "Fundo do móvel").esp == 6
    assert peca(res, "Fundo da gaveta").material == "MDF"
    assert peca(res, "Fundo da gaveta").esp == 6
    assert peca(res, "Lateral").esp == 15


def test_conferencias(res):
    m = res.medidas
    # rodapé 5 + base 1,5 + vão 72 + tampo 1,5 = 80
    assert m["rod"] + 15 + m["Hi"] + 15 == pytest.approx(800)
    # 3 × 1,5 + 2 × 67,75 = 140
    assert 3 * 15 + 2 * m["vao"] == pytest.approx(1400)
    # caixa 65,2 + 2 × 1,27 = 67,74 ≤ 67,75
    caixa = m["caixa"]["larg"]
    assert caixa == 652
    assert caixa + 2 * 12.7 <= m["vao"] + 1e-9


def test_sem_avisos_na_referencia(res):
    assert res.avisos == []


def test_ferragens(res):
    nomes = {f.nome: f for f in res.ferragens}
    assert nomes["Telescópica 45 kg"].qtd == 6
    assert nomes["Telescópica 45 kg"].detalhe == "450 mm"
