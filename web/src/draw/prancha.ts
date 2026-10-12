// Monta as páginas A3 (paisagem) em unidades de 0,1 mm: 4200 × 2970. Cada página é um documento SVG.
import * as C from '../core/catalogo'
import type { Calculo } from '../core/calculo'
import { fmtBrl, fmtCm, fmtNum } from '../core/formato'
import { totalLinha } from '../core/orcamento'
import { fitaTexto } from '../core/tipos'
import { desenhar3d, desenharExplodida } from './obliqua'
import { Area, CONTORNO, FONTE, Saida, cortar, linhaSvg, luminosidade, n2, retangulo, texto, textoQuebrado } from './svg'
import { desenharCaixa, desenharFrontal, desenharInterna, desenharLateral, desenharPorta } from './vistas'

export const LARG = 4200, ALT = 2970
const MARGEM = 80
const TINTA = '#222222', CINZA = '#666666', AZUL = '#14285A'

export interface Pagina { titulo: string; svg: () => string }

const envelope = (corpo: Saida) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LARG} ${ALT}" width="${LARG}" height="${ALT}" font-family="${FONTE}">` +
  `<rect width="${LARG}" height="${ALT}" fill="#fff"/>${corpo.join('')}</svg>`

function moldura(out: Saida) { retangulo(out, MARGEM, MARGEM, LARG - 2 * MARGEM, ALT - 2 * MARGEM, 'none', TINTA, 5) }

function cabecalho(out: Saida, calc: Calculo, sub: string, pagina?: number, total?: number) {
  const p = calc.projeto, m = calc.resultado.medidas
  moldura(out)
  const x = MARGEM + 50
  texto(out, x, MARGEM + 110, p.nome || 'Projeto sem nome', 80, AZUL, true)
  let cliente = p.cliente ? `Cliente: ${p.cliente}` : ''
  if (p.telefone) cliente += `   Tel.: ${p.telefone}`
  const partes = cliente ? [cliente] : []
  if (p.data) partes.push(`Data: ${p.data}`)
  texto(out, x, MARGEM + 175, partes.join('     '), 36, TINTA)
  texto(out, LARG - MARGEM - 50, MARGEM + 110, `${fmtCm(m.L)} × ${fmtCm(m.H)} × ${fmtCm(m.P)} cm  (L × A × P)`, 52, TINTA, true, 'd')
  texto(out, LARG - MARGEM - 50, MARGEM + 175, sub + (pagina ? `   —   página ${pagina}/${total}` : ''), 36, CINZA, false, 'd')
  linhaSvg(out, MARGEM, MARGEM + 215, LARG - MARGEM, MARGEM + 215, TINTA, 3)
}
const marca = (out: Saida) => texto(out, LARG - MARGEM - 30, ALT - MARGEM - 25, 'Projeta Móveis', 26, CINZA, false, 'd', true)
function tituloCelula(out: Saida, a: Area, s: string) {
  texto(out, a.x + 20, a.y + 45, s, 36, AZUL, true)
  retangulo(out, a.x, a.y, a.w, a.h, 'none', '#B8BCC8', 2)
}
const amostra = (out: Saida, x: number, y: number, cor: string, tam = 46) => retangulo(out, x, y, tam, tam, cor, TINTA, 2.5)
const corPadrao = (calc: Calculo, nome: string) => C.padrao(calc.catalogo, nome).cor
const sub = (a: Area, dy: number): Area => ({ x: a.x, y: a.y + dy, w: a.w, h: a.h - dy })

// ---- página 1 – desenho técnico ------------------------------------------------------------------------------
function faixaMateriais(out: Saida, calc: Calculo, a: Area) {
  const p = calc.projeto, cat = calc.catalogo
  retangulo(out, a.x, a.y, a.w, a.h, '#F4F5F8', '#B8BCC8', 2)
  let x = a.x + 30
  const y0 = a.y + 30
  const itens: [string, string, string][] = [['Estrutura', p.estrutura_padrao, `${p.estrutura_material} ${p.estrutura_esp} mm`],
    ['Frentes', p.frente_padrao, `${p.frente_material} ${p.frente_esp} mm`]]
  if (p.motor === 'gavetas') itens.push(['Caixas', p.caixa_padrao, `${p.caixa_material} ${p.caixa_esp} mm`])
  itens.push(['Fundo', p.fundo_padrao, `${p.fundo_material} ${p.fundo_esp} mm`])
  for (const [rot, pad, mat] of itens) {
    amostra(out, x, y0, corPadrao(calc, pad))
    texto(out, x + 62, y0 + 20, `${rot}: ${pad}`, 28, TINTA, true)
    texto(out, x + 62, y0 + 52, mat, 26, CINZA)
    x += 520
  }
  let linha = `Puxador: ${C.puxador(cat, p.puxador).nome}`
  if (p.motor === 'gavetas') linha += `      Corrediça: ${C.corredica(cat, p.corredica).nome} (${fmtNum(calc.resultado.medidas.caixa.comp_corredica, 0)} mm)`
  else linha += `      Dobradiça: ${C.dobradica(cat, p.dobradica).nome}`
  linha += `      Fita de borda: ${C.fita(cat, p.fita).nome}      Frentes ${p.frente_tipo === 'sobrepostas' ? 'sobrepostas' : 'embutidas'}`
  texto(out, a.x + 30, y0 + 105, linha, 28, TINTA)
}

function paginaTecnica(calc: Calculo, n: number, total: number): string {
  const out: Saida = []
  cabecalho(out, calc, 'Desenho técnico — medidas em cm', n, total)
  const topo = MARGEM + 245, x0 = MARGEM + 20, x1 = LARG - MARGEM - 20, larg = x1 - x0
  const h1 = 1130, h2 = 1170, y2 = topo + h1 + 20
  const cFront: Area = { x: x0, y: topo, w: larg * 0.38, h: h1 }
  const cLat: Area = { x: cFront.x + cFront.w, y: topo, w: larg * 0.22, h: h1 }
  const c3d: Area = { x: cLat.x + cLat.w, y: topo, w: x1 - (cLat.x + cLat.w), h: h1 }
  const cInt: Area = { x: x0, y: y2, w: larg * 0.34, h: h2 }
  const cIntg: Area = { x: cInt.x + cInt.w, y: y2, w: larg * 0.34, h: h2 }
  const cCx: Area = { x: cIntg.x + cIntg.w, y: y2, w: x1 - (cIntg.x + cIntg.w), h: h2 }
  const faixa: Area = { x: x0, y: y2 + h2 + 15, w: larg, h: 170 }
  const gav = calc.projeto.motor === 'gavetas'
  tituloCelula(out, cFront, 'VISTA FRONTAL'); desenharFrontal(out, sub(cFront, 50), calc)
  tituloCelula(out, cLat, 'VISTA LATERAL'); desenharLateral(out, sub(cLat, 50), calc)
  tituloCelula(out, c3d, 'PERSPECTIVA'); desenhar3d(out, sub(c3d, 60), calc)
  tituloCelula(out, cInt, gav ? 'INTERNA SEM GAVETAS' : 'INTERNA (SEM PORTAS)'); desenharInterna(out, sub(cInt, 50), calc, false)
  tituloCelula(out, cIntg, gav ? 'INTERNA COM GAVETAS' : 'PORTA E DOBRADIÇAS')
  if (gav) desenharInterna(out, sub(cIntg, 50), calc, true); else desenharPorta(out, sub(cIntg, 60), calc)
  tituloCelula(out, cCx, gav ? 'CAIXA DA GAVETA' : 'VISTA EXPLODIDA')
  if (gav) desenharCaixa(out, sub(cCx, 50), calc); else desenharExplodida(out, sub(cCx, 60), calc)
  faixaMateriais(out, calc, faixa)
  marca(out)
  return envelope(out)
}

// ---- página 2 – corte e materiais ---------------------------------------------------------------------------------------
function celula(out: Saida, x: number, y: number, w: number, s: string, al: 'e' | 'c' | 'd', tam: number, neg: boolean) {
  const mg = 12
  if (al === 'e') texto(out, x + mg, y, cortar(s, w - 2 * mg, tam, neg), tam, TINTA, neg, 'e')
  else if (al === 'd') texto(out, x + w - mg, y, s, tam, TINTA, neg, 'd')
  else texto(out, x + w / 2, y, s, tam, TINTA, neg, 'c')
}

function tabelaOrcamento(out: Saida, calc: Calculo, x0: number, y: number, largura: number) {
  const orc = calc.orcamento
  texto(out, x0, y, 'LISTA DE MATERIAIS E ORÇAMENTO', 34, AZUL, true)
  y += 60
  const base: [string, number, 'e' | 'c' | 'd'][] = [['Item', 1050, 'e'], ['Qtd', 170, 'd'], ['Un.', 110, 'c'], ['Preço un.', 260, 'd'], ['Total', 280, 'd']]
  const aj = largura / base.reduce((a, c) => a + c[1], 0)
  const cols = base.map(([n, w, a]) => [n, w * aj, a] as [string, number, 'e' | 'c' | 'd'])
  const h = 46
  out.push(`<rect x="${x0}" y="${y - h + 12}" width="${largura}" height="${h}" fill="#E6E9F2"/>`)
  let x = x0
  for (const [nome, w, al] of cols) { celula(out, x, y, w, nome, al, 26, true); x += w }
  y += h
  orc.linhas.forEach((ln, i) => {
    if (i % 2) out.push(`<rect x="${x0}" y="${y - h + 12}" width="${largura}" height="${h}" fill="#F7F8FB"/>`)
    const qtd = fmtNum(ln.qtd, Number.isInteger(ln.qtd) ? 0 : 2)
    const vals = [ln.item + (ln.detalhe ? ` — ${ln.detalhe}` : ''), qtd, ln.unidade, ln.preco ? fmtBrl(ln.preco) : '—', ln.preco ? fmtBrl(totalLinha(ln)) : '—']
    x = x0
    cols.forEach(([, w, al], k) => { celula(out, x, y, w, vals[k], al, 24, false); x += w })
    y += h
  })
  y += 10
  const resumo: [string, number, boolean][] = [['Materiais', orc.materiais, false], ['Mão de obra', orc.mao_de_obra, false],
    [`Margem (${fmtNum(orc.margem_pct, 1)}%)`, orc.margem_valor, false], ['TOTAL', orc.total, true]]
  for (const [rot, val, forte] of resumo) {
    texto(out, x0 + largura - 300, y + 18, rot, forte ? 28 : 26, TINTA, forte, 'd')
    texto(out, x0 + largura - 20, y + 18, fmtBrl(val), forte ? 28 : 26, TINTA, forte, 'd')
    y += 44
  }
  if (orc.sem_precos) texto(out, x0, y + 20, 'Preços ainda não preenchidos no catálogo (botão Catálogo).', 24, '#8A5A00', false, 'e', true)
}

function paginaCorte(calc: Calculo, n: number, total: number): string {
  const out: Saida = []
  cabecalho(out, calc, 'Plano de corte e materiais — medidas em cm', n, total)
  const res = calc.resultado
  const cols: [string, number, 'e' | 'c' | 'd'][] = [['Nº', 70, 'c'], ['Peça', 560, 'e'], ['Qtd', 100, 'c'], ['Comp.', 190, 'd'], ['Larg.', 190, 'd'],
    ['Esp. mm', 150, 'd'], ['Material', 270, 'e'], ['Cor', 330, 'e'], ['Fita', 150, 'c'], ['Veio', 110, 'c'], ['Observação', 330, 'e']]
  const x0 = MARGEM + 40
  let y = MARGEM + 300
  const yTopo = y
  const alt = res.pecas.length <= 18 ? 60 : Math.max(42, Math.floor(1000 / Math.max(res.pecas.length, 1)))
  const tam = alt >= 55 ? 30 : 24
  const larguraTab = cols.reduce((a, c) => a + c[1], 0)
  out.push(`<rect x="${x0}" y="${y - alt + 14}" width="${larguraTab}" height="${alt}" fill="#E6E9F2"/>`)
  let x = x0
  for (const [nome, w, al] of cols) { celula(out, x, y, w, nome, al, tam, true); x += w }
  y += alt
  res.pecas.forEach((pc, i) => {
    if (i % 2) out.push(`<rect x="${x0}" y="${y - alt + 14}" width="${larguraTab}" height="${alt}" fill="#F7F8FB"/>`)
    const vals = [String(pc.id), pc.nome, String(pc.qtd), fmtCm(pc.comp), fmtCm(pc.larg), fmtNum(pc.esp, 1), pc.material, pc.padrao,
      fitaTexto(pc), pc.veio ? 'sim' : 'não', pc.obs]
    x = x0
    cols.forEach(([, w, al], k) => { celula(out, x, y, w, vals[k], al, tam, false); x += w })
    y += alt
  })
  retangulo(out, x0, yTopo - alt + 14, larguraTab, y - yTopo + alt - 14, 'none', TINTA, 2.5)
  texto(out, x0, y + 50, `${res.pecas.reduce((a, p) => a + p.qtd, 0)} peças  •  fita de borda: ${fmtNum(calc.orcamento.fita_metros, 1)} m (com 10% de sobra)  •  C = borda no sentido do comprimento, L = no da largura`, 26, CINZA)
  tabelaOrcamento(out, calc, x0, y + 130, larguraTab)

  const xr = x0 + larguraTab + 90, largR = LARG - MARGEM - 40 - xr
  let yr = MARGEM + 285
  texto(out, xr, yr, 'FERRAGENS E MATERIAIS', 34, AZUL, true); yr += 52
  for (const f of res.ferragens) {
    texto(out, xr, yr, `${fmtNum(f.qtd, Number.isInteger(f.qtd) ? 0 : 1)} ${f.unidade}  ${f.nome}${f.detalhe ? ` (${f.detalhe})` : ''}`, 27, TINTA); yr += 40
  }
  yr += 15
  texto(out, xr, yr, 'CHAPAS NECESSÁRIAS', 34, AZUL, true); yr += 52
  for (const g of calc.plano.grupos) {
    if (!g.chapas.length) continue
    texto(out, xr, yr, `${g.chapas.length}× ${g.material} ${fmtNum(g.esp, 0)} mm — ${g.padrao}`, 27, TINTA); yr += 36
    texto(out, xr + 30, yr, `${fmtNum(g.comprimento, 0)} × ${fmtNum(g.largura, 0)} mm — aproveitamento ${fmtNum(g.aproveitamento, 0)}%`, 24, CINZA); yr += 40
  }
  yr += 15
  if (res.definicoes.length) {
    texto(out, xr, yr, 'DEFINIÇÕES DE MONTAGEM', 34, AZUL, true); yr += 50
    for (const d of res.definicoes) yr = textoQuebrado(out, xr, yr, largR, '• ' + d, 25, TINTA, 1.2) + 6
  }
  yr += 15
  if (res.avisos.length) {
    texto(out, xr, yr, 'AVISOS', 34, '#B00020', true); yr += 50
    for (const a of res.avisos) yr = textoQuebrado(out, xr, yr, largR, '• ' + a.texto, 25, a.nivel === 'erro' ? '#B00020' : '#8A5A00', 1.2) + 6
  }
  marca(out)
  return envelope(out)
}

// ---- plano de chapas -------------------------------------------------------------------------------------------------------
function desenharChapa(out: Saida, calc: Calculo, g: Calculo['plano']['grupos'][number], ch: Calculo['plano']['grupos'][number]['chapas'][number], num: number, a: Area) {
  texto(out, a.x + 10, a.y + 38, `${g.material} ${fmtNum(g.esp, 0)} mm — ${g.padrao}   |   chapa ${num}/${g.chapas.length}   |   aproveitamento ${fmtNum(ch.aproveitamento, 1)}%`, 30, AZUL, true)
  const refilo = calc.plano.refilo
  const mold: Area = { x: a.x + 60, y: a.y + 70, w: a.w - 120, h: a.h - 160 }
  const esc = Math.min(mold.w / g.comprimento, mold.h / g.largura)
  const w = g.comprimento * esc, h = g.largura * esc
  retangulo(out, mold.x, mold.y, w, h, '#EEF0F4', TINTA, 3.5)
  retangulo(out, mold.x + refilo * esc, mold.y + refilo * esc, w - 2 * refilo * esc, h - 2 * refilo * esc, 'none', '#9AA0AA', 2, '14 10')
  const cor = corPadrao(calc, g.padrao)
  const tinta = luminosidade(cor) < 110 ? '#fff' : TINTA
  for (const pp of ch.pecas) {
    const rx = mold.x + (refilo + pp.x) * esc, ry = mold.y + (refilo + pp.y) * esc, rw = pp.w * esc, rh = pp.h * esc
    retangulo(out, rx, ry, rw, rh, cor, TINTA, 2.6)
    if (rw > 120 && rh > 90) {
      texto(out, rx + rw / 2, ry + rh / 2 - 2, String(pp.peca_id), 40, tinta, true, 'c')
      texto(out, rx + rw / 2, ry + rh / 2 + 34, `${fmtCm(pp.w)}×${fmtCm(pp.h)}`, 24, tinta, false, 'c')
    } else if (rw > 60 && rh > 36) texto(out, rx + rw / 2, ry + rh / 2 + 10, String(pp.peca_id), 26, tinta, true, 'c')
  }
  texto(out, mold.x + w / 2, mold.y + h + 45, `${fmtCm(g.comprimento)} cm`, 28, AZUL, false, 'c')
  out.push(`<text transform="translate(${n2(mold.x - 18)} ${n2(mold.y + h / 2)}) rotate(-90)" font-size="28" fill="${AZUL}" text-anchor="middle" font-family="${FONTE}">${fmtCm(g.largura)} cm</text>`)
}

function paginasChapas(calc: Calculo, primeiro: number, total: number): Pagina[] {
  const itens = calc.plano.grupos.flatMap(g => g.chapas.map((ch, i) => ({ g, ch, num: i + 1 })))
  const pgs: Pagina[] = []
  for (let k = 0; k < itens.length; k += 4) {
    const grupo = itens.slice(k, k + 4)
    const n = primeiro + pgs.length
    pgs.push({ titulo: `Plano de chapas ${pgs.length + 1}`, svg: () => {
      const out: Saida = []
      cabecalho(out, calc, 'Plano de chapas — medidas em cm', n, total)
      const topo = MARGEM + 245
      const aw = (LARG - 2 * MARGEM - 60) / 2, ah = (ALT - topo - MARGEM - 30) / 2
      grupo.forEach(({ g, ch, num }, i) => {
        desenharChapa(out, calc, g, ch, num, { x: MARGEM + 20 + (i % 2) * (aw + 20), y: topo + Math.floor(i / 2) * (ah + 10), w: aw, h: ah })
      })
      marca(out)
      return envelope(out)
    } })
  }
  return pgs
}

// ---- página do cliente ------------------------------------------------------------------------------------------------------------
function paginaCliente(calc: Calculo, n: number, total: number): string {
  const out: Saida = []
  cabecalho(out, calc, 'Apresentação ao cliente', n, total)
  const p = calc.projeto, cat = calc.catalogo, m = calc.resultado.medidas
  const topo = MARGEM + 250
  const esq: Area = { x: MARGEM + 30, y: topo, w: 2350, h: ALT - topo - MARGEM - 40 }
  const dir: Area = { x: esq.x + esq.w + 40, y: topo, w: LARG - MARGEM - 30 - (esq.x + esq.w + 40), h: esq.h }
  desenhar3d(out, { x: esq.x, y: esq.y, w: esq.w, h: esq.h * 0.62 }, calc)
  desenharFrontal(out, { x: esq.x, y: esq.y + esq.h * 0.6, w: esq.w, h: esq.h * 0.4 }, calc)
  const x = dir.x
  let y = dir.y + 40
  texto(out, x, y, 'MEDIDAS EXTERNAS', 38, AZUL, true); y += 60
  texto(out, x, y, `Largura:  ${fmtCm(m.L)} cm`, 36, TINTA)
  texto(out, x, y + 52, `Altura:  ${fmtCm(m.H)} cm`, 36, TINTA)
  texto(out, x, y + 104, `Profundidade:  ${fmtCm(m.P)} cm`, 36, TINTA)
  y += 210
  texto(out, x, y, 'ACABAMENTOS', 38, AZUL, true); y += 40
  const itens: [string, string][] = [['Estrutura', p.estrutura_padrao], ['Frentes', p.frente_padrao]]
  if (p.motor === 'gavetas') itens.push(['Interior das gavetas', p.caixa_padrao])
  for (const [rot, pad] of itens) {
    amostra(out, x, y, corPadrao(calc, pad), 60)
    texto(out, x + 80, y + 28, rot, 28, CINZA)
    texto(out, x + 80, y + 58, pad, 34, TINTA, true)
    y += 95
  }
  y += 15
  texto(out, x, y, `Puxador: ${C.puxador(cat, p.puxador).nome}`, 32, TINTA); y += 50
  texto(out, x, y, p.motor === 'gavetas' ? `Corrediças: ${C.corredica(cat, p.corredica).nome}` : `Dobradiças: ${C.dobradica(cat, p.dobradica).nome}`, 32, TINTA)
  y += 90
  texto(out, x, y, 'INVESTIMENTO', 38, AZUL, true); y += 75
  if (calc.orcamento.total > 0) texto(out, x, y, fmtBrl(calc.orcamento.total), 64, TINTA, true)
  else texto(out, x, y, 'Valor a combinar', 44, CINZA, true)
  if (p.observacoes) {
    y += 90
    texto(out, x, y, 'OBSERVAÇÕES', 34, AZUL, true)
    textoQuebrado(out, x, y + 48, dir.w, p.observacoes, 28, TINTA)
  }
  marca(out)
  return envelope(out)
}

// ---- lista de páginas e folhas de vista ----------------------------------------------------------------------------------------------
export type Modo = 'completo' | 'tecnico' | 'cliente'

export function montarPaginas(calc: Calculo, modo: Modo = 'completo'): Pagina[] {
  if (modo === 'cliente') return [{ titulo: 'Apresentação ao cliente', svg: () => paginaCliente(calc, 1, 1) }]
  const incluirCliente = modo === 'completo'
  const nChapas = paginasChapas(calc, 3, 0).length
  const total = 2 + nChapas + (incluirCliente ? 1 : 0)
  const pgs: Pagina[] = [
    { titulo: 'Desenho técnico', svg: () => paginaTecnica(calc, 1, total) },
    { titulo: 'Corte e materiais', svg: () => paginaCorte(calc, 2, total) },
    ...paginasChapas(calc, 3, total),
  ]
  if (incluirCliente) pgs.push({ titulo: 'Apresentação ao cliente', svg: () => paginaCliente(calc, total, total) })
  return pgs
}

export const NOMES_VISTAS: Record<string, string> = {
  frontal: 'Vista frontal', lateral: 'Vista lateral', interna: 'Vista interna', interna_gavetas: 'Vista interna com gavetas',
  caixa: 'Caixa da gaveta / porta', '3d': 'Perspectiva 3D', explodida: 'Vista explodida',
}

export function folhaVista(calc: Calculo, nome: string): string {
  const out: Saida = []
  cabecalho(out, calc, NOMES_VISTAS[nome] ?? nome)
  const a: Area = { x: MARGEM + 40, y: MARGEM + 240, w: LARG - 2 * MARGEM - 80, h: ALT - 2 * MARGEM - 280 }
  const gav = calc.projeto.motor === 'gavetas'
  if (nome === 'frontal') desenharFrontal(out, a, calc)
  else if (nome === 'lateral') desenharLateral(out, a, calc)
  else if (nome === 'interna') desenharInterna(out, a, calc, false)
  else if (nome === 'interna_gavetas') desenharInterna(out, a, calc, gav)
  else if (nome === 'caixa') (gav ? desenharCaixa : desenharPorta)(out, a, calc)
  else if (nome === '3d') desenhar3d(out, a, calc)
  else if (nome === 'explodida') desenharExplodida(out, a, calc)
  marca(out)
  return envelope(out)
}

export function paginasChapasPreview(calc: Calculo): Pagina[] {
  return paginasChapas(calc, 3, montarPaginas(calc, 'completo').length)
}
