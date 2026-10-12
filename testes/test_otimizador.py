from app.calculo import calcular_projeto
from app.catalogo import Catalogo
from app.modelos import Peca, Projeto, Resultado
from app.otimizador import otimizar


def test_comoda_cabe_em_duas_chapas_de_mdf_15():
    p = Projeto()
    p.estrutura_padrao = p.frente_padrao = p.caixa_padrao = "Branco"
    calc = calcular_projeto(p, Catalogo())
    assert calc.plano.total_chapas("MDF", 15) == 2


def test_pecas_nao_se_sobrepoem_e_ficam_dentro():
    calc = calcular_projeto(Projeto(), Catalogo())
    for g in calc.plano.grupos:
        for chapa in g.chapas:
            ps = chapa.pecas
            for a in ps:
                assert a.x >= -1e-6 and a.y >= -1e-6
                assert a.x + a.w <= g.comprimento - 20 + 1e-6
                assert a.y + a.h <= g.largura - 20 + 1e-6
            for i, a in enumerate(ps):
                for b in ps[i + 1:]:
                    sobrepoe = a.x < b.x + b.w and b.x < a.x + a.w and a.y < b.y + b.h and b.y < a.y + a.h
                    assert not sobrepoe


def test_peca_com_veio_nao_gira_e_peca_livre_gira():
    cat = Catalogo()
    res = Resultado()
    res.pecas = [Peca("Longa", 1, 2000, 100, 15, "MDF", "Branco", veio=True, id=1)]
    plano = otimizar(res, cat)
    assert not plano.grupos[0].chapas[0].pecas[0].girada
    res2 = Resultado()
    res2.pecas = [Peca("Larga", 1, 1700, 2400, 15, "MDF", "Branco", veio=False, id=1)]
    plano2 = otimizar(res2, cat)
    assert plano2.grupos[0].chapas[0].pecas[0].girada


def test_peca_maior_que_a_chapa_gera_aviso():
    res = Resultado()
    res.pecas = [Peca("Gigante", 1, 3000, 100, 15, "MDF", "Branco", veio=True, id=1)]
    otimizar(res, Catalogo())
    assert any("maior que a chapa" in a.texto for a in res.avisos)
