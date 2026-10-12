// Motor de mesas: jantar, centro, lateral, escrivaninha, bancada (tampo + pernas ou painéis, saia e gavetas opcionais).
import * as C from './catalogo'
import { Folgas } from './folgas'
import { fmtCm } from './formato'
import { addPeca, aviso } from './tipos'
import type { Catalogo, Cota, Projeto, Resultado } from './tipos'
import { bloco, blocosCaixa, blocosCorredica, colocarPuxador, envolvente, escolherCorredica, ferragemPuxador, peca, r3 } from './comum'

export function calcularMesa(p: Projeto, cat: Catalogo, fo: Folgas, res: Resultado): void {
  const m = p.mesa
  const redonda = m.formato === 'redonda'
  const L = p.largura * 10
  const P = redonda ? L : p.profundidade * 10
  const H = p.altura * 10
  const t = m.tampo_esp
  const e = p.estrutura_esp
  const perna = m.perna * 10
  const inset = redonda ? 0 : 30
  const saia = m.saia * 10
  const B = res.blocos
  const maciça = (mat: string) => mat === 'Madeira maciça'
  const fita = (mat: string) => (maciça(mat) ? [0, 0] : [2, 2])

  // tampo
  const [fc, fl] = fita(m.tampo_material)
  const idT = addPeca(res, peca(p, redonda ? 'Tampo redondo' : 'Tampo', 1, L, P, redonda ? 0 : fc, redonda ? 0 : fl, true, { esp: t, material: m.tampo_material, obs: redonda ? `Ø ${fmtCm(L)} cm` : '' }))
  B.push(bloco('Tampo', 'tampo', 0, H - t, 0, L, t, P, 'estrutura', 'x', idT, -1, redonda ? { forma: 'redondo' } : {}))

  const hPerna = H - t
  const pernaMat = m.perna_material
  if (m.pes === 'painel' && !redonda) {
    const idP = addPeca(res, peca(p, 'Painel lateral', 2, hPerna, P - 2 * inset, 1, 0, true))
    B.push(bloco('Painel esquerdo', 'lateral', inset, 0, inset, e, hPerna, P - 2 * inset, 'estrutura', 'y', idP))
    B.push(bloco('Painel direito', 'lateral', L - inset - e, 0, inset, e, hPerna, P - 2 * inset, 'estrutura', 'y', idP))
    const w = L - 2 * inset - 2 * e
    const idTr = addPeca(res, peca(p, 'Travessa traseira', 1, w, 250, 1, 0, true))
    B.push(bloco('Travessa traseira', 'saia', inset + e, hPerna - 250, inset, w, 250, e, 'estrutura', 'x', idTr))
    if (m.prateleira_inferior) {
      const idPr = addPeca(res, peca(p, 'Prateleira inferior', 1, w, P - 2 * inset - 20, 1, 0, true))
      B.push(bloco('Prateleira inferior', 'prateleira', inset + e, 150, inset + 10, w, e, P - 2 * inset - 20, 'estrutura', 'x', idPr))
    }
  } else {
    const pos: [number, number][] = redonda
      ? [[L / 2 - L * 0.2 - perna / 2, P / 2 - P * 0.2 - perna / 2], [L / 2 + L * 0.2 - perna / 2, P / 2 - P * 0.2 - perna / 2],
        [L / 2 - L * 0.2 - perna / 2, P / 2 + P * 0.2 - perna / 2], [L / 2 + L * 0.2 - perna / 2, P / 2 + P * 0.2 - perna / 2]]
      : [[inset, inset], [L - inset - perna, inset], [inset, P - inset - perna], [L - inset - perna, P - inset - perna]]
    const idL = addPeca(res, { nome: 'Perna', qtd: 4, comp: r3(hPerna), larg: perna, esp: perna, material: pernaMat,
      padrao: p.estrutura_padrao, fita_c: 0, fita_l: 0, veio: true, obs: '' })
    pos.forEach(([x, z], i) => B.push(bloco(`Perna ${i + 1}`, 'perna', x, 0, z, perna, hPerna, perna, 'perna', 'y', idL)))
    if (!redonda) {
      const wF = L - 2 * inset - 2 * perna, wL = P - 2 * inset - 2 * perna
      const zFront = P - inset - e
      const temGav = m.gavetas > 0
      if (!temGav) {
        const id = addPeca(res, peca(p, 'Saia frontal/traseira', 2, wF, saia, 1, 0, true))
        B.push(bloco('Saia frontal', 'saia', inset + perna, hPerna - saia, zFront, wF, saia, e, 'estrutura', 'x', id))
        B.push(bloco('Saia traseira', 'saia', inset + perna, hPerna - saia, inset, wF, saia, e, 'estrutura', 'x', id))
      } else {
        const id = addPeca(res, peca(p, 'Saia traseira', 1, wF, saia, 1, 0, true))
        B.push(bloco('Saia traseira', 'saia', inset + perna, hPerna - saia, inset, wF, saia, e, 'estrutura', 'x', id))
      }
      const idS = addPeca(res, peca(p, 'Saia lateral', 2, wL, saia, 1, 0, true))
      B.push(bloco('Saia esquerda', 'saia', inset, hPerna - saia, inset + perna, e, saia, wL, 'estrutura', 'z', idS))
      B.push(bloco('Saia direita', 'saia', L - inset - e, hPerna - saia, inset + perna, e, saia, wL, 'estrutura', 'z', idS))
      if (m.prateleira_inferior) {
        const idPr = addPeca(res, peca(p, 'Prateleira inferior', 1, wF, wL, 1, 0, true))
        B.push(bloco('Prateleira inferior', 'prateleira', inset + perna, 150, inset + perna, wF, e, wL, 'estrutura', 'x', idPr))
      }
      if (temGav) gavetasMesa(p, cat, fo, res, { L, P, H, t, e, inset, perna, saia, hPerna, wF, zFront })
    } else if (m.prateleira_inferior) {
      aviso(res, 'aviso', 'Mesa redonda não leva prateleira inferior neste modelo.')
    }
  }
  if (m.gavetas > 0 && (redonda || m.pes === 'painel')) aviso(res, 'aviso', 'Gavetas sob o tampo exigem mesa retangular com pernas.')

  // ferragens
  const nPernas = m.pes === 'painel' && !redonda ? 0 : 4
  if (!redonda) res.ferragens.push({ nome: 'Cantoneiras de fixação', qtd: 8, unidade: 'un', categoria: 'insumo', detalhe: 'saia/tampo', chave: 'cantoneira' })
  void nPernas

  // medidas, cotas e textos
  const bb = envolvente(B)
  res.medidas = { ...res.medidas, L, H, P, e, t, Hm: H, perna, saia, bbox: bb, elev: 0, y0: 0, rod: 0 }
  const F: Cota[] = [{ t: 'h', a: 0, b: L, nivel: 1, lado: true }, { t: 'v', a: 0, b: H, nivel: 1, lado: false },
    { t: 'v', a: 0, b: hPerna, nivel: 1, lado: true }, { t: 'v', a: hPerna, b: H, nivel: 2, lado: true, texto: fmtCm(t) }]
  res.cotas.frontal = F
  res.cotas.lateral = [{ t: 'h', a: 0, b: P, nivel: 1, lado: true }, { t: 'v', a: 0, b: H, nivel: 1, lado: false }]
  res.cotas.planta = [{ t: 'h', a: 0, b: L, nivel: 1, lado: true }, { t: 'v', a: 0, b: P, nivel: 1, lado: true }]
  if (res.caixa_modelo.length) res.detalhe = 'caixa'
  res.vistas = ['frontal', 'lateral', 'planta', ...(res.detalhe === 'caixa' ? ['detalhe' as const] : []), '3d', 'explodida']
  res.conferencias.push(`Altura: pernas ${fmtCm(hPerna)} + tampo ${fmtCm(t)} = ${fmtCm(H)} cm`)
  res.definicoes.push(
    `Tampo: ${m.tampo_material} ${t} mm${redonda ? `, redondo Ø ${fmtCm(L)} cm` : ''}.`,
    m.pes === 'painel' && !redonda ? `Painéis laterais de ${p.estrutura_material} ${e} mm com travessa traseira.`
      : `Pernas: ${m.perna} × ${m.perna} cm em ${pernaMat}${redonda ? ', afastadas das bordas' : `, recuadas ${fmtCm(inset)} cm das bordas`}.`,
    !redonda && m.pes !== 'painel' ? `Saia (travessas): ${fmtCm(saia)} cm de altura sob o tampo.` : 'Estrutura simples, sem saia.',
    `Fita de borda: ${C.fita(cat, p.fita).nome} nas bordas visíveis do tampo e das peças de chapa.`,
  )
  if (m.prateleira_inferior) res.definicoes.push('Prateleira inferior a 15 cm do chão.')
  if (hPerna < 600) aviso(res, 'aviso', 'Altura baixa: verifique se é uma mesa de centro ou lateral.')
  if (p.altura > 82 && p.tipo.includes('escrivaninha')) aviso(res, 'aviso', 'Escrivaninha acima de 82 cm: altura confortável costuma ser de 72 a 76 cm.')
}

function gavetasMesa(p: Projeto, cat: Catalogo, fo: Folgas, res: Resultado,
  d: { L: number; P: number; H: number; t: number; e: number; inset: number; perna: number; saia: number; hPerna: number; wF: number; zFront: number }): void {
  const n = Math.max(1, Math.floor(p.mesa.gavetas))
  const g = fo.valor('entre_frentes')
  const fe = p.frente_esp, e = d.e
  const bayX = d.inset + d.perna
  const bayW = d.wF
  const zInnerFront = d.P - d.inset - fe
  const Dint = zInnerFront - (d.inset + e)
  const { cor, comp, lat } = escolherCorredica(p, cat, fo, res, Dint)
  if (d.saia < 140) aviso(res, 'aviso', 'Saia baixa para gavetas: use pelo menos 14 cm de altura.')
  const bay = (bayW - (n - 1) * e) / n
  const frontW = (bayW - (n - 1) * g) / n
  const frontH = d.saia - g
  const yF = d.hPerna - d.saia
  const ec = p.caixa_esp
  const { r, s } = { r: fo.valor('rasgo_prof'), s: fo.valor('rasgo_sobra') }
  const wCaixa = Math.floor(bay - 2 * lat + 1e-6)
  const topo = fo.valor('topo_caixa', { vao_gaveta: d.saia }), fundo = fo.valor('fundo_caixa')
  const alt = Math.max(1, Math.floor(Math.min(d.saia - topo - fundo, frontH - 30) + 1e-6))
  if (alt < 60) aviso(res, 'aviso', `Caixa da gaveta com altura menor que 60 mm (${alt} mm).`)
  const idF = addPeca(res, { nome: 'Frente de gaveta', qtd: n, comp: r3(frontW), larg: r3(frontH), esp: fe, material: p.frente_material,
    padrao: p.frente_padrao, fita_c: 2, fita_l: 2, veio: true, obs: '' })
  const idLat = addPeca(res, { nome: 'Lateral da gaveta', qtd: 2 * n, comp: comp, larg: alt, esp: ec, material: p.caixa_material, padrao: p.caixa_padrao, fita_c: 1, fita_l: 0, veio: true, obs: '' })
  const idFt = addPeca(res, { nome: 'Frente/traseira da gaveta', qtd: 2 * n, comp: wCaixa - 2 * ec, larg: alt, esp: ec, material: p.caixa_material, padrao: p.caixa_padrao, fita_c: 1, fita_l: 0, veio: true, obs: '' })
  const idFd = addPeca(res, { nome: 'Fundo da gaveta', qtd: n, comp: r3(wCaixa - 2 * ec + 2 * (r - s)), larg: r3(comp - 2 * ec + 2 * (r - s)), esp: p.fundo_caixa_esp,
    material: p.fundo_caixa_material, padrao: p.fundo_padrao, fita_c: 0, fita_l: 0, veio: false, obs: 'em rasgo' })
  if (n > 1) {
    const idD = addPeca(res, { nome: 'Divisória de gaveta', qtd: n - 1, comp: d.saia, larg: Dint, esp: e, material: p.estrutura_material,
      padrao: p.estrutura_padrao, fita_c: 1, fita_l: 0, veio: true, obs: '' })
    for (let i = 1; i < n; i++) res.blocos.push(bloco('Divisória de gaveta', 'divisoria', bayX + i * bay + (i - 1) * e, yF, d.inset + e, e, d.saia, Dint, 'estrutura', 'y', idD))
  }
  for (let i = 0; i < n; i++) {
    const xb = bayX + i * (bay + e)
    const xf = bayX + i * (frontW + g)
    res.blocos.push(bloco(`Frente ${i + 1}`, 'frente', xf, yF, d.P - d.inset - fe, frontW, frontH, fe, 'frente', 'x', idF, i))
    colocarPuxador(p, cat, res, xf, yF, frontW, frontH, d.P - d.inset)
    const xC = xb + (bay - wCaixa) / 2
    res.blocos.push(...blocosCaixa(xC, yF + fundo, zInnerFront - comp, wCaixa, alt, comp, ec, r, s, idLat, idFt, idFd, p.fundo_caixa_esp, i))
    res.blocos.push(...blocosCorredica(cor.tipo, xC, yF + fundo, zInnerFront, wCaixa, alt, lat, comp, i))
    if (!res.caixa_modelo.length) res.caixa_modelo = [...blocosCaixa(0, 0, 0, wCaixa, alt, comp, ec, r, s, idLat, idFt, idFd, p.fundo_caixa_esp, 0),
      ...blocosCorredica(cor.tipo, 0, 0, comp, wCaixa, alt, lat, comp, 0)]
  }
  res.ferragens.push({ nome: cor.nome, qtd: n, unidade: 'par', categoria: 'corrediça', detalhe: `${comp} mm` })
  ferragemPuxador(p, cat, res, n)
  res.medidas.caixa = { larg: wCaixa, larg_int: wCaixa - 2 * ec, prof: comp, alts: [alt], comp_corredica: comp }
  res.medidas.vaos_gaveta = [d.saia]
  res.medidas.n_gavetas = n
  res.definicoes.push(`Gavetas: ${n} sob o tampo com corrediça de ${comp} mm; caixa de ${wCaixa} mm de largura.`)
}
