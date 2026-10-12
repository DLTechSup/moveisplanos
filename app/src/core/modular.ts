// Motor modular: um móvel de caixa (laterais, tampo, base, fundo) cujo espaço interno é dividido em vãos por um layout
// em árvore (lado a lado / um sobre o outro). Cada vão é gavetas, portas ou aberto (prateleiras e cabideiro).
// Serve para guarda-roupas, cômodas, armários, estantes, racks, balcões…
import * as C from './catalogo'
import { Folgas } from './folgas'
import { fmtCm, fmtNum } from './formato'
import { contem, folhasDe, repartir, resolver } from './layout'
import type { DivisorR, FolhaR } from './layout'
import { addPeca, aviso, secaoPadrao } from './tipos'
import type { Bloco, Catalogo, Cota, DivisorInfo, FolhaInfo, ItemMedida, No, Projeto, Regiao, Resultado, Secao } from './tipos'
import { ehDivisao } from './tipos'
import { bloco, blocosCaixa, blocosCorredica, colocarPuxador, distribuir, escolherCorredica, ferragemPuxador, numeroDobradicas,
  peca, pesosGavetas, posicoesDobradicas, r3 } from './comum'

export interface Estrutura {
  L: number; H: number; Hm: number; P: number; e: number; f: number; fe: number; y0: number; rod: number; elev: number
  topo_lat: number; ytop_int: number; ybase_int: number; Hi: number
  z_lat0: number; zEnd: number; Dlat: number; Dint: number; frontZ0: number; z_fundo_face: number
  rasgo: boolean; r: number; s: number; dist: number
}

const layoutValido = (l: No | undefined): No => (l ? l : secaoPadrao('aberto'))

export function calcularModular(p: Projeto, cat: Catalogo, fo: Folgas, res: Resultado): void {
  const correr = p.porta_correr >= 2
  const sobreposta = p.frente_tipo === 'sobrepostas' && !correr
  const E = estrutura(p, fo, res, correr)
  const { e, fe } = E
  const g = fo.valor('entre_frentes')
  const c = fo.valor('contorno_embutida')
  const B = res.blocos
  const temFrente = (s: Secao) => s.tipo === 'gavetas' || (s.tipo === 'portas' && !correr)

  // ---- retângulos dos vãos e tábuas entre eles ------------------------------------------------------------------------------
  const interior: Regiao = { x: e, y: E.ybase_int, w: E.L - 2 * e, h: E.Hi }
  const avisosLayout: { nivel: 'erro' | 'aviso'; texto: string }[] = []
  const raiz = layoutValido(p.layout)
  const R = resolver(raiz, interior, e, avisosLayout)
  for (const a of avisosLayout) aviso(res, a.nivel, a.texto)
  const folhas = R.folhas

  const folhaEm = (x: number, y: number): FolhaR | undefined => folhas.find(f => contem(f.rect, x, y, 0.5))
  const tem = (f: FolhaR | undefined) => !!f && temFrente(f.no)

  // ---- extensão das frentes de cada vão (sobrepostas: até o meio das tábuas; senão: dentro do vão) -------------------------------
  const frentes = new Map<FolhaR, Regiao>()
  for (const f of folhas) {
    const r = f.rect
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2
    let xa: number, xb: number, ya: number, yb: number
    if (sobreposta) {
      xa = r.x <= e + 0.5 ? 0 : (() => { const n = folhaEm(r.x - e - 1, cy); return tem(n) ? r.x - e / 2 + g / 2 : r.x - e })()
      xb = r.x + r.w >= E.L - e - 0.5 ? E.L : (() => { const n = folhaEm(r.x + r.w + e + 1, cy); return tem(n) ? r.x + r.w + e / 2 - g / 2 : r.x + r.w + e })()
      yb = r.y + r.h >= E.ytop_int - 0.5 ? E.topo_lat : (() => { const n = folhaEm(cx, r.y + r.h + e + 1); return tem(n) ? r.y + r.h + e / 2 - g / 2 : r.y + r.h + e })()
      ya = r.y <= E.ybase_int + 0.5 ? E.y0 + E.rod : (() => { const n = folhaEm(cx, r.y - e - 1); return tem(n) ? r.y - e / 2 + g / 2 : r.y - e })()
    } else {
      xa = r.x + c; xb = r.x + r.w - c; ya = r.y + c; yb = r.y + r.h - c
    }
    frentes.set(f, { x: xa, y: ya, w: xb - xa, h: yb - ya })
  }

  // ---- tábuas: divisórias verticais e prateleiras fixas ---------------------------------------------------------------------------------
  const infoDiv: DivisorInfo[] = []
  const larg_div = E.zEnd - E.z_fundo_face
  for (const d of R.divisores) {
    infoDiv.push({ caminho: d.caminho, indice: d.indice, dir: d.dir, rect: d.rect, pai: d.pai })
    if (d.dir === 'v') {
      const id = addPeca(res, peca(p, 'Divisória', 1, d.rect.h, larg_div, 1, 0))
      B.push(bloco('Divisória', 'divisoria', d.rect.x, d.rect.y, E.z_fundo_face, e, d.rect.h, larg_div, 'estrutura', 'y', id))
    } else {
      const id = addPeca(res, peca(p, 'Prateleira fixa', 1, d.rect.w, E.Dint, 1, 0))
      const acima = folhaEm(d.rect.x + d.rect.w / 2, d.rect.y + e + 1), abaixo = folhaEm(d.rect.x + d.rect.w / 2, d.rect.y - 1)
      const semFrente = !tem(acima) && !tem(abaixo)
      B.push(bloco('Prateleira fixa', 'prateleira', d.rect.x, d.rect.y, E.frontZ0 - E.Dint, d.rect.w, e, E.Dint, 'estrutura', 'x', id, -1,
        { aberto: !correr && (semFrente || !sobreposta) }))
    }
  }

  // ---- construção de cada vão ------------------------------------------------------------------------------------------------------------------
  let idxGaveta = 0, idxPorta = 0
  let totalGavetas = 0, totalPuxadores = 0, totalDob = 0, qtdVarao = 0, areaEspelho = 0, nPortas = 0
  const caixaInfo = { larg: 0, larg_int: 0, prof: 0, alts: [] as number[], comp_corredica: 0 }
  const vaosGaveta: number[] = []
  const portaInfo: any = {}
  const algumaGaveta = folhas.some(f => f.no.tipo === 'gavetas')
  const corr = algumaGaveta ? escolherCorredica(p, cat, fo, res, E.Dint) : null
  const infos: FolhaInfo[] = []
  const mm = (v: number) => v

  for (const f of folhas) {
    const s = f.no
    const r = f.rect
    const fr = frentes.get(f)!
    const info: FolhaInfo = { caminho: f.caminho, tipo: s.tipo, rect: r, frente: temFrente(s) ? fr : null, itens: [], n: 0, slots: [] }
    infos.push(info)
    const vao = r.w
    const itens = info.itens
    const add = (rotulo: string, qtd: number, w: number, h: number, d: number) => itens.push({ rotulo, qtd, w: mm(w), h: mm(h), d: mm(d) })

    // --- gavetas ---
    if (s.tipo === 'gavetas' && corr) {
      const n = Math.max(1, Math.floor(s.n))
      info.n = n
      const pesos = pesosGavetas(s.crescente, n)
      const fixos = (s.alturas || []).map(v => Number(v) * 10)
      const altF = distribuir(fr.h - (n - 1) * g, n, pesos, fixos)
      const somaF = altF.reduce((a, b) => a + b, 0)
      const ec = p.caixa_esp
      const wCaixa = Math.floor(vao - 2 * corr.lat + 1e-6)
      const prof = corr.comp
      const { r: rr, s: sb } = E
      let yF = fr.y + fr.h, ySlot = r.y + r.h
      for (let j = 0; j < n; j++) {
        const hf = altF[j]
        const slot = (hf * r.h) / somaF
        yF -= hf
        const yf = yF
        const ySlotBase = ySlot - slot
        ySlot = ySlotBase
        const topoCx = fo.valor('topo_caixa', { vao_gaveta: slot })
        const fundoCx = fo.valor('fundo_caixa')
        const altCx = Math.max(1, Math.floor(Math.min(slot - topoCx - fundoCx, hf - 30) + 1e-6))
        vaosGaveta.push(slot)
        info.slots.push({ y1: ySlotBase, y2: ySlotBase + slot })
        if (!caixaInfo.larg) { caixaInfo.larg = wCaixa; caixaInfo.larg_int = wCaixa - 2 * ec; caixaInfo.prof = prof; caixaInfo.comp_corredica = prof }
        caixaInfo.alts.push(altCx)
        if (vao < 200) aviso(res, 'aviso', 'Vão de gaveta com menos de 200 mm de largura.')
        if (altCx < 60) aviso(res, 'aviso', `Caixa de gaveta com altura menor que 60 mm (${altCx} mm).`)
        if (altCx < corr.cor.altura_min_caixa) aviso(res, 'aviso', `Caixa de gaveta abaixo da altura mínima da corrediça (${corr.cor.altura_min_caixa} mm).`)
        if (hf < 80) aviso(res, 'aviso', 'Frente de gaveta com altura menor que 80 mm.')
        const idFrente = addPeca(res, { nome: 'Frente de gaveta', qtd: 1, comp: r3(fr.w), larg: r3(hf), esp: p.frente_esp, material: p.frente_material,
          padrao: p.frente_padrao, fita_c: 2, fita_l: 2, veio: true, obs: '' })
        const idLat = addPeca(res, { nome: 'Lateral da gaveta', qtd: 2, comp: prof, larg: altCx, esp: ec, material: p.caixa_material, padrao: p.caixa_padrao, fita_c: 1, fita_l: 0, veio: true, obs: '' })
        const idFt = addPeca(res, { nome: 'Frente/traseira da gaveta', qtd: 2, comp: wCaixa - 2 * ec, larg: altCx, esp: ec, material: p.caixa_material, padrao: p.caixa_padrao, fita_c: 1, fita_l: 0, veio: true, obs: '' })
        const wFundo = wCaixa - 2 * ec + 2 * (rr - sb), pFundo = prof - 2 * ec + 2 * (rr - sb)
        const idFd = addPeca(res, { nome: 'Fundo da gaveta', qtd: 1, comp: r3(wFundo), larg: r3(pFundo), esp: p.fundo_caixa_esp, material: p.fundo_caixa_material,
          padrao: p.fundo_padrao, fita_c: 0, fita_l: 0, veio: false, obs: 'em rasgo' })
        const gid = idxGaveta++
        B.push(bloco(`Frente ${gid + 1}`, 'frente', fr.x, yf, E.frontZ0, fr.w, hf, fe, 'frente', 'x', idFrente, gid))
        colocarPuxador(p, cat, res, fr.x, yf, fr.w, hf, E.frontZ0 + fe)
        totalPuxadores++
        const xC = r.x + (vao - wCaixa) / 2
        const yCx = ySlotBase + fundoCx
        B.push(...blocosCaixa(xC, yCx, E.frontZ0 - prof, wCaixa, altCx, prof, ec, rr, sb, idLat, idFt, idFd, p.fundo_caixa_esp, gid))
        B.push(...blocosCorredica(corr.cor.tipo, xC, yCx, E.frontZ0, wCaixa, altCx, corr.lat, prof, gid))
        if (!res.caixa_modelo.length) {
          res.caixa_modelo = [...blocosCaixa(0, 0, 0, wCaixa, altCx, prof, ec, rr, sb, idLat, idFt, idFd, p.fundo_caixa_esp, 0),
            ...blocosCorredica(corr.cor.tipo, 0, 0, prof, wCaixa, altCx, corr.lat, prof, 0)]
        }
        add(`Frente da gaveta ${j + 1}`, 1, fr.w, hf, fe)
        add(`Caixa da gaveta ${j + 1} (externa)`, 1, wCaixa, altCx, prof)
        yF -= g
        totalGavetas++
      }
    }

    // --- portas ---
    if (s.tipo === 'portas' && !correr) {
      const wf = fr.w
      const nDoors = s.portas > 0 ? Math.floor(s.portas) : Math.max(1, Math.ceil(wf / 600 - 1e-9))
      info.n = nDoors
      const larg = (wf - (nDoors - 1) * g) / nDoors
      const altura = fr.h
      if (larg > 600) aviso(res, 'aviso', `Porta com ${fmtCm(larg)} cm de largura: acima de 60 cm pode empenar.`)
      if (altura > 2400) aviso(res, 'aviso', 'Porta com mais de 2,4 m de altura.')
      const qd = numeroDobradicas(altura)
      const ys = posicoesDobradicas(altura, qd)
      const id = addPeca(res, { nome: 'Porta', qtd: nDoors, comp: r3(altura), larg: r3(larg), esp: p.frente_esp, material: p.frente_material,
        padrao: p.frente_padrao, fita_c: 2, fita_l: 2, veio: true, obs: `${qd} dobradiças${s.espelho ? ' · espelho' : ''}` })
      const colIdx = folhas.indexOf(f)
      for (let i = 0; i < nDoors; i++) {
        const x = fr.x + i * (larg + g)
        const esq = nDoors > 1 ? i < Math.floor((nDoors + 1) / 2) : (r.x + r.w / 2) < E.L / 2
        B.push(bloco(`Porta ${idxPorta + 1}`, 'porta', x, fr.y, E.frontZ0, larg, altura, fe, s.espelho ? 'espelho' : 'frente', 'y', id, idxPorta))
        colocarPuxador(p, cat, res, x, fr.y, larg, altura, E.frontZ0 + fe, true, esq ? x + larg - 45 : x + 45)
        res.dobradicas.push([...ys])
        if (!portaInfo.larg) Object.assign(portaInfo, { larg, alt: altura, lado: esq ? 'esq' : 'dir', dobradicas_por_porta: qd })
        totalDob += qd; totalPuxadores++; nPortas++
        if (s.espelho) areaEspelho += (larg * altura) / 1e6
        idxPorta++
      }
      void colIdx
      add(s.espelho ? 'Porta com espelho' : 'Porta', nDoors, larg, altura, fe)
    }

    // --- prateleiras soltas e cabideiro (portas / aberto) ---
    if (s.tipo !== 'gavetas') {
      const visivel = s.tipo === 'aberto' && !correr
      const nprat = Math.max(0, Math.floor(s.prateleiras))
      const pratW = vao - fo.valor('prat_largura')
      const pratD = E.Dint - fo.valor('prat_recuo')
      if (nprat > 0 && pratD > 0) {
        const idp = addPeca(res, peca(p, 'Prateleira', 1, pratW, pratD, 1, 0))
        const livre = (r.h - nprat * e) / (nprat + 1)
        for (let j = 1; j <= nprat; j++) {
          const y = r.y + j * livre + (j - 1) * e
          B.push(bloco('Prateleira', 'prateleira', r.x + (vao - pratW) / 2, y, E.frontZ0 - E.Dint, pratW, e, pratD, 'estrutura', 'x', idp, -1, { aberto: visivel }))
        }
        add('Prateleira solta', nprat, pratW, e, pratD)
      }
      if (s.cabideiro) {
        const yr = r.y + r.h - 95
        B.push(bloco('Varão cabideiro', 'cabideiro', r.x, yr, E.z_fundo_face + E.Dint / 2 - 15, vao, 30, 30, 'ferragem', 'x', 0, -1, { aberto: visivel }))
        qtdVarao++
        const livre = yr - r.y
        add('Varão do cabideiro', 1, vao, 30, 30)
        if (livre < 800) aviso(res, 'aviso', `Cabideiro com apenas ${fmtCm(livre)} cm livres: roupa curta precisa de pelo menos 90 cm (vestidos longos, 140 cm).`)
      }
      if (visivel) res.abertos.push({ x: r.x, y: r.y, w: r.w, h: r.h })
    }
  }

  // ---- portas de correr ---------------------------------------------------------------------------------------------------------------------------
  if (correr) {
    const n = Math.floor(p.porta_correr)
    const sobre = 40
    const w = (E.L + (n - 1) * sobre) / n
    const yb = E.y0 + E.rod + 10
    const altura = E.topo_lat - yb - 10
    const id = addPeca(res, { nome: 'Porta de correr', qtd: n, comp: r3(altura), larg: r3(w), esp: p.frente_esp, material: p.frente_material,
      padrao: p.frente_padrao, fita_c: 2, fita_l: 2, veio: true, obs: 'trilho duplo' })
    const algumEsp = folhas.some(f => f.no.espelho)
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
  }

  // ---- ferragens ----------------------------------------------------------------------------------------------------------------------------------------
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

  // ---- medidas ------------------------------------------------------------------------------------------------------------------------------------------------
  const yMin = Math.min(...folhas.map(f => f.rect.y))
  const baixo = folhas.filter(f => Math.abs(f.rect.y - yMin) < 1).sort((a, b) => a.rect.x - b.rect.x)
  const vaos = baixo.map(f => f.rect.w)
  Object.assign(res.medidas, { L: E.L, H: E.H, Hm: E.Hm, P: E.P, e, y0: E.y0, rod: E.rod, Hi: E.Hi, vaos, vao: vaos[0], colunas: vaos.length,
    Dlat: E.Dlat, Dint: E.Dint, topo_lat: E.topo_lat, ybase_int: E.ybase_int, ytop_int: E.ytop_int, z_lat0: E.z_lat0, zEnd: E.zEnd, elev: E.elev,
    vaos_gaveta: vaosGaveta, caixa: caixaInfo.larg ? caixaInfo : undefined, n_gavetas: totalGavetas, n_portas: nPortas,
    porta: portaInfo.larg ? portaInfo : undefined, sobreposta: sobreposta || correr, correr, n_folhas: folhas.length,
    largura_util: E.L - 2 * e, frente_esp: fe })
  res.layout = { folhas: infos, divisores: infoDiv, interior }
  if (algumaGaveta && corr) res.detalhe = 'caixa'
  else if (portaInfo.larg) res.detalhe = 'porta'
  res.vistas = ['frontal', 'lateral', 'interna', ...(algumaGaveta ? ['interna_gavetas' as const] : []), 'detalhe', '3d', 'explodida']
  cotasModular(res, E, infos, correr, g)
  conferencias(res, E, infos, g)
  void idxPorta
}

// ---- estrutura (tampo, laterais, base, rodapé/pés, fundo) --------------------------------------------------------------------------------------------------
function estrutura(p: Projeto, fo: Folgas, res: Resultado, correr: boolean): Estrutura {
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
  const E: Estrutura = { L, H, Hm, P, e, f, fe, y0, rod, elev, topo_lat, ytop_int, ybase_int, Hi, z_lat0, zEnd, Dlat, Dint, frontZ0, z_fundo_face, rasgo, r, s, dist }
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
    res.ferragens.push({ nome: grupo === 'pe' ? 'Pé regulável' : 'Rodízio com trava', qtd: n, unidade: 'un', categoria: 'base', detalhe: `altura ${fmtCm(pes)} cm`, chave: grupo })
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

// ---- textos (definições e conferências) ---------------------------------------------------------------------------------------------------------------------------
function descricoes(p: Projeto, cat: Catalogo, res: Resultado, E: Estrutura, correr: boolean, sobreposta: boolean, temGaveta: boolean, g: number, c: number): void {
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

function folhasDaLinhaDeBaixo(infos: FolhaInfo[]): FolhaInfo[] {
  const yMin = Math.min(...infos.map(f => f.rect.y))
  return infos.filter(f => Math.abs(f.rect.y - yMin) < 1).sort((a, b) => a.rect.x - b.rect.x)
}

function conferencias(res: Resultado, E: Estrutura, infos: FolhaInfo[], g: number): void {
  const base = E.y0 - E.elev + E.rod
  const baseTxt = E.rod ? `rodapé ${fmtCm(E.rod)}` : base ? `pés ${fmtCm(base)}` : ''
  res.conferencias.push(`Altura: ${baseTxt ? baseTxt + ' + ' : ''}base ${fmtCm(E.e)} + vão ${fmtCm(E.Hi)} + tampo ${fmtCm(E.e)} = ${fmtCm(E.Hm)} cm`)
  const linha = folhasDaLinhaDeBaixo(infos)
  const nDiv = linha.length - 1
  res.conferencias.push(`Largura: 2 laterais de ${fmtCm(E.e)}${nDiv > 0 ? ` + ${nDiv} divisória(s) de ${fmtCm(E.e)}` : ''} + vãos ${linha.map(f => fmtCm(f.rect.w)).join(' + ')} = ${fmtCm(E.L)} cm`)
  const gav = infos.filter(f => f.tipo === 'gavetas' && f.frente).sort((a, b) => a.rect.x - b.rect.x)[0]
  if (gav && gav.frente) {
    const n = Math.max(1, gav.n)
    const h = (gav.frente.h - (n - 1) * g) / n
    const iguais = new Set(gav.itens.filter(i => i.rotulo.startsWith('Frente')).map(i => Math.round(i.h * 100))).size === 1
    if (iguais) res.conferencias.push(`Frentes: ${n} × ${fmtCm(h)} + ${n - 1} folgas de ${fmtCm(g)} = ${fmtCm(gav.frente.h)} cm`)
  }
}

// ---- cotas ---------------------------------------------------------------------------------------------------------------------------------------------------------------------
function cotasModular(res: Resultado, E: Estrutura, infos: FolhaInfo[], correr: boolean, g: number): void {
  const F: Cota[] = []
  const linha = folhasDaLinhaDeBaixo(infos)
  // largura: nível 1 = portas ou frentes da linha de baixo, nível 2 = total
  if (correr) {
    const pc = res.medidas.porta_correr
    if (pc) { const passo = pc.larg - 40; for (let i = 0; i < pc.n; i++) F.push({ t: 'h', a: i * passo, b: i * passo + pc.larg, nivel: 1, lado: true }) }
  } else {
    for (const f of linha) {
      const fx = f.frente ?? { x: f.rect.x, y: 0, w: f.rect.w, h: 0 }
      const portas = f.tipo === 'portas' ? res.blocos.filter(b => b.grupo === 'porta' && b.x >= fx.x - 1 && b.x + b.dx <= fx.x + fx.w + 1 && Math.abs(b.y - (f.frente?.y ?? 0)) < 2) : []
      if (portas.length > 1) portas.forEach(b => F.push({ t: 'h', a: b.x, b: b.x + b.dx, nivel: 1, lado: true }))
      else F.push({ t: 'h', a: fx.x, b: fx.x + fx.w, nivel: 1, lado: true })
    }
  }
  F.push({ t: 'h', a: 0, b: E.L, nivel: 2, lado: true })
  // alturas à esquerda: vãos da coluna da esquerda
  const esquerda = infos.filter(f => f.rect.x <= E.e + 1).sort((a, b) => b.rect.y - a.rect.y)
  if (correr) {
    const pc = res.medidas.porta_correr
    if (pc) F.push({ t: 'v', a: E.y0 + E.rod + 10, b: E.y0 + E.rod + 10 + pc.alt, nivel: 1, lado: true })
  } else {
    for (const f of esquerda) {
      if (f.tipo === 'gavetas' && f.frente) {
        const fs = res.blocos.filter(b => b.grupo === 'frente' && b.x >= f.frente!.x - 1 && b.x < f.frente!.x + 5 && b.y >= f.frente!.y - 1 && b.y + b.dy <= f.frente!.y + f.frente!.h + 1)
        fs.forEach(b => F.push({ t: 'v', a: b.y, b: b.y + b.dy, nivel: 1, lado: true }))
      } else if (f.frente) F.push({ t: 'v', a: f.frente.y, b: f.frente.y + f.frente.h, nivel: 1, lado: true })
      else F.push({ t: 'v', a: f.rect.y, b: f.rect.y + f.rect.h, nivel: 1, lado: true })
    }
  }
  F.push({ t: 'v', a: E.elev, b: E.H, nivel: 2, lado: true })
  const baseH = E.y0 - E.elev + E.rod
  if (E.elev > 0) F.push({ t: 'v', a: 0, b: E.elev, nivel: 1, lado: false, texto: fmtCm(E.elev) })
  else if (baseH > 0) F.push({ t: 'v', a: 0, b: baseH, nivel: 1, lado: false })
  F.push({ t: 'v', a: 0, b: E.H, nivel: E.elev > 0 || baseH > 0 ? 2 : 1, lado: false })
  res.cotas.frontal = F

  const Lt: Cota[] = [{ t: 'h', a: E.z_lat0, b: E.z_lat0 + E.Dlat, nivel: 1, lado: true }, { t: 'h', a: 0, b: E.P, nivel: 2, lado: true },
    { t: 'v', a: 0, b: E.H, nivel: 1, lado: false }]
  if (E.elev > 0) Lt.push({ t: 'v', a: 0, b: E.elev, nivel: 1, lado: true })
  else if (baseH > 0) Lt.push({ t: 'v', a: 0, b: baseH, nivel: 1, lado: true })
  res.cotas.lateral = Lt

  const I: Cota[] = linha.map(f => ({ t: 'h', a: f.rect.x, b: f.rect.x + f.rect.w, nivel: 1, lado: true } as Cota))
  const I2 = [...I]
  const temCaixa = !!res.medidas.caixa
  I.push({ t: 'h', a: 0, b: E.L, nivel: 2, lado: true })
  if (temCaixa) {
    for (const f of linha) {
      if (f.tipo === 'gavetas') {
        const w = res.medidas.caixa.larg
        const xc = f.rect.x + (f.rect.w - w) / 2
        I2.push({ t: 'h', a: xc, b: xc + w, nivel: 2, lado: true })
      }
    }
    I2.push({ t: 'h', a: 0, b: E.L, nivel: 3, lado: true })
  } else I2.push({ t: 'h', a: 0, b: E.L, nivel: 2, lado: true })
  const alturas: Cota[] = []
  for (const f of esquerda) {
    if (f.tipo === 'gavetas' && f.slots.length) f.slots.forEach(s => alturas.push({ t: 'v', a: s.y1, b: s.y2, nivel: 1, lado: true, ref: 0 }))
    else alturas.push({ t: 'v', a: f.rect.y, b: f.rect.y + f.rect.h, nivel: 1, lado: true, ref: 0 })
  }
  const resto: Cota[] = [{ t: 'v', a: E.ybase_int, b: E.ytop_int, nivel: 2, lado: true }, { t: 'v', a: E.elev, b: E.H, nivel: 1, lado: false }]
  res.cotas.interna = [...I, ...alturas, ...resto]
  res.cotas.interna_gavetas = [...I2, ...alturas, ...resto]
  void g
}
export { folhasDe, repartir, ehDivisao }
export type { ItemMedida, DivisorR }
