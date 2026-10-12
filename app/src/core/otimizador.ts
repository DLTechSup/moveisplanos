// Otimizador de chapas: guilhotina em faixas (shelf first-fit decreasing), com kerf e refilo.
import * as C from './catalogo'
import { aviso } from './tipos'
import type { Catalogo, Peca, Resultado } from './tipos'

export interface Posicionada { peca_id: number; nome: string; x: number; y: number; w: number; h: number; girada: boolean; indice: number }
export interface ChapaPlano { pecas: Posicionada[]; faixas: [number, number, number][]; aproveitamento: number }
export interface Grupo {
  material: string; esp: number; padrao: string; comprimento: number; largura: number; preco: number; unidade: string
  chapas: ChapaPlano[]; nao_cabem: string[]; aproveitamento: number
}
export interface Plano { grupos: Grupo[]; kerf: number; refilo: number }

export const totalChapas = (pl: Plano, material?: string, esp?: number) =>
  pl.grupos.filter(g => (!material || g.material === material) && (esp == null || g.esp === esp))
    .reduce((a, g) => a + g.chapas.length, 0)

export function otimizar(res: Resultado, cat: Catalogo, kerf = 4, refilo = 10): Plano {
  const plano: Plano = { grupos: [], kerf, refilo }
  const mapa = new Map<string, Peca[]>()
  for (const pc of res.pecas) {
    const k = `${pc.material}|${pc.esp}|${pc.padrao}`
    mapa.set(k, [...(mapa.get(k) ?? []), pc])
  }
  for (const pecas of mapa.values()) {
    const { material, esp, padrao } = pecas[0]
    const ch = C.chapa(cat, material, esp)
    const g: Grupo = { material, esp, padrao, comprimento: ch.comprimento, largura: ch.largura, preco: ch.preco ?? 0,
      unidade: ch.unidade ?? 'chapa', chapas: [], nao_cabem: [], aproveitamento: 0 }
    encaixar(g, pecas, kerf, refilo)
    g.aproveitamento = g.chapas.length ? g.chapas.reduce((a, c) => a + c.aproveitamento, 0) / g.chapas.length : 0
    plano.grupos.push(g)
    for (const nome of g.nao_cabem) aviso(res, 'erro', `Peça maior que a chapa: ${nome} (${material} ${esp} mm).`)
  }
  return plano
}

type Opcao = [number, number, boolean]

function encaixar(g: Grupo, pecas: Peca[], kerf: number, refilo: number): void {
  const W = g.comprimento - 2 * refilo
  const H = g.largura - 2 * refilo
  const itens: [Peca, number][] = []
  for (const pc of pecas) for (let i = 0; i < pc.qtd; i++) itens.push([pc, i])

  const opcoes = (pc: Peca): Opcao[] => {
    const o: Opcao[] = [[pc.comp, pc.larg, false]]
    if (!pc.veio && Math.abs(pc.comp - pc.larg) > 1e-6) o.push([pc.larg, pc.comp, true])
    return o.filter(x => x[0] <= W + 1e-6 && x[1] <= H + 1e-6)
  }
  const chave = ([pc]: [Peca, number]) => {
    const ops = opcoes(pc)
    return -Math.min(...(ops.length ? ops : [[pc.comp, pc.larg, false] as Opcao]).map(o => o[1]))
  }
  itens.sort((a, b) => chave(a) - chave(b))

  for (const [pc, i] of itens) {
    const ops = opcoes(pc)
    if (!ops.length) { g.nao_cabem.push(pc.nome); continue }
    if (!colocarExistente(g, pc, i, ops, W, H, kerf)) novaFaixa(g, pc, i, ops, kerf)
  }
  const areaUtil = W * H
  for (const c of g.chapas) {
    c.aproveitamento = areaUtil ? (100 * c.pecas.reduce((a, p) => a + p.w * p.h, 0)) / areaUtil : 0
  }
}

function colocarExistente(g: Grupo, pc: Peca, i: number, ops: Opcao[], W: number, H: number, kerf: number): boolean {
  type Melhor = [number, number, number, number, number, boolean]
  let melhor = null as Melhor | null
  for (let ci = 0; ci < g.chapas.length; ci++) {
    const faixas = g.chapas[ci].faixas
    for (let fi = 0; fi < faixas.length; fi++) {
      const [, alt, usado] = faixas[fi]
      for (const [w, h, girada] of ops) {
        if (h <= alt + 1e-6 && usado + w <= W + 1e-6) {
          const sobra = alt - h
          if (!melhor || ci < melhor[0] || (ci === melhor[0] && sobra < melhor[1])) melhor = [ci, sobra, fi, w, h, girada]
        }
      }
    }
    if (melhor) break
  }
  if (!melhor) {
    for (const chapa of g.chapas) {
      const yProx = chapa.faixas.length ? chapa.faixas[chapa.faixas.length - 1][0] + chapa.faixas[chapa.faixas.length - 1][1] + kerf : 0
      for (const [w, h, girada] of [...ops].sort((a, b) => a[1] - b[1])) {
        if (yProx + h <= H + 1e-6) {
          chapa.faixas.push([yProx, h, 0])
          por(chapa, pc, i, chapa.faixas.length - 1, w, h, girada, kerf)
          return true
        }
      }
    }
    return false
  }
  const [ci, , fi, w, h, girada] = melhor
  por(g.chapas[ci], pc, i, fi, w, h, girada, kerf)
  return true
}

function novaFaixa(g: Grupo, pc: Peca, i: number, ops: Opcao[], kerf: number): void {
  const chapa: ChapaPlano = { pecas: [], faixas: [], aproveitamento: 0 }
  g.chapas.push(chapa)
  const [w, h, girada] = [...ops].sort((a, b) => a[1] - b[1])[0]
  chapa.faixas.push([0, h, 0])
  por(chapa, pc, i, 0, w, h, girada, kerf)
}

function por(chapa: ChapaPlano, pc: Peca, i: number, fi: number, w: number, h: number, girada: boolean, kerf: number): void {
  const faixa = chapa.faixas[fi]
  chapa.pecas.push({ peca_id: pc.id, nome: pc.nome, x: faixa[2], y: faixa[0], w, h, girada, indice: i })
  faixa[2] += w + kerf
}
