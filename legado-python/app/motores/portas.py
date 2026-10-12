"""Motor de portas: armário, balcão de portas, sapateira."""
from __future__ import annotations

from math import ceil

from ..catalogo import Catalogo
from ..folgas import Folgas
from ..modelos import Bloco, Ferragem, Peca, Projeto, Resultado
from .base import Estrutura, colocar_puxador, numero_dobradicas


def calcular_portas(p: Projeto, cat: Catalogo, fo: Folgas, res: Resultado, E: Estrutura) -> None:
    n = max(1, int(p.portas))
    e, fe = E.e, E.fe
    g = fo["entre_frentes"]
    c = fo["contorno_embutida"]
    B = res.blocos

    # ---- portas --------------------------------------------------------------------
    if E.sobrepostas:
        y_ini = E.y0 + E.rod
        altura = E.topo_lat - y_ini
        larg = (E.L - (n - 1) * g) / n
        x0 = 0.0
    else:
        y_ini = E.ybase_int + c
        altura = E.Hi - 2 * c
        larg = (E.L - 2 * e - 2 * c - (n - 1) * g) / n
        x0 = e + c
    if larg > 600:
        res.aviso("aviso", f"Porta com {larg / 10:.1f} cm de largura: acima de 60 cm pode empenar.")
    if altura > 2400:
        res.aviso("aviso", "Porta com mais de 2,4 m de altura.")

    qtd_dob = numero_dobradicas(altura)
    pid = res.add_peca(Peca("Porta", n, round(altura, 3), round(larg, 3), p.frente_esp, p.frente_material,
                            p.frente_padrao, 2, 2, True, f"{qtd_dob} dobradiças"))
    posicoes_y = _posicoes_dobradicas(altura, qtd_dob)
    for i in range(n):
        x = x0 + i * (larg + g)
        B.append(Bloco(f"Porta {i + 1}", "porta", x, y_ini, E.P - fe, larg, altura, fe, "frente", "y", pid, i))
        dobradica_esq = i < (n + 1) // 2 if n > 1 else True
        if n % 2 == 1 and i == n // 2:
            dobradica_esq = True
        x_livre = x + larg - 45 if dobradica_esq else x + 45
        colocar_puxador(p, cat, res, x, y_ini, larg, altura, E.P, vertical=True, x_livre=x_livre)
        res.dobradicas.append(list(posicoes_y))
        res.medidas.setdefault("portas_lado", []).append("esq" if dobradica_esq else "dir")

    res.medidas.update({"porta_larg": larg, "porta_alt": altura, "porta_y": y_ini, "porta_x0": x0,
                        "n_portas": n, "dobradicas_por_porta": qtd_dob,
                        "frente_largura": larg, "frentes_altura": [altura]})

    # ---- prateleiras -------------------------------------------------------------------
    nprat = max(0, int(p.prateleiras))
    prat_w = E.vao - fo["prat_largura"]
    prat_d = E.Dint - fo["prat_recuo"]
    if nprat > 0 and prat_d > 0:
        pid_p = res.add_peca(Peca("Prateleira", nprat * E.colunas, round(prat_w, 3), round(prat_d, 3), e,
                                  p.estrutura_material, p.estrutura_padrao, 1, 0, True))
        livre = (E.Hi - nprat * e) / (nprat + 1)
        ys = []
        for k in range(1, nprat + 1):
            y = E.ybase_int + k * livre + (k - 1) * e
            ys.append(y)
            for col in range(E.colunas):
                xc = E.col_x[col] + (E.vao - prat_w) / 2
                B.append(Bloco("Prateleira", "prateleira", xc, y, E.z_front_inner - E.Dint, prat_w, e, prat_d,
                               "estrutura", "x", pid_p))
        res.medidas["prateleiras_y"] = ys
        res.medidas["vao_prateleira"] = livre

    # ---- ferragens ------------------------------------------------------------------------
    dob = cat.dobradica(p.dobradica)
    res.ferragens.append(Ferragem(dob["nome"], n * qtd_dob, "un", "dobradiça", ""))
    px = cat.puxador(p.puxador)
    if px["tipo"] in ("cava_usinada", "perfil_cava"):
        res.ferragens.append(Ferragem(px["nome"] if px["tipo"] == "perfil_cava" else "Usinagem de cava", n,
                                      "un" if px["tipo"] == "cava_usinada" else "peça", "puxador", ""))
    elif px["tipo"] != "toque":
        res.ferragens.append(Ferragem(px["nome"], n, "un", "puxador", ""))
    res.definicoes.append(f"{qtd_dob} dobradiças por porta; furo de caneco a 100 mm das pontas.")


def _posicoes_dobradicas(altura: float, qtd: int) -> list[float]:
    """Alturas (a partir da base da porta) das dobradiças."""
    margem = 100.0
    if qtd == 1:
        return [altura / 2]
    passo = (altura - 2 * margem) / (qtd - 1)
    return [margem + i * passo for i in range(qtd)]
