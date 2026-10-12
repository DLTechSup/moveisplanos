"""Presets de cada tipo de móvel."""
from __future__ import annotations

PRESETS: dict[str, dict] = {
    "comoda": {
        "nome": "Cômoda", "motor": "gavetas",
        "valores": dict(largura=140, altura=80, profundidade=52, colunas=2, gavetas_por_coluna=3,
                        nicho=0, base_tipo="rodape", base_altura=5, tampo="sobreposto",
                        frente_tipo="sobrepostas", distribuicao="iguais", puxador_posicao="centro"),
    },
    "gaveteiro": {
        "nome": "Gaveteiro volante", "motor": "gavetas",
        "valores": dict(largura=40, altura=60, profundidade=50, colunas=1, gavetas_por_coluna=3,
                        nicho=0, base_tipo="rodizios", base_altura=5, tampo="sobreposto",
                        frente_tipo="sobrepostas", distribuicao="iguais"),
    },
    "criado_mudo": {
        "nome": "Criado-mudo", "motor": "gavetas",
        "valores": dict(largura=50, altura=55, profundidade=40, colunas=1, gavetas_por_coluna=2,
                        nicho=15, base_tipo="pes", base_altura=10, tampo="sobreposto",
                        frente_tipo="sobrepostas", distribuicao="iguais"),
    },
    "balcao_gavetas": {
        "nome": "Balcão de gavetas", "motor": "gavetas",
        "valores": dict(largura=80, altura=85, profundidade=55, colunas=1, gavetas_por_coluna=4,
                        nicho=0, base_tipo="rodape", base_altura=10, tampo="sobreposto",
                        frente_tipo="sobrepostas", distribuicao="crescente"),
    },
    "sapateira": {
        "nome": "Sapateira (portas – basculante em fase futura)", "motor": "portas",
        "valores": dict(largura=80, altura=100, profundidade=35, portas=2, prateleiras=4,
                        base_tipo="rodape", base_altura=5, tampo="sobreposto",
                        frente_tipo="sobrepostas", puxador_posicao="lateral"),
    },
    "armario_2_portas": {
        "nome": "Armário 2 portas", "motor": "portas",
        "valores": dict(largura=80, altura=180, profundidade=55, portas=2, prateleiras=4,
                        base_tipo="rodape", base_altura=5, tampo="sobreposto",
                        frente_tipo="sobrepostas", puxador_posicao="lateral"),
    },
    "armario_4_portas": {
        "nome": "Armário 4 portas", "motor": "portas",
        "valores": dict(largura=160, altura=210, profundidade=55, portas=4, prateleiras=5,
                        base_tipo="rodape", base_altura=5, tampo="sobreposto",
                        frente_tipo="sobrepostas", puxador_posicao="lateral"),
    },
    "balcao_portas": {
        "nome": "Balcão de portas", "motor": "portas",
        "valores": dict(largura=80, altura=85, profundidade=55, portas=2, prateleiras=1,
                        base_tipo="rodape", base_altura=10, tampo="sobreposto",
                        frente_tipo="sobrepostas", puxador_posicao="lateral"),
    },
}


def aplicar_preset(projeto, tipo: str) -> None:
    """Carrega no projeto os valores do tipo de móvel escolhido."""
    preset = PRESETS[tipo]
    projeto.tipo = tipo
    projeto.motor = preset["motor"]
    for chave, valor in preset["valores"].items():
        setattr(projeto, chave, valor)
    projeto.alturas_personalizadas = []
    projeto.folgas_travadas = {}
    projeto.nome = preset["nome"].split(" (")[0]
    if preset["motor"] == "portas" and projeto.puxador_posicao == "centro":
        projeto.puxador_posicao = "lateral"
