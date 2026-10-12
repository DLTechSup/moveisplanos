// Monta as folhas A3 em unidades de 0,1 mm: a folha do projeto (retrato), a relação de materiais e valores,
// o plano de chapas (opcional) e as folhas de vista (paisagem).
import * as C from '../core/catalogo'
import type { Calculo } from '../core/calculo'
import { fmtBrl, fmtCm, fmtNum } from '../core/formato'
import { rotuloCategoria, totalLinha } from '../core/orcamento'
import type { Linha } from '../core/orcamento'
import { fitaTexto } from '../core/tipos'
import type { Peca } from '../core/tipos'
import { ilustracao } from './ilustracoes'
import { desenhar3d, desenharExplodida } from './obliqua'
import { Area, FONTE, Saida, corpoPainel, cortar, linhaSvg, n2, painel, quebrar, retangulo, texto, textoQuebrado } from './svg'
import { desenharCaixa, desenharFrontal, desenharInterna, desenharLateral, desenharPlanta, desenharPorta } from './vistas'

export const PW = 2970, PH = 4200            // retrato (folha do projeto)
export const LW = 4200, LH = 2970            // paisagem (vistas avulsas)
const M = 60
const TINTA = '#222222', CINZA = '#5d6b7a', AZUL = '#1b4a7a'

export interface Pagina { titulo: string; svg: () => string }
export interface OpcoesExport {
  materiais: boolean                 // incluir a folha "Relação de materiais e valores"
  chapas: boolean                    // incluir o plano de chapas (corte otimizado)
  valores: 'itens' | 'total' | 'nenhum'
}
export const OPCOES_PADRAO: OpcoesExport = { materiais: true, chapas: false, valores: 'itens' }

const envelope = (corpo: Saida, w: number, h: number) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" font-family="${FONTE}">` +
  `<rect width="${w}" height="${h}" fill="#eef4fb"/>${corpo.join('')}</svg>`

// ---- cabeçalho ----------------------------------------------------------------------------------------------------
function cabecalho(out: Saida, calc: Calculo, sub: string, largura = PW) {
  const p = calc.projeto, m = calc.resultado.medidas
  const a: Area = { x: M, y: M, w: largura - 2 * M, h: 270 }
  out.push(`<defs><linearGradient id="hdr" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#17406b"/><stop offset="1" stop-color="#2a6aa6"/></linearGradient></defs>`)
  out.push(`<rect x="${a.x}" y="${a.y}" width="${a.w}" height="${a.h}" rx="26" fill="url(#hdr)"/>`)
  const titulo = `${(p.nome || 'Projeto').toUpperCase()} - PROJETO EXECUTIVO`
  const disp = a.w - 100 - 3 * 270 - 40
  texto(out, a.x + 50, a.y + 110, titulo, Math.max(40, Math.min(82, disp / (titulo.length * 0.66))), '#ffffff', true)
  texto(out, a.x + 50, a.y + 170, sub, 38, '#dbe9f7')
  const info: string[] = []
  if (p.cliente) info.push(`Cliente: ${p.cliente}`)
  if (p.telefone) info.push(`Tel.: ${p.telefone}`)
  if (p.data) info.push(p.data)
  if (p.empresa) info.unshift(p.empresa)
  if (info.length) texto(out, a.x + 50, a.y + 225, info.join('   •   '), 32, '#ffffff')
  // quadros de medidas
  const chips: [string, number][] = [['LARGURA', m.L], ['ALTURA', m.Hm ?? m.H], ['PROFUND.', m.P]]
  let x = a.x + a.w - 3 * 270 - 20
  for (const [rot, v] of chips) {
    out.push(`<rect x="${x}" y="${a.y + 40}" width="250" height="190" rx="22" fill="#ffffff"/>`)
    texto(out, x + 125, a.y + 90, rot, 28, '#47617b', true, 'c')
    texto(out, x + 125, a.y + 190, fmtCm(v), 96, AZUL, true, 'c')
    x += 270
  }
}
const marca = (out: Saida, w: number, h: number) => texto(out, w - M - 20, h - M + 10, 'Projeta Móveis', 24, '#7d8da0', false, 'd', true)

// ---- textos de apoio ------------------------------------------------------------------------------------------------
function legendas(calc: Calculo) {
  const res = calc.resultado, m = res.medidas, p = calc.projeto
  const g = res.folgas.entre_frentes.valor
  const frontal = p.familia === 'modular'
    ? (m.correr ? `Portas de correr em trilho duplo. Tampo de ${fmtCm(p.estrutura_esp)} cm por cima.`
      : p.frente_tipo === 'sobrepostas' ? `Frentes sobrepostas, cobrindo a borda das laterais. Folga de ${fmtCm(g)} cm entre frentes. Tampo de ${fmtCm(p.estrutura_esp)} cm por cima.`
        : `Frentes embutidas no vão, com folga de ${fmtCm(res.folgas.contorno_embutida.valor)} cm no contorno.`)
    : p.familia === 'mesa' ? `Tampo de ${fmtCm(m.t)} cm sobre ${p.mesa.pes === 'painel' ? 'painéis laterais' : 'pernas e saia'}.`
      : 'Vista pelo pé da cama.'
  const lateral = p.familia === 'modular'
    ? `Lateral ${fmtCm(m.Dlat)} + frente ${fmtCm(p.frente_esp)} = ${fmtCm(m.P)} cm. Tracejado: fundo em ${p.fundo_material} a ${fmtCm(res.folgas.rasgo_dist.valor)} cm da traseira.`
    : 'Vista lateral esquerda.'
  const interna = p.familia === 'modular'
    ? `Sem frentes. ${m.colunas} vão(s) por linha; cada gaveta usa 1 par de corrediças fixado nas laterais e divisórias.`
    : ''
  return { frontal, lateral, interna: m.n_gavetas ? interna : p.familia === 'modular' ? `Sem portas nem gavetas. ${m.colunas} coluna(s); prateleiras e cabideiros conforme o projeto.` : '' }
}

function usoPeca(nome: string): string {
  if (/Frente de gaveta|^Porta/.test(nome)) return 'frentes e portas'
  if (/da gaveta|traseira da gaveta/.test(nome)) return 'caixas das gavetas'
  if (/Fundo do móvel/.test(nome)) return 'fundo do móvel'
  if (/Ripa|Sarrafo|Perna|Pé da|Coluna|Degrau|Montante/.test(nome)) return 'pernas e travessas'
  return 'estrutura'
}

// ---- lista com marcadores (reduz a fonte até caber) -----------------------------------------------------------------------
function listaMarcadores(out: Saida, a: Area, itens: string[], tamMax = 32): void {
  for (let tam = tamMax; tam >= 18; tam -= 2) {
    const linhas = itens.map(s => quebrar(s, a.w - 40, tam))
    const total = linhas.reduce((n, l) => n + l.length, 0) * tam * 1.28 + itens.length * tam * 0.55
    if (total <= a.h || tam === 18) {
      let y = a.y + tam
      for (let i = 0; i < itens.length; i++) {
        out.push(`<circle cx="${n2(a.x + 12)}" cy="${n2(y - tam * 0.32)}" r="${n2(tam * 0.16)}" fill="${AZUL}"/>`)
        const l = linhas[i]
        const dois = itens[i].indexOf(':')
        l.forEach((ln, k) => {
          if (k === 0 && dois > 0 && dois < ln.length) {
            const rot = ln.slice(0, dois + 1)
            const w = texto(out, a.x + 36, y, rot, tam, AZUL, true)
            texto(out, a.x + 36 + w + tam * 0.25, y, ln.slice(dois + 1).trim(), tam, TINTA)
          } else texto(out, a.x + 36, y, ln, tam, TINTA)
          y += tam * 1.28
        })
        y += tam * 0.55
      }
      return
    }
  }
}

function legenda(out: Saida, a: Area, s: string, tam = 28): void {
  if (!s) return
  const linhas = quebrar(s, a.w - 40, tam)
  let y = a.y + a.h - 18 - (linhas.length - 1) * tam * 1.25
  for (const ln of linhas) { texto(out, a.x + 24, y, ln, tam, CINZA); y += tam * 1.25 }
}

// ---- folha 1: projeto -------------------------------------------------------------------------------------------------------
function folhaProjeto(calc: Calculo, n: number, total: number, maxLinhasCorte: number): string {
  const out: Saida = []
  const p = calc.projeto, res = calc.resultado, m = res.medidas
  const fam = p.familia
  const sub = `${p.estrutura_material} ${p.estrutura_esp} mm, medidas em centímetros${total > 1 ? ` — folha ${n}/${total}` : ''}`
  cabecalho(out, calc, sub)
  const L = legendas(calc)
  const topo = 360
  const colW = PW - 2 * M
  // linha 1
  const h1 = 1000
  const aF: Area = { x: M, y: topo, w: 1380, h: h1 }, aL: Area = { x: aF.x + aF.w + 20, y: topo, w: 690, h: h1 }
  const aD: Area = { x: aL.x + aL.w + 20, y: topo, w: PW - M - (aL.x + aL.w + 20), h: h1 }
  painel(out, aF, '1. VISTA FRONTAL'); desenharFrontal(out, descontar(corpoPainel(aF), 80), calc)
  legenda(out, aF, L.frontal)
  painel(out, aL, '2. VISTA LATERAL'); desenharLateral(out, descontar(corpoPainel(aL), 80), calc)
  legenda(out, aL, L.lateral, 24)
  painel(out, aD, '3. DEFINIÇÕES')
  const cd = corpoPainel(aD)
  listaMarcadores(out, { x: cd.x + 20, y: cd.y + 20, w: cd.w - 40, h: cd.h - 40 }, res.definicoes)

  // linha 2
  const y2 = topo + h1 + 30, h2 = 900
  const a4: Area = { x: M, y: y2, w: 1560, h: h2 }, a5: Area = { x: a4.x + a4.w + 20, y: y2, w: PW - M - (a4.x + a4.w + 20), h: h2 }
  const planta = fam !== 'modular'
  painel(out, a4, planta ? '4. PLANTA (VISTA DE CIMA)' : (res.medidas.caixa || res.medidas.n_gavetas ? '4. VISTA INTERNA (SEM GAVETAS)' : '4. VISTA INTERNA'))
  const c4 = descontar(corpoPainel(a4), 70)
  if (planta) desenharPlanta(out, c4, calc); else desenharInterna(out, c4, calc, false)
  legenda(out, a4, planta ? '' : L.interna, 26)
  const nCaixas = m.n_gavetas
  const tit5 = res.detalhe === 'caixa' ? `5. CAIXA DA GAVETA (${nCaixas} UNIDADE${nCaixas > 1 ? 'S' : ''})` : res.detalhe === 'porta' ? '5. PORTA E DOBRADIÇAS' : '5. VISTA EXPLODIDA'
  painel(out, a5, tit5)
  const c5 = corpoPainel(a5)
  const confH = Math.min(260, 60 + res.conferencias.length * 62)
  const dentro: Area = { x: c5.x, y: c5.y, w: c5.w, h: c5.h - confH - 10 }
  if (res.detalhe === 'caixa') desenharCaixa(out, dentro, calc)
  else if (res.detalhe === 'porta') desenharPorta(out, dentro, calc)
  else desenharExplodida(out, dentro, calc)
  // quadro de conferências
  const q: Area = { x: c5.x + 16, y: c5.y + c5.h - confH, w: c5.w - 32, h: confH - 8 }
  out.push(`<rect x="${q.x}" y="${q.y}" width="${q.w}" height="${q.h}" rx="16" fill="#e2effb"/>`)
  let yy = q.y + 44
  for (const c of res.conferencias) {
    for (const ln of quebrar(c, q.w - 50, 26, false)) {
      const dois = ln.indexOf(':')
      if (dois > 0 && ln === c.slice(0, ln.length)) { const w = texto(out, q.x + 24, yy, ln.slice(0, dois + 1), 26, AZUL, true); texto(out, q.x + 24 + w + 8, yy, ln.slice(dois + 1).trim(), 26, TINTA) }
      else texto(out, q.x + 24, yy, ln, 26, TINTA)
      yy += 33
    }
    yy += 8
  }

  // linha 3
  const y3 = y2 + h2 + 30, h3 = 860
  const a6: Area = { x: M, y: y3, w: 1260, h: h3 }, a7: Area = { x: a6.x + a6.w + 20, y: y3, w: PW - M - (a6.x + a6.w + 20), h: h3 }
  painel(out, a6, '6. PERSPECTIVA 3D'); desenhar3d(out, descontar(corpoPainel(a6), 20), calc)
  painel(out, a7, '7. MATERIAIS E FERRAGENS')
  materiaisPainel(out, calc, corpoPainel(a7))

  // linha 4: plano de corte
  const y4 = y3 + h3 + 30
  const a8: Area = { x: M, y: y4, w: colW, h: PH - M - y4 }
  painel(out, a8, '8. PLANO DE CORTE')
  const sobrou = tabelaCorte(out, calc, corpoPainel(a8), res.pecas, maxLinhasCorte)
  if (sobrou > 0) texto(out, a8.x + a8.w - 30, a8.y + 52, `continua na folha 2 (+${sobrou} linhas)`, 28, '#ffffff', false, 'd', true)
  marca(out, PW, PH)
  return envelope(out, PW, PH)
}

const descontar = (a: Area, baixo: number): Area => ({ x: a.x, y: a.y, w: a.w, h: a.h - baixo })

// ---- painel de materiais e ferragens --------------------------------------------------------------------------------------
function materiaisPainel(out: Saida, calc: Calculo, a: Area): void {
  const res = calc.resultado, p = calc.projeto
  // fotos: estrutura, fundo, ferragem principal, fita
  const tw = 330, th = 220, gap = 22
  const principal = res.ferragens.find(f => ['corrediça', 'porta de correr', 'dobradiça', 'cabideiro'].includes(f.categoria)) ?? res.ferragens[0]
  const linhaPrinc = calc.orcamento.linhas.find(l => principal && l.item === principal.nome)
  // as duas chapas/madeiras de maior área viram as fotos principais
  const area = new Map<string, { material: string; esp: number; padrao: string; a: number }>()
  for (const pc of res.pecas) {
    const k = `${pc.material}|${pc.esp}|${pc.padrao}`
    const x = area.get(k) ?? { material: pc.material, esp: pc.esp, padrao: pc.padrao, a: 0 }
    x.a += pc.comp * pc.larg * pc.qtd
    area.set(k, x)
  }
  const top = [...area.values()].sort((a, b) => b.a - a.a).slice(0, 2)
  const tiles: { ref: any; leg: string }[] = top.map(t => ({
    ref: t.material === 'HDF' ? { tipo: 'chapa', nome: 'HDF' } : { tipo: 'padrao', nome: t.padrao },
    leg: cortar(`${t.material} ${fmtNum(t.esp, 0)} mm`, tw, 22),
  }))
  tiles.push({ ref: linhaPrinc?.ref ?? { tipo: 'nenhuma', nome: '' }, leg: principal ? cortar(principal.nome, tw, 22) : '' })
  tiles.push({ ref: { tipo: 'fita', nome: p.fita }, leg: cortar(p.fita.replace('Fita PVC ', 'Fita de borda '), tw, 22) })
  tiles.forEach((t, i) => {
    const x = a.x + 16 + (i % 2) * (tw + gap), y = a.y + 14 + Math.floor(i / 2) * (th + 62)
    out.push(ilustracao(t.ref, calc, x, y, tw, th))
    texto(out, x + tw / 2, y + th + 34, t.leg, 24, AZUL, true, 'c')
  })
  // lista
  const lx = a.x + 16 + 2 * (tw + gap) + 10
  const itens: string[] = []
  const usos = new Map<string, Set<string>>()
  for (const pc of res.pecas) {
    const k = `${pc.material} ${fmtNum(pc.esp, 0)} mm — ${pc.padrao}`
    if (!usos.has(k)) usos.set(k, new Set())
    usos.get(k)!.add(usoPeca(pc.nome))
  }
  for (const [k, u] of usos) itens.push(`${k}: ${[...u].join(', ')}`)
  for (const f of res.ferragens) itens.push(`${fmtNum(f.qtd, Number.isInteger(f.qtd) ? 0 : 2)} ${f.unidade} — ${f.nome}${f.detalhe ? ` (${f.detalhe})` : ''}`)
  itens.push(`${p.fita}: ${fmtNum(calc.orcamento.fita_metros, 1)} m (inclui 10% de sobra)`)
  itens.push('Parafusos, cavilhas e cola para madeira')
  listaMarcadores(out, { x: lx, y: a.y + 6, w: a.x + a.w - lx - 10, h: a.h - 190 }, itens, 26)
  // aviso
  const temGav = !!res.medidas.caixa
  const nota = p.familia === 'modular'
    ? `Antes de cortar: conferir a espessura real das chapas. Se não for exatamente a nominal, ajustar divisórias, base, rodapé${temGav ? ' e frente/traseira interna das gavetas' : ''}.`
    : 'Antes de cortar: conferir a espessura real das chapas e madeiras. Se não for exatamente a nominal, ajustar as peças que dependem dela (saia, travessas, frentes).'
  const by = a.y + a.h - 170
  out.push(`<rect x="${lx}" y="${by}" width="${a.x + a.w - lx - 10}" height="160" rx="16" fill="#fdf3dc" stroke="#ecd7a3" stroke-width="2"/>`)
  let yy = by + 40
  texto(out, lx + 22, yy, 'Antes de cortar:', 26, '#7a5a00', true)
  yy += 36
  const resto = nota.replace('Antes de cortar: ', '')
  for (const ln of quebrar(resto, a.x + a.w - lx - 60, 24)) { texto(out, lx + 22, yy, ln, 24, '#5b4a1a'); yy += 30 }
}

// ---- tabela do plano de corte ----------------------------------------------------------------------------------------------------
function tabelaCorte(out: Saida, calc: Calculo, a: Area, pecas: Peca[], maxLinhas: number): number {
  const cols: [string, number, 'e' | 'c' | 'd'][] = [['Nº', 70, 'c'], ['Peça', 520, 'e'], ['Qtd', 90, 'c'], ['Medidas (cm)', 330, 'c'], ['Chapa', 260, 'e'],
    ['Cor', 330, 'e'], ['Fita', 130, 'c'], ['Observação', 1000, 'e']]
  const soma = cols.reduce((x, c) => x + c[1], 0)
  const aj = (a.w - 40) / soma
  const lista = pecas.slice(0, maxLinhas)
  const rh = Math.min(56, (a.h - 30) / (lista.length + 1))
  const tam = Math.max(18, Math.min(30, rh * 0.62))
  let y = a.y + 16
  out.push(`<rect x="${a.x + 20}" y="${y}" width="${a.w - 40}" height="${rh}" rx="8" fill="#d7e8f8"/>`)
  let x = a.x + 20
  const celula = (s: string, w: number, al: 'e' | 'c' | 'd', yy: number, neg: boolean) => {
    if (al === 'e') texto(out, x + 14, yy, cortar(s, w - 24, tam, neg), tam, neg ? AZUL : TINTA, neg)
    else if (al === 'd') texto(out, x + w - 14, yy, s, tam, neg ? AZUL : TINTA, neg, 'd')
    else texto(out, x + w / 2, yy, s, tam, neg ? AZUL : TINTA, neg, 'c')
  }
  for (const [nome, w, al] of cols) { celula(nome, w * aj, al, y + rh * 0.7, true); x += w * aj }
  y += rh
  lista.forEach((pc, i) => {
    if (i % 2 === 0) out.push(`<rect x="${a.x + 20}" y="${y}" width="${a.w - 40}" height="${rh}" fill="#ffffff" fill-opacity="0.7"/>`)
    const vals = [String(pc.id), pc.nome, String(pc.qtd), `${fmtCm(pc.comp)} × ${fmtCm(pc.larg)}`, `${pc.material} ${fmtNum(pc.esp, 0)}`, pc.padrao, fitaTexto(pc), pc.obs]
    x = a.x + 20
    cols.forEach(([, w, al], k) => { celula(vals[k], w * aj, al, y + rh * 0.7, false); x += w * aj })
    y += rh
  })
  return pecas.length - lista.length
}

// ---- folha 2: relação de materiais e valores --------------------------------------------------------------------------------------
function folhaMateriais(calc: Calculo, opc: OpcoesExport, n: number, total: number, pecasRestantes: Peca[]): string {
  const out: Saida = []
  const p = calc.projeto, orc = calc.orcamento
  cabecalho(out, calc, `Relação de materiais e valores${total > 1 ? ` — folha ${n}/${total}` : ''}`)
  let y = 360
  const mostrarItens = opc.valores === 'itens'
  const mostrarTotal = opc.valores !== 'nenhum'

  if (pecasRestantes.length) {
    const h = 130 + pecasRestantes.length * 46
    const a: Area = { x: M, y, w: PW - 2 * M, h }
    painel(out, a, 'PLANO DE CORTE (CONTINUAÇÃO)')
    tabelaCorte(out, calc, corpoPainel(a), pecasRestantes, 999)
    y += h + 30
  }

  // tabela de materiais
  const grupos = new Map<string, Linha[]>()
  for (const l of orc.linhas) { if (!grupos.has(l.categoria)) grupos.set(l.categoria, []); grupos.get(l.categoria)!.push(l) }
  const cabH = 56
  const nLinhas = orc.linhas.length + grupos.size * 0.65
  const disponivel = PH - M - y - 600 - 74 - 30 - 60 - 40
  const linhaH = Math.max(84, Math.min(150, disponivel / Math.max(nLinhas, 1)))
  const alt = 74 + 30 + 60 + nLinhas * linhaH + 40
  const a: Area = { x: M, y, w: PW - 2 * M, h: Math.min(alt, PH - M - y - 600) }
  painel(out, a, 'RELAÇÃO DE MATERIAIS' + (mostrarItens ? ' E VALORES' : ''))
  const cols: [string, number, 'e' | 'c' | 'd'][] = mostrarItens
    ? [['', 160, 'c'], ['Item', 1050, 'e'], ['Qtd', 170, 'd'], ['Un.', 110, 'c'], ['Preço un.', 270, 'd'], ['Total', 290, 'd'], ['Fonte do preço', 770, 'e']]
    : [['', 100, 'c'], ['Item', 1700, 'e'], ['Qtd', 220, 'd'], ['Un.', 160, 'c'], ['Detalhe', 560, 'e']]
  const soma = cols.reduce((s, c) => s + c[1], 0)
  const aj = (a.w - 40) / soma
  let yy = a.y + 74 + 20
  out.push(`<rect x="${a.x + 20}" y="${yy}" width="${a.w - 40}" height="${cabH}" rx="8" fill="#d7e8f8"/>`)
  let x = a.x + 20
  const cel = (s: string, w: number, al: 'e' | 'c' | 'd', y0: number, tam: number, neg = false, cor = TINTA) => {
    if (al === 'e') texto(out, x + 12, y0, cortar(s, w - 20, tam, neg), tam, cor, neg)
    else if (al === 'd') texto(out, x + w - 12, y0, s, tam, cor, neg, 'd')
    else texto(out, x + w / 2, y0, s, tam, cor, neg, 'c')
  }
  for (const [nome, w, al] of cols) { cel(nome, w * aj, al, yy + 38, 28, true, AZUL); x += w * aj }
  yy += cabH + 6
  for (const [cat, linhas] of grupos) {
    out.push(`<rect x="${a.x + 20}" y="${yy}" width="${a.w - 40}" height="50" fill="#eaf3fc"/>`)
    texto(out, a.x + 40, yy + 35, rotuloCategoria(cat).toUpperCase(), 26, AZUL, true)
    if (mostrarItens) {
      const sub = linhas.reduce((s, l) => s + totalLinha(l), 0)
      if (sub > 0) texto(out, a.x + a.w - 40 - ((cols[6][1] * aj)), yy + 35, fmtBrl(sub), 26, AZUL, true, 'd')
    }
    yy += 54
    linhas.forEach((l, i) => {
      if (i % 2 === 1) out.push(`<rect x="${a.x + 20}" y="${yy}" width="${a.w - 40}" height="${linhaH}" fill="#ffffff" fill-opacity="0.65"/>`)
      out.push(ilustracao(l.ref, calc, a.x + 20 + 14, yy + 8, linhaH - 16, linhaH - 16))
      const qtd = fmtNum(l.qtd, Number.isInteger(l.qtd) ? 0 : 2)
      x = a.x + 20
      const w0 = cols[0][1] * aj
      x += w0
      const my = linhaH / 2; cel(l.item, cols[1][1] * aj, 'e', yy + my - (l.detalhe ? 2 : -10), 30, true); if (l.detalhe) { const sx = x; cel(l.detalhe, cols[1][1] * aj, 'e', yy + my + 32, 23, false, CINZA); x = sx }
      x += cols[1][1] * aj
      cel(qtd, cols[2][1] * aj, 'd', yy + linhaH / 2 + 10, 29); x += cols[2][1] * aj
      cel(l.unidade, cols[3][1] * aj, 'c', yy + linhaH / 2 + 10, 26); x += cols[3][1] * aj
      if (mostrarItens) {
        cel(l.preco ? fmtBrl(l.preco) : '—', cols[4][1] * aj, 'd', yy + linhaH / 2 + 10, 29); x += cols[4][1] * aj
        cel(l.preco ? fmtBrl(totalLinha(l)) : '—', cols[5][1] * aj, 'd', yy + linhaH / 2 + 10, 30, true); x += cols[5][1] * aj
        const f = l.preco ? [l.fonte ?? 'Preço informado pelo marceneiro', l.atualizado ?? ''].filter(Boolean).join(' · ') : 'sem preço informado'
        cel(f, cols[6][1] * aj, 'e', yy + linhaH / 2 + 8, 20, false, CINZA)
      }
      yy += linhaH
    })
  }
  y = a.y + a.h + 30

  // resumo
  const rs: Area = { x: PW - M - 1100, y, w: 1100, h: 520 }
  const cond: Area = { x: M, y, w: PW - 2 * M - 1100 - 30, h: 520 }
  painel(out, cond, 'CONDIÇÕES E OBSERVAÇÕES')
  const cc = corpoPainel(cond)
  const textos: string[] = []
  if (p.condicoes) textos.push(p.condicoes)
  if (p.observacoes) textos.push(`Observações: ${p.observacoes}`)
  if (orc.incompleto && mostrarTotal) textos.push('Atenção: há itens sem preço informado; o total pode estar incompleto.')
  textos.push('Valores sujeitos a confirmação de preços dos fornecedores na data do pedido.')
  let ty = cc.y + 40
  for (const t of textos) ty = textoQuebrado(out, cc.x + 24, ty, cc.w - 48, t, 28, TINTA) + 10
  painel(out, rs, mostrarTotal ? 'VALORES' : 'RESUMO')
  const rc = corpoPainel(rs)
  if (mostrarTotal) {
    const linhas: [string, number, boolean][] = [['Materiais', orc.materiais, false], ['Mão de obra', orc.mao_de_obra, false],
      [`Margem (${fmtNum(orc.margem_pct, 1)}%)`, orc.margem_valor, false]]
    let ry = rc.y + 56
    if (mostrarItens) for (const [r, v] of linhas) { texto(out, rc.x + 30, ry, r, 32, TINTA); texto(out, rc.x + rc.w - 30, ry, fmtBrl(v), 32, TINTA, false, 'd'); ry += 56 }
    out.push(`<rect x="${rc.x + 16}" y="${rc.y + rc.h - 170}" width="${rc.w - 32}" height="150" rx="18" fill="#1b4a7a"/>`)
    texto(out, rc.x + 44, rc.y + rc.h - 100, 'TOTAL', 36, '#cfe3f7', true)
    texto(out, rc.x + rc.w - 44, rc.y + rc.h - 52, orc.total > 0 ? fmtBrl(orc.total) : 'a combinar', 72, '#ffffff', true, 'd')
  } else {
    texto(out, rc.x + 30, rc.y + 70, 'Lista de materiais sem valores.', 30, TINTA)
  }
  marca(out, PW, PH)
  return envelope(out, PW, PH)
}

// ---- plano de chapas (retrato, 6 por folha) --------------------------------------------------------------------------------------------
function desenharChapa(out: Saida, calc: Calculo, g: Calculo['plano']['grupos'][number], ch: Calculo['plano']['grupos'][number]['chapas'][number], num: number, a: Area) {
  texto(out, a.x + 10, a.y + 34, `${g.material} ${fmtNum(g.esp, 0)} mm — ${g.padrao}`, 28, AZUL, true)
  texto(out, a.x + 10, a.y + 68, `chapa ${num}/${g.chapas.length}  •  aproveitamento ${fmtNum(ch.aproveitamento, 1)}%`, 24, CINZA)
  const refilo = calc.plano.refilo
  const mold: Area = { x: a.x + 40, y: a.y + 90, w: a.w - 80, h: a.h - 170 }
  const esc = Math.min(mold.w / g.comprimento, mold.h / g.largura)
  const w = g.comprimento * esc, h = g.largura * esc
  retangulo(out, mold.x, mold.y, w, h, '#ffffff', TINTA, 3)
  retangulo(out, mold.x + refilo * esc, mold.y + refilo * esc, w - 2 * refilo * esc, h - 2 * refilo * esc, 'none', '#9AA0AA', 2, '12 8')
  const cor = C.padrao(calc.catalogo, g.padrao).cor
  const claro = (() => { const [r, gg, b] = [1, 3, 5].map(i => parseInt(cor.slice(i, i + 2), 16)); return (Math.max(r, gg, b) + Math.min(r, gg, b)) / 2 > 110 })()
  for (const pp of ch.pecas) {
    const rx = mold.x + (refilo + pp.x) * esc, ry = mold.y + (refilo + pp.y) * esc, rw = pp.w * esc, rh = pp.h * esc
    retangulo(out, rx, ry, rw, rh, cor, TINTA, 2.2)
    const tinta = claro ? TINTA : '#ffffff'
    if (rw > 100 && rh > 70) {
      texto(out, rx + rw / 2, ry + rh / 2 - 2, String(pp.peca_id), 34, tinta, true, 'c')
      texto(out, rx + rw / 2, ry + rh / 2 + 28, `${fmtCm(pp.w)}×${fmtCm(pp.h)}`, 20, tinta, false, 'c')
    } else if (rw > 50 && rh > 30) texto(out, rx + rw / 2, ry + rh / 2 + 9, String(pp.peca_id), 22, tinta, true, 'c')
  }
  texto(out, mold.x + w / 2, mold.y + h + 38, `${fmtCm(g.comprimento)} × ${fmtCm(g.largura)} cm`, 24, AZUL, false, 'c')
}

function paginasChapas(calc: Calculo, primeiro: number, total: number): Pagina[] {
  const itens = calc.plano.grupos.flatMap(g => g.chapas.map((ch, i) => ({ g, ch, num: i + 1 })))
  const pgs: Pagina[] = []
  for (let k = 0; k < itens.length; k += 6) {
    const grupo = itens.slice(k, k + 6)
    const n = primeiro + pgs.length
    pgs.push({ titulo: `Plano de chapas ${pgs.length + 1}`, svg: () => {
      const out: Saida = []
      cabecalho(out, calc, `Plano de chapas (corte otimizado) — folha ${n}/${total}`)
      const topo = 360
      const aw = (PW - 2 * M - 20) / 2, ah = (PH - M - topo - 40) / 3
      grupo.forEach(({ g, ch, num }, i) => {
        const a: Area = { x: M + (i % 2) * (aw + 20), y: topo + Math.floor(i / 3 * 1) * 0 + Math.floor(i / 2) * (ah + 20), w: aw, h: ah }
        out.push(`<rect x="${a.x}" y="${a.y}" width="${a.w}" height="${a.h}" rx="16" fill="#f5f9fe" stroke="#a9c4e0" stroke-width="3"/>`)
        desenharChapa(out, calc, g, ch, num, a)
      })
      marca(out, PW, PH)
      return envelope(out, PW, PH)
    } })
  }
  return pgs
}

// ---- lista de folhas ---------------------------------------------------------------------------------------------------------------------------------
const MAX_LINHAS_CORTE = 26

export function montarPaginas(calc: Calculo, opc: OpcoesExport = OPCOES_PADRAO): Pagina[] {
  const restantes = calc.resultado.pecas.slice(MAX_LINHAS_CORTE)
  const nChapas = opc.chapas ? paginasChapas(calc, 0, 0).length : 0
  const temMateriais = opc.materiais || restantes.length > 0
  const total = 1 + (temMateriais ? 1 : 0) + nChapas
  const pgs: Pagina[] = [{ titulo: 'Folha do projeto', svg: () => folhaProjeto(calc, 1, total, MAX_LINHAS_CORTE) }]
  if (temMateriais) pgs.push({ titulo: 'Materiais e valores', svg: () => folhaMateriais(calc, opc.materiais ? opc : { ...opc, valores: 'nenhum' }, 2, total, restantes) })
  if (opc.chapas) pgs.push(...paginasChapas(calc, 2 + (temMateriais ? 1 : 0), total))
  return pgs
}

export const NOMES_VISTAS: Record<string, string> = {
  frontal: 'Vista frontal', lateral: 'Vista lateral', interna: 'Vista interna', interna_gavetas: 'Vista interna com gavetas', planta: 'Planta (vista de cima)',
  detalhe: 'Detalhe', '3d': 'Perspectiva 3D', explodida: 'Vista explodida',
}

/** Uma única vista em tamanho grande, numa folha A3 paisagem. */
export function folhaVista(calc: Calculo, nome: string): string {
  const out: Saida = []
  cabecalho(out, calc, NOMES_VISTAS[nome] ?? nome, LW)
  const a: Area = { x: M + 20, y: 360, w: LW - 2 * M - 40, h: LH - M - 380 }
  out.push(`<rect x="${a.x}" y="${a.y}" width="${a.w}" height="${a.h}" rx="20" fill="#f5f9fe" stroke="#a9c4e0" stroke-width="3"/>`)
  const res = calc.resultado
  const gav = !!res.medidas.caixa
  if (nome === 'frontal') desenharFrontal(out, a, calc)
  else if (nome === 'lateral') desenharLateral(out, a, calc)
  else if (nome === 'interna') desenharInterna(out, a, calc, false)
  else if (nome === 'interna_gavetas') desenharInterna(out, a, calc, gav)
  else if (nome === 'planta') desenharPlanta(out, a, calc)
  else if (nome === 'detalhe') (res.detalhe === 'porta' ? desenharPorta : desenharCaixa)(out, a, calc)
  else if (nome === '3d') desenhar3d(out, a, calc)
  else if (nome === 'explodida') desenharExplodida(out, a, calc)
  marca(out, LW, LH)
  return envelope(out, LW, LH)
}

export function paginasChapasPreview(calc: Calculo): Pagina[] {
  return paginasChapas(calc, 3, montarPaginas(calc, { ...OPCOES_PADRAO, chapas: true }).length)
}
export { linhaSvg }
