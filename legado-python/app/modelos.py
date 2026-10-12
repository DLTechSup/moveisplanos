"""Modelos de dados: Projeto (entrada) e Resultado (saída do motor)."""
from __future__ import annotations

from dataclasses import dataclass, field, fields, asdict


@dataclass
class Peca:
    """Peça do plano de corte. Medidas em mm; `comp` segue o veio."""
    nome: str
    qtd: int
    comp: float
    larg: float
    esp: float
    material: str
    padrao: str
    fita_c: int = 0          # bordas de fita no sentido do comprimento (0-2)
    fita_l: int = 0          # bordas de fita no sentido da largura (0-2)
    veio: bool = True
    obs: str = ""
    id: int = 0

    def fita_texto(self) -> str:
        partes = []
        if self.fita_c:
            partes.append(f"{self.fita_c}C")
        if self.fita_l:
            partes.append(f"{self.fita_l}L")
        return "+".join(partes) if partes else "—"

    def metros_fita(self) -> float:
        return self.qtd * (self.fita_c * self.comp + self.fita_l * self.larg) / 1000.0

    def chave(self) -> tuple:
        return (self.nome, round(self.comp, 2), round(self.larg, 2), round(self.esp, 2),
                self.material, self.padrao, self.fita_c, self.fita_l, self.veio, self.obs)


@dataclass
class Bloco:
    """Caixa alinhada aos eixos usada nos desenhos (X largura, Y altura, Z profundidade)."""
    nome: str
    grupo: str               # tampo, lateral, base, rodape, divisoria, fundo, frente, porta,
                             # prateleira, caixa_lateral, caixa_frente, caixa_fundo, corredica, pe...
    x: float
    y: float
    z: float
    dx: float
    dy: float
    dz: float
    cor: str = "estrutura"   # estrutura | frente | caixa | fundo | ferragem
    veio: str = ""           # direção do veio: x | y | z | ''
    peca: int = 0            # id da peça (numeração da vista explodida)
    gaveta: int = -1         # índice da gaveta/porta a que pertence (-1 = nenhuma)

    @property
    def x2(self): return self.x + self.dx
    @property
    def y2(self): return self.y + self.dy
    @property
    def z2(self): return self.z + self.dz


@dataclass
class Puxador:
    """Puxador na face frontal (plano X-Y). x,y = centro, em mm."""
    x: float
    y: float
    z: float
    tipo: str
    comp: float
    vertical: bool
    frente_x: float
    frente_y: float
    frente_w: float
    frente_h: float


@dataclass
class Ferragem:
    nome: str
    qtd: float
    unidade: str
    categoria: str
    detalhe: str = ""


@dataclass
class Aviso:
    nivel: str   # 'erro' (vermelho) | 'aviso' (amarelo)
    texto: str


@dataclass
class Resultado:
    pecas: list[Peca] = field(default_factory=list)
    blocos: list[Bloco] = field(default_factory=list)
    puxadores: list[Puxador] = field(default_factory=list)
    ferragens: list[Ferragem] = field(default_factory=list)
    avisos: list[Aviso] = field(default_factory=list)
    medidas: dict = field(default_factory=dict)
    folgas: dict = field(default_factory=dict)
    caixa_modelo: list[Bloco] = field(default_factory=list)
    dobradicas: list[list[float]] = field(default_factory=list)   # y (mm) de cada dobradiça, por porta
    definicoes: list[str] = field(default_factory=list)
    insumos: dict = field(default_factory=dict)       # pe / rodizio -> quantidade

    def add_peca(self, peca: Peca) -> int:
        """Soma peças idênticas numa linha só e devolve o id da linha."""
        for existente in self.pecas:
            if existente.chave() == peca.chave():
                existente.qtd += peca.qtd
                return existente.id
        peca.id = len(self.pecas) + 1
        self.pecas.append(peca)
        return peca.id

    def aviso(self, nivel: str, texto: str) -> None:
        if not any(a.texto == texto for a in self.avisos):
            self.avisos.append(Aviso(nivel, texto))

    def blocos_do_grupo(self, *grupos: str) -> list[Bloco]:
        return [b for b in self.blocos if b.grupo in grupos]


@dataclass
class Projeto:
    # identificação
    nome: str = "Cômoda"
    cliente: str = ""
    telefone: str = ""
    data: str = ""
    observacoes: str = ""
    tipo: str = "comoda"
    motor: str = "gavetas"           # gavetas | portas
    # medidas externas (cm)
    largura: float = 140.0
    altura: float = 80.0
    profundidade: float = 52.0
    # divisão
    colunas: int = 2
    gavetas_por_coluna: int = 3
    distribuicao: str = "iguais"     # iguais | crescente
    alturas_personalizadas: list = field(default_factory=list)   # cm por gaveta (0 = automático)
    nicho: float = 0.0               # cm
    portas: int = 2
    prateleiras: int = 1
    # estrutura
    estrutura_material: str = "MDF"
    estrutura_esp: float = 15.0
    estrutura_padrao: str = "Carvalho claro"
    tampo: str = "sobreposto"        # sobreposto | entre_laterais
    base_tipo: str = "rodape"        # rodape | pes | rodizios | nenhuma
    base_altura: float = 5.0         # cm
    fundo_tipo: str = "rasgo"        # rasgo | pregado
    fundo_material: str = "HDF"
    fundo_esp: float = 6.0
    fundo_padrao: str = "Branco"
    # frentes
    frente_tipo: str = "sobrepostas"  # sobrepostas | embutidas
    frente_material: str = "MDF"
    frente_esp: float = 15.0
    frente_padrao: str = "Carvalho claro"
    puxador: str = "Barra 128"
    puxador_posicao: str = "centro"   # centro | superior | lateral
    # gavetas
    corredica: str = "Telescópica 45 kg"
    corredica_comp: str = "auto"      # auto ou comprimento em mm
    caixa_material: str = "MDF"
    caixa_esp: float = 15.0
    caixa_padrao: str = "Branco"
    fundo_caixa_material: str = "MDF"
    fundo_caixa_esp: float = 6.0
    # fita e dobradiça
    fita: str = "Fita PVC 22 mm"
    dobradica: str = "Dobradiça 35 mm curva"
    # folgas travadas pelo usuário: {chave: valor_mm}
    folgas_travadas: dict = field(default_factory=dict)
    # orçamento
    mao_de_obra: float = 0.0
    margem: float = 30.0
    extras: list = field(default_factory=list)   # [{descricao, qtd, preco}]

    def para_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def de_dict(cls, dados: dict) -> "Projeto":
        validos = {f.name for f in fields(cls)}
        return cls(**{k: v for k, v in dados.items() if k in validos})
