"""Motor de gavetas: cômoda, gaveteiro, criado-mudo, balcão de gavetas."""
from __future__ import annotations

from math import floor

from ..catalogo import Catalogo
from ..folgas import Folgas
from ..modelos import Bloco, Ferragem, Peca, Projeto, Resultado
from .base import Estrutura, colocar_puxador, distribuir, pesos_gavetas


def calcular_gavetas(p: Projeto, cat: Catalogo, fo: Folgas, res: Resultado, E: Estrutura) -> None:
    n = max(1, int(p.gavetas_por_coluna))
    cols = E.colunas
    e, fe = E.e, E.fe
    g = fo["entre_frentes"]
    c = fo["contorno_embutida"]
    nicho = p.nicho * 10
    B = res.blocos

    # ---- nicho aberto superior (prateleira fixa) ---------------------------
    if nicho > 0:
        y_prat = E.ytop_int - nicho - e
        pid = res.add_peca(Peca("Prateleira fixa do nicho", cols, round(E.vao, 3), round(E.Dint, 3), e,
                                p.estrutura_material, p.estrutura_padrao, 1, 0, True))
        for k in range(cols):
            B.append(Bloco("Prateleira do nicho", "prateleira", E.col_x[k], y_prat, E.z_front_inner - E.Dint,
                           E.vao, e, E.Dint, "estrutura", "x", pid))
        zona_int = E.Hi - nicho - e
        y_topo_frentes = E.ytop_int - nicho
        res.medidas["nicho"] = nicho
    else:
        zona_int = E.Hi
        y_topo_frentes = E.topo_lat
    y_base_frentes = E.y0 + E.rod

    # ---- alturas das frentes (de cima para baixo) ---------------------------
    pesos = pesos_gavetas(p, n)
    fixos = [float(v) * 10 for v in (p.alturas_personalizadas or [])]
    if E.sobrepostas:
        zona_frentes = y_topo_frentes - y_base_frentes
        topo_f = y_topo_frentes
        total_util = zona_frentes - (n - 1) * g
        larg_f = (E.L - (cols - 1) * g) / cols
        xs_f = [k * (larg_f + g) for k in range(cols)]
    else:
        topo_f = E.ybase_int + zona_int - c
        total_util = zona_int - 2 * c - (n - 1) * g
        larg_f = E.vao - 2 * c
        xs_f = [x + c for x in E.col_x]
    alt_f = distribuir(total_util, n, pesos, fixos)
    soma_f = sum(alt_f)

    # ---- corrediça ------------------------------------------------------------
    cor = cat.corredica(p.corredica)
    lat_corr = fo["lateral_corredica"]
    trasei = fo["traseira_corredica"]
    comprimentos = sorted(cor["comprimentos"])
    if str(p.corredica_comp).lower() == "auto":
        cabem = [x for x in comprimentos if x <= E.Dint - trasei + 1e-9]
        if cabem:
            comp_corr = float(cabem[-1])
        else:
            comp_corr = float(comprimentos[0])
            res.aviso("erro", "Profundidade insuficiente para a menor corrediça do catálogo.")
    else:
        comp_corr = float(p.corredica_comp)
        if comp_corr > E.Dint - trasei + 1e-9:
            res.aviso("aviso", f"Corrediça de {comp_corr:g} mm é grande demais para a profundidade útil.")

    ec = p.caixa_esp
    r, s = E.r, E.s
    w_caixa = floor(E.vao - 2 * lat_corr + 1e-6)
    prof = comp_corr

    # ---- posições de frentes e vãos ---------------------------------------------
    y_top_slot = E.ybase_int + zona_int
    y_f = topo_f
    caixas_info = []
    pecas_ids = {}
    gaveta_idx = 0
    caixa_alts, vaos_gaveta, frente_ys = [], [], []

    for i in range(n):
        hf = alt_f[i]
        slot = hf * zona_int / soma_f
        y_f -= hf
        frente_ys.append((y_f, hf))
        y_slot_base = y_top_slot - slot
        y_top_slot = y_slot_base
        topo_cx = fo.valor("topo_caixa", vao_gaveta=slot)
        fundo_cx = fo["fundo_caixa"]
        alt_cx = floor(min(slot - topo_cx - fundo_cx, hf - 30) + 1e-6)
        alt_cx = max(alt_cx, 1)
        caixa_alts.append(alt_cx)
        vaos_gaveta.append(slot)
        y_cx = y_slot_base + fundo_cx
        y_f -= g
        caixas_info.append((y_cx, alt_cx, slot, hf))
        y_f_atual = frente_ys[-1][0]

        # avisos por gaveta
        if E.vao < 200:
            res.aviso("aviso", "Vão da gaveta com menos de 200 mm de largura.")
        if alt_cx < 60:
            res.aviso("aviso", f"Caixa da gaveta {i + 1} com altura menor que 60 mm ({alt_cx:g} mm).")
        if alt_cx < cor["altura_min_caixa"]:
            res.aviso("aviso", f"Caixa da gaveta {i + 1} abaixo da altura mínima da corrediça ({cor['altura_min_caixa']} mm).")
        if hf < 80:
            res.aviso("aviso", f"Frente da gaveta {i + 1} com altura menor que 80 mm.")

    res.medidas.update({
        "frentes_altura": alt_f, "frente_largura": larg_f, "frentes_y": [y for y, _ in frente_ys],
        "vaos_gaveta": vaos_gaveta, "caixa": {"larg": w_caixa, "larg_int": w_caixa - 2 * ec,
        "prof": prof, "alts": caixa_alts, "comp_corredica": comp_corr},
        "n_gavetas": n, "gaveta_xs": xs_f, "topo_frentes": topo_f,
    })

    # ---- peças ---------------------------------------------------------------------
    z_end = E.z_front_inner
    z_ini = z_end - prof
    todas_caixas = n * cols
    for i in range(n):
        y_cx, alt_cx, slot, hf = caixas_info[i]
        yf, _ = frente_ys[i]
        id_frente = res.add_peca(Peca("Frente de gaveta", cols, round(larg_f, 3), round(hf, 3), p.frente_esp,
                                      p.frente_material, p.frente_padrao, 2, 2, True, ""))
        id_lat = res.add_peca(Peca("Lateral da gaveta", 2 * cols, prof, alt_cx, ec, p.caixa_material,
                                   p.caixa_padrao, 1, 0, True))
        id_ft = res.add_peca(Peca("Frente/traseira da gaveta", 2 * cols, w_caixa - 2 * ec, alt_cx, ec,
                                  p.caixa_material, p.caixa_padrao, 1, 0, True))
        w_fundo = w_caixa - 2 * ec + 2 * (r - s)
        p_fundo = prof - 2 * ec + 2 * (r - s)
        id_fd = res.add_peca(Peca("Fundo da gaveta", cols, round(w_fundo, 3), round(p_fundo, 3), p.fundo_caixa_esp,
                                  p.fundo_caixa_material, p.fundo_padrao, 0, 0, False, "em rasgo"))
        for k in range(cols):
            gid = i * cols + k
            fx = xs_f[k]
            B.append(Bloco(f"Frente {gid + 1}", "frente", fx, yf, E.P - fe, larg_f, hf, fe, "frente", "x", id_frente, gid))
            colocar_puxador(p, cat, res, fx, yf, larg_f, hf, E.P)
            x_c = E.col_x[k] + (E.vao - w_caixa) / 2
            blocos_caixa = _blocos_caixa(x_c, y_cx, z_ini, w_caixa, alt_cx, prof, ec, r, s,
                                         id_lat, id_ft, id_fd, p.fundo_caixa_esp, gid)
            B.extend(blocos_caixa)
            _blocos_corredica(B, cor["tipo"], x_c, y_cx, z_end, w_caixa, alt_cx, lat_corr, comp_corr, gid)
            if i == 0 and k == 0 and not res.caixa_modelo:
                res.caixa_modelo = _blocos_caixa(0, 0, 0, w_caixa, alt_cx, prof, ec, r, s,
                                                 id_lat, id_ft, id_fd, p.fundo_caixa_esp, 0)
                res.caixa_modelo += _blocos_corredica([], cor["tipo"], 0, 0, prof, w_caixa, alt_cx,
                                                     lat_corr, comp_corr, 0)

    # ---- ferragens ----------------------------------------------------------------------
    res.ferragens.append(Ferragem(cor["nome"], todas_caixas, "par", "corrediça", f"{comp_corr:g} mm"))
    px = cat.puxador(p.puxador)
    if px["tipo"] == "toque":
        pass
    elif px["tipo"] in ("cava_usinada", "perfil_cava"):
        res.ferragens.append(Ferragem(px["nome"] if px["tipo"] == "perfil_cava" else "Usinagem de cava",
                                      todas_caixas, "un" if px["tipo"] == "cava_usinada" else "peça", "puxador", ""))
    else:
        res.ferragens.append(Ferragem(px["nome"], todas_caixas, "un", "puxador", ""))
    res.definicoes += [
        f"Caixa da gaveta: {w_caixa:g} mm de largura (vão {E.vao:.1f} − 2 × {lat_corr:g} mm de corrediça, "
        "arredondado para baixo).",
        f"Corrediça de {comp_corr:g} mm; profundidade útil {E.Dint:.1f} mm.",
    ]


def _blocos_caixa(x, y, z, w, alt, prof, ec, r, s, id_lat, id_ft, id_fd, esp_fundo, gid) -> list[Bloco]:
    b = [
        Bloco("Lateral da gaveta", "caixa_lateral", x, y, z, ec, alt, prof, "caixa", "z", id_lat, gid),
        Bloco("Lateral da gaveta", "caixa_lateral", x + w - ec, y, z, ec, alt, prof, "caixa", "z", id_lat, gid),
        Bloco("Frente da caixa", "caixa_frente", x + ec, y, z + prof - ec, w - 2 * ec, alt, ec, "caixa", "x", id_ft, gid),
        Bloco("Traseira da caixa", "caixa_frente", x + ec, y, z, w - 2 * ec, alt, ec, "caixa", "x", id_ft, gid),
    ]
    off = r - s
    b.append(Bloco("Fundo da gaveta", "caixa_fundo", x + ec - off, y + 10, z + ec - off,
                   w - 2 * ec + 2 * off, esp_fundo, prof - 2 * ec + 2 * off, "fundo", "", id_fd, gid))
    return b


def _blocos_corredica(B, tipo, x, y, z_end, w, alt, lat, comp, gid) -> list[Bloco]:
    novos = []
    if tipo == "oculta":
        altura = 8.0
        for xx in (x + 10, x + w - 30):
            novos.append(Bloco("Corrediça", "corredica", xx, y - altura, z_end - comp, 20, altura, comp, "ferragem", "", 0, gid))
    else:
        altura = 35.0
        yy = y + alt / 2 - altura / 2
        novos.append(Bloco("Corrediça", "corredica", x - lat, yy, z_end - comp, lat, altura, comp, "ferragem", "", 0, gid))
        novos.append(Bloco("Corrediça", "corredica", x + w, yy, z_end - comp, lat, altura, comp, "ferragem", "", 0, gid))
    B.extend(novos)
    return novos
