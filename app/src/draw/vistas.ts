// Vistas ortogonais para qualquer família de móvel: frontal, lateral, interna, planta, caixa da gaveta e porta.
import * as C from '../core/catalogo'
import type { Calculo } from '../core/calculo'
import { fmtCm } from '../core/formato'
import type { Bloco } from '../core/tipos'
import { CAIXA, aplicarCotas, blocoFrontal, blocoLateral, corDoBloco, desenharPuxadores, direcaoVeio, ordenarPorProfundidade } from './comum'
import { Area, Saida, Vista, clarear, desenharPuxador, escurecer, retangulo, texto } from './svg'

const dimensao = (calc: Calculo) => {
  const m = calc.resultado.medidas
  return { L: m.L as number, H: m.H as number, P: m.P as number }
}

// ---- frontal ----------------------------------------------------------------------------------------------
export function desenharFrontal(out: Saida, area: Area, calc: Calculo, cotas = true): Vista {
  const res = calc.resultado, m = res.medidas
  const { L, H } = dimensao(calc)
  const v = new Vista(out, area, L, H, [270, 70, 270, cotas ? 260 : 80])
  if (calc.projeto.familia !== 'modular') {
    for (const b of ordenarPorProfundidade(res.blocos.filter(b => b.grupo !== 'colchao' || true))) blocoFrontal(v, calc, b)
    if (cotas) aplicarCotas(v, res.cotas.frontal)
    desenharPuxadores(v, calc)
    return v
  }

  const sobre: boolean = !!m.sobreposta
  const cabe = (b: Bloco) => !['fundo', 'prateleira', 'cabideiro', 'corredica', 'divisoria', 'lateral', 'base', ...CAIXA].includes(b.grupo)
  // sombra atrás das frentes (mostra as frestas)
  const reg = sobre ? v.rect(0, m.y0 + m.rod, L, m.topo_lat - m.y0 - m.rod) : v.rect(m.e, m.ybase_int, L - 2 * m.e, m.Hi)
  retangulo(out, reg.x, reg.y, reg.w, reg.h, '#303030')
  const fundoCor = C.padrao(calc.catalogo, calc.projeto.fundo_padrao).cor
  if (!sobre) {
    // móvel de frentes embutidas: laterais, divisórias e base aparecem
    for (const b of ordenarPorProfundidade(res.blocos.filter(b => ['lateral', 'divisoria', 'base'].includes(b.grupo)))) blocoFrontal(v, calc, b)
  }
  for (const R of res.abertos) {
    const r = v.rect(R.x, R.y, R.w, R.h)
    retangulo(out, r.x, r.y, r.w, r.h, fundoCor, '#555', 2.5)
    // sombra interna (profundidade)
    out.push(`<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${Math.min(40, r.h)}" fill="#000" fill-opacity="0.16"/>`)
    out.push(`<rect x="${r.x}" y="${r.y}" width="${Math.min(30, r.w)}" height="${r.h}" fill="#000" fill-opacity="0.10"/>`)
    if (sobre) {
      // laterais/divisórias que ficam à mostra ao lado do vão aberto
      for (const b of res.blocos.filter(b => b.grupo === 'lateral' || b.grupo === 'divisoria')) {
        const toca = b.x + b.dx >= R.x - 0.5 && b.x <= R.x + R.w + 0.5
        if (!toca) continue
        const y1 = Math.max(R.y, b.y), y2 = Math.min(R.y + R.h, b.y + b.dy)
        if (y2 > y1) v.peca(b.x, y1, b.dx, y2 - y1, corDoBloco(calc, b), direcaoVeio(calc, b, 'xy'), b.peca + 5)
      }
    }
  }
  const extras = res.blocos.filter(b => (b.grupo === 'prateleira' || b.grupo === 'cabideiro') && b.aberto)
  for (const b of ordenarPorProfundidade([...res.blocos.filter(cabe), ...extras])) blocoFrontal(v, calc, b, b.grupo === 'rodape' ? 112 : 100)
  desenharPuxadores(v, calc)
  if (cotas) aplicarCotas(v, res.cotas.frontal)
  return v
}

// ---- lateral (esquerda) ---------------------------------------------------------------------------------------------
export function desenharLateral(out: Saida, area: Area, calc: Calculo, cotas = true): Vista {
  const res = calc.resultado, m = res.medidas
  const { H, P } = dimensao(calc)
  const v = new Vista(out, area, P, H, [215, 70, 215, cotas ? 245 : 80])
  if (calc.projeto.familia !== 'modular') {
    // do mais distante (maior x) para o mais próximo (menor x)
    for (const b of [...res.blocos].sort((a, c) => (c.x + c.dx) - (a.x + a.dx) || a.x - c.x)) blocoLateral(v, calc, b)
    if (cotas) aplicarCotas(v, res.cotas.lateral)
    return v
  }
  const embutidas = calc.projeto.frente_tipo === 'embutidas' && !m.correr
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
  if (cotas) aplicarCotas(v, res.cotas.lateral)
  return v
}

// ---- interna ---------------------------------------------------------------------------------------------------------------
export function desenharInterna(out: Saida, area: Area, calc: Calculo, comGavetas: boolean, cotas = true): Vista {
  const res = calc.resultado, m = res.medidas
  const { L, H } = dimensao(calc)
  const v = new Vista(out, area, L, H, [320, 70, 320, cotas ? 340 : 80])
  const excluir = new Set(['frente', 'porta'])
  if (!comGavetas) CAIXA.forEach(g => excluir.add(g))
  for (const b of ordenarPorProfundidade(res.blocos.filter(b => !excluir.has(b.grupo)))) {
    blocoFrontal(v, calc, b, b.grupo === 'rodape' ? 112 : 100)
  }
  if (comGavetas && m.caixa) {
    const b0 = res.blocos.find(b => b.grupo === 'caixa_frente' && b.nome === 'Frente da caixa')
    if (b0) v.rotulo(b0.x + b0.dx / 2, b0.y + b0.dy / 2 - 10, `${fmtCm(m.caixa.larg)} × ${fmtCm(b0.dy)}`, 28, '#222222', true)
  }
  if (cotas) aplicarCotas(v, comGavetas && res.cotas.interna_gavetas ? res.cotas.interna_gavetas : res.cotas.interna)
  return v
}

// ---- planta (vista de cima) --------------------------------------------------------------------------------------------------------
export function desenharPlanta(out: Saida, area: Area, calc: Calculo, cotas = true): Vista {
  const res = calc.resultado
  const { L, P } = dimensao(calc)
  const v = new Vista(out, area, L, P, [270, 70, 270, cotas ? 230 : 80])
  const ordenados = [...res.blocos].filter(b => b.grupo !== 'caixa_lateral' && !CAIXA.has(b.grupo) && b.grupo !== 'corredica')
    .sort((a, b) => (a.y + a.dy) - (b.y + b.dy) || a.y - b.y)
  for (const b of ordenados) {
    const y = P - (b.z + b.dz)
    const cor = corDoBloco(calc, b)
    if (b.forma === 'redondo') { v.peca(b.x, y, b.dx, b.dz, cor, '', 0, { redondo: true }); continue }
    if (b.grupo === 'colchao') { v.peca(b.x, y, b.dx, b.dz, cor, '', 0, { espessura: 2.5 }); continue }
    const veio = b.veio === 'x' ? 'h' : b.veio === 'z' ? 'v' : ''
    v.peca(b.x, y, b.dx, b.dz, cor, calc.catalogo.padroes.find(p => p.nome === calc.projeto.estrutura_padrao)?.veio ? veio : '', b.peca * 13 + 1)
  }
  if (cotas) aplicarCotas(v, res.cotas.planta)
  return v
}

// ---- caixa da gaveta e porta ----------------------------------------------------------------------------------------------------------
const extensao = (bl: Bloco[], eixo: 'x' | 'y' | 'z') => {
  const [a, d] = eixo === 'x' ? ['x', 'dx'] : eixo === 'y' ? ['y', 'dy'] : ['z', 'dz']
  return [Math.min(...bl.map(b => (b as any)[a])), Math.max(...bl.map(b => (b as any)[a] + (b as any)[d]))]
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

  texto(out, a1.x + a1.w / 2, a1.y + 50, 'VISTA FRONTAL DA CAIXA', 30, '#1b4a7a', true, 'c')
  const v = new Vista(out, { ...a1, y: a1.y + 40, h: a1.h - 40 }, x1 - x0, y1 - y0, [110, 70, 110, 250])
  for (const b of [...blocos].sort((a, b2) => (a.z + a.dz) - (b2.z + b2.dz) || (a.grupo === 'corredica' ? -1 : 1) - (b2.grupo === 'corredica' ? -1 : 1))) {
    v.peca(b.x - x0, b.y - y0, b.dx, b.dy, corDoBloco(calc, b), direcaoVeio(calc, b, 'xy'), b.peca * 5 + 1)
  }
  const ec = calc.projeto.caixa_esp
  v.cotaH(-x0, -x0 + c.larg, 1, true, undefined, undefined, `${fmtCm(c.larg)} (externa)`)
  v.cotaH(-x0 + ec, -x0 + c.larg - ec, 2, true, undefined, undefined, `${fmtCm(c.larg - 2 * ec)} (interna)`)
  v.cotaV(-y0, -y0 + altCx, 1, false)

  texto(out, a2.x + a2.w / 2, a2.y + 50, 'VISTA LATERAL DA CAIXA', 30, '#1b4a7a', true, 'c')
  const w = new Vista(out, { ...a2, y: a2.y + 40, h: a2.h - 40 }, z1 - z0, y1 - y0, [110, 70, 110, 250])
  for (const b of [...blocos].sort((a, b2) => b2.x - a.x)) {
    if (b.grupo === 'caixa_fundo') continue
    w.peca(b.z - z0, b.y - y0, b.dz, b.dy, corDoBloco(calc, b), direcaoVeio(calc, b, 'zy'), b.peca * 7 + 2)
  }
  for (const b of blocos) if (b.grupo === 'caixa_fundo') w.peca(b.z - z0, b.y - y0, b.dz, b.dy, '#fff', '', 0, { tracejado: true })
  w.cotaH(0, z1 - z0, 1)
  w.cotaH(0, c.comp_corredica, 2, true, undefined, undefined, `corrediça ${fmtCm(c.comp_corredica)}`)
  w.cotaV(-y0, -y0 + altCx, 1, false)
}

export function desenharPorta(out: Saida, area: Area, calc: Calculo): void {
  const res = calc.resultado, m = res.medidas
  const pi = m.porta
  const bloco0 = res.blocos.find(b => b.grupo === 'porta')
  if (!pi || !bloco0) { texto(out, area.x + area.w / 2, area.y + area.h / 2, 'Sem portas neste móvel', 40, '#555555', false, 'c'); return }
  const larg = bloco0.dx, alt = bloco0.dy
  const v = new Vista(out, { ...area, y: area.y + 30, h: area.h - 30 }, larg, alt, [270, 80, 270, 160])
  if (bloco0.cor === 'espelho') blocoFrontal(v, calc, { ...bloco0, x: 0, y: 0 })
  else v.peca(0, 0, larg, alt, corDoBloco(calc, bloco0), direcaoVeio(calc, bloco0, 'xy'), 11)
  const esq = pi.lado === 'esq'
  const ys = res.dobradicas[0] ?? []
  const xd = esq ? 22 : larg - 22
  for (const y of ys) {
    const r = v.rect(xd - 17.5, y - 17.5, 35, 35)
    out.push(`<ellipse cx="${r.x + r.w / 2}" cy="${r.y + r.h / 2}" rx="${r.w / 2}" ry="${r.h / 2}" fill="#D9DCE0" stroke="#2B2B2B" stroke-width="2.5"/>`)
  }
  const pu = res.puxadores.find(p => Math.abs(p.frente_x - bloco0.x) < 1 && Math.abs(p.frente_y - bloco0.y) < 1) ?? res.puxadores[0]
  if (pu) desenharPuxador(out, pu.tipo, C.puxador(calc.catalogo, calc.projeto.puxador).cor, v.X(pu.x - bloco0.x), v.Y(pu.y - bloco0.y), v.L(pu.comp), pu.vertical)
  v.cotaH(0, larg, 1)
  v.cotaV(0, alt, 1, esq)
  if (ys.length) {
    let ant = 0
    for (const y of ys) { v.cotaV(ant, y, 1, !esq, undefined, xd); ant = y }
    v.cotaV(ys[ys.length - 1], alt, 1, !esq, undefined, xd)
  }
  void clarear; void escurecer; void retangulo
}
