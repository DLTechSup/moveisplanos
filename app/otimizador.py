"""Otimizador de chapas: guilhotina em faixas (shelf first-fit decreasing)."""
from __future__ import annotations

from dataclasses import dataclass, field

from .catalogo import Catalogo
from .modelos import Peca, Resultado


@dataclass
class Posicionada:
    peca_id: int
    nome: str
    x: float
    y: float
    w: float
    h: float
    girada: bool = False
    indice: int = 0       # n-ésima unidade da peça


@dataclass
class Chapa:
    pecas: list[Posicionada] = field(default_factory=list)
    faixas: list[list[float]] = field(default_factory=list)   # [y, altura, x_usado]
    aproveitamento: float = 0.0


@dataclass
class Grupo:
    material: str
    esp: float
    padrao: str
    comprimento: float
    largura: float
    preco: float
    unidade: str
    chapas: list[Chapa] = field(default_factory=list)
    nao_cabem: list[str] = field(default_factory=list)

    @property
    def aproveitamento(self) -> float:
        if not self.chapas:
            return 0.0
        return sum(c.aproveitamento for c in self.chapas) / len(self.chapas)

    @property
    def area_pecas_m2(self) -> float:
        return sum(p.w * p.h for c in self.chapas for p in c.pecas) / 1e6


@dataclass
class Plano:
    grupos: list[Grupo] = field(default_factory=list)
    kerf: float = 4.0
    refilo: float = 10.0

    def total_chapas(self, material: str | None = None, esp: float | None = None) -> int:
        return sum(len(g.chapas) for g in self.grupos
                   if (material is None or g.material == material) and (esp is None or g.esp == esp))


def otimizar(res: Resultado, cat: Catalogo, kerf: float = 4.0, refilo: float = 10.0) -> Plano:
    plano = Plano(kerf=kerf, refilo=refilo)
    grupos: dict[tuple, list[Peca]] = {}
    for pc in res.pecas:
        grupos.setdefault((pc.material, pc.esp, pc.padrao), []).append(pc)
    for (material, esp, padrao), pecas in grupos.items():
        ch = cat.chapa(material, esp)
        g = Grupo(material, esp, padrao, ch["comprimento"], ch["largura"], ch.get("preco", 0.0),
                  ch.get("unidade", "chapa"))
        _encaixar(g, pecas, kerf, refilo)
        plano.grupos.append(g)
        for nome in g.nao_cabem:
            res.aviso("erro", f"Peça maior que a chapa: {nome} ({material} {esp:g} mm).")
    return plano


def _encaixar(g: Grupo, pecas: list[Peca], kerf: float, refilo: float) -> None:
    W = g.comprimento - 2 * refilo
    H = g.largura - 2 * refilo
    itens = []
    for pc in pecas:
        for i in range(pc.qtd):
            itens.append((pc, i))

    def opcoes(pc: Peca):
        o = [(pc.comp, pc.larg, False)]
        if not pc.veio and abs(pc.comp - pc.larg) > 1e-6:
            o.append((pc.larg, pc.comp, True))
        return [x for x in o if x[0] <= W + 1e-6 and x[1] <= H + 1e-6]

    # ordena pela maior dimensão da faixa (altura) decrescente
    def chave(item):
        pc, _ = item
        ops = opcoes(pc) or [(pc.comp, pc.larg, False)]
        return -min(o[1] for o in ops)
    itens.sort(key=chave)

    for pc, i in itens:
        ops = opcoes(pc)
        if not ops:
            g.nao_cabem.append(pc.nome)
            continue
        if not _colocar_existente(g, pc, i, ops, W, H, kerf):
            _nova_faixa(g, pc, i, ops, W, H, kerf)

    area_util = W * H
    for chapa in g.chapas:
        chapa.aproveitamento = 100.0 * sum(p.w * p.h for p in chapa.pecas) / area_util if area_util else 0.0


def _colocar_existente(g, pc, i, ops, W, H, kerf) -> bool:
    melhor = None
    for ci, chapa in enumerate(g.chapas):
        for fi, faixa in enumerate(chapa.faixas):
            y, alt, usado = faixa
            for w, h, girada in ops:
                if h <= alt + 1e-6 and usado + w <= W + 1e-6:
                    sobra = alt - h
                    if melhor is None or (ci, sobra) < (melhor[0], melhor[1]):
                        melhor = (ci, sobra, fi, w, h, girada)
        if melhor is not None:
            break
    if melhor is None:
        # tenta abrir faixa nova em chapa existente
        for ci, chapa in enumerate(g.chapas):
            y_prox = _proxima_y(chapa, kerf)
            for w, h, girada in sorted(ops, key=lambda o: o[1]):
                if y_prox + h <= H + 1e-6:
                    chapa.faixas.append([y_prox, h, 0.0])
                    _por(chapa, pc, i, len(chapa.faixas) - 1, w, h, girada, kerf)
                    return True
        return False
    ci, _, fi, w, h, girada = melhor
    _por(g.chapas[ci], pc, i, fi, w, h, girada, kerf)
    return True


def _proxima_y(chapa: Chapa, kerf: float) -> float:
    if not chapa.faixas:
        return 0.0
    y, alt, _ = chapa.faixas[-1]
    return y + alt + kerf


def _nova_faixa(g, pc, i, ops, W, H, kerf) -> None:
    chapa = Chapa()
    g.chapas.append(chapa)
    w, h, girada = sorted(ops, key=lambda o: o[1])[0]
    chapa.faixas.append([0.0, h, 0.0])
    _por(chapa, pc, i, 0, w, h, girada, kerf)


def _por(chapa: Chapa, pc: Peca, i: int, fi: int, w: float, h: float, girada: bool, kerf: float) -> None:
    faixa = chapa.faixas[fi]
    chapa.pecas.append(Posicionada(pc.id, pc.nome, faixa[2], faixa[0], w, h, girada, i))
    faixa[2] += w + kerf
