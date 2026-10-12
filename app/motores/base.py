"""Estrutura comum a todos os móveis: laterais, tampo, base, rodapé/pés, fundo, divisórias."""
from __future__ import annotations

from dataclasses import dataclass
from math import ceil

from ..catalogo import Catalogo
from ..folgas import Folgas
from ..modelos import Bloco, Ferragem, Peca, Projeto, Puxador, Resultado


@dataclass
class Estrutura:
    L: float
    H: float
    P: float
    e: float            # espessura da estrutura
    f: float            # espessura do fundo
    fe: float           # espessura das frentes
    y0: float           # altura dos pés/rodízios
    rod: float          # altura do rodapé
    topo_lat: float
    ytop_int: float
    ybase_int: float
    Hi: float
    z_lat0: float
    Dlat: float
    Dint: float
    z_front_inner: float
    z_fundo_face: float
    colunas: int
    vao: float
    col_x: list
    rasgo: bool
    sobrepostas: bool
    r: float            # profundidade do rasgo
    s: float            # sobra do encaixe
    dist: float         # distância do rasgo à traseira


def construir_estrutura(p: Projeto, cat: Catalogo, fo: Folgas, res: Resultado, colunas: int) -> Estrutura:
    L, H, P = p.largura * 10, p.altura * 10, p.profundidade * 10
    e, f, fe = p.estrutura_esp, p.fundo_esp, p.frente_esp
    rasgo = p.fundo_tipo == "rasgo"
    sobrepostas = p.frente_tipo == "sobrepostas"
    r, s, dist = fo["rasgo_prof"], fo["rasgo_sobra"], fo["rasgo_dist"]

    y0 = p.base_altura * 10 if p.base_tipo in ("pes", "rodizios") else 0.0
    rod = p.base_altura * 10 if p.base_tipo == "rodape" else 0.0
    topo_lat = H - e if p.tampo == "sobreposto" else H
    ytop_int = H - e
    ybase_int = y0 + rod + e
    Hi = ytop_int - ybase_int

    z_lat0 = 0.0 if rasgo else f
    Dlat = (P - fe if sobrepostas else P) - (0.0 if rasgo else f)
    z_front_inner = P - fe
    z_fundo_face = z_lat0 + (dist + f if rasgo else 0.0)
    Dint = z_front_inner - z_fundo_face

    util = L - 2 * e - (colunas - 1) * e
    vao = util / colunas
    col_x = [e + k * (vao + e) for k in range(colunas)]

    est = Estrutura(L, H, P, e, f, fe, y0, rod, topo_lat, ytop_int, ybase_int, Hi, z_lat0, Dlat,
                    Dint, z_front_inner, z_fundo_face, colunas, vao, col_x, rasgo, sobrepostas,
                    r, s, dist)
    _pecas_estrutura(p, fo, res, est)
    res.medidas.update({
        "L": L, "H": H, "P": P, "e": e, "y0": y0, "rod": rod, "Hi": Hi, "vao": vao,
        "Dlat": Dlat, "Dint": Dint, "topo_lat": topo_lat, "ybase_int": ybase_int,
        "ytop_int": ytop_int, "colunas": colunas, "z_lat0": z_lat0,
    })
    return est


def _peca(p: Projeto, nome, qtd, comp, larg, fita_c=0, fita_l=0, veio=True, **kw) -> Peca:
    return Peca(nome, qtd, round(comp, 3), round(larg, 3), kw.get("esp", p.estrutura_esp),
                kw.get("material", p.estrutura_material), kw.get("padrao", p.estrutura_padrao),
                fita_c, fita_l, veio, kw.get("obs", ""))


def _pecas_estrutura(p: Projeto, fo: Folgas, res: Resultado, E: Estrutura) -> None:
    L, H, P, e, f = E.L, E.H, E.P, E.e, E.f
    B = res.blocos

    # Tampo
    if p.tampo == "sobreposto":
        pid = res.add_peca(_peca(p, "Tampo", 1, L, P, 1, 2))
        B.append(Bloco("Tampo", "tampo", 0, H - e, 0, L, e, P, "estrutura", "x", pid))
    else:
        pid = res.add_peca(_peca(p, "Tampo", 1, L - 2 * e, E.Dlat, 1, 0))
        B.append(Bloco("Tampo", "tampo", e, H - e, E.z_lat0, L - 2 * e, e, E.Dlat, "estrutura", "x", pid))

    # Laterais
    alt_lat = E.topo_lat - E.y0
    pid = res.add_peca(_peca(p, "Lateral", 2, alt_lat, E.Dlat, 1, 0))
    B.append(Bloco("Lateral esquerda", "lateral", 0, E.y0, E.z_lat0, e, alt_lat, E.Dlat, "estrutura", "y", pid))
    B.append(Bloco("Lateral direita", "lateral", L - e, E.y0, E.z_lat0, e, alt_lat, E.Dlat, "estrutura", "y", pid))

    # Base
    pid = res.add_peca(_peca(p, "Base", 1, L - 2 * e, E.Dlat, 1, 0))
    B.append(Bloco("Base", "base", e, E.y0 + E.rod, E.z_lat0, L - 2 * e, e, E.Dlat, "estrutura", "x", pid))

    # Rodapé
    if E.rod > 0:
        recuo = fo["recuo_rodape"]
        z2 = P - recuo
        z1 = z2 - e
        if z1 < E.z_lat0:
            res.aviso("aviso", "Recuo do rodapé grande demais: o rodapé ultrapassa a traseira.")
            z1, z2 = E.z_lat0, E.z_lat0 + e
        pid = res.add_peca(_peca(p, "Rodapé", 1, L - 2 * e, E.rod, 1, 0))
        B.append(Bloco("Rodapé", "rodape", e, 0, z1, L - 2 * e, E.rod, e, "estrutura", "x", pid))

    # Pés / rodízios
    if p.base_tipo in ("pes", "rodizios"):
        n = 6 if L > 1200 else 4
        tam = 40.0
        xs = [20.0, L - 20.0 - tam]
        if n == 6:
            xs.insert(1, (L - tam) / 2)
        zs = [E.z_lat0 + 20.0, E.z_lat0 + E.Dlat - 20.0 - tam]
        grupo = "pe" if p.base_tipo == "pes" else "rodizio"
        for z in zs:
            for x in xs:
                B.append(Bloco("Pé" if grupo == "pe" else "Rodízio", grupo, x, 0, z, tam, E.y0, tam, "ferragem"))
        res.insumos[grupo if grupo == "pe" else "rodizio"] = n
        res.ferragens.append(Ferragem("Pé regulável" if grupo == "pe" else "Rodízio com trava", n, "un",
                                      "base", f"altura {E.y0 / 10:g} cm"))

    # Divisórias
    if E.colunas > 1:
        z1 = E.z_fundo_face
        comp_div = E.Hi
        larg_div = E.z_lat0 + E.Dlat - z1
        pid = res.add_peca(_peca(p, "Divisória", E.colunas - 1, comp_div, larg_div, 1, 0))
        for k in range(E.colunas - 1):
            x = E.col_x[k] + E.vao
            B.append(Bloco(f"Divisória {k + 1}", "divisoria", x, E.ybase_int, z1, e, E.Hi, larg_div, "estrutura", "y", pid))

    # Fundo do móvel
    if E.rasgo:
        r, s = E.r, E.s
        w = L - 2 * e + 2 * (r - s)
        h = E.Hi + 2 * (r - s)
        pid = res.add_peca(_peca(p, "Fundo do móvel", 1, w, h, 0, 0, False, esp=f,
                                 material=p.fundo_material, padrao=p.fundo_padrao, obs="em rasgo"))
        B.append(Bloco("Fundo", "fundo", e - (r - s), E.ybase_int - (r - s), E.dist, w, h, f, "fundo", "", pid))
    else:
        w = L - 2
        h = alt_lat - 2
        pid = res.add_peca(_peca(p, "Fundo do móvel", 1, w, h, 0, 0, False, esp=f,
                                 material=p.fundo_material, padrao=p.fundo_padrao, obs="pregado"))
        B.append(Bloco("Fundo", "fundo", 1, E.y0 + 1, 0, w, h, f, "fundo", "", pid))


def distribuir(total: float, n: int, pesos: list[float], fixos: list[float] | None = None) -> list[float]:
    """Divide `total` em n partes proporcionais aos pesos; `fixos` (mm, 0 = livre) mantêm o valor."""
    fixos = list(fixos or [0.0] * n) + [0.0] * n
    fixos = fixos[:n]
    soma_fixos = sum(v for v in fixos if v > 0)
    livres = [i for i in range(n) if fixos[i] <= 0]
    restante = max(total - soma_fixos, 0.0)
    soma_pesos = sum(pesos[i] for i in livres) or 1.0
    saida = []
    for i in range(n):
        saida.append(fixos[i] if fixos[i] > 0 else restante * pesos[i] / soma_pesos)
    return saida


def pesos_gavetas(p: Projeto, n: int) -> list[float]:
    if p.distribuicao == "crescente":
        return [1.0 + 0.15 * i for i in range(n)]
    return [1.0] * n


def numero_dobradicas(altura_mm: float) -> int:
    if altura_mm <= 900:
        return 2
    if altura_mm <= 1600:
        return 3
    return 4


def colocar_puxador(p: Projeto, cat: Catalogo, res: Resultado, fx: float, fy: float, fw: float,
                    fh: float, z_face: float, vertical: bool = False, x_livre: float | None = None) -> None:
    """Posiciona o puxador numa frente (fx,fy = canto inferior esquerdo)."""
    px = cat.puxador(p.puxador)
    tipo = px["tipo"]
    if tipo == "toque":
        return
    comp = float(px.get("comprimento") or 0)
    cx, cy = fx + fw / 2, fy + fh / 2
    if tipo == "perfil_cava":
        res.puxadores.append(Puxador(cx, fy + fh - 12, z_face, tipo, fw, False, fx, fy, fw, fh))
        return
    if tipo == "cava_usinada":
        res.puxadores.append(Puxador(cx, fy + fh - 15, z_face, tipo, min(comp or 150, fw - 40), False, fx, fy, fw, fh))
        return
    if p.puxador_posicao == "superior" and not vertical:
        cy = fy + fh - 45
    if vertical:
        if x_livre is not None:
            cx = x_livre
        if fh > 1200:
            cy = fy + min(1000.0 - fy, fh - 150)
            cy = max(cy, fy + 150)
    maximo = (fh if vertical else fw) - 40
    if tipo in ("barra", "concha"):
        comp = min(comp or 128, maximo)
    res.puxadores.append(Puxador(cx, cy, z_face, tipo, comp, vertical, fx, fy, fw, fh))
