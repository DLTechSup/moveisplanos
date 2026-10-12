import type { Catalogo, CorredicaCat, DobradicaCat, FitaCat, Insumo, Padrao, PuxadorCat, Chapa, SecaoCatalogo } from './tipos'

export const VERSAO = 2

const CHAPAS: [string, number[], number, number, 'chapa' | 'm2'][] = [
  ['MDF', [3, 6, 9, 12, 15, 18, 25], 2750, 1850, 'chapa'],
  ['MDP', [15, 18, 25], 2750, 1850, 'chapa'],
  ['HDF', [3, 6], 2750, 1830, 'chapa'],
  ['Compensado', [6, 10, 15, 18], 2200, 1600, 'chapa'],
  ['Madeira maciça', [20, 25, 30], 2500, 400, 'm2'],
]

const A = 'amadeirado', U = 'unicolor'
const PADROES: [string, 'amadeirado' | 'unicolor', string, boolean][] = [
  ['Carvalho claro', A, '#D2B48C', true], ['Carvalho escuro', A, '#8B6A45', true], ['Freijó', A, '#C9A66B', true],
  ['Nogueira', A, '#5E4631', true], ['Cumaru', A, '#9A6A3E', true], ['Teca', A, '#B9824A', true],
  ['Louro', A, '#7A4E2D', true], ['Cinamomo', A, '#B98E62', true], ['Ipê', A, '#6B4A2B', true],
  ['Jatobá', A, '#A65E3A', true], ['Imbuia', A, '#4A3326', true], ['Mogno', A, '#7B3F2A', true],
  ['Cedro', A, '#B5693F', true], ['Peroba', A, '#C98F5A', true], ['Pinus', A, '#E3C48D', true],
  ['Eucalipto', A, '#CDA67A', true], ['Cerejeira', A, '#9C4A33', true], ['Bétula', A, '#EBD9B4', true],
  ['Maple', A, '#E8CFA0', true], ['Garapa', A, '#D9A441', true], ['Sucupira', A, '#6E3B24', true],
  ['Ébano', A, '#2E2420', true], ['Cedro rosa', A, '#C47E5F', true], ['Amendoim', A, '#A9743F', true],
  ['Itaúba', A, '#8A6B2E', true], ['Tauari', A, '#D7B98A', true], ['Demolição', A, '#8E7B66', true],
  ['Madeira rústica', A, '#A08463', true],
  ['Branco', U, '#F5F5F2', false], ['Preto', U, '#1E1E1E', false], ['Cinza grafite', U, '#4A4D52', false],
  ['Cinza claro', U, '#BFC2C4', false], ['Areia', U, '#D8C7A4', false], ['Off-white', U, '#EDE8DA', false],
  ['Bege', U, '#CBB594', false], ['Fendi', U, '#A99A87', false], ['Verde sálvia', U, '#9CAF98', false],
  ['Verde musgo', U, '#5B6B46', false], ['Azul petróleo', U, '#25525E', false], ['Azul marinho', U, '#1F2F4F', false],
  ['Terracota', U, '#B5603F', false], ['Rosa antigo', U, '#D3A5A0', false], ['Amarelo mostarda', U, '#C9962B', false],
  ['Vinho', U, '#5E2230', false], ['Cimento queimado', U, '#8F9092', false],
]

function puxadoresPadrao(): PuxadorCat[] {
  const l: PuxadorCat[] = []
  const add = (nome: string, tipo: string, comprimento: number, entre_furos: number, cor: string) =>
    l.push({ nome, tipo, comprimento, entre_furos, cor, preco: 0 })
  for (const ef of [96, 128, 160, 192, 224, 256, 320, 480, 640]) add(`Barra ${ef}`, 'barra', ef + 32, ef, '#B8BCC2')
  for (const ef of [128, 192]) {
    add(`Barra slim preta ${ef}`, 'barra', ef + 20, ef, '#1E1E1E')
    add(`Barra slim dourada ${ef}`, 'barra', ef + 20, ef, '#C9A24B')
  }
  add('Cava usinada', 'cava_usinada', 150, 0, '#3A2A1E')
  add('Perfil cava alumínio', 'perfil_cava', 0, 0, '#C9CDD2')
  add('Perfil cava preto', 'perfil_cava', 0, 0, '#222222')
  add('Botão redondo', 'botao', 30, 0, '#B8BCC2')
  add('Botão preto fosco', 'botao', 30, 0, '#222222')
  add('Botão dourado', 'botao', 30, 0, '#C9A24B')
  add('Concha 96', 'concha', 110, 96, '#B8BCC2')
  add('Concha 128', 'concha', 140, 128, '#B8BCC2')
  add('Sem puxador (toque)', 'toque', 0, 0, '#000000')
  return l
}

export function catalogoPadrao(): Catalogo {
  const comps = [250, 300, 350, 400, 450, 500, 550]
  const cor = (nome: string, tipo: string, folga_lado: number, altura_min_caixa: number, amortecimento: boolean): CorredicaCat =>
    ({ nome, tipo, comprimentos: [...comps], folga_lado, altura_min_caixa, amortecimento, preco: 0 })
  const fita = (nome: string, largura: number, espessura: number): FitaCat => ({ nome, largura, espessura, preco_metro: 0 })
  const dob = (nome: string, tipo: string, amortecimento: boolean): DobradicaCat => ({ nome, tipo, amortecimento, preco: 0 })
  const ins = (chave: string, nome: string): Insumo => ({ chave, nome, unidade: 'un', preco: 0 })
  return {
    versao: VERSAO,
    chapas: CHAPAS.flatMap(([material, esps, comprimento, largura, unidade]) =>
      esps.map((espessura): Chapa => ({ material, espessura, comprimento, largura, preco: 0, unidade }))),
    padroes: PADROES.map(([nome, tipo, c, veio]): Padrao => ({ nome, tipo, cor: c, veio })),
    puxadores: puxadoresPadrao(),
    corredicas: [
      cor('Telescópica 45 kg', 'telescopica', 12.7, 60, false),
      cor('Telescópica amortecida', 'telescopica', 12.7, 60, true),
      cor('Roldana', 'roldana', 12.5, 60, false),
      cor('Oculta', 'oculta', 21, 70, false),
      cor('Oculta amortecida', 'oculta', 21, 70, true),
    ],
    fitas: [fita('Fita PVC 22 mm', 22, 0.45), fita('Fita PVC 35 mm', 35, 1), fita('Fita PVC 45 mm', 45, 2),
      fita('Fita PVC 22 mm espessa', 22, 1)],
    dobradicas: [
      dob('Dobradiça 35 mm reta', 'reta', false), dob('Dobradiça 35 mm curva', 'curva', false),
      dob('Dobradiça 35 mm supercurva', 'supercurva', false), dob('Dobradiça reta amortecida', 'reta', true),
      dob('Dobradiça curva amortecida', 'curva', true), dob('Dobradiça supercurva amortecida', 'supercurva', true),
    ],
    insumos: [ins('pe', 'Pé regulável'), ins('rodizio', 'Rodízio com trava'), ins('parafuso', 'Parafusos (unidade)'),
      ins('cavilha', 'Cavilhas (unidade)'), ins('cola', 'Cola PVA (frasco 500 g)')],
  }
}

/** Completa seções que faltem (catálogos antigos ou importados). */
export function completarCatalogo(c: Partial<Catalogo> | null | undefined): Catalogo {
  const pad = catalogoPadrao()
  const out: any = { ...pad, ...(c || {}) }
  for (const k of Object.keys(pad) as (keyof Catalogo)[]) if (out[k] == null) out[k] = (pad as any)[k]
  out.versao = VERSAO
  return out as Catalogo
}

const CHAVE = 'projeta-moveis:catalogo'

export function carregarCatalogo(): Catalogo {
  try {
    const t = localStorage.getItem(CHAVE)
    if (t) return completarCatalogo(JSON.parse(t))
  } catch { /* usa o padrão */ }
  const c = catalogoPadrao()
  salvarCatalogo(c)
  return c
}

export function salvarCatalogo(c: Catalogo): void {
  try { localStorage.setItem(CHAVE, JSON.stringify(c)) } catch { /* sem armazenamento */ }
}

// --- consultas -------------------------------------------------------------------------------
export const materiais = (c: Catalogo) => [...new Set(c.chapas.map(x => x.material))]
export const espessuras = (c: Catalogo, m: string) =>
  [...new Set(c.chapas.filter(x => x.material === m).map(x => x.espessura))].sort((a, b) => a - b)

export function chapa(c: Catalogo, material: string, esp: number): Chapa {
  return c.chapas.find(x => x.material === material && Math.abs(x.espessura - esp) < 0.01)
    ?? c.chapas.find(x => x.material === material)
    ?? { material, espessura: esp, comprimento: 2750, largura: 1850, preco: 0, unidade: 'chapa' }
}
export const padrao = (c: Catalogo, nome: string): Padrao =>
  c.padroes.find(x => x.nome === nome) ?? { nome, tipo: 'unicolor', cor: '#CCCCCC', veio: false }
export const puxador = (c: Catalogo, nome: string): PuxadorCat =>
  c.puxadores.find(x => x.nome === nome) ?? c.puxadores[c.puxadores.length - 1]
export const corredica = (c: Catalogo, nome: string): CorredicaCat =>
  c.corredicas.find(x => x.nome === nome) ?? c.corredicas[0]
export const fita = (c: Catalogo, nome: string): FitaCat => c.fitas.find(x => x.nome === nome) ?? c.fitas[0]
export const dobradica = (c: Catalogo, nome: string): DobradicaCat =>
  c.dobradicas.find(x => x.nome === nome) ?? c.dobradicas[0]
export const insumo = (c: Catalogo, chave: string): Insumo =>
  c.insumos.find(x => x.chave === chave) ?? { chave, nome: chave, unidade: 'un', preco: 0 }
export const nomes = (c: Catalogo, secao: SecaoCatalogo): string[] =>
  (c[secao] as any[]).map(x => x.nome)

export function adicionarPadrao(c: Catalogo, nome: string, cor: string, veio = false): Catalogo {
  if (c.padroes.some(p => p.nome === nome)) return c
  return { ...c, padroes: [...c.padroes, { nome, tipo: veio ? 'amadeirado' : 'unicolor', cor, veio }] }
}
