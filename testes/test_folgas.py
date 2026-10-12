import pytest

from app.catalogo import Catalogo
from app.folgas import Folgas
from app.modelos import Projeto
from app.motores import calcular


def test_valores_automaticos():
    f = Folgas(lateral_corredica=12.7)
    assert f["entre_frentes"] == 3
    assert f["lateral_corredica"] == 12.7
    assert f.valor("topo_caixa", vao_gaveta=240) == 25
    assert f.valor("topo_caixa", vao_gaveta=120) == 15


def test_folga_travada_prevalece_e_altera_o_calculo():
    p = Projeto()
    p.folgas_travadas = {"entre_frentes": 5}
    res = calcular(p, Catalogo())
    frente = [x for x in res.pecas if x.nome == "Frente de gaveta"][0]
    assert frente.comp == pytest.approx((1400 - 5) / 2)
    assert frente.larg == pytest.approx((735 - 2 * 5) / 3, abs=1e-3)


def test_folga_fora_da_faixa_gera_aviso():
    p = Projeto()
    p.folgas_travadas = {"entre_frentes": 20}
    res = calcular(p, Catalogo())
    assert res.folgas["entre_frentes"]["fora"]
    assert any("Entre frentes" in a.texto for a in res.avisos)


def test_corredica_oculta_usa_folga_de_21mm():
    p = Projeto()
    p.corredica = "Oculta"
    res = calcular(p, Catalogo())
    assert res.medidas["caixa"]["larg"] == int((677.5 - 42) // 1)
