"""Monta as páginas A3 (paisagem) em unidades de 0,1 mm: 4200 × 2970."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

from PySide6.QtCore import QPointF, QRectF, Qt
from PySide6.QtGui import QBrush, QColor, QPen

from ..formato import fmt_brl, fmt_cm, fmt_num
from .caixa import desenhar_caixa, desenhar_porta
from .frontal import desenhar_frontal
from .interna import desenhar_interna
from .lateral import desenhar_lateral
from .perspectiva import desenhar_3d, desenhar_explodida
from .vista import cor_padrao, texto, texto_quebrado

LARG, ALT = 4200.0, 2970.0
MARGEM = 80.0
TINTA = QColor("#222222")
CINZA = QColor("#666666")
AZUL = QColor("#14285A")


@dataclass
class Pagina:
    titulo: str
    desenhar: Callable   # (QPainter) -> None


# ---------------------------------------------------------------------------------------------
# elementos comuns
# ---------------------------------------------------------------------------------------------
def _fundo(pt) -> None:
    pt.save()
    pt.fillRect(QRectF(0, 0, LARG, ALT), QColor("white"))
    pt.restore()


def _moldura(pt) -> None:
    pt.save()
    pt.setPen(QPen(TINTA, 5))
    pt.setBrush(Qt.NoBrush)
    pt.drawRect(QRectF(MARGEM, MARGEM, LARG - 2 * MARGEM, ALT - 2 * MARGEM))
    pt.restore()


def _cabecalho(pt, calc, subtitulo: str, pagina: int | None = None, total: int | None = None) -> None:
    p, m = calc.projeto, calc.resultado.medidas
    _moldura(pt)
    x = MARGEM + 50
    texto(pt, x, MARGEM + 110, p.nome or "Projeto sem nome", 80, AZUL, True)
    cliente = f"Cliente: {p.cliente}" if p.cliente else ""
    if p.telefone:
        cliente += f"   Tel.: {p.telefone}"
    partes = [cliente] if cliente else []
    if p.data:
        partes.append(f"Data: {p.data}")
    texto(pt, x, MARGEM + 175, "     ".join(partes), 36, TINTA)
    medidas = f"{fmt_cm(m['L'])} × {fmt_cm(m['H'])} × {fmt_cm(m['P'])} cm  (L × A × P)"
    texto(pt, LARG - MARGEM - 50, MARGEM + 110, medidas, 52, TINTA, True, "d")
    texto(pt, LARG - MARGEM - 50, MARGEM + 175, subtitulo + (f"   —   página {pagina}/{total}" if pagina else ""),
          36, CINZA, False, "d")
    pt.save()
    pt.setPen(QPen(TINTA, 3))
    pt.drawLine(QPointF(MARGEM, MARGEM + 215), QPointF(LARG - MARGEM, MARGEM + 215))
    pt.restore()


def _rodape_marca(pt) -> None:
    texto(pt, LARG - MARGEM - 30, ALT - MARGEM - 25, "Projeta Móveis", 26, CINZA, False, "d", True)


def _titulo_celula(pt, area: QRectF, s: str) -> None:
    texto(pt, area.left() + 20, area.top() + 45, s, 36, AZUL, True)
    pt.save()
    pt.setPen(QPen(QColor("#B8BCC8"), 2))
    pt.drawRect(area)
    pt.restore()


def _amostra(pt, x: float, y: float, cor: QColor, tam: float = 46) -> None:
    pt.save()
    pt.setBrush(cor)
    pt.setPen(QPen(TINTA, 2.5))
    pt.drawRect(QRectF(x, y, tam, tam))
    pt.restore()


# ---------------------------------------------------------------------------------------------
# página 1 – desenho técnico
# ---------------------------------------------------------------------------------------------
def _faixa_materiais(pt, calc, area: QRectF) -> None:
    p, cat = calc.projeto, calc.catalogo
    pt.save()
    pt.setPen(QPen(QColor("#B8BCC8"), 2))
    pt.setBrush(QColor("#F4F5F8"))
    pt.drawRect(area)
    pt.restore()
    x = area.left() + 30
    y0 = area.top() + 30
    itens = [("Estrutura", p.estrutura_padrao, f"{p.estrutura_material} {p.estrutura_esp:g} mm"),
             ("Frentes", p.frente_padrao, f"{p.frente_material} {p.frente_esp:g} mm")]
    if p.motor == "gavetas":
        itens.append(("Caixas", p.caixa_padrao, f"{p.caixa_material} {p.caixa_esp:g} mm"))
    itens.append(("Fundo", p.fundo_padrao, f"{p.fundo_material} {p.fundo_esp:g} mm"))
    for rotulo, padrao, mat in itens:
        _amostra(pt, x, y0, cor_padrao(cat, padrao))
        texto(pt, x + 62, y0 + 20, f"{rotulo}: {padrao}", 28, TINTA, True)
        texto(pt, x + 62, y0 + 52, mat, 26, CINZA)
        x += 520
    x = area.left() + 30
    y1 = y0 + 105
    px = cat.puxador(p.puxador)
    linha = f"Puxador: {px['nome']}"
    if p.motor == "gavetas":
        cor = cat.corredica(p.corredica)
        linha += f"      Corrediça: {cor['nome']} ({fmt_num(calc.resultado.medidas['caixa']['comp_corredica'], 0)} mm)"
    else:
        linha += f"      Dobradiça: {cat.dobradica(p.dobradica)['nome']}"
    linha += f"      Fita de borda: {cat.fita(p.fita)['nome']}"
    linha += f"      Frentes {'sobrepostas' if p.frente_tipo == 'sobrepostas' else 'embutidas'}"
    texto(pt, x, y1, linha, 28, TINTA)


def pagina_tecnica(pt, calc, n: int, total: int) -> None:
    _fundo(pt)
    _cabecalho(pt, calc, "Desenho técnico — medidas em cm", n, total)
    topo = MARGEM + 245
    x0, x1 = MARGEM + 20, LARG - MARGEM - 20
    larg = x1 - x0
    h1 = 1130
    h2 = 1170
    y2 = topo + h1 + 20
    c_front = QRectF(x0, topo, larg * 0.38, h1)
    c_lat = QRectF(c_front.right(), topo, larg * 0.22, h1)
    c_3d = QRectF(c_lat.right(), topo, x1 - c_lat.right(), h1)
    c_int = QRectF(x0, y2, larg * 0.34, h2)
    c_intg = QRectF(c_int.right(), y2, larg * 0.34, h2)
    c_cx = QRectF(c_intg.right(), y2, x1 - c_intg.right(), h2)
    faixa = QRectF(x0, y2 + h2 + 15, larg, 170)

    gav = calc.projeto.motor == "gavetas"
    _titulo_celula(pt, c_front, "VISTA FRONTAL")
    desenhar_frontal(pt, c_front.adjusted(0, 50, 0, 0), calc)
    _titulo_celula(pt, c_lat, "VISTA LATERAL")
    desenhar_lateral(pt, c_lat.adjusted(0, 50, 0, 0), calc)
    _titulo_celula(pt, c_3d, "PERSPECTIVA")
    desenhar_3d(pt, c_3d.adjusted(0, 60, 0, 0), calc)
    _titulo_celula(pt, c_int, "INTERNA SEM GAVETAS" if gav else "INTERNA (SEM PORTAS)")
    desenhar_interna(pt, c_int.adjusted(0, 50, 0, 0), calc, False)
    _titulo_celula(pt, c_intg, "INTERNA COM GAVETAS" if gav else "INTERNA — PRATELEIRAS")
    if gav:
        desenhar_interna(pt, c_intg.adjusted(0, 50, 0, 0), calc, True)
    else:
        desenhar_porta(pt, c_intg.adjusted(0, 60, 0, 0), calc)
    _titulo_celula(pt, c_cx, "CAIXA DA GAVETA" if gav else "VISTA EXPLODIDA")
    if gav:
        desenhar_caixa(pt, c_cx.adjusted(0, 50, 0, 0), calc)
    else:
        desenhar_explodida(pt, c_cx.adjusted(0, 60, 0, 0), calc)
    _faixa_materiais(pt, calc, faixa)
    _rodape_marca(pt)


# ---------------------------------------------------------------------------------------------
# página 2 – corte e materiais
# ---------------------------------------------------------------------------------------------
def pagina_corte(pt, calc, n: int, total: int) -> None:
    _fundo(pt)
    _cabecalho(pt, calc, "Plano de corte e materiais — medidas em cm", n, total)
    res = calc.resultado
    cols = [("Nº", 70, "c"), ("Peça", 560, "e"), ("Qtd", 100, "c"), ("Comp.", 190, "d"), ("Larg.", 190, "d"),
            ("Esp. mm", 150, "d"), ("Material", 270, "e"), ("Cor", 330, "e"), ("Fita", 150, "c"),
            ("Veio", 110, "c"), ("Observação", 330, "e")]
    x0 = MARGEM + 40
    y = MARGEM + 300
    altura_linha = 60 if len(res.pecas) <= 18 else max(42, 1000 // max(len(res.pecas), 1))
    tam = 30 if altura_linha >= 55 else 24
    largura_tabela = sum(c[1] for c in cols)
    pt.save()
    pt.setBrush(QColor("#E6E9F2"))
    pt.setPen(QPen(TINTA, 2.5))
    pt.drawRect(QRectF(x0, y - altura_linha + 14, largura_tabela, altura_linha))
    pt.restore()
    x = x0
    for nome, w, al in cols:
        _celula(pt, x, y, w, nome, al, tam, True)
        x += w
    y += altura_linha
    for i, pc in enumerate(res.pecas):
        if i % 2 == 1:
            pt.save()
            pt.fillRect(QRectF(x0, y - altura_linha + 14, largura_tabela, altura_linha), QColor("#F7F8FB"))
            pt.restore()
        valores = [str(pc.id), pc.nome, str(pc.qtd), fmt_cm(pc.comp), fmt_cm(pc.larg), fmt_num(pc.esp, 1),
                   pc.material, pc.padrao, pc.fita_texto(), "sim" if pc.veio else "não", pc.obs]
        x = x0
        for (nome, w, al), val in zip(cols, valores):
            _celula(pt, x, y, w, val, al, tam, False)
            x += w
        y += altura_linha
    pt.save()
    pt.setPen(QPen(TINTA, 2.5))
    pt.setBrush(Qt.NoBrush)
    pt.drawRect(QRectF(x0, MARGEM + 300 - altura_linha + 14, largura_tabela, y - (MARGEM + 300) + altura_linha - 14 + 0))
    pt.restore()
    total_pecas = sum(pc.qtd for pc in res.pecas)
    texto(pt, x0, y + 50, f"{total_pecas} peças  •  fita de borda: {fmt_num(calc.orcamento.fita_metros, 1)} m (com 10% de sobra)"
          "  •  C = borda no sentido do comprimento, L = no da largura", 26, CINZA)

    _tabela_orcamento(pt, calc, x0, y + 130, largura_tabela)

    # coluna direita
    xr = x0 + largura_tabela + 90
    larg_r = LARG - MARGEM - 40 - xr
    yr = MARGEM + 285
    texto(pt, xr, yr, "FERRAGENS E MATERIAIS", 34, AZUL, True)
    yr += 52
    for f in res.ferragens:
        qtd = fmt_num(f.qtd, 0) if f.qtd == int(f.qtd) else fmt_num(f.qtd, 1)
        s = f"{qtd} {f.unidade}  {f.nome}" + (f" ({f.detalhe})" if f.detalhe else "")
        texto(pt, xr, yr, s, 27, TINTA)
        yr += 40
    yr += 15
    texto(pt, xr, yr, "CHAPAS NECESSÁRIAS", 34, AZUL, True)
    yr += 52
    for g in calc.plano.grupos:
        if not g.chapas:
            continue
        s = f"{len(g.chapas)}× {g.material} {fmt_num(g.esp, 0)} mm — {g.padrao}"
        texto(pt, xr, yr, s, 27, TINTA)
        yr += 36
        texto(pt, xr + 30, yr, f"{fmt_num(g.comprimento, 0)} × {fmt_num(g.largura, 0)} mm — aproveitamento {fmt_num(g.aproveitamento, 0)}%",
              24, CINZA)
        yr += 40
    yr += 15
    if res.definicoes:
        texto(pt, xr, yr, "DEFINIÇÕES DE MONTAGEM", 34, AZUL, True)
        yr += 50
        for d in res.definicoes:
            yr = texto_quebrado(pt, xr, yr, larg_r, "• " + d, 25, TINTA, 1.2) + 6
    yr += 15
    if res.avisos:
        texto(pt, xr, yr, "AVISOS", 34, QColor("#B00020"), True)
        yr += 50
        for a in res.avisos:
            cor = QColor("#B00020") if a.nivel == "erro" else QColor("#8A5A00")
            yr = texto_quebrado(pt, xr, yr, larg_r, "• " + a.texto, 25, cor, 1.2) + 6
    _rodape_marca(pt)


def _tabela_orcamento(pt, calc, x0: float, y: float, largura: float) -> None:
    orc = calc.orcamento
    texto(pt, x0, y, "LISTA DE MATERIAIS E ORÇAMENTO", 34, AZUL, True)
    y += 60
    cols = [("Item", 1050, "e"), ("Qtd", 170, "d"), ("Un.", 110, "c"), ("Preço un.", 260, "d"), ("Total", 280, "d")]
    ajuste = largura / sum(c[1] for c in cols)
    cols = [(n, w * ajuste, a) for n, w, a in cols]
    h = 46
    pt.save()
    pt.fillRect(QRectF(x0, y - h + 12, largura, h), QColor("#E6E9F2"))
    pt.restore()
    x = x0
    for nome, w, al in cols:
        _celula(pt, x, y, w, nome, al, 26, True)
        x += w
    y += h
    for i, ln in enumerate(orc.linhas):
        if i % 2 == 1:
            pt.save()
            pt.fillRect(QRectF(x0, y - h + 12, largura, h), QColor("#F7F8FB"))
            pt.restore()
        qtd = fmt_num(ln.qtd, 2 if ln.qtd != int(ln.qtd) else 0)
        valores = [ln.item + (f" — {ln.detalhe}" if ln.detalhe else ""), qtd, ln.unidade,
                   fmt_brl(ln.preco) if ln.preco else "—", fmt_brl(ln.total) if ln.preco else "—"]
        x = x0
        for (nome, w, al), val in zip(cols, valores):
            _celula(pt, x, y, w, val, al, 24, False)
            x += w
        y += h
    y += 10
    for rotulo, valor, forte in (("Materiais", orc.materiais, False), ("Mão de obra", orc.mao_de_obra, False),
                                 (f"Margem ({fmt_num(orc.margem_pct, 1)}%)", orc.margem_valor, False),
                                 ("TOTAL", orc.total, True)):
        texto(pt, x0 + largura - 300, y + 18, rotulo, 28 if forte else 26, TINTA, forte, "d")
        texto(pt, x0 + largura - 20, y + 18, fmt_brl(valor), 28 if forte else 26, TINTA, forte, "d")
        y += 44
    if orc.sem_precos:
        texto(pt, x0, y + 20, "Preços ainda não preenchidos no catálogo (menu Catálogo).", 24, QColor("#8A5A00"), False, "e", True)


def _celula(pt, x, y, w, s, alinh, tam, negrito) -> None:
    margem = 12
    if alinh == "e":
        texto(pt, x + margem, y, _cortar(pt, s, w - 2 * margem, tam, negrito), tam, TINTA, negrito, "e")
    elif alinh == "d":
        texto(pt, x + w - margem, y, s, tam, TINTA, negrito, "d")
    else:
        texto(pt, x + w / 2, y, s, tam, TINTA, negrito, "c")


def _cortar(pt, s, largura, tam, negrito) -> str:
    from PySide6.QtGui import QFontMetricsF
    from .vista import fonte
    fm = QFontMetricsF(fonte(tam, negrito))
    if fm.horizontalAdvance(s) <= largura:
        return s
    while s and fm.horizontalAdvance(s + "…") > largura:
        s = s[:-1]
    return s + "…"


# ---------------------------------------------------------------------------------------------
# páginas de chapas
# ---------------------------------------------------------------------------------------------
def _chapas_lista(calc):
    itens = []
    for g in calc.plano.grupos:
        for i, ch in enumerate(g.chapas):
            itens.append((g, ch, i + 1))
    return itens


def paginas_chapas(calc, primeiro: int, total: int) -> list[Pagina]:
    itens = _chapas_lista(calc)
    paginas = []
    por_pagina = 4
    for k in range(0, len(itens), por_pagina):
        grupo = itens[k:k + por_pagina]
        n = primeiro + len(paginas)
        paginas.append(Pagina(f"Plano de chapas {len(paginas) + 1}",
                              lambda pt, grupo=grupo, n=n: _pagina_chapas(pt, calc, grupo, n, total)))
    return paginas


def _pagina_chapas(pt, calc, grupo, n, total) -> None:
    _fundo(pt)
    _cabecalho(pt, calc, "Plano de chapas — medidas em cm", n, total)
    topo = MARGEM + 245
    area_w = (LARG - 2 * MARGEM - 60) / 2
    area_h = (ALT - topo - MARGEM - 30) / 2
    for i, (g, ch, num) in enumerate(grupo):
        col, lin = i % 2, i // 2
        area = QRectF(MARGEM + 20 + col * (area_w + 20), topo + lin * (area_h + 10), area_w, area_h)
        _desenhar_chapa(pt, calc, g, ch, num, area)
    _rodape_marca(pt)


def _desenhar_chapa(pt, calc, g, ch, num, area: QRectF) -> None:
    titulo = f"{g.material} {fmt_num(g.esp, 0)} mm — {g.padrao}   |   chapa {num}/{len(g.chapas)}   |   aproveitamento {fmt_num(ch.aproveitamento, 1)}%"
    texto(pt, area.left() + 10, area.top() + 38, titulo, 30, AZUL, True)
    refilo = calc.plano.refilo
    moldura = area.adjusted(60, 70, -60, -90)
    esc = min(moldura.width() / g.comprimento, moldura.height() / g.largura)
    w, h = g.comprimento * esc, g.largura * esc
    r0 = QRectF(moldura.left(), moldura.top(), w, h)
    cor = cor_padrao(calc.catalogo, g.padrao)
    pt.save()
    pt.setBrush(QColor("#EEF0F4"))
    pt.setPen(QPen(TINTA, 3.5))
    pt.drawRect(r0)
    # área útil (sem refilo)
    pt.setBrush(Qt.NoBrush)
    pen = QPen(QColor("#9AA0AA"), 2)
    pen.setStyle(Qt.DashLine)
    pt.setPen(pen)
    pt.drawRect(QRectF(r0.left() + refilo * esc, r0.top() + refilo * esc, w - 2 * refilo * esc, h - 2 * refilo * esc))
    pt.restore()
    for pp in ch.pecas:
        r = QRectF(r0.left() + (refilo + pp.x) * esc, r0.top() + (refilo + pp.y) * esc, pp.w * esc, pp.h * esc)
        pt.save()
        pt.setBrush(cor)
        pt.setPen(QPen(TINTA, 2.6))
        pt.drawRect(r)
        pt.restore()
        if cor.lightness() < 110:
            tinta = QColor("white")
        else:
            tinta = TINTA
        medidas = f"{fmt_cm(pp.w)}×{fmt_cm(pp.h)}"
        if r.width() > 120 and r.height() > 90:
            texto(pt, r.center().x(), r.center().y() - 2, f"{pp.peca_id}", 40, tinta, True, "c")
            texto(pt, r.center().x(), r.center().y() + 34, medidas, 24, tinta, False, "c")
        elif r.width() > 60 and r.height() > 36:
            texto(pt, r.center().x(), r.center().y() + 10, f"{pp.peca_id}", 26, tinta, True, "c")
    # cotas gerais da chapa
    texto(pt, r0.center().x(), r0.bottom() + 45, f"{fmt_cm(g.comprimento)} cm", 28, AZUL, False, "c")
    pt.save()
    pt.translate(r0.left() - 18, r0.center().y())
    pt.rotate(-90)
    texto(pt, 0, 0, f"{fmt_cm(g.largura)} cm", 28, AZUL, False, "c")
    pt.restore()


# ---------------------------------------------------------------------------------------------
# página do cliente
# ---------------------------------------------------------------------------------------------
def pagina_cliente(pt, calc, n: int, total: int) -> None:
    _fundo(pt)
    _cabecalho(pt, calc, "Apresentação ao cliente", n, total)
    p, cat, m = calc.projeto, calc.catalogo, calc.resultado.medidas
    topo = MARGEM + 250
    esq = QRectF(MARGEM + 30, topo, 2350, ALT - topo - MARGEM - 40)
    dir_ = QRectF(esq.right() + 40, topo, LARG - MARGEM - 30 - esq.right() - 40, esq.height())
    desenhar_3d(pt, QRectF(esq.left(), esq.top(), esq.width(), esq.height() * 0.62), calc)
    desenhar_frontal(pt, QRectF(esq.left(), esq.top() + esq.height() * 0.60, esq.width(), esq.height() * 0.40), calc)
    x, y = dir_.left(), dir_.top() + 40
    texto(pt, x, y, "MEDIDAS EXTERNAS", 38, AZUL, True)
    y += 60
    texto(pt, x, y, f"Largura:  {fmt_cm(m['L'])} cm", 36, TINTA)
    texto(pt, x, y + 52, f"Altura:  {fmt_cm(m['H'])} cm", 36, TINTA)
    texto(pt, x, y + 104, f"Profundidade:  {fmt_cm(m['P'])} cm", 36, TINTA)
    y += 210
    texto(pt, x, y, "ACABAMENTOS", 38, AZUL, True)
    y += 40
    itens = [("Estrutura", p.estrutura_padrao), ("Frentes", p.frente_padrao)]
    if p.motor == "gavetas":
        itens.append(("Interior das gavetas", p.caixa_padrao))
    for rotulo, padrao in itens:
        _amostra(pt, x, y, cor_padrao(cat, padrao), 60)
        texto(pt, x + 80, y + 28, rotulo, 28, CINZA)
        texto(pt, x + 80, y + 58, padrao, 34, TINTA, True)
        y += 95
    px = cat.puxador(p.puxador)
    y += 15
    texto(pt, x, y, f"Puxador: {px['nome']}", 32, TINTA)
    y += 50
    if p.motor == "gavetas":
        c = cat.corredica(p.corredica)
        texto(pt, x, y, f"Corrediças: {c['nome']}", 32, TINTA)
        y += 50
    else:
        texto(pt, x, y, f"Dobradiças: {cat.dobradica(p.dobradica)['nome']}", 32, TINTA)
        y += 50
    y += 40
    texto(pt, x, y, "INVESTIMENTO", 38, AZUL, True)
    y += 75
    orc = calc.orcamento
    if orc.total > 0:
        texto(pt, x, y, fmt_brl(orc.total), 64, TINTA, True)
    else:
        texto(pt, x, y, "Valor a combinar", 44, CINZA, True)
    if p.observacoes:
        y += 90
        texto(pt, x, y, "OBSERVAÇÕES", 34, AZUL, True)
        texto_quebrado(pt, x, y + 48, dir_.width(), p.observacoes, 28, TINTA)
    _rodape_marca(pt)


# ---------------------------------------------------------------------------------------------
# lista de páginas e folhas de vista
# ---------------------------------------------------------------------------------------------
def montar_paginas(calc, incluir_cliente: bool = True, somente_cliente: bool = False) -> list[Pagina]:
    if somente_cliente:
        return [Pagina("Apresentação ao cliente", lambda pt: pagina_cliente(pt, calc, 1, 1))]
    n_chapas = len(paginas_chapas(calc, 3, 0))
    total = 2 + n_chapas + (1 if incluir_cliente else 0)
    paginas = [
        Pagina("Desenho técnico", lambda pt: pagina_tecnica(pt, calc, 1, total)),
        Pagina("Corte e materiais", lambda pt: pagina_corte(pt, calc, 2, total)),
    ]
    paginas += paginas_chapas(calc, 3, total)
    if incluir_cliente:
        paginas.append(Pagina("Apresentação ao cliente", lambda pt: pagina_cliente(pt, calc, total, total)))
    return paginas


VISTAS = ("frontal", "lateral", "interna", "interna_gavetas", "caixa", "3d", "explodida")
NOMES_VISTAS = {
    "frontal": "Vista frontal", "lateral": "Vista lateral", "interna": "Vista interna",
    "interna_gavetas": "Vista interna com gavetas", "caixa": "Caixa da gaveta / porta",
    "3d": "Perspectiva 3D", "explodida": "Vista explodida",
}


def folha_vista(pt, calc, nome: str) -> None:
    """Uma única vista em tamanho grande, numa folha A3."""
    _fundo(pt)
    _cabecalho(pt, calc, NOMES_VISTAS.get(nome, nome))
    area = QRectF(MARGEM + 40, MARGEM + 240, LARG - 2 * MARGEM - 80, ALT - 2 * MARGEM - 280)
    if nome == "frontal":
        desenhar_frontal(pt, area, calc)
    elif nome == "lateral":
        desenhar_lateral(pt, area, calc)
    elif nome == "interna":
        desenhar_interna(pt, area, calc, False)
    elif nome == "interna_gavetas":
        if calc.projeto.motor == "gavetas":
            desenhar_interna(pt, area, calc, True)
        else:
            desenhar_interna(pt, area, calc, False)
    elif nome == "caixa":
        if calc.projeto.motor == "gavetas":
            desenhar_caixa(pt, area, calc)
        else:
            desenhar_porta(pt, area, calc)
    elif nome == "3d":
        desenhar_3d(pt, area, calc)
    elif nome == "explodida":
        desenhar_explodida(pt, area, calc)
    _rodape_marca(pt)
