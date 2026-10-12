"""Catálogo de materiais, cores, ferragens e preços (editável e salvo em JSON)."""
from __future__ import annotations

import copy
import json
import os
from pathlib import Path

VERSAO = 2

# --- chapas -----------------------------------------------------------------
_CHAPAS = [
    ("MDF", [3, 6, 9, 12, 15, 18, 25], 2750, 1850, "chapa"),
    ("MDP", [15, 18, 25], 2750, 1850, "chapa"),
    ("HDF", [3, 6], 2750, 1830, "chapa"),
    ("Compensado", [6, 10, 15, 18], 2200, 1600, "chapa"),
    ("Madeira maciça", [20, 25, 30], 2500, 400, "m2"),
]

# --- cores / padrões (nome, tipo, cor, veio) ---------------------------------
_PADROES = [
    # madeiras e amadeirados
    ("Carvalho claro", "amadeirado", "#D2B48C", True),
    ("Carvalho escuro", "amadeirado", "#8B6A45", True),
    ("Freijó", "amadeirado", "#C9A66B", True),
    ("Nogueira", "amadeirado", "#5E4631", True),
    ("Cumaru", "amadeirado", "#9A6A3E", True),
    ("Teca", "amadeirado", "#B9824A", True),
    ("Louro", "amadeirado", "#7A4E2D", True),
    ("Cinamomo", "amadeirado", "#B98E62", True),
    ("Ipê", "amadeirado", "#6B4A2B", True),
    ("Jatobá", "amadeirado", "#A65E3A", True),
    ("Imbuia", "amadeirado", "#4A3326", True),
    ("Mogno", "amadeirado", "#7B3F2A", True),
    ("Cedro", "amadeirado", "#B5693F", True),
    ("Peroba", "amadeirado", "#C98F5A", True),
    ("Pinus", "amadeirado", "#E3C48D", True),
    ("Eucalipto", "amadeirado", "#CDA67A", True),
    ("Cerejeira", "amadeirado", "#9C4A33", True),
    ("Bétula", "amadeirado", "#EBD9B4", True),
    ("Maple", "amadeirado", "#E8CFA0", True),
    ("Garapa", "amadeirado", "#D9A441", True),
    ("Sucupira", "amadeirado", "#6E3B24", True),
    ("Ébano", "amadeirado", "#2E2420", True),
    ("Cedro rosa", "amadeirado", "#C47E5F", True),
    ("Amendoim", "amadeirado", "#A9743F", True),
    ("Itaúba", "amadeirado", "#8A6B2E", True),
    ("Tauari", "amadeirado", "#D7B98A", True),
    ("Demolição", "amadeirado", "#8E7B66", True),
    ("Madeira rústica", "amadeirado", "#A08463", True),
    # unicolores
    ("Branco", "unicolor", "#F5F5F2", False),
    ("Preto", "unicolor", "#1E1E1E", False),
    ("Cinza grafite", "unicolor", "#4A4D52", False),
    ("Cinza claro", "unicolor", "#BFC2C4", False),
    ("Areia", "unicolor", "#D8C7A4", False),
    ("Off-white", "unicolor", "#EDE8DA", False),
    ("Bege", "unicolor", "#CBB594", False),
    ("Fendi", "unicolor", "#A99A87", False),
    ("Verde sálvia", "unicolor", "#9CAF98", False),
    ("Verde musgo", "unicolor", "#5B6B46", False),
    ("Azul petróleo", "unicolor", "#25525E", False),
    ("Azul marinho", "unicolor", "#1F2F4F", False),
    ("Terracota", "unicolor", "#B5603F", False),
    ("Rosa antigo", "unicolor", "#D3A5A0", False),
    ("Amarelo mostarda", "unicolor", "#C9962B", False),
    ("Vinho", "unicolor", "#5E2230", False),
    ("Cimento queimado", "unicolor", "#8F9092", False),
]


# --- puxadores (nome, tipo, comprimento, entre_furos, cor) --------------------
def _puxadores():
    lista = []
    for ef in (96, 128, 160, 192, 224, 256, 320, 480, 640):
        lista.append((f"Barra {ef}", "barra", ef + 32, ef, "#B8BCC2"))
    for ef in (128, 192):
        lista.append((f"Barra slim preta {ef}", "barra", ef + 20, ef, "#1E1E1E"))
        lista.append((f"Barra slim dourada {ef}", "barra", ef + 20, ef, "#C9A24B"))
    lista += [
        ("Cava usinada", "cava_usinada", 150, 0, "#3A2A1E"),
        ("Perfil cava alumínio", "perfil_cava", 0, 0, "#C9CDD2"),
        ("Perfil cava preto", "perfil_cava", 0, 0, "#222222"),
        ("Botão redondo", "botao", 30, 0, "#B8BCC2"),
        ("Botão preto fosco", "botao", 30, 0, "#222222"),
        ("Botão dourado", "botao", 30, 0, "#C9A24B"),
        ("Concha 96", "concha", 110, 96, "#B8BCC2"),
        ("Concha 128", "concha", 140, 128, "#B8BCC2"),
        ("Sem puxador (toque)", "toque", 0, 0, "#000000"),
    ]
    return lista


_COMPRIMENTOS_CORREDICA = [250, 300, 350, 400, 450, 500, 550]

# --- corrediças (nome, tipo, folga/lado, altura mínima da caixa, amortecimento) -
_CORREDICAS = [
    ("Telescópica 45 kg", "telescopica", 12.7, 60, False),
    ("Telescópica amortecida", "telescopica", 12.7, 60, True),
    ("Roldana", "roldana", 12.5, 60, False),
    ("Oculta", "oculta", 21.0, 70, False),
    ("Oculta amortecida", "oculta", 21.0, 70, True),
]

_FITAS = [
    ("Fita PVC 22 mm", 22, 0.45),
    ("Fita PVC 35 mm", 35, 1.0),
    ("Fita PVC 45 mm", 45, 2.0),
    ("Fita PVC 22 mm espessa", 22, 1.0),
]

_DOBRADICAS = [
    ("Dobradiça 35 mm reta", "reta", False),
    ("Dobradiça 35 mm curva", "curva", False),
    ("Dobradiça 35 mm supercurva", "supercurva", False),
    ("Dobradiça reta amortecida", "reta", True),
    ("Dobradiça curva amortecida", "curva", True),
    ("Dobradiça supercurva amortecida", "supercurva", True),
]

_INSUMOS = [
    ("pe", "Pé regulável", "un"),
    ("rodizio", "Rodízio com trava", "un"),
    ("parafuso", "Parafusos (unidade)", "un"),
    ("cavilha", "Cavilhas (unidade)", "un"),
    ("cola", "Cola PVA (frasco 500 g)", "un"),
]


def catalogo_padrao() -> dict:
    return {
        "versao": VERSAO,
        "chapas": [
            {"material": m, "espessura": e, "comprimento": c, "largura": l, "preco": 0.0, "unidade": u}
            for m, esps, c, l, u in _CHAPAS for e in esps
        ],
        "padroes": [
            {"nome": n, "tipo": t, "cor": c, "veio": v} for n, t, c, v in _PADROES
        ],
        "puxadores": [
            {"nome": n, "tipo": t, "comprimento": c, "entre_furos": ef, "cor": cor, "preco": 0.0}
            for n, t, c, ef, cor in _puxadores()
        ],
        "corredicas": [
            {"nome": n, "tipo": t, "comprimentos": list(_COMPRIMENTOS_CORREDICA),
             "folga_lado": fl, "altura_min_caixa": am, "amortecimento": a, "preco": 0.0}
            for n, t, fl, am, a in _CORREDICAS
        ],
        "fitas": [
            {"nome": n, "largura": l, "espessura": e, "preco_metro": 0.0} for n, l, e in _FITAS
        ],
        "dobradicas": [
            {"nome": n, "tipo": t, "amortecimento": a, "preco": 0.0} for n, t, a in _DOBRADICAS
        ],
        "insumos": [
            {"chave": k, "nome": n, "unidade": u, "preco": 0.0} for k, n, u in _INSUMOS
        ],
    }


def pasta_dados() -> Path:
    custom = os.environ.get("PROJETA_DADOS")
    if custom:
        return Path(custom)
    if os.name == "nt":
        return Path(os.environ.get("APPDATA", str(Path.home()))) / "ProjetaMoveis"
    return Path.home() / ".config" / "ProjetaMoveis"


def caminho_catalogo() -> Path:
    return pasta_dados() / "catalogo.json"


class Catalogo:
    def __init__(self, dados: dict | None = None):
        self.dados = dados if dados is not None else catalogo_padrao()
        self._completar()

    # ---- persistência ----------------------------------------------------
    @classmethod
    def carregar(cls, caminho: Path | None = None) -> "Catalogo":
        """Lê o catálogo; na primeira execução cria o arquivo com os valores padrão."""
        caminho = Path(caminho) if caminho else caminho_catalogo()
        if caminho.exists():
            try:
                with open(caminho, encoding="utf-8") as f:
                    return cls(json.load(f))
            except (OSError, ValueError):
                pass
        cat = cls()
        try:
            cat.salvar(caminho)
        except OSError:
            pass
        return cat

    def salvar(self, caminho: Path | None = None) -> None:
        caminho = Path(caminho) if caminho else caminho_catalogo()
        caminho.parent.mkdir(parents=True, exist_ok=True)
        with open(caminho, "w", encoding="utf-8") as f:
            json.dump(self.dados, f, ensure_ascii=False, indent=2)

    def _completar(self) -> None:
        """Garante todas as seções (catálogos antigos recebem os padrões novos)."""
        padrao = catalogo_padrao()
        for chave, valor in padrao.items():
            self.dados.setdefault(chave, copy.deepcopy(valor))
        self.dados["versao"] = VERSAO

    # ---- consultas ---------------------------------------------------------
    def materiais(self) -> list[str]:
        vistos = []
        for c in self.dados["chapas"]:
            if c["material"] not in vistos:
                vistos.append(c["material"])
        return vistos

    def espessuras(self, material: str) -> list[float]:
        return sorted({c["espessura"] for c in self.dados["chapas"] if c["material"] == material})

    def chapa(self, material: str, espessura: float) -> dict:
        for c in self.dados["chapas"]:
            if c["material"] == material and abs(c["espessura"] - espessura) < 0.01:
                return c
        for c in self.dados["chapas"]:
            if c["material"] == material:
                return c
        return {"material": material, "espessura": espessura, "comprimento": 2750,
                "largura": 1850, "preco": 0.0, "unidade": "chapa"}

    def _achar(self, secao: str, nome: str, campo: str = "nome") -> dict | None:
        for item in self.dados[secao]:
            if item.get(campo) == nome:
                return item
        return None

    def padrao(self, nome: str) -> dict:
        return self._achar("padroes", nome) or {"nome": nome, "tipo": "unicolor", "cor": "#CCCCCC", "veio": False}

    def puxador(self, nome: str) -> dict:
        return self._achar("puxadores", nome) or self.dados["puxadores"][-1]

    def corredica(self, nome: str) -> dict:
        return self._achar("corredicas", nome) or self.dados["corredicas"][0]

    def fita(self, nome: str) -> dict:
        return self._achar("fitas", nome) or self.dados["fitas"][0]

    def dobradica(self, nome: str) -> dict:
        return self._achar("dobradicas", nome) or self.dados["dobradicas"][0]

    def insumo(self, chave: str) -> dict:
        return self._achar("insumos", chave, "chave") or {"chave": chave, "nome": chave, "unidade": "un", "preco": 0.0}

    def nomes(self, secao: str) -> list[str]:
        return [i["nome"] for i in self.dados[secao]]

    def adicionar_padrao(self, nome: str, cor: str, veio: bool = False) -> None:
        if self._achar("padroes", nome):
            return
        self.dados["padroes"].append(
            {"nome": nome, "tipo": "amadeirado" if veio else "unicolor", "cor": cor, "veio": veio})
