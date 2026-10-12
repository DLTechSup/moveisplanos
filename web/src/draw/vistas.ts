// Vistas ortogonais: frontal, lateral, interna, caixa da gaveta e porta.
import * as C from '../core/catalogo'
import type { Calculo } from '../core/calculo'
import { fmtCm } from '../core/formato'
import { CAIXA, INTERIOR, blocoFrontal, blocoLateral, corDoBloco, desenharPuxadores, direcaoVeio, ordenarPorProfundidade, COR_FERRAGEM } from './comum'
import { Area, Saida, Vista, desenharPuxador, retangulo, texto } from './svg'

// ---- frontal --------------------------------------------------------------------------------------------
export function desenharFrontal(out: Saida, area: Area, calc: Calculo, cotas = true): Vista {
  const res = calc.resultado, m = res.medidas
  const L = m.L, H = m.H
  const v = new Vista(out, area, L, H, [330, 90, 330, cotas ? 330 : 100])
  const nicho = m.nicho ?? 0
  if (calc.projeto.frente_tipo === 'sobrepostas') {
    const topo = m.topo_frentes ?? m.topo_lat
    const r = v.rect(0, m.y0 + m.rod, L, topo - m.y0 - m.rod)
    retangulo(out, r.x, r.y, r.w, r.h, '#303030')
  } else {
    const r = v.rect(m.e, m.ybase_int, L - 2 * m.e, m.Hi)
    retangulo(out, r.x, r.y, r.w, r.h, '#303030')
  }
  const visiveis = res.blocos.filter(b => !INTERIOR.has(b.grupo) ||
    (nicho && (b.grupo === 'fundo' || b.grupo === 'prateleira') && b.nome !== 'Fundo da gaveta'))
  for (const b of ordenarPorProfundidade(visiveis)) blocoFrontal(v, calc, b, b.grupo === 'rodape' ? 112 : 100)
  desenharPuxadores(v, calc)
  if (cotas) cotasFrontal(v, calc)
  return v
}

function cotasFrontal(v: Vista, calc: Calculo): void {
  const res = calc.resultado, m = res.medidas
  const larg = m.frente_largura ?? 0
  if (calc.projeto.motor === 'portas') {
    const g = res.folgas.entre_frentes.valor
    for (let i = 0; i < m.n_portas; i++) { const xa = m.porta_x0 + i * (larg + g); v.cotaH(xa, xa + larg, 1) }
    v.cotaV(m.porta_y, m.porta_y + m.porta_alt, 1, true)
  } else {
    for (const xa of m.gaveta_xs) v.cotaH(xa, xa + larg, 1)
    m.frentes_y.forEach((y: number, i: number) => v.cotaV(y, y + m.frentes_altura[i], 1, true))
  }
  v.cotaH(0, m.L, 2)
  v.cotaV(0, m.H, 2, true)
  const base = m.rod || m.y0
  if (base > 0) v.cotaV(0, base, 1, false)
  v.cotaV(0, m.H, 2, false)
}

// ---- lateral (esquerda) ---------------------------------------------------------------------------------------
export function desenharLateral(out: Saida, area: Area, calc: Calculo, cotas = true): Vista {
  const res = calc.resultado, m = res.medidas
  const v = new Vista(out, area, m.P, m.H, [260, 90, 260, cotas ? 300 : 100])
  const embutidas = calc.projeto.frente_tipo === 'embutidas'
  let ocultas = res.blocos.filter(b => b.grupo === 'fundo' || b.grupo === 'rodape')
  let visiveis = res.blocos.filter(b => ['tampo', 'pe', 'rodizio'].includes(b.grupo))
  const frentes = res.blocos.filter(b => b.grupo === 'frente' || b.grupo === 'porta')
  if (embutidas) ocultas = [...ocultas, ...frentes]; else visiveis = [...visiveis, ...frentes]
  const lat = res.blocos.filter(b => b.grupo === 'lateral' && b.x < 1)
  for (const b of [...lat, ...visiveis]) blocoLateral(v, calc, b)
  const vistos = new Set<string>()
  for (const b of ocultas) {
    const k = [b.grupo, b.z.toFixed(1), b.y.toFixed(1), b.dz.toFixed(1), b.dy.toFixed(1)].join('|')
    if (vistos.has(k)) continue
    vistos.add(k)
    blocoLateral(v, calc, b, true)
  }
  if (cotas) {
    v.cotaH(m.z_lat0, m.z_lat0 + m.Dlat, 1)
    v.cotaH(0, m.P, 2)
    v.cotaV(0, m.H, 1, false)
    const base = m.rod || m.y0
    if (base > 0) v.cotaV(0, base, 1, true)
  }
  return v
}

// ---- interna ---------------------------------------------------------------------------------------------------------
export function desenharInterna(out: Saida, area: Area, calc: Calculo, comGavetas: boolean, cotas = true): Vista {
  const res = calc.resultado, m = res.medidas
  const v = new Vista(out, area, m.L, m.H, [380, 90, 380, cotas ? 400 : 100])
  const excluir = new Set(['frente', 'porta'])
  if (!comGavetas) CAIXA.forEach(g => excluir.add(g))
  for (const b of ordenarPorProfundidade(res.blocos.filter(b => !excluir.has(b.grupo)))) {
    blocoFrontal(v, calc, b, b.grupo === 'rodape' ? 112 : 100)
  }
  if (comGavetas && calc.projeto.motor === 'gavetas') {
    for (const b of res.blocos) {
      if (b.grupo === 'caixa_frente' && b.nome === 'Frente da caixa' && b.gaveta === 0) {
        v.rotulo(b.x + b.dx / 2, b.y + b.dy / 2 - 10, `${fmtCm(m.caixa.larg)} × ${fmtCm(b.dy)}`, 28, '#222222', true)
      }
    }
  }
  if (cotas) cotasInterna(v, calc, comGavetas)
  return v
}

function cotasInterna(v: Vista, calc: Calculo, comGavetas: boolean): void {
  const m = calc.resultado.medidas
  const { e, L, H, vao, colunas } = m
  const xs = Array.from({ length: colunas }, (_, k) => e + k * (vao + e))
  for (const x of xs) v.cotaH(x, x + vao, 1)
  if (comGavetas && calc.projeto.motor === 'gavetas') {
    for (const x of xs) { const xc = x + (vao - m.caixa.larg) / 2; v.cotaH(xc, xc + m.caixa.larg, 2) }
    v.cotaH(0, L, 3)
  } else v.cotaH(0, L, 2)
  if (calc.projeto.motor === 'gavetas') {
    let y = m.ytop_int - (m.nicho ?? 0) - (m.nicho ? e : 0)
    for (const h of m.vaos_gaveta as number[]) { v.cotaV(y - h, y, 1, true, undefined, 0); y -= h }
  } else {
    const ys = [m.ybase_int, ...((m.prateleiras_y ?? []) as number[]).map(y => y + e)]
    const topos = [...((m.prateleiras_y ?? []) as number[]), m.ytop_int]
    ys.forEach((a, i) => v.cotaV(a, topos[i], 1, true, undefined, 0))
  }
  v.cotaV(m.ybase_int, m.ytop_int, 2, true)
  v.cotaV(0, H, 1, false)
}

// ---- caixa da gaveta e porta --------------------------------------------------------------------------------------------
const extensao = (bl: { x: number; dx: number; y: number; dy: number; z: number; dz: number }[], eixo: 'x' | 'y' | 'z') => {
  const [a, d] = eixo === 'x' ? ['x', 'dx'] : eixo === 'y' ? ['y', 'dy'] : ['z', 'dz']
  const lo = Math.min(...bl.map(b => (b as any)[a]))
  const hi = Math.max(...bl.map(b => (b as any)[a] + (b as any)[d]))
  return [lo, hi]
}

export function desenharCaixa(out: Saida, area: Area, calc: Calculo): void {
  const blocos = calc.resultado.caixa_modelo
  if (!blocos.length) { texto(out, area.x + area.w / 2, area.y + area.h / 2, 'Sem gavetas neste móvel', 40, '#555555', false, 'c'); return }
  const c = calc.resultado.medidas.caixa
  const metade = area.w / 2
  const a1: Area = { x: area.x, y: area.y, w: metade, h: area.h }
  const a2: Area = { x: area.x + metade, y: area.y, w: metade, h: area.h }
  const [x0, x1] = extensao(blocos, 'x'), [y0, y1] = extensao(blocos, 'y'), [z0, z1] = extensao(blocos, 'z')
  const altCx = Math.max(...blocos.filter(b => b.grupo === 'caixa_lateral').map(b => b.dy))

  const v = new Vista(out, a1, x1 - x0, y1 - y0, [120, 100, 120, 330])
  for (const b of [...blocos].sort((a, b2) => (a.z + a.dz) - (b2.z + b2.dz) || (a.grupo === 'corredica' ? -1 : 1) - (b2.grupo === 'corredica' ? -1 : 1))) {
    v.peca(b.x - x0, b.y - y0, b.dx, b.dy, corDoBloco(calc, b), direcaoVeio(calc, b, 'xy'), b.peca * 5 + 1)
  }
  const ec = calc.projeto.caixa_esp
  v.cotaH(-x0, -x0 + c.larg, 1)
  v.cotaH(-x0 + ec, -x0 + c.larg - ec, 2)
  v.cotaV(-y0, -y0 + altCx, 1, false)
  texto(out, a1.x + a1.w / 2, a1.y + 60, 'Vista frontal da caixa', 34, '#222222', true, 'c')

  const w = new Vista(out, a2, z1 - z0, y1 - y0, [120, 100, 120, 330])
  for (const b of [...blocos].sort((a, b2) => b2.x - a.x)) {
    if (b.grupo === 'caixa_fundo') continue
    w.peca(b.z - z0, b.y - y0, b.dz, b.dy, corDoBloco(calc, b), direcaoVeio(calc, b, 'zy'), b.peca * 7 + 2)
  }
  for (const b of blocos) if (b.grupo === 'caixa_fundo') w.peca(b.z - z0, b.y - y0, b.dz, b.dy, '#fff', '', 0, { tracejado: true })
  w.cotaH(0, z1 - z0, 1)
  w.cotaH(0, c.comp_corredica, 2, true, undefined, undefined, `corrediça ${fmtCm(c.comp_corredica)}`)
  w.cotaV(-y0, -y0 + altCx, 1, false)
  texto(out, a2.x + a2.w / 2, a2.y + 60, 'Vista lateral da caixa', 34, '#222222', true, 'c')
}

export function desenharPorta(out: Saida, area: Area, calc: Calculo): void {
  const res = calc.resultado, m = res.medidas
  if (!res.dobradicas.length) { texto(out, area.x + area.w / 2, area.y + area.h / 2, 'Sem portas neste móvel', 40, '#555555', false, 'c'); return }
  const larg = m.porta_larg, alt = m.porta_alt
  const v = new Vista(out, area, larg, alt, [330, 100, 330, 200])
  const bloco0 = res.blocos.find(b => b.grupo === 'porta')!
  v.peca(0, 0, larg, alt, corDoBloco(calc, bloco0), direcaoVeio(calc, bloco0, 'xy'), 11)
  const esq = m.portas_lado[0] === 'esq'
  const ys = res.dobradicas[0]
  const xd = esq ? 22 : larg - 22
  for (const y of ys) {
    const r = v.rect(xd - 17.5, y - 17.5, 35, 35)
    out.push(`<ellipse cx="${r.x + r.w / 2}" cy="${r.y + r.h / 2}" rx="${r.w / 2}" ry="${r.h / 2}" fill="#D9DCE0" stroke="#2B2B2B" stroke-width="2.5"/>`)
  }
  const pu = res.puxadores[0]
  if (pu) desenharPuxador(out, pu.tipo, C.puxador(calc.catalogo, calc.projeto.puxador).cor, v.X(pu.x - bloco0.x), v.Y(pu.y - bloco0.y), v.L(pu.comp), pu.vertical)
  v.cotaH(0, larg, 1)
  v.cotaV(0, alt, 1, esq)
  const ladoCota = !esq
  let ant = 0
  for (const y of ys) { v.cotaV(ant, y, 1, ladoCota, undefined, xd); ant = y }
  v.cotaV(ys[ys.length - 1], alt, 1, ladoCota, undefined, xd)
  texto(out, area.x + area.w / 2, area.y + 50, `Porta — ${m.dobradicas_por_porta} dobradiças`, 34, '#222222', true, 'c')
}
export { COR_FERRAGEM }
