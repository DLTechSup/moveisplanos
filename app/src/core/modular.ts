// Motor modular: um móvel de caixa (laterais, tampo, base, fundo) dividido em colunas, e cada coluna em seções
// (gavetas, portas ou vão aberto). Serve para guarda-roupas, cômodas, armários, estantes, racks, balcões…
import * as C from './catalogo'
import { Folgas } from './folgas'
import { fmtCm, fmtNum } from './formato'
import { addPeca, aviso, secaoPadrao } from './tipos'
import type { Bloco, Catalogo, Coluna, Cota, Projeto, Resultado, Secao } from './tipos'
import { bloco, blocosCaixa, blocosCorredica, colocarPuxador, distribuir, escolherCorredica, ferragemPuxador, numeroDobradicas,
  peca, pesosGavetas, posicoesDobradicas, r3 } from './comum'

interface SecInfo {
  sec: Secao; yTop: number; yBot: number; hi: number   // espaço interno
  fTop: number; fBot: number                           // extensão da frente
  frente: boolean
}

export interface Estrutura {
  L: number; H: number; Hm: number; P: number; e: number; f: number; fe: number; y0: number; rod: number; elev: number
  topo_lat: number; ytop_int: number; ybase_int: number; Hi: number
  z_lat0: number; zEnd: number; Dlat: number; Dint: number; frontZ0: number; z_fundo_face: number
  vaos: number[]; col_x: number[]; rasgo: boolean; r: number; s: number; dist: number
}

const normalizar = (cols: Coluna[]): Coluna[] => {
  const base = cols && cols.length ? cols : [{ largura: 0, secoes: [secaoPadrao('aberto')] }]
  return base.map(c => ({ largura: c.largura || 0, secoes: c.secoes && c.secoes.length ? c.secoes : [secaoPadrao('aberto')] }))
}

export function calcularModular(p: Projeto, cat: Catalogo, fo: Folgas, res: Resultado): void {
  const cols = normalizar(p.colunas)
  const nc = cols.length
  const correr = p.porta_correr >= 2
  const sobreposta = p.frente_tipo === 'sobrepostas' && !correr
  const E = estrutura(p, fo, res, cols, correr)
  const { e, fe } = E
  const g = fo.valor('entre_frentes')
  const c = fo.valor('contorno_embutida')
  const B = res.blocos
  const temFrente = (s: Secao) => s.tipo === 'gavetas' || (s.tipo === 'portas' && !correr)

  // ---- extensão horizontal das frentes de cada coluna ---------------------------------------------------------------------
  const frontX: [number, number][] = cols.map((_, k) => {
    if (sobreposta) {
      const xa = k === 0 ? 0 : E.col_x[k - 1] + E.vaos[k - 1] + e / 2 + g / 2
      const xb = k === nc - 1 ? E.L : E.col_x[k] + E.vaos[k] + e / 2 - g / 2
      return [xa, xb]
    }
    return [E.col_x[k] + c, E.col_x[k] + E.vaos[k] - c]
  })

  // ---- seções (alturas, extensões das frentes) ---------------------------------------------------------------------------
  const infos: SecInfo[][] = cols.map(col => {
    const n = col.secoes.length
    const total = E.Hi - (n - 1) * e
    const fixos = col.secoes.map(s => (s.altura > 0 ? s.altura * 10 : 0))
    let somaFix = fixos.reduce((a, b) => a + b, 0)
    const livres = fixos.filter(v => v <= 0).length
    if (somaFix > total - livres * 80 && somaFix > 0) {
      aviso(res, 'aviso', 'As alturas das seções somam mais que a altura interna: foram reduzidas proporcionalmente.')
      const f = (total - livres * 150) / somaFix
      for (let i = 0; i < fixos.length; i++) fixos[i] *= Math.max(f, 0.2)
      somaFix = fixos.reduce((a, b) => a + b, 0)
    }
    const livreH = livres ? Math.max(total - somaFix, 0) / livres : 0
    const hs = fixos.map(v => (v > 0 ? v : livreH))
    const out: SecInfo[] = []
    let y = E.ytop_int
    col.secoes.forEach((s, i) => {
      out.push({ sec: s, yTop: y, yBot: y - hs[i], hi: hs[i], fTop: 0, fBot: 0, frente: temFrente(s) })
      y -= hs[i] + e
    })
    out.forEach((inf, i) => {
      if (sobreposta) {
        const prev = out[i - 1], next = out[i + 1]
        inf.fTop = !prev ? E.topo_lat : prev.frente ? inf.yTop + e / 2 - g / 2 : prev.yBot
        inf.fBot = !next ? E.y0 + E.rod : next.frente ? next.yTop + e / 2 + g / 2 : next.yTop
      } else {
        inf.fTop = inf.yTop - c
        inf.fBot = inf.yBot + c
      }
    })
    return out
  })

  // ---- construção das seções ---------------------------------------------------------------------------------------------------
  let idxGaveta = 0, idxPorta = 0
  let totalGavetas = 0, totalPuxadores = 0, totalDob = 0, qtdVarao = 0, areaEspelho = 0, nPortas = 0
  const caixaInfo = { larg: 0, larg_int: 0, prof: 0, alts: [] as number[], comp_corredica: 0 }
  const vaosGaveta: number[] = []
  const frentesCol0: { y: number; h: number }[] = []
  const portaInfo: any = {}
  const dobradicaQtd = { v: 0 }
  const slotsCol: { y1: number; y2: number }[][] = cols.map(() => [])
  let corr: ReturnType<typeof escolherCorredica> | null = null
  const algumaGaveta = cols.some(cl => cl.secoes.some(s => s.tipo === 'gavetas'))
  if (algumaGaveta) corr = escolherCorredica(p, cat, fo, res, E.Dint)
  const algumaPorta = cols.some(cl => cl.secoes.some(s => s.tipo === 'portas')) && !correr

  cols.forEach((col, k) => {
    const vao = E.vaos[k]
    const [xa, xb] = frontX[k]
    infos[k].forEach((inf, si) => {
      const s = inf.sec
      const xCol = E.col_x[k]

      // --- gavetas ---
      if (s.tipo === 'gavetas' && corr) {
        const n = Math.max(1, Math.floor(s.n))
        const pesos = pesosGavetas(s.crescente, n)
        const fixos = (s.alturas || []).map(v => Number(v) * 10)
        const altF = distribuir(inf.fTop - inf.fBot - (n - 1) * g, n, pesos, fixos)
        const somaF = altF.reduce((a, b) => a + b, 0)
        const wFront = xb - xa
        const ec = p.caixa_esp
        const wCaixa = Math.floor(vao - 2 * corr.lat + 1e-6)
        const prof = corr.comp
        const { r, s: sb } = E
        let yF = inf.fTop, ySlot = inf.yTop
        for (let j = 0; j < n; j++) {
          const hf = altF[j]
          const slot = (hf * inf.hi) / somaF
          yF -= hf
          const yf = yF
          const ySlotBase = ySlot - slot
          ySlot = ySlotBase
          const topoCx = fo.valor('topo_caixa', { vao_gaveta: slot })
          const fundoCx = fo.valor('fundo_caixa')
          let altCx = Math.floor(Math.min(slot - topoCx - fundoCx, hf - 30) + 1e-6)
          altCx = Math.max(altCx, 1)
          vaosGaveta.push(slot)
          if (!caixaInfo.larg) { caixaInfo.larg = wCaixa; caixaInfo.larg_int = wCaixa - 2 * ec; caixaInfo.prof = prof; caixaInfo.comp_corredica = prof }
          caixaInfo.alts.push(altCx)
          if (vao < 200) aviso(res, 'aviso', 'Vão da gaveta com menos de 200 mm de largura.')
          if (altCx < 60) aviso(res, 'aviso', `Caixa de gaveta com altura menor que 60 mm (${altCx} mm).`)
          if (altCx < corr.cor.altura_min_caixa) aviso(res, 'aviso', `Caixa de gaveta abaixo da altura mínima da corrediça (${corr.cor.altura_min_caixa} mm).`)
          if (hf < 80) aviso(res, 'aviso', 'Frente de gaveta com altura menor que 80 mm.')
          const idFrente = addPeca(res, { nome: 'Frente de gaveta', qtd: 1, comp: r3(wFront), larg: r3(hf), esp: p.frente_esp,
            material: p.frente_material, padrao: p.frente_padrao, fita_c: 2, fita_l: 2, veio: true, obs: '' })
          const idLat = addPeca(res, { nome: 'Lateral da gaveta', qtd: 2, comp: prof, larg: altCx, esp: ec, material: p.caixa_material,
            padrao: p.caixa_padrao, fita_c: 1, fita_l: 0, veio: true, obs: '' })
          const idFt = addPeca(res, { nome: 'Frente/traseira da gaveta', qtd: 2, comp: wCaixa - 2 * ec, larg: altCx, esp: ec,
            material: p.caixa_material, padrao: p.caixa_padrao, fita_c: 1, fita_l: 0, veio: true, obs: '' })
          const wFundo = wCaixa - 2 * ec + 2 * (r - sb), pFundo = prof - 2 * ec + 2 * (r - sb)
          const idFd = addPeca(res, { nome: 'Fundo da gaveta', qtd: 1, comp: r3(wFundo), larg: r3(pFundo), esp: p.fundo_caixa_esp,
            material: p.fundo_caixa_material, padrao: p.fundo_padrao, fita_c: 0, fita_l: 0, veio: false, obs: 'em rasgo' })
          const gid = idxGaveta++
          B.push(bloco(`Frente ${gid + 1}`, 'frente', xa, yf, E.frontZ0, wFront, hf, fe, 'frente', 'x', idFrente, gid))
          colocarPuxador(p, cat, res, xa, yf, wFront, hf, E.frontZ0 + fe)
          totalPuxadores++
          const xC = xCol + (vao - wCaixa) / 2
          const yCx = ySlotBase + fundoCx
          B.push(...blocosCaixa(xC, yCx, E.frontZ0 - prof, wCaixa, altCx, prof, ec, r, sb, idLat, idFt, idFd, p.fundo_caixa_esp, gid))
          B.push(...blocosCorredica(corr.cor.tipo, xC, yCx, E.frontZ0, wCaixa, altCx, corr.lat, prof, gid))
          if (!res.caixa_modelo.length) {
            res.caixa_modelo = [...blocosCaixa(0, 0, 0, wCaixa, altCx, prof, ec, r, sb, idLat, idFt, idFd, p.fundo_caixa_esp, 0),
              ...blocosCorredica(corr.cor.tipo, 0, 0, prof, wCaixa, altCx, corr.lat, prof, 0)]
          }
          yF -= g
          totalGavetas++
        }
      }

      // --- portas ---
      if (s.tipo === 'portas' && !correr) {
        const wf = xb - xa
        const nDoors = s.portas > 0 ? Math.floor(s.portas) : Math.max(1, Math.ceil(wf / 600 - 1e-9))
        const larg = (wf - (nDoors - 1) * g) / nDoors
        const altura = inf.fTop - inf.fBot
        if (larg > 600) aviso(res, 'aviso', `Porta com ${fmtCm(larg)} cm de largura: acima de 60 cm pode empenar.`)
        if (altura > 2400) aviso(res, 'aviso', 'Porta com mais de 2,4 m de altura.')
        const qd = numeroDobradicas(altura)
        const ys = posicoesDobradicas(altura, qd)
        const id = addPeca(res, { nome: 'Porta', qtd: nDoors, comp: r3(altura), larg: r3(larg), esp: p.frente_esp,
          material: p.frente_material, padrao: p.frente_padrao, fita_c: 2, fita_l: 2, veio: true,
          obs: `${qd} dobradiças${s.espelho ? ' · espelho' : ''}` })
        for (let i = 0; i < nDoors; i++) {
          const x = xa + i * (larg + g)
          const esq = nDoors > 1 ? i < Math.floor((nDoors + 1) / 2) : k < nc / 2
          B.push(bloco(`Porta ${idxPorta + 1}`, 'porta', x, inf.fBot, E.frontZ0, larg, altura, fe, s.espelho ? 'espelho' : 'frente', 'y', id, idxPorta))
          colocarPuxador(p, cat, res, x, inf.fBot, larg, altura, E.frontZ0 + fe, true, esq ? x + larg - 45 : x + 45)
          res.dobradicas.push([...ys])
          if (!portaInfo.larg) Object.assign(portaInfo, { larg, alt: altura, lado: esq ? 'esq' : 'dir', dobradicas_por_porta: qd })
          totalDob += qd; totalPuxadores++; nPortas++
          if (s.espelho) areaEspelho += (larg * altura) / 1e6
          idxPorta++
        }
      }

      // --- conteúdo interno (prateleiras soltas e cabideiro) para portas / aberto ---
      if (s.tipo !== 'gavetas') {
        const visivel = s.tipo === 'aberto' && !correr
        const nprat = Math.max(0, Math.floor(s.prateleiras))
        const pratW = vao - fo.valor('prat_largura')
        const pratD = E.Dint - fo.valor('prat_recuo')
        if (nprat > 0 && pratD > 0) {
          const idp = addPeca(res, peca(p, 'Prateleira', 1, pratW, pratD, 1, 0))
          const livre = (inf.hi - nprat * e) / (nprat + 1)
          for (let j = 1; j <= nprat; j++) {
            const y = inf.yBot + j * livre + (j - 1) * e
            B.push(bloco('Prateleira', 'prateleira', E.col_x[k] + (vao - pratW) / 2, y, E.frontZ0 - E.Dint, pratW, e, pratD, 'estrutura', 'x', idp, -1, { aberto: visivel }))
          }
        }
        if (s.cabideiro) {
          const yr = inf.yTop - 95
          B.push(bloco('Varão cabideiro', 'cabideiro', E.col_x[k], yr, E.z_fundo_face + E.Dint / 2 - 15, vao, 30, 30, 'ferragem', 'x', 0, -1, { aberto: visivel }))
          qtdVarao++
          const livre = yr - inf.yBot
          if (livre < 800) aviso(res, 'aviso', `Cabideiro com apenas ${fmtCm(livre)} cm livres: roupa curta precisa de pelo menos 90 cm (vestidos longos, 140 cm).`)
        }
        if (visivel) res.abertos.push({ x: E.col_x[k], y: inf.yBot, w: vao, h: inf.hi })
      }

      // --- prateleira fixa (divisória horizontal) entre esta seção e a seguinte ---
      const next = infos[k][si + 1]
      if (next) {
        const idb = addPeca(res, peca(p, 'Prateleira fixa', 1, vao, E.Dint, 1, 0))
        const semFrente = !inf.frente && !next.frente
        B.push(bloco('Prateleira fixa', 'prateleira', E.col_x[k], next.yTop, E.frontZ0 - E.Dint, vao, e, E.Dint, 'estrutura', 'x', idb, -1,
          { aberto: !correr && (semFrente || !sobreposta) }))
      }
    })
  })

  // gavetas por coluna (cotas e totais) – quando não há gavetas, as listas ficam vazias
  // (os slots de cada coluna foram registrados na construção das gavetas)

  // ---- portas de correr ------------------------------------------------------------------------------------------------------
  if (correr) {
    const n = Math.floor(p.porta_correr)
    const sobre = 40
    const w = (E.L + (n - 1) * sobre) / n
    const yb = E.y0 + E.rod + 10
    const altura = E.topo_lat - yb - 10
    const qd = 0
    const id = addPeca(res, { nome: 'Porta de correr', qtd: n, comp: r3(altura), larg: r3(w), esp: p.frente_esp,
      material: p.frente_material, padrao: p.frente_padrao, fita_c: 2, fita_l: 2, veio: true, obs: 'trilho duplo' })
    const algumEsp = cols.some(cl => cl.secoes.some(s => s.espelho))
    for (let i = 0; i < n; i++) {
      const x = i * (w - sobre)
      const z = i % 2 === 0 ? E.P - fe : E.P - 2 * fe - 4
      B.push(bloco(`Porta de correr ${i + 1}`, 'porta', x, yb, z, w, altura, fe, algumEsp ? 'espelho' : 'frente', 'y', id, i))
      colocarPuxador(p, cat, res, x, yb, w, altura, z + fe, true, i === 0 ? x + w - 35 : x + 35)
      totalPuxadores++; nPortas++
      if (algumEsp) areaEspelho += (w * altura) / 1e6
    }
    if (n > 3 && E.L / n > 900) aviso(res, 'aviso', 'Portas de correr muito largas: considere mais portas.')
    res.ferragens.push({ nome: 'Trilho duplo para porta de correr', qtd: 1, unidade: 'jogo', categoria: 'porta de correr', detalhe: `${fmtCm(E.L)} cm`, chave: 'trilho_correr' })
    res.ferragens.push({ nome: 'Kit roldanas para porta de correr', qtd: n, unidade: 'kit', categoria: 'porta de correr', detalhe: '', chave: 'roldana_correr' })
    res.definicoes.push(`Portas de correr: ${n} portas em trilho duplo, com sobreposição de ${fmtCm(sobre)} cm entre elas.`)
    res.medidas.porta_correr = { n, larg: w, alt: altura }
    Object.assign(portaInfo, { larg: w, alt: altura, lado: 'esq', dobradicas_por_porta: 0 })
    void qd
  }

  // ---- ferragens ----------------------------------------------------------------------------------------------------------------
  if (corr) {
    res.ferragens.push({ nome: corr.cor.nome, qtd: totalGavetas, unidade: 'par', categoria: 'corrediça', detalhe: `${corr.comp} mm` })
    res.definicoes.push(`Caixa da gaveta: ${caixaInfo.larg} mm de largura (vão − 2 × ${fmtNum(corr.lat, 1)} mm de corrediça, arredondado para baixo).`)
    res.definicoes.push(`Corrediça: ${corr.comp} mm; profundidade útil ${fmtNum(E.Dint, 1)} mm.`)
  }
  if (nPortas && !correr && totalDob) {
    res.ferragens.push({ nome: C.dobradica(cat, p.dobradica).nome, qtd: totalDob, unidade: 'un', categoria: 'dobradiça', detalhe: '' })
    res.definicoes.push('Dobradiças: a 100 mm das pontas da porta, furo de caneco de 35 mm.')
  }
  ferragemPuxador(p, cat, res, totalPuxadores)
  if (qtdVarao) {
    res.ferragens.push({ nome: 'Varão oval para cabideiro', qtd: qtdVarao, unidade: 'un', categoria: 'cabideiro', detalhe: '', chave: 'varao' })
    res.ferragens.push({ nome: 'Suporte de varão', qtd: qtdVarao, unidade: 'par', categoria: 'cabideiro', detalhe: '', chave: 'suporte_varao' })
    res.definicoes.push('Cabideiro: varão oval a 9,5 cm abaixo da prateleira superior do vão.')
  }
  if (areaEspelho > 0) res.ferragens.push({ nome: 'Espelho 3 mm colado na porta', qtd: Math.round(areaEspelho * 100) / 100, unidade: 'm²', categoria: 'espelho', detalhe: '', chave: 'espelho' })
  if (E.elev > 0) {
    res.ferragens.push({ nome: 'Suporte para móvel suspenso', qtd: Math.max(1, Math.ceil(E.L / 800)), unidade: 'par', categoria: 'fixação', detalhe: '', chave: 'suporte_aereo' })
    res.definicoes.push(`Móvel suspenso a ${fmtCm(E.elev)} cm do chão (fixar com buchas adequadas à parede).`)
  }
  descricoes(p, cat, res, E, correr, sobreposta, !!corr, g, c)

  // ---- medidas e cotas --------------------------------------------------------------------------------------------------------------
  Object.assign(res.medidas, { L: E.L, H: E.H, Hm: E.Hm, P: E.P, e, y0: E.y0, rod: E.rod, Hi: E.Hi, vaos: E.vaos, vao: E.vaos[0],
    col_x: E.col_x, colunas: nc, Dlat: E.Dlat, Dint: E.Dint, topo_lat: E.topo_lat, ybase_int: E.ybase_int, ytop_int: E.ytop_int,
    z_lat0: E.z_lat0, zEnd: E.zEnd, elev: E.elev, vaos_gaveta: vaosGaveta, caixa: caixaInfo.larg ? caixaInfo : undefined,
    n_gavetas: totalGavetas, n_portas: nPortas, porta: portaInfo.larg ? portaInfo : undefined, sobreposta: sobreposta || correr, correr })
  if (algumaGaveta && corr) res.detalhe = 'caixa'
  else if (portaInfo.larg) res.detalhe = 'porta'
  void algumaPorta; void dobradicaQtd; void idxPorta
  res.vistas = ['frontal', 'lateral', 'interna', ...(algumaGaveta ? ['interna_gavetas' as const] : []), 'detalhe', '3d', 'explodida']
  cotasModular(res, E, cols, infos, frontX, sobreposta, correr, slotsCol, frentesCol0, g)
  conferencias(res, E, cols, infos, g, vaosGaveta)
}

// ---- estrutura ------------------------------------------------------------------------------------------------------------------------------
function estrutura(p: Projeto, fo: Folgas, res: Resultado, cols: Coluna[], correr: boolean): Estrutura {
  const L = p.largura * 10, Hm = p.altura * 10, P = p.profundidade * 10
  const elev = Math.max(0, p.elevacao) * 10
  const H = Hm + elev
  const e = p.estrutura_esp, f = p.fundo_esp, fe = p.frente_esp
  const rasgo = p.fundo_tipo === 'rasgo'
  const sobrepostas = p.frente_tipo === 'sobrepostas' && !correr
  const r = fo.valor('rasgo_prof'), s = fo.valor('rasgo_sobra'), dist = fo.valor('rasgo_dist')
  const pes = p.base_tipo === 'pes' || p.base_tipo === 'rodizios' ? p.base_altura * 10 : 0
  const y0 = pes + elev
  const rod = p.base_tipo === 'rodape' ? p.base_altura * 10 : 0
  const topo_lat = p.tampo === 'sobreposto' ? H - e : H
  const ytop_int = H - e
  const ybase_int = y0 + rod + e
  const Hi = ytop_int - ybase_int
  const z_lat0 = rasgo ? 0 : f
  const zEnd = correr ? P - (2 * fe + 8) : sobrepostas ? P - fe : P
  const frontZ0 = correr ? zEnd - fe : P - fe
  const Dlat = zEnd - z_lat0
  const z_fundo_face = z_lat0 + (rasgo ? dist + f : 0)
  const Dint = frontZ0 - z_fundo_face

  // larguras dos vãos
  const nc = cols.length
  const util = L - 2 * e - (nc - 1) * e
  const fixos = cols.map(c => (c.largura > 0 ? c.largura * 10 : 0))
  let somaFix = fixos.reduce((a, b) => a + b, 0)
  const nLivres = fixos.filter(v => v <= 0).length
  if (somaFix > util - nLivres * 100 && somaFix > 0) {
    aviso(res, 'aviso', 'Larguras das colunas ajustadas para caber na largura do móvel.')
    const fator = (util - nLivres * 200) / somaFix
    for (let i = 0; i < fixos.length; i++) fixos[i] *= Math.max(fator, 0.2)
    somaFix = fixos.reduce((a, b) => a + b, 0)
  } else if (nLivres === 0 && Math.abs(somaFix - util) > 0.5) {
    aviso(res, 'aviso', `Larguras das colunas somam ${fmtCm(somaFix)} cm e o espaço útil é ${fmtCm(util)} cm: ajustadas proporcionalmente.`)
    for (let i = 0; i < fixos.length; i++) fixos[i] *= util / somaFix
  }
  const livreW = nLivres ? Math.max(util - somaFix, 0) / nLivres : 0
  const vaos = fixos.map(v => (v > 0 ? v : livreW))
  const col_x: number[] = []
  let x = e
  for (const v of vaos) { col_x.push(x); x += v + e }

  const E: Estrutura = { L, H, Hm, P, e, f, fe, y0, rod, elev, topo_lat, ytop_int, ybase_int, Hi, z_lat0, zEnd, Dlat, Dint, frontZ0,
    z_fundo_face, vaos, col_x, rasgo, r, s, dist }
  const B = res.blocos

  if (p.tampo === 'sobreposto') {
    const id = addPeca(res, peca(p, 'Tampo', 1, L, P, 1, 2))
    B.push(bloco('Tampo', 'tampo', 0, H - e, 0, L, e, P, 'estrutura', 'x', id))
  } else {
    const id = addPeca(res, peca(p, 'Tampo', 1, L - 2 * e, Dlat, 1, 0))
    B.push(bloco('Tampo', 'tampo', e, H - e, z_lat0, L - 2 * e, e, Dlat, 'estrutura', 'x', id))
  }
  const alt_lat = topo_lat - y0
  let id = addPeca(res, peca(p, 'Lateral', 2, alt_lat, Dlat, 1, 0))
  B.push(bloco('Lateral esquerda', 'lateral', 0, y0, z_lat0, e, alt_lat, Dlat, 'estrutura', 'y', id))
  B.push(bloco('Lateral direita', 'lateral', L - e, y0, z_lat0, e, alt_lat, Dlat, 'estrutura', 'y', id))
  id = addPeca(res, peca(p, 'Base', 1, L - 2 * e, Dlat, 1, 0))
  B.push(bloco('Base', 'base', e, y0 + rod, z_lat0, L - 2 * e, e, Dlat, 'estrutura', 'x', id))

  if (rod > 0) {
    const recuo = fo.valor('recuo_rodape')
    let z2 = P - recuo, z1 = z2 - e
    if (z1 < z_lat0) { aviso(res, 'aviso', 'Recuo do rodapé grande demais: o rodapé ultrapassa a traseira.'); z1 = z_lat0; z2 = z_lat0 + e }
    id = addPeca(res, peca(p, 'Rodapé', 1, L - 2 * e, rod, 1, 0))
    B.push(bloco('Rodapé', 'rodape', e, y0, z1, L - 2 * e, rod, e, 'estrutura', 'x', id))
  }
  if (pes > 0) {
    const n = L > 1200 ? 6 : 4
    const tam = 40
    const xs = [20, L - 20 - tam]
    if (n === 6) xs.splice(1, 0, (L - tam) / 2)
    const zs = [z_lat0 + 20, z_lat0 + Dlat - 20 - tam]
    const grupo = p.base_tipo === 'pes' ? 'pe' : 'rodizio'
    for (const z of zs) for (const xx of xs) B.push(bloco(grupo === 'pe' ? 'Pé' : 'Rodízio', grupo, xx, elev, z, tam, pes, tam, 'ferragem'))
    res.ferragens.push({ nome: grupo === 'pe' ? 'Pé regulável' : 'Rodízio com trava', qtd: n, unidade: 'un', categoria: 'base',
      detalhe: `altura ${fmtCm(pes)} cm`, chave: grupo })
  }
  if (nc > 1) {
    const z1 = z_fundo_face
    const larg_div = z_lat0 + Dlat - z1
    id = addPeca(res, peca(p, 'Divisória', nc - 1, Hi, larg_div, 1, 0))
    for (let k = 0; k < nc - 1; k++) {
      B.push(bloco(`Divisória ${k + 1}`, 'divisoria', col_x[k] + vaos[k], ybase_int, z1, e, Hi, larg_div, 'estrutura', 'y', id))
    }
  }
  if (rasgo) {
    const w = L - 2 * e + 2 * (r - s), h = Hi + 2 * (r - s)
    id = addPeca(res, peca(p, 'Fundo do móvel', 1, w, h, 0, 0, false, { esp: f, material: p.fundo_material, padrao: p.fundo_padrao, obs: 'em rasgo' }))
    B.push(bloco('Fundo', 'fundo', e - (r - s), ybase_int - (r - s), dist, w, h, f, 'fundo', '', id))
  } else {
    const w = L - 2, h = alt_lat - 2
    id = addPeca(res, peca(p, 'Fundo do móvel', 1, w, h, 0, 0, false, { esp: f, material: p.fundo_material, padrao: p.fundo_padrao, obs: 'pregado' }))
    B.push(bloco('Fundo', 'fundo', 1, y0 + 1, 0, w, h, f, 'fundo', '', id))
  }
  return E
}

// ---- textos (definições e conferências) ---------------------------------------------------------------------------------------------------------
function descricoes(p: Projeto, cat: Catalogo, res: Resultado, E: Estrutura, correr: boolean, sobreposta: boolean, temGaveta: boolean,
  g: number, c: number): void {
  const px = C.puxador(cat, p.puxador)
  const D: string[] = []
  const ptxt: Record<string, string> = {
    barra: `barra ${px.entre_furos} mm entre furos`, cava_usinada: 'cava usinada no topo da frente (não altera medidas)',
    perfil_cava: 'perfil cava embutido no topo da frente', botao: 'botão', concha: `concha ${px.entre_furos} mm`, toque: 'sem puxador (abertura por toque)',
  }
  D.push(`Puxador: ${px.tipo === 'toque' ? ptxt.toque : `${px.nome} — ${ptxt[px.tipo] ?? px.nome}`}.`)
  if (correr) D.push('Frentes: portas de correr à frente do móvel; gavetas internas ficam recuadas atrás das portas.')
  else if (sobreposta) D.push(`Frentes: sobrepostas, cobrindo a borda das laterais. Folga de ${fmtCm(g)} cm entre frentes.`)
  else D.push(`Frentes: embutidas no vão, com folga de ${fmtCm(c)} cm no contorno e ${fmtCm(g)} cm entre frentes.`)
  D.push(`Tampo: ${p.tampo === 'sobreposto' ? `sobreposto às laterais (${fmtCm(E.e)} cm por cima)` : 'encaixado entre as laterais'}.`)
  if (p.base_tipo === 'rodape') D.push(`Rodapé: ${fmtCm(E.rod)} cm de altura, recuado ${fmtCm(res.folgas.recuo_rodape?.valor ?? 30)} cm da frente.`)
  else if (p.base_tipo === 'pes') D.push(`Pés: ${fmtCm(E.y0 - E.elev)} cm de altura (reguláveis).`)
  else if (p.base_tipo === 'rodizios') D.push(`Rodízios com trava: ${fmtCm(E.y0 - E.elev)} cm de altura.`)
  const rr = fmtCm(E.r), dd = fmtCm(E.dist)
  D.push(E.rasgo ? `Fundo do móvel: ${p.fundo_material} ${p.fundo_esp} mm em rasgo de ${rr} cm, a ${dd} cm da traseira, nas laterais, tampo e base.`
    : `Fundo do móvel: ${p.fundo_material} ${p.fundo_esp} mm pregado atrás.`)
  if (temGaveta) D.push(`Fundo da gaveta: ${p.fundo_caixa_material} ${p.fundo_caixa_esp} mm em rasgo de ${rr} cm.`)
  D.push(`Fita de borda: ${C.fita(cat, p.fita).nome} nas bordas visíveis.`)
  res.definicoes.unshift(...D)
}

function conferencias(res: Resultado, E: Estrutura, cols: Coluna[], infos: SecInfo[][], g: number, vaosGaveta: number[]): void {
  const base = E.y0 - E.elev + E.rod
  const baseTxt = E.rod ? `rodapé ${fmtCm(E.rod)}` : base ? `pés ${fmtCm(base)}` : ''
  res.conferencias.push(`Altura: ${baseTxt ? baseTxt + ' + ' : ''}base ${fmtCm(E.e)} + vão ${fmtCm(E.Hi)} + tampo ${fmtCm(E.e)} = ${fmtCm(E.Hm)} cm`)
  const nc = cols.length
  const vaosTxt = E.vaos.map(v => fmtCm(v)).join(' + ')
  res.conferencias.push(`Largura: 2 laterais de ${fmtCm(E.e)}${nc > 1 ? ` + ${nc - 1} divisória(s) de ${fmtCm(E.e)}` : ''} + vãos ${vaosTxt} = ${fmtCm(E.L)} cm`)
  const gav = infos[0].find(i => i.sec.tipo === 'gavetas')
  if (gav) {
    const n = Math.max(1, Math.floor(gav.sec.n))
    const total = gav.fTop - gav.fBot
    const h = (total - (n - 1) * g) / n
    if (!gav.sec.crescente && !(gav.sec.alturas || []).some(v => v > 0)) {
      res.conferencias.push(`Frentes: ${n} × ${fmtCm(h)} + ${n - 1} folgas de ${fmtCm(g)} = ${fmtCm(total)} cm`)
    }
  }
  void vaosGaveta
}

// ---- cotas -------------------------------------------------------------------------------------------------------------------------------------------
function cotasModular(res: Resultado, E: Estrutura, cols: Coluna[], infos: SecInfo[][], frontX: [number, number][], sobreposta: boolean,
  correr: boolean, slotsCol: { y1: number; y2: number }[][], frentesCol0: { y: number; h: number }[], g: number): void {
  const nc = cols.length
  const F: Cota[] = []
  // largura: nível 1 = frentes (portas ou coluna), nível 2 = total
  if (correr) {
    const pc = res.medidas.porta_correr
    if (pc) { const passo = pc.larg - 40; for (let i = 0; i < pc.n; i++) F.push({ t: 'h', a: i * passo, b: i * passo + pc.larg, nivel: 1, lado: true }) }
  } else {
    cols.forEach((_, k) => {
      const porta = res.blocos.filter(b => b.grupo === 'porta' && b.x >= frontX[k][0] - 1 && b.x + b.dx <= frontX[k][1] + 1)
      const topos = porta.length ? porta.filter(b => Math.abs(b.y - porta[0].y) < 1) : []
      if (topos.length > 1) topos.forEach(b => F.push({ t: 'h', a: b.x, b: b.x + b.dx, nivel: 1, lado: true }))
      else F.push({ t: 'h', a: frontX[k][0], b: frontX[k][1], nivel: 1, lado: true })
    })
  }
  F.push({ t: 'h', a: 0, b: E.L, nivel: 2, lado: true })
  // alturas à esquerda (coluna 1)
  const col0 = infos[0]
  if (correr) {
    const pc = res.medidas.porta_correr
    if (pc) F.push({ t: 'v', a: E.y0 + E.rod + 10, b: E.y0 + E.rod + 10 + pc.alt, nivel: 1, lado: true })
  } else {
    col0.forEach(inf => {
      if (inf.sec.tipo === 'gavetas') {
        const n = Math.max(1, Math.floor(inf.sec.n))
        const fs = res.blocos.filter(b => b.grupo === 'frente' && b.x >= frontX[0][0] - 1 && b.x < frontX[0][0] + 5 && b.y >= inf.fBot - 1 && b.y + b.dy <= inf.fTop + 1)
        fs.forEach(b => F.push({ t: 'v', a: b.y, b: b.y + b.dy, nivel: 1, lado: true }))
        void n
      } else if (inf.sec.tipo === 'portas') F.push({ t: 'v', a: inf.fBot, b: inf.fTop, nivel: 1, lado: true })
      else F.push({ t: 'v', a: inf.yBot, b: inf.yTop, nivel: 1, lado: true })
    })
  }
  F.push({ t: 'v', a: E.elev, b: E.H, nivel: 2, lado: true })
  const baseH = E.y0 - E.elev + E.rod
  if (E.elev > 0) F.push({ t: 'v', a: 0, b: E.elev, nivel: 1, lado: false, texto: fmtCm(E.elev) })
  else if (baseH > 0) F.push({ t: 'v', a: 0, b: baseH, nivel: 1, lado: false })
  F.push({ t: 'v', a: 0, b: E.H, nivel: E.elev > 0 || baseH > 0 ? 2 : 1, lado: false })
  res.cotas.frontal = F

  // lateral
  const Lt: Cota[] = [{ t: 'h', a: E.z_lat0, b: E.z_lat0 + E.Dlat, nivel: 1, lado: true }, { t: 'h', a: 0, b: E.P, nivel: 2, lado: true },
    { t: 'v', a: 0, b: E.H, nivel: 1, lado: false }]
  if (E.elev > 0) Lt.push({ t: 'v', a: 0, b: E.elev, nivel: 1, lado: true })
  else if (baseH > 0) Lt.push({ t: 'v', a: 0, b: baseH, nivel: 1, lado: true })
  res.cotas.lateral = Lt

  // interna (com e sem gavetas)
  const I: Cota[] = []
  cols.forEach((_, k) => I.push({ t: 'h', a: E.col_x[k], b: E.col_x[k] + E.vaos[k], nivel: 1, lado: true }))
  const I2 = [...I]
  const temCaixa = !!res.medidas.caixa
  I.push({ t: 'h', a: 0, b: E.L, nivel: 2, lado: true })
  if (temCaixa) {
    // caixas: uma cota por coluna que tenha gavetas
    cols.forEach((cl, k) => {
      if (cl.secoes.some(s => s.tipo === 'gavetas')) {
        const w = res.medidas.caixa.larg
        const xc = E.col_x[k] + (E.vaos[k] - w) / 2
        I2.push({ t: 'h', a: xc, b: xc + w, nivel: 2, lado: true })
      }
    })
    I2.push({ t: 'h', a: 0, b: E.L, nivel: 3, lado: true })
  } else I2.push({ t: 'h', a: 0, b: E.L, nivel: 2, lado: true })
  const alturas: Cota[] = []
  infos[0].forEach(inf => {
    if (inf.sec.tipo === 'gavetas') {
      const n = Math.max(1, Math.floor(inf.sec.n))
      const fixos = (inf.sec.alturas || []).map(v => v * 10)
      const pesos = pesosGavetas(inf.sec.crescente, n)
      const total = inf.fTop - inf.fBot - (n - 1) * g
      const altF = distribuir(total, n, pesos, fixos)
      const soma = altF.reduce((a, b) => a + b, 0)
      let y = inf.yTop
      altF.forEach(hf => { const s = (hf * inf.hi) / soma; alturas.push({ t: 'v', a: y - s, b: y, nivel: 1, lado: true, ref: 0 }); y -= s })
    } else alturas.push({ t: 'v', a: inf.yBot, b: inf.yTop, nivel: 1, lado: true, ref: 0 })
  })
  const resto: Cota[] = [{ t: 'v', a: E.ybase_int, b: E.ytop_int, nivel: 2, lado: true }, { t: 'v', a: E.elev, b: E.H, nivel: 1, lado: false }]
  res.cotas.interna = [...I, ...alturas, ...resto]
  res.cotas.interna_gavetas = [...I2, ...alturas, ...resto]
  void nc; void slotsCol; void frentesCol0
}
