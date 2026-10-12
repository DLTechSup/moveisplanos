"""Lista de materiais e orçamento."""
from __future__ import annotations

from dataclasses import dataclass, field
from math import ceil

from .catalogo import Catalogo
from .modelos import Projeto, Resultado
from .otimizador import Plano


@dataclass
class Linha:
    categoria: str
    item: str
    qtd: float
    unidade: str
    preco: float
    detalhe: str = ""

    @property
    def total(self) -> float:
        return self.qtd * self.preco


@dataclass
class Orcamento:
    linhas: list[Linha] = field(default_factory=list)
    mao_de_obra: float = 0.0
    margem_pct: float = 0.0
    fita_metros: float = 0.0
    sem_precos: bool = False

    @property
    def materiais(self) -> float:
        return sum(l.total for l in self.linhas)

    @property
    def subtotal(self) -> float:
        return self.materiais + self.mao_de_obra

    @property
    def margem_valor(self) -> float:
        return self.subtotal * self.margem_pct / 100.0

    @property
    def total(self) -> float:
        return self.subtotal + self.margem_valor


def montar_orcamento(p: Projeto, res: Resultado, plano: Plano, cat: Catalogo) -> Orcamento:
    orc = Orcamento(mao_de_obra=p.mao_de_obra, margem_pct=p.margem)
    L = orc.linhas

    # chapas
    for g in plano.grupos:
        if not g.chapas:
            continue
        if g.unidade == "m2":
            area = g.comprimento * g.largura / 1e6 * len(g.chapas)
            L.append(Linha("chapa", f"{g.material} {g.esp:g} mm – {g.padrao}", area, "m²", g.preco,
                           f"{len(g.chapas)} tábua(s) de {g.comprimento:g} × {g.largura:g}"))
        else:
            L.append(Linha("chapa", f"{g.material} {g.esp:g} mm – {g.padrao}", len(g.chapas), "chapa", g.preco,
                           f"{g.comprimento:g} × {g.largura:g} mm"))

    # fita de borda (+10% de sobra)
    metros = sum(pc.metros_fita() for pc in res.pecas) * 1.10
    orc.fita_metros = metros
    fita = cat.fita(p.fita)
    if metros > 0:
        L.append(Linha("fita", fita["nome"], round(metros, 2), "m", fita["preco_metro"], "inclui 10% de sobra"))

    # ferragens
    for f in res.ferragens:
        preco = _preco_ferragem(f, p, cat)
        if f.categoria in ("base",):
            chave = "pe" if "Pé" in f.nome else "rodizio"
            preco = cat.insumo(chave)["preco"]
        L.append(Linha(f.categoria, f.nome, f.qtd, f.unidade, preco, f.detalhe))

    # insumos (estimativa)
    pecas_total = sum(pc.qtd for pc in res.pecas)
    L.append(Linha("insumo", cat.insumo("parafuso")["nome"], pecas_total * 6, "un", cat.insumo("parafuso")["preco"], "estimativa"))
    L.append(Linha("insumo", cat.insumo("cavilha")["nome"], pecas_total * 4, "un", cat.insumo("cavilha")["preco"], "estimativa"))
    L.append(Linha("insumo", cat.insumo("cola")["nome"], 1, "un", cat.insumo("cola")["preco"], ""))

    # extras do projeto
    for ex in p.extras or []:
        try:
            qtd = float(ex.get("qtd", 1) or 0)
            preco = float(ex.get("preco", 0) or 0)
        except (TypeError, ValueError):
            continue
        if ex.get("descricao") and qtd > 0:
            L.append(Linha("extra", ex["descricao"], qtd, "un", preco, ""))

    orc.sem_precos = all(l.preco == 0 for l in L)
    return orc


def _preco_ferragem(f, p: Projeto, cat: Catalogo) -> float:
    if f.categoria == "corrediça":
        return cat.corredica(f.nome)["preco"]
    if f.categoria == "puxador":
        return cat.puxador(f.nome)["preco"] if any(x["nome"] == f.nome for x in cat.dados["puxadores"]) else 0.0
    if f.categoria == "dobradiça":
        return cat.dobradica(f.nome)["preco"]
    return 0.0
