// Modelos de dados do Projeta Móveis (projeto, resultado do cálculo e catálogo).

export const VERSAO_PROJETO = 3

// ---- projeto ------------------------------------------------------------------------------------
export type Familia = 'modular' | 'mesa' | 'cama'
export type TipoSecao = 'gavetas' | 'portas' | 'aberto'

/** Uma seção vertical dentro de uma coluna (de cima para baixo). */
export interface Secao {
  tipo: TipoSecao
  altura: number          // cm; 0 = automática (divide o que sobrar)
  n: number               // gavetas: quantidade
  prateleiras: number     // prateleiras soltas (portas / aberto)
  portas: number          // portas: quantidade (0 = automático pela largura)
  cabideiro: boolean      // varão de roupas (portas / aberto)
  crescente: boolean      // gavetas: maiores embaixo
  espelho: boolean        // portas com espelho
  alturas: number[]       // gavetas: alturas personalizadas das frentes (cm, 0 = auto)
}
export interface Coluna { largura: number; secoes: Secao[] }   // largura do vão em cm; 0 = automática

export interface Extra { descricao: string; qtd: number; preco: number }

export interface MesaCfg {
  formato: 'retangular' | 'redonda'
  pes: 'quadrado' | 'painel'
  perna: number            // cm (lado da perna)
  perna_material: string
  tampo_material: string
  saia: number             // cm (altura da travessa sob o tampo)
  tampo_esp: number        // mm
  prateleira_inferior: boolean
  gavetas: number          // gavetas sob o tampo
}
export interface CamaCfg {
  tamanho: string          // solteiro | solteiro_king | casal | queen | king | infantil | personalizado
  colchao_l: number        // cm
  colchao_c: number        // cm
  altura_base: number      // cm do chão até o topo do estrado
  cabeceira: 'nenhuma' | 'painel'
  cabeceira_altura: number // cm do chão ao topo
  estrado: 'ripas' | 'chapa'
  andares: 1 | 2           // 2 = beliche
}

export interface Projeto {
  versao: number
  nome: string; cliente: string; telefone: string; data: string; observacoes: string
  empresa: string; cidade: string; uf: string; condicoes: string
  familia: Familia
  tipo: string
  largura: number; altura: number; profundidade: number   // cm
  elevacao: number                                         // cm do chão (móvel suspenso)
  colunas: Coluna[]
  porta_correr: number                                     // 0 = portas de abrir; n ≥ 2 = n portas de correr
  estrutura_material: string; estrutura_esp: number; estrutura_padrao: string
  tampo: 'sobreposto' | 'entre_laterais'
  base_tipo: 'rodape' | 'pes' | 'rodizios' | 'nenhuma'
  base_altura: number
  fundo_tipo: 'rasgo' | 'pregado'
  fundo_material: string; fundo_esp: number; fundo_padrao: string
  frente_tipo: 'sobrepostas' | 'embutidas'
  frente_material: string; frente_esp: number; frente_padrao: string
  puxador: string; puxador_posicao: 'centro' | 'superior' | 'lateral'
  corredica: string; corredica_comp: string
  caixa_material: string; caixa_esp: number; caixa_padrao: string
  fundo_caixa_material: string; fundo_caixa_esp: number
  fita: string; dobradica: string
  mesa: MesaCfg
  cama: CamaCfg
  folgas_travadas: Record<string, number>
  mao_de_obra: number; margem: number
  extras: Extra[]
}

export const secaoPadrao = (tipo: TipoSecao = 'aberto', o: Partial<Secao> = {}): Secao => ({
  tipo, altura: 0, n: tipo === 'gavetas' ? 3 : 0, prateleiras: 0, portas: 0, cabideiro: false, crescente: false,
  espelho: false, alturas: [], ...o,
})

export function projetoPadrao(): Projeto {
  return {
    versao: VERSAO_PROJETO,
    nome: 'Cômoda 6 gavetas', cliente: '', telefone: '', data: '', observacoes: '',
    empresa: '', cidade: '', uf: 'SP', condicoes: '',
    familia: 'modular', tipo: 'comoda_6',
    largura: 140, altura: 80, profundidade: 52, elevacao: 0,
    colunas: [
      { largura: 0, secoes: [secaoPadrao('gavetas', { n: 3 })] },
      { largura: 0, secoes: [secaoPadrao('gavetas', { n: 3 })] },
    ],
    porta_correr: 0,
    estrutura_material: 'MDF', estrutura_esp: 15, estrutura_padrao: 'Carvalho claro',
    tampo: 'sobreposto', base_tipo: 'rodape', base_altura: 5,
    fundo_tipo: 'rasgo', fundo_material: 'HDF', fundo_esp: 6, fundo_padrao: 'Branco',
    frente_tipo: 'sobrepostas', frente_material: 'MDF', frente_esp: 15, frente_padrao: 'Carvalho claro',
    puxador: 'Barra 128', puxador_posicao: 'centro',
    corredica: 'Telescópica 45 kg', corredica_comp: 'auto',
    caixa_material: 'MDF', caixa_esp: 15, caixa_padrao: 'Branco',
    fundo_caixa_material: 'MDF', fundo_caixa_esp: 6,
    fita: 'Fita PVC 22 mm', dobradica: 'Dobradiça 35 mm curva',
    mesa: { formato: 'retangular', pes: 'quadrado', perna: 6, perna_material: 'Madeira maciça', tampo_material: 'MDF', saia: 8, tampo_esp: 25,
      prateleira_inferior: false, gavetas: 0 },
    cama: { tamanho: 'casal', colchao_l: 138, colchao_c: 188, altura_base: 35, cabeceira: 'painel', cabeceira_altura: 100,
      estrado: 'ripas', andares: 1 },
    folgas_travadas: {}, mao_de_obra: 0, margem: 30, extras: [],
  }
}

// ---- resultado do cálculo ---------------------------------------------------------------------------------------------
/** Peça do plano de corte; medidas em mm, `comp` segue o veio. */
export interface Peca {
  nome: string; qtd: number; comp: number; larg: number; esp: number
  material: string; padrao: string
  fita_c: number; fita_l: number; veio: boolean; obs: string; id: number
}

export type Cor = 'estrutura' | 'frente' | 'caixa' | 'fundo' | 'ferragem' | 'espelho' | 'colchao' | 'perna'

/** Caixa alinhada aos eixos (X largura, Y altura, Z profundidade). */
export interface Bloco {
  nome: string; grupo: string
  x: number; y: number; z: number; dx: number; dy: number; dz: number
  cor: Cor; veio: '' | 'x' | 'y' | 'z'; peca: number; gaveta: number
  aberto?: boolean          // visível de frente mesmo com o móvel fechado (nicho, cabideiro…)
  forma?: 'redondo'         // tampo redondo
}

export interface Puxador {
  x: number; y: number; z: number; tipo: string; comp: number; vertical: boolean
  frente_x: number; frente_y: number; frente_w: number; frente_h: number
}

export interface Ferragem {
  nome: string; qtd: number; unidade: string; categoria: string; detalhe: string
  chave?: string            // código do insumo no catálogo (para o preço)
}
export interface Aviso { nivel: 'erro' | 'aviso'; texto: string }
export interface FolgaInfo { valor: number; auto: number; travada: boolean; fora: boolean }

/** Cota que o motor pede para uma vista (valores em mm, coordenadas do móvel). */
export interface Cota { t: 'h' | 'v'; a: number; b: number; nivel: number; lado: boolean; texto?: string; ref?: number }
export interface Regiao { x: number; y: number; w: number; h: number }

export type VistaId = 'frontal' | 'lateral' | 'interna' | 'interna_gavetas' | 'planta' | 'detalhe' | '3d' | 'explodida'

export interface Resultado {
  pecas: Peca[]; blocos: Bloco[]; puxadores: Puxador[]; ferragens: Ferragem[]; avisos: Aviso[]
  medidas: Record<string, any>
  folgas: Record<string, FolgaInfo>
  caixa_modelo: Bloco[]
  dobradicas: number[][]
  definicoes: string[]
  conferencias: string[]
  abertos: Regiao[]                      // áreas abertas vistas de frente
  cotas: Partial<Record<VistaId, Cota[]>>
  vistas: VistaId[]                      // vistas que fazem sentido para este móvel
  detalhe: 'caixa' | 'porta' | 'nenhum'
}

export function resultadoVazio(): Resultado {
  return { pecas: [], blocos: [], puxadores: [], ferragens: [], avisos: [], medidas: {}, folgas: {}, caixa_modelo: [],
    dobradicas: [], definicoes: [], conferencias: [], abertos: [], cotas: {}, vistas: [], detalhe: 'nenhum' }
}

export function addPeca(res: Resultado, p: Omit<Peca, 'id'>): number {
  const r2 = (v: number) => Math.round(v * 100) / 100
  const chave = (x: Omit<Peca, 'id'>) => [x.nome, r2(x.comp), r2(x.larg), r2(x.esp), x.material, x.padrao,
    x.fita_c, x.fita_l, x.veio, x.obs].join('|')
  const k = chave(p)
  for (const e of res.pecas) if (chave(e) === k) { e.qtd += p.qtd; return e.id }
  const nova: Peca = { ...p, id: res.pecas.length + 1 }
  res.pecas.push(nova)
  return nova.id
}

export function aviso(res: Resultado, nivel: 'erro' | 'aviso', texto: string): void {
  if (!res.avisos.some(a => a.texto === texto)) res.avisos.push({ nivel, texto })
}

export const fitaTexto = (p: Peca) => {
  const partes: string[] = []
  if (p.fita_c) partes.push(`${p.fita_c}C`)
  if (p.fita_l) partes.push(`${p.fita_l}L`)
  return partes.length ? partes.join('+') : '—'
}
export const metrosFita = (p: Peca) => (p.qtd * (p.fita_c * p.comp + p.fita_l * p.larg)) / 1000

// ---- catálogo -------------------------------------------------------------------------------------------------------------
/** Campos de preço comuns a todos os itens do catálogo. */
export interface Precificado { fonte?: string; atualizado?: string }
export interface Chapa extends Precificado { preco: number; material: string; espessura: number; comprimento: number; largura: number; unidade: 'chapa' | 'm2' }
export interface Padrao { nome: string; tipo: 'amadeirado' | 'unicolor'; cor: string; veio: boolean; fator: number; imagem?: string }
export interface PuxadorCat extends Precificado { preco: number; nome: string; tipo: string; comprimento: number; entre_furos: number; cor: string; imagem?: string }
export interface CorredicaCat extends Precificado { preco: number; nome: string; tipo: string; comprimentos: number[]; folga_lado: number; altura_min_caixa: number; amortecimento: boolean; imagem?: string }
export interface FitaCat extends Precificado { nome: string; largura: number; espessura: number; preco_metro: number; imagem?: string }
export interface DobradicaCat extends Precificado { preco: number; nome: string; tipo: string; amortecimento: boolean; imagem?: string }
export interface Insumo extends Precificado { preco: number; chave: string; nome: string; unidade: string; imagem?: string }

export interface Catalogo {
  versao: number
  chapas: Chapa[]; padroes: Padrao[]; puxadores: PuxadorCat[]; corredicas: CorredicaCat[]
  fitas: FitaCat[]; dobradicas: DobradicaCat[]; insumos: Insumo[]
}
export type SecaoCatalogo = Exclude<keyof Catalogo, 'versao'>
