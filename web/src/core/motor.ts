// Motor de cálculo: transforma um Projeto em um Resultado (peças, blocos 3D, ferragens, avisos).
import * as C from './catalogo'
import { DEFINICOES, Folgas } from './folgas'
import { addPeca, aviso, resultadoVazio } from './tipos'
import type { Bloco, Catalogo, Cor, Peca, Projeto, Resultado } from './tipos'

interface Estrutura {
  L: number; H: number; P: number; e: number; f: number; fe: number; y0: number; rod: number
  topo_lat: number; ytop_int: number; ybase_int: number; Hi: number
  z_lat0: number; Dlat: number; Dint: number; z_front_inner: number; z_fundo_face: number
  colunas: number; vao: number; col_x: number[]; rasgo: boolean; sobrepostas: boolean
  r: number; s: number; dist: number
}

const bloco = (nome: string, grupo: string, x: number, y: number, z: number, dx: number, dy: number, dz: number,
  cor: Cor, veio: Bloco['veio'] = '', peca = 0, gaveta = -1): Bloco =>
  ({ nome, grupo, x, y, z, dx, dy, dz, cor, veio, peca, gaveta })

const r3 = (v: number) => Math.round(v * 1000) / 1000

export function calcular(p: Projeto, cat: Catalogo): Resultado {
  const res = resultadoVazio()
  const cor = C.corredica(cat, p.corredica)
  const fo = new Folgas(p.folgas_travadas, cor.folga_lado)
  const colunas = p.motor === 'portas' ? Math.max(1, Math.ceil(Math.max(1, p.portas) / 2)) : Math.max(1, Math.floor(p.colunas))
  const E = construirEstrutura(p, cat, fo, res, colunas)
  if (p.motor === 'portas') calcularPortas(p, cat, fo, res, E)
  else calcularGavetas(p, cat, fo, res, E)
  folgasEfetivas(fo, res)
  if (E.Hi <= 0) aviso(res, 'erro', 'Altura interna inválida: aumente a altura do móvel ou reduza a base.')
  if (E.vao <= 0) aviso(res, 'erro', 'Largura útil inválida para o número de colunas.')
  if (E.Dint <= 0) aviso(res, 'erro', 'Profundidade útil inválida.')
  return res
}

function folgasEfetivas(fo: Folgas, res: Resultado): void {
  const vaos: number[] = res.medidas.vaos_gaveta || []
  const menor = vaos.length ? Math.min(...vaos) : undefined
  for (const d of DEFINICOES) {
    const ctx = d.chave === 'topo_caixa' ? { vao_gaveta: menor } : {}
    const valor = fo.valor(d.chave, ctx)
    const fora = Folgas.fora(d.chave, valor)
    res.folgas[d.chave] = { valor, auto: fo.automatico(d.chave, ctx), travada: fo.travada(d.chave), fora }
    if (fora) aviso(res, 'aviso', `Folga '${d.nome}' fora da faixa permitida (${d.minimo}–${d.maximo} mm).`)
  }
}

// ---- estrutura -----------------------------------------------------------------------------------
function construirEstrutura(p: Projeto, cat: Catalogo, fo: Folgas, res: Resultado, colunas: number): Estrutura {
  const L = p.largura * 10, H = p.altura * 10, P = p.profundidade * 10
  const e = p.estrutura_esp, f = p.fundo_esp, fe = p.frente_esp
  const rasgo = p.fundo_tipo === 'rasgo'
  const sobrepostas = p.frente_tipo === 'sobrepostas'
  const r = fo.valor('rasgo_prof'), s = fo.valor('rasgo_sobra'), dist = fo.valor('rasgo_dist')
  const y0 = p.base_tipo === 'pes' || p.base_tipo === 'rodizios' ? p.base_altura * 10 : 0
  const rod = p.base_tipo === 'rodape' ? p.base_altura * 10 : 0
  const topo_lat = p.tampo === 'sobreposto' ? H - e : H
  const ytop_int = H - e
  const ybase_int = y0 + rod + e
  const Hi = ytop_int - ybase_int
  const z_lat0 = rasgo ? 0 : f
  const Dlat = (sobrepostas ? P - fe : P) - (rasgo ? 0 : f)
  const z_front_inner = P - fe
  const z_fundo_face = z_lat0 + (rasgo ? dist + f : 0)
  const Dint = z_front_inner - z_fundo_face
  const util = L - 2 * e - (colunas - 1) * e
  const vao = util / colunas
  const col_x = Array.from({ length: colunas }, (_, k) => e + k * (vao + e))
  const E: Estrutura = { L, H, P, e, f, fe, y0, rod, topo_lat, ytop_int, ybase_int, Hi, z_lat0, Dlat, Dint,
    z_front_inner, z_fundo_face, colunas, vao, col_x, rasgo, sobrepostas, r, s, dist }
  pecasEstrutura(p, fo, res, E)
  Object.assign(res.medidas, { L, H, P, e, y0, rod, Hi, vao, Dlat, Dint, topo_lat, ybase_int, ytop_int, colunas, z_lat0 })
  return E
}

function peca(p: Projeto, nome: string, qtd: number, comp: number, larg: number, fita_c = 0, fita_l = 0, veio = true,
  extra: Partial<Peca> = {}): Omit<Peca, 'id'> {
  return { nome, qtd, comp: r3(comp), larg: r3(larg), esp: extra.esp ?? p.estrutura_esp,
    material: extra.material ?? p.estrutura_material, padrao: extra.padrao ?? p.estrutura_padrao,
    fita_c, fita_l, veio, obs: extra.obs ?? '' }
}

function pecasEstrutura(p: Projeto, fo: Folgas, res: Resultado, E: Estrutura): void {
  const { L, H, P, e, f } = E
  const B = res.blocos

  if (p.tampo === 'sobreposto') {
    const id = addPeca(res, peca(p, 'Tampo', 1, L, P, 1, 2))
    B.push(bloco('Tampo', 'tampo', 0, H - e, 0, L, e, P, 'estrutura', 'x', id))
  } else {
    const id = addPeca(res, peca(p, 'Tampo', 1, L - 2 * e, E.Dlat, 1, 0))
    B.push(bloco('Tampo', 'tampo', e, H - e, E.z_lat0, L - 2 * e, e, E.Dlat, 'estrutura', 'x', id))
  }

  const alt_lat = E.topo_lat - E.y0
  let id = addPeca(res, peca(p, 'Lateral', 2, alt_lat, E.Dlat, 1, 0))
  B.push(bloco('Lateral esquerda', 'lateral', 0, E.y0, E.z_lat0, e, alt_lat, E.Dlat, 'estrutura', 'y', id))
  B.push(bloco('Lateral direita', 'lateral', L - e, E.y0, E.z_lat0, e, alt_lat, E.Dlat, 'estrutura', 'y', id))

  id = addPeca(res, peca(p, 'Base', 1, L - 2 * e, E.Dlat, 1, 0))
  B.push(bloco('Base', 'base', e, E.y0 + E.rod, E.z_lat0, L - 2 * e, e, E.Dlat, 'estrutura', 'x', id))

  if (E.rod > 0) {
    const recuo = fo.valor('recuo_rodape')
    let z2 = P - recuo, z1 = z2 - e
    if (z1 < E.z_lat0) {
      aviso(res, 'aviso', 'Recuo do rodapé grande demais: o rodapé ultrapassa a traseira.')
      z1 = E.z_lat0; z2 = E.z_lat0 + e
    }
    id = addPeca(res, peca(p, 'Rodapé', 1, L - 2 * e, E.rod, 1, 0))
    B.push(bloco('Rodapé', 'rodape', e, 0, z1, L - 2 * e, E.rod, e, 'estrutura', 'x', id))
  }

  if (p.base_tipo === 'pes' || p.base_tipo === 'rodizios') {
    const n = L > 1200 ? 6 : 4
    const tam = 40
    const xs = [20, L - 20 - tam]
    if (n === 6) xs.splice(1, 0, (L - tam) / 2)
    const zs = [E.z_lat0 + 20, E.z_lat0 + E.Dlat - 20 - tam]
    const grupo = p.base_tipo === 'pes' ? 'pe' : 'rodizio'
    for (const z of zs) for (const x of xs) {
      B.push(bloco(grupo === 'pe' ? 'Pé' : 'Rodízio', grupo, x, 0, z, tam, E.y0, tam, 'ferragem'))
    }
    res.insumos[grupo] = n
    res.ferragens.push({ nome: grupo === 'pe' ? 'Pé regulável' : 'Rodízio com trava', qtd: n, unidade: 'un',
      categoria: 'base', detalhe: `altura ${E.y0 / 10} cm` })
  }

  if (E.colunas > 1) {
    const z1 = E.z_fundo_face
    const larg_div = E.z_lat0 + E.Dlat - z1
    id = addPeca(res, peca(p, 'Divisória', E.colunas - 1, E.Hi, larg_div, 1, 0))
    for (let k = 0; k < E.colunas - 1; k++) {
      B.push(bloco(`Divisória ${k + 1}`, 'divisoria', E.col_x[k] + E.vao, E.ybase_int, z1, e, E.Hi, larg_div, 'estrutura', 'y', id))
    }
  }

  if (E.rasgo) {
    const { r, s } = E
    const w = L - 2 * e + 2 * (r - s), h = E.Hi + 2 * (r - s)
    id = addPeca(res, peca(p, 'Fundo do móvel', 1, w, h, 0, 0, false,
      { esp: f, material: p.fundo_material, padrao: p.fundo_padrao, obs: 'em rasgo' }))
    B.push(bloco('Fundo', 'fundo', e - (r - s), E.ybase_int - (r - s), E.dist, w, h, f, 'fundo', '', id))
  } else {
    const w = L - 2, h = alt_lat - 2
    id = addPeca(res, peca(p, 'Fundo do móvel', 1, w, h, 0, 0, false,
      { esp: f, material: p.fundo_material, padrao: p.fundo_padrao, obs: 'pregado' }))
    B.push(bloco('Fundo', 'fundo', 1, E.y0 + 1, 0, w, h, f, 'fundo', '', id))
  }
}

function distribuir(total: number, n: number, pesos: number[], fixos: number[] = []): number[] {
  const fx = Array.from({ length: n }, (_, i) => fixos[i] ?? 0)
  const somaFixos = fx.filter(v => v > 0).reduce((a, b) => a + b, 0)
  const livres = fx.map((v, i) => (v <= 0 ? i : -1)).filter(i => i >= 0)
  const restante = Math.max(total - somaFixos, 0)
  const somaPesos = livres.reduce((a, i) => a + pesos[i], 0) || 1
  return fx.map((v, i) => (v > 0 ? v : (restante * pesos[i]) / somaPesos))
}

const pesosGavetas = (p: Projeto, n: number) =>
  Array.from({ length: n }, (_, i) => (p.distribuicao === 'crescente' ? 1 + 0.15 * i : 1))

function numeroDobradicas(alturaMm: number): number {
  return alturaMm <= 900 ? 2 : alturaMm <= 1600 ? 3 : 4
}

function colocarPuxador(p: Projeto, cat: Catalogo, res: Resultado, fx: number, fy: number, fw: number, fh: number,
  zFace: number, vertical = false, xLivre?: number): void {
  const px = C.puxador(cat, p.puxador)
  const tipo = px.tipo
  if (tipo === 'toque') return
  let comp = Number(px.comprimento || 0)
  let cx = fx + fw / 2, cy = fy + fh / 2
  const base = { z: zFace, tipo, vertical, frente_x: fx, frente_y: fy, frente_w: fw, frente_h: fh }
  if (tipo === 'perfil_cava') { res.puxadores.push({ ...base, x: cx, y: fy + fh - 12, comp: fw, vertical: false }); return }
  if (tipo === 'cava_usinada') {
    res.puxadores.push({ ...base, x: cx, y: fy + fh - 15, comp: Math.min(comp || 150, fw - 40), vertical: false }); return
  }
  if (p.puxador_posicao === 'superior' && !vertical) cy = fy + fh - 45
  if (vertical) {
    if (xLivre != null) cx = xLivre
    if (fh > 1200) {
      cy = fy + Math.min(1000 - fy, fh - 150)
      cy = Math.max(cy, fy + 150)
    }
  }
  const maximo = (vertical ? fh : fw) - 40
  if (tipo === 'barra' || tipo === 'concha') comp = Math.min(comp || 128, maximo)
  res.puxadores.push({ ...base, x: cx, y: cy, comp })
}

// ---- gavetas ------------------------------------------------------------------------------------------
function calcularGavetas(p: Projeto, cat: Catalogo, fo: Folgas, res: Resultado, E: Estrutura): void {
  const n = Math.max(1, Math.floor(p.gavetas_por_coluna))
  const cols = E.colunas
  const { e, fe } = E
  const g = fo.valor('entre_frentes')
  const c = fo.valor('contorno_embutida')
  const nicho = p.nicho * 10
  const B = res.blocos

  let zonaInt: number, yTopoFrentes: number
  if (nicho > 0) {
    const yPrat = E.ytop_int - nicho - e
    const id = addPeca(res, { nome: 'Prateleira fixa do nicho', qtd: cols, comp: r3(E.vao), larg: r3(E.Dint), esp: e,
      material: p.estrutura_material, padrao: p.estrutura_padrao, fita_c: 1, fita_l: 0, veio: true, obs: '' })
    for (let k = 0; k < cols; k++) {
      B.push(bloco('Prateleira do nicho', 'prateleira', E.col_x[k], yPrat, E.z_front_inner - E.Dint, E.vao, e, E.Dint, 'estrutura', 'x', id))
    }
    zonaInt = E.Hi - nicho - e
    yTopoFrentes = E.ytop_int - nicho
    res.medidas.nicho = nicho
  } else {
    zonaInt = E.Hi
    yTopoFrentes = E.topo_lat
  }
  const yBaseFrentes = E.y0 + E.rod

  const pesos = pesosGavetas(p, n)
  const fixos = (p.alturas_personalizadas || []).map(v => Number(v) * 10)
  let topoF: number, totalUtil: number, largF: number, xsF: number[]
  if (E.sobrepostas) {
    const zonaFrentes = yTopoFrentes - yBaseFrentes
    topoF = yTopoFrentes
    totalUtil = zonaFrentes - (n - 1) * g
    largF = (E.L - (cols - 1) * g) / cols
    xsF = Array.from({ length: cols }, (_, k) => k * (largF + g))
  } else {
    topoF = E.ybase_int + zonaInt - c
    totalUtil = zonaInt - 2 * c - (n - 1) * g
    largF = E.vao - 2 * c
    xsF = E.col_x.map(x => x + c)
  }
  const altF = distribuir(totalUtil, n, pesos, fixos)
  const somaF = altF.reduce((a, b) => a + b, 0)

  const cor = C.corredica(cat, p.corredica)
  const latCorr = fo.valor('lateral_corredica')
  const trasei = fo.valor('traseira_corredica')
  const comprimentos = [...cor.comprimentos].sort((a, b) => a - b)
  let compCorr: number
  if (String(p.corredica_comp).toLowerCase() === 'auto') {
    const cabem = comprimentos.filter(x => x <= E.Dint - trasei + 1e-9)
    if (cabem.length) compCorr = Number(cabem[cabem.length - 1])
    else {
      compCorr = Number(comprimentos[0])
      aviso(res, 'erro', 'Profundidade insuficiente para a menor corrediça do catálogo.')
    }
  } else {
    compCorr = Number(p.corredica_comp)
    if (compCorr > E.Dint - trasei + 1e-9) aviso(res, 'aviso', `Corrediça de ${compCorr} mm é grande demais para a profundidade útil.`)
  }

  const ec = p.caixa_esp
  const { r, s } = E
  const wCaixa = Math.floor(E.vao - 2 * latCorr + 1e-6)
  const prof = compCorr

  let yTopSlot = E.ybase_int + zonaInt
  let yF = topoF
  const caixas: { yCx: number; altCx: number; slot: number; hf: number }[] = []
  const frenteYs: [number, number][] = []
  const caixaAlts: number[] = [], vaosGaveta: number[] = []

  for (let i = 0; i < n; i++) {
    const hf = altF[i]
    const slot = (hf * zonaInt) / somaF
    yF -= hf
    frenteYs.push([yF, hf])
    const ySlotBase = yTopSlot - slot
    yTopSlot = ySlotBase
    const topoCx = fo.valor('topo_caixa', { vao_gaveta: slot })
    const fundoCx = fo.valor('fundo_caixa')
    let altCx = Math.floor(Math.min(slot - topoCx - fundoCx, hf - 30) + 1e-6)
    altCx = Math.max(altCx, 1)
    caixaAlts.push(altCx)
    vaosGaveta.push(slot)
    caixas.push({ yCx: ySlotBase + fundoCx, altCx, slot, hf })
    yF -= g
    if (E.vao < 200) aviso(res, 'aviso', 'Vão da gaveta com menos de 200 mm de largura.')
    if (altCx < 60) aviso(res, 'aviso', `Caixa da gaveta ${i + 1} com altura menor que 60 mm (${altCx} mm).`)
    if (altCx < cor.altura_min_caixa) aviso(res, 'aviso', `Caixa da gaveta ${i + 1} abaixo da altura mínima da corrediça (${cor.altura_min_caixa} mm).`)
    if (hf < 80) aviso(res, 'aviso', `Frente da gaveta ${i + 1} com altura menor que 80 mm.`)
  }

  Object.assign(res.medidas, {
    frentes_altura: altF, frente_largura: largF, frentes_y: frenteYs.map(x => x[0]), vaos_gaveta: vaosGaveta,
    caixa: { larg: wCaixa, larg_int: wCaixa - 2 * ec, prof, alts: caixaAlts, comp_corredica: compCorr },
    n_gavetas: n, gaveta_xs: xsF, topo_frentes: topoF,
  })

  const zEnd = E.z_front_inner
  const zIni = zEnd - prof
  const todas = n * cols
  for (let i = 0; i < n; i++) {
    const { yCx, altCx, hf } = caixas[i]
    const [yf] = frenteYs[i]
    const idFrente = addPeca(res, { nome: 'Frente de gaveta', qtd: cols, comp: r3(largF), larg: r3(hf), esp: p.frente_esp,
      material: p.frente_material, padrao: p.frente_padrao, fita_c: 2, fita_l: 2, veio: true, obs: '' })
    const idLat = addPeca(res, { nome: 'Lateral da gaveta', qtd: 2 * cols, comp: prof, larg: altCx, esp: ec,
      material: p.caixa_material, padrao: p.caixa_padrao, fita_c: 1, fita_l: 0, veio: true, obs: '' })
    const idFt = addPeca(res, { nome: 'Frente/traseira da gaveta', qtd: 2 * cols, comp: wCaixa - 2 * ec, larg: altCx, esp: ec,
      material: p.caixa_material, padrao: p.caixa_padrao, fita_c: 1, fita_l: 0, veio: true, obs: '' })
    const wFundo = wCaixa - 2 * ec + 2 * (r - s), pFundo = prof - 2 * ec + 2 * (r - s)
    const idFd = addPeca(res, { nome: 'Fundo da gaveta', qtd: cols, comp: r3(wFundo), larg: r3(pFundo), esp: p.fundo_caixa_esp,
      material: p.fundo_caixa_material, padrao: p.fundo_padrao, fita_c: 0, fita_l: 0, veio: false, obs: 'em rasgo' })
    for (let k = 0; k < cols; k++) {
      const gid = i * cols + k
      const fx = xsF[k]
      B.push(bloco(`Frente ${gid + 1}`, 'frente', fx, yf, E.P - fe, largF, hf, fe, 'frente', 'x', idFrente, gid))
      colocarPuxador(p, cat, res, fx, yf, largF, hf, E.P)
      const xC = E.col_x[k] + (E.vao - wCaixa) / 2
      B.push(...blocosCaixa(xC, yCx, zIni, wCaixa, altCx, prof, ec, r, s, idLat, idFt, idFd, p.fundo_caixa_esp, gid))
      B.push(...blocosCorredica(cor.tipo, xC, yCx, zEnd, wCaixa, altCx, latCorr, compCorr, gid))
      if (i === 0 && k === 0 && !res.caixa_modelo.length) {
        res.caixa_modelo = [
          ...blocosCaixa(0, 0, 0, wCaixa, altCx, prof, ec, r, s, idLat, idFt, idFd, p.fundo_caixa_esp, 0),
          ...blocosCorredica(cor.tipo, 0, 0, prof, wCaixa, altCx, latCorr, compCorr, 0),
        ]
      }
    }
  }

  res.ferragens.push({ nome: cor.nome, qtd: todas, unidade: 'par', categoria: 'corrediça', detalhe: `${compCorr} mm` })
  const px = C.puxador(cat, p.puxador)
  if (px.tipo === 'cava_usinada') res.ferragens.push({ nome: 'Usinagem de cava', qtd: todas, unidade: 'un', categoria: 'puxador', detalhe: '' })
  else if (px.tipo === 'perfil_cava') res.ferragens.push({ nome: px.nome, qtd: todas, unidade: 'peça', categoria: 'puxador', detalhe: '' })
  else if (px.tipo !== 'toque') res.ferragens.push({ nome: px.nome, qtd: todas, unidade: 'un', categoria: 'puxador', detalhe: '' })
  res.definicoes.push(
    `Caixa da gaveta: ${wCaixa} mm de largura (vão ${E.vao.toFixed(1)} − 2 × ${latCorr} mm de corrediça, arredondado para baixo).`,
    `Corrediça de ${compCorr} mm; profundidade útil ${E.Dint.toFixed(1)} mm.`)
}

function blocosCaixa(x: number, y: number, z: number, w: number, alt: number, prof: number, ec: number, r: number, s: number,
  idLat: number, idFt: number, idFd: number, espFundo: number, gid: number): Bloco[] {
  const off = r - s
  return [
    bloco('Lateral da gaveta', 'caixa_lateral', x, y, z, ec, alt, prof, 'caixa', 'z', idLat, gid),
    bloco('Lateral da gaveta', 'caixa_lateral', x + w - ec, y, z, ec, alt, prof, 'caixa', 'z', idLat, gid),
    bloco('Frente da caixa', 'caixa_frente', x + ec, y, z + prof - ec, w - 2 * ec, alt, ec, 'caixa', 'x', idFt, gid),
    bloco('Traseira da caixa', 'caixa_frente', x + ec, y, z, w - 2 * ec, alt, ec, 'caixa', 'x', idFt, gid),
    bloco('Fundo da gaveta', 'caixa_fundo', x + ec - off, y + 10, z + ec - off, w - 2 * ec + 2 * off, espFundo,
      prof - 2 * ec + 2 * off, 'fundo', '', idFd, gid),
  ]
}

function blocosCorredica(tipo: string, x: number, y: number, zEnd: number, w: number, alt: number, lat: number,
  comp: number, gid: number): Bloco[] {
  if (tipo === 'oculta') {
    return [x + 10, x + w - 30].map(xx => bloco('Corrediça', 'corredica', xx, y - 8, zEnd - comp, 20, 8, comp, 'ferragem', '', 0, gid))
  }
  const altura = 35
  const yy = y + alt / 2 - altura / 2
  return [
    bloco('Corrediça', 'corredica', x - lat, yy, zEnd - comp, lat, altura, comp, 'ferragem', '', 0, gid),
    bloco('Corrediça', 'corredica', x + w, yy, zEnd - comp, lat, altura, comp, 'ferragem', '', 0, gid),
  ]
}

// ---- portas ------------------------------------------------------------------------------------------------
function calcularPortas(p: Projeto, cat: Catalogo, fo: Folgas, res: Resultado, E: Estrutura): void {
  const n = Math.max(1, Math.floor(p.portas))
  const { e, fe } = E
  const g = fo.valor('entre_frentes')
  const c = fo.valor('contorno_embutida')
  const B = res.blocos

  let yIni: number, altura: number, larg: number, x0: number
  if (E.sobrepostas) {
    yIni = E.y0 + E.rod
    altura = E.topo_lat - yIni
    larg = (E.L - (n - 1) * g) / n
    x0 = 0
  } else {
    yIni = E.ybase_int + c
    altura = E.Hi - 2 * c
    larg = (E.L - 2 * e - 2 * c - (n - 1) * g) / n
    x0 = e + c
  }
  if (larg > 600) aviso(res, 'aviso', `Porta com ${(larg / 10).toFixed(1)} cm de largura: acima de 60 cm pode empenar.`)
  if (altura > 2400) aviso(res, 'aviso', 'Porta com mais de 2,4 m de altura.')

  const qtdDob = numeroDobradicas(altura)
  const id = addPeca(res, { nome: 'Porta', qtd: n, comp: r3(altura), larg: r3(larg), esp: p.frente_esp,
    material: p.frente_material, padrao: p.frente_padrao, fita_c: 2, fita_l: 2, veio: true, obs: `${qtdDob} dobradiças` })
  const ys = posicoesDobradicas(altura, qtdDob)
  const lados: string[] = []
  for (let i = 0; i < n; i++) {
    const x = x0 + i * (larg + g)
    B.push(bloco(`Porta ${i + 1}`, 'porta', x, yIni, E.P - fe, larg, altura, fe, 'frente', 'y', id, i))
    let esq = n > 1 ? i < Math.floor((n + 1) / 2) : true
    if (n % 2 === 1 && i === Math.floor(n / 2)) esq = true
    colocarPuxador(p, cat, res, x, yIni, larg, altura, E.P, true, esq ? x + larg - 45 : x + 45)
    res.dobradicas.push([...ys])
    lados.push(esq ? 'esq' : 'dir')
  }
  Object.assign(res.medidas, { porta_larg: larg, porta_alt: altura, porta_y: yIni, porta_x0: x0, n_portas: n,
    dobradicas_por_porta: qtdDob, frente_largura: larg, frentes_altura: [altura], portas_lado: lados })

  const nprat = Math.max(0, Math.floor(p.prateleiras))
  const pratW = E.vao - fo.valor('prat_largura')
  const pratD = E.Dint - fo.valor('prat_recuo')
  if (nprat > 0 && pratD > 0) {
    const idp = addPeca(res, { nome: 'Prateleira', qtd: nprat * E.colunas, comp: r3(pratW), larg: r3(pratD), esp: e,
      material: p.estrutura_material, padrao: p.estrutura_padrao, fita_c: 1, fita_l: 0, veio: true, obs: '' })
    const livre = (E.Hi - nprat * e) / (nprat + 1)
    const pys: number[] = []
    for (let k = 1; k <= nprat; k++) {
      const y = E.ybase_int + k * livre + (k - 1) * e
      pys.push(y)
      for (let col = 0; col < E.colunas; col++) {
        const xc = E.col_x[col] + (E.vao - pratW) / 2
        B.push(bloco('Prateleira', 'prateleira', xc, y, E.z_front_inner - E.Dint, pratW, e, pratD, 'estrutura', 'x', idp))
      }
    }
    res.medidas.prateleiras_y = pys
    res.medidas.vao_prateleira = livre
  }

  const dob = C.dobradica(cat, p.dobradica)
  res.ferragens.push({ nome: dob.nome, qtd: n * qtdDob, unidade: 'un', categoria: 'dobradiça', detalhe: '' })
  const px = C.puxador(cat, p.puxador)
  if (px.tipo === 'cava_usinada') res.ferragens.push({ nome: 'Usinagem de cava', qtd: n, unidade: 'un', categoria: 'puxador', detalhe: '' })
  else if (px.tipo === 'perfil_cava') res.ferragens.push({ nome: px.nome, qtd: n, unidade: 'peça', categoria: 'puxador', detalhe: '' })
  else if (px.tipo !== 'toque') res.ferragens.push({ nome: px.nome, qtd: n, unidade: 'un', categoria: 'puxador', detalhe: '' })
  res.definicoes.push(`${qtdDob} dobradiças por porta; furo de caneco a 100 mm das pontas.`)
}

function posicoesDobradicas(altura: number, qtd: number): number[] {
  if (qtd === 1) return [altura / 2]
  const margem = 100
  const passo = (altura - 2 * margem) / (qtd - 1)
  return Array.from({ length: qtd }, (_, i) => margem + i * passo)
}
