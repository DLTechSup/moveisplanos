import * as C from '../core/catalogo'
import type { Calculo } from '../core/calculo'
import type { Bloco, Cota } from '../core/tipos'
import { Vista, desenharPuxador, escurecer } from './svg'

export const COR_FERRAGEM = '#9AA0A8'
export const COR_ESPELHO = '#cfe4ee'
export const COR_COLCHAO = '#e9edf2'
export const CAIXA = new Set(['caixa_lateral', 'caixa_frente', 'caixa_fundo'])

function nomePadrao(calc: Calculo, b: Bloco): string | undefined {
  const p = calc.projeto
  return { estrutura: p.estrutura_padrao, frente: p.frente_padrao, caixa: p.caixa_padrao, fundo: p.fundo_padrao,
    perna: p.estrutura_padrao, ferragem: undefined, espelho: undefined, colchao: undefined }[b.cor]
}
export function corDoBloco(calc: Calculo, b: Bloco): string {
  if (b.cor === 'espelho') return COR_ESPELHO
  if (b.cor === 'colchao') return COR_COLCHAO
  const nome = nomePadrao(calc, b)
  if (!nome) return COR_FERRAGEM
  const cor = C.padrao(calc.catalogo, nome).cor
  return b.cor === 'perna' ? escurecer(cor, 112) : cor
}
/** 'h', 'v' ou '' conforme o veio do bloco no plano ('xy' ou 'zy'). */
export function direcaoVeio(calc: Calculo, b: Bloco, plano: 'xy' | 'zy'): 'h' | 'v' | '' {
  const nome = nomePadrao(calc, b)
  if (!nome || !C.padrao(calc.catalogo, nome).veio) return ''
  const horizontal = plano === 'xy' ? 'x' : 'z'
  if (b.veio === horizontal) return 'h'
  if (b.veio === 'y') return 'v'
  return ''
}
export function blocoFrontal(v: Vista, calc: Calculo, b: Bloco, escurecerPct = 100, tracejado = false): void {
  let cor = corDoBloco(calc, b)
  if (escurecerPct !== 100) cor = escurecer(cor, escurecerPct)
  if (b.grupo === 'rodizio') { rodizio(v, b); return }
  if (b.grupo === 'cabideiro') { v.peca(b.x, b.y, b.dx, b.dy, '#B8BCC2', '', 0, { espessura: 2.5 }); return }
  if (b.cor === 'espelho') { espelho(v, b.x, b.y, b.dx, b.dy); return }
  v.peca(b.x, b.y, b.dx, b.dy, cor, direcaoVeio(calc, b, 'xy'), b.peca * 31 + b.gaveta + 7, { tracejado, redondo: false })
}
export function blocoLateral(v: Vista, calc: Calculo, b: Bloco, tracejado = false): void {
  if (b.grupo === 'cabideiro') return
  v.peca(b.z, b.y, b.dz, b.dy, corDoBloco(calc, b), direcaoVeio(calc, b, 'zy'), b.peca * 17 + 3, { tracejado })
}
function espelho(v: Vista, x: number, y: number, w: number, h: number): void {
  const r = v.rect(x, y, w, h)
  v.out.push(`<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${COR_ESPELHO}" stroke="#2B2B2B" stroke-width="3.5"/>`)
  v.out.push(`<polygon points="${r.x + r.w * 0.15},${r.y + r.h} ${r.x + r.w * 0.5},${r.y} ${r.x + r.w * 0.68},${r.y} ${r.x + r.w * 0.33},${r.y + r.h}" fill="#fff" fill-opacity="0.5"/>`)
}
function rodizio(v: Vista, b: Bloco): void {
  const r = v.rect(b.x, b.y, b.dx, b.dy)
  v.out.push(`<rect x="${r.x + r.w * 0.2}" y="${r.y}" width="${r.w * 0.6}" height="${r.h * 0.3}" fill="#555"/>`)
  const d = Math.min(r.w, r.h * 0.75)
  v.out.push(`<ellipse cx="${r.x + r.w / 2}" cy="${r.y + r.h - d / 2}" rx="${d / 2}" ry="${d / 2}" fill="#2B2B2B" stroke="#222" stroke-width="2"/>`)
}
export function desenharPuxadores(v: Vista, calc: Calculo): void {
  const cor = C.puxador(calc.catalogo, calc.projeto.puxador).cor
  for (const pu of calc.resultado.puxadores) desenharPuxador(v.out, pu.tipo, cor, v.X(pu.x), v.Y(pu.y), v.L(pu.comp), pu.vertical)
}
const PRIORIDADE: Record<string, number> = { fundo: 0, base: 1, divisoria: 1, lateral: 2, prateleira: 2, cabideiro: 2, corredica: 3,
  caixa_fundo: 3, caixa_lateral: 4, caixa_frente: 5, tampo: 6, rodape: 6, saia: 4, perna: 3, ripa: 4, colchao: 5, frente: 7, porta: 7 }
/** Do mais ao fundo (menor Z) para o mais próximo. */
export function ordenarPorProfundidade(blocos: Bloco[]): Bloco[] {
  return [...blocos].sort((a, b) =>
    (Math.round((a.dz + a.z) * 1000) - Math.round((b.dz + b.z) * 1000)) ||
    ((PRIORIDADE[a.grupo] ?? 5) - (PRIORIDADE[b.grupo] ?? 5)) || (a.x - b.x))
}

/** Aplica as cotas pedidas pelo motor para a vista. */
export function aplicarCotas(v: Vista, cotas: Cota[] | undefined): void {
  for (const c of cotas ?? []) {
    if (c.t === 'h') v.cotaH(c.a, c.b, c.nivel, c.lado, undefined, c.ref, c.texto)
    else v.cotaV(c.a, c.b, c.nivel, c.lado, undefined, c.ref, c.texto)
  }
}
