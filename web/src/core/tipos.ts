// Modelos de dados (mesmos nomes de campos do programa desktop, para o .pmv ser compatível).

export interface Extra { descricao: string; qtd: number; preco: number }

export interface Projeto {
  nome: string; cliente: string; telefone: string; data: string; observacoes: string
  tipo: string
  motor: 'gavetas' | 'portas'
  largura: number; altura: number; profundidade: number // cm
  colunas: number; gavetas_por_coluna: number
  distribuicao: 'iguais' | 'crescente'
  alturas_personalizadas: number[]
  nicho: number
  portas: number; prateleiras: number
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
  folgas_travadas: Record<string, number>
  mao_de_obra: number; margem: number
  extras: Extra[]
}

export function projetoPadrao(): Projeto {
  return {
    nome: 'Cômoda', cliente: '', telefone: '', data: '', observacoes: '',
    tipo: 'comoda', motor: 'gavetas',
    largura: 140, altura: 80, profundidade: 52,
    colunas: 2, gavetas_por_coluna: 3, distribuicao: 'iguais', alturas_personalizadas: [], nicho: 0,
    portas: 2, prateleiras: 1,
    estrutura_material: 'MDF', estrutura_esp: 15, estrutura_padrao: 'Carvalho claro',
    tampo: 'sobreposto', base_tipo: 'rodape', base_altura: 5,
    fundo_tipo: 'rasgo', fundo_material: 'HDF', fundo_esp: 6, fundo_padrao: 'Branco',
    frente_tipo: 'sobrepostas', frente_material: 'MDF', frente_esp: 15, frente_padrao: 'Carvalho claro',
    puxador: 'Barra 128', puxador_posicao: 'centro',
    corredica: 'Telescópica 45 kg', corredica_comp: 'auto',
    caixa_material: 'MDF', caixa_esp: 15, caixa_padrao: 'Branco',
    fundo_caixa_material: 'MDF', fundo_caixa_esp: 6,
    fita: 'Fita PVC 22 mm', dobradica: 'Dobradiça 35 mm curva',
    folgas_travadas: {}, mao_de_obra: 0, margem: 30, extras: [],
  }
}

/** Peça do plano de corte; medidas em mm, `comp` segue o veio. */
export interface Peca {
  nome: string; qtd: number; comp: number; larg: number; esp: number
  material: string; padrao: string
  fita_c: number; fita_l: number; veio: boolean; obs: string; id: number
}

export type Cor = 'estrutura' | 'frente' | 'caixa' | 'fundo' | 'ferragem'

/** Caixa alinhada aos eixos (X largura, Y altura, Z profundidade). */
export interface Bloco {
  nome: string; grupo: string
  x: number; y: number; z: number; dx: number; dy: number; dz: number
  cor: Cor; veio: '' | 'x' | 'y' | 'z'; peca: number; gaveta: number
}

export interface Puxador {
  x: number; y: number; z: number; tipo: string; comp: number; vertical: boolean
  frente_x: number; frente_y: number; frente_w: number; frente_h: number
}

export interface Ferragem { nome: string; qtd: number; unidade: string; categoria: string; detalhe: string }
export interface Aviso { nivel: 'erro' | 'aviso'; texto: string }
export interface FolgaInfo { valor: number; auto: number; travada: boolean; fora: boolean }

export interface Resultado {
  pecas: Peca[]; blocos: Bloco[]; puxadores: Puxador[]; ferragens: Ferragem[]; avisos: Aviso[]
  medidas: Record<string, any>
  folgas: Record<string, FolgaInfo>
  caixa_modelo: Bloco[]
  dobradicas: number[][]
  definicoes: string[]
  insumos: Record<string, number>
}

export function resultadoVazio(): Resultado {
  return { pecas: [], blocos: [], puxadores: [], ferragens: [], avisos: [], medidas: {}, folgas: {},
    caixa_modelo: [], dobradicas: [], definicoes: [], insumos: {} }
}

export function addPeca(res: Resultado, p: Omit<Peca, 'id'>): number {
  const r2 = (v: number) => Math.round(v * 100) / 100
  const chave = (x: Omit<Peca, 'id'>) => [x.nome, r2(x.comp), r2(x.larg), r2(x.esp), x.material, x.padrao,
    x.fita_c, x.fita_l, x.veio, x.obs].join('|')
  const k = chave(p)
  for (const e of res.pecas) {
    if (chave(e) === k) { e.qtd += p.qtd; return e.id }
  }
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

// --- catálogo ---------------------------------------------------------------------------------
export interface Chapa { material: string; espessura: number; comprimento: number; largura: number; preco: number; unidade: 'chapa' | 'm2' }
export interface Padrao { nome: string; tipo: 'amadeirado' | 'unicolor'; cor: string; veio: boolean }
export interface PuxadorCat { nome: string; tipo: string; comprimento: number; entre_furos: number; cor: string; preco: number }
export interface CorredicaCat { nome: string; tipo: string; comprimentos: number[]; folga_lado: number; altura_min_caixa: number; amortecimento: boolean; preco: number }
export interface FitaCat { nome: string; largura: number; espessura: number; preco_metro: number }
export interface DobradicaCat { nome: string; tipo: string; amortecimento: boolean; preco: number }
export interface Insumo { chave: string; nome: string; unidade: string; preco: number }

export interface Catalogo {
  versao: number
  chapas: Chapa[]; padroes: Padrao[]; puxadores: PuxadorCat[]; corredicas: CorredicaCat[]
  fitas: FitaCat[]; dobradicas: DobradicaCat[]; insumos: Insumo[]
}
export type SecaoCatalogo = Exclude<keyof Catalogo, 'versao'>
