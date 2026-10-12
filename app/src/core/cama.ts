// Motor de camas: solteiro, casal, queen, king, infantil e beliche (estrado em ripas ou chapa, cabeceira opcional).
import * as C from './catalogo'
import { Folgas } from './folgas'
import { fmtCm } from './formato'
import { addPeca, aviso } from './tipos'
import type { Bloco, Catalogo, Cota, Projeto, Resultado } from './tipos'
import { bloco, envolvente, peca } from './comum'

export const TAMANHOS_CAMA: Record<string, { nome: string; l: number; c: number }> = {
  solteiro: { nome: 'Solteiro', l: 88, c: 188 },
  solteiro_king: { nome: 'Solteiro king', l: 96, c: 203 },
  casal: { nome: 'Casal padrão', l: 138, c: 188 },
  queen: { nome: 'Queen', l: 158, c: 198 },
  king: { nome: 'King', l: 193, c: 203 },
  infantil: { nome: 'Infantil (mini cama)', l: 70, c: 150 },
  personalizado: { nome: 'Personalizado', l: 0, c: 0 },
}

export function calcularCama(p: Projeto, cat: Catalogo, fo: Folgas, res: Resultado): void {
  const c = p.cama
  const e = p.estrutura_esp
  const Lc = c.colchao_l * 10, Cc = c.colchao_c * 10
  const folga = 20
  const W = Lc + folga + 2 * e              // largura externa (entre os lados externos das laterais)
  const Lt = Cc + folga + 2 * e             // comprimento externo
  const beliche = c.andares === 2
  const ab = c.altura_base * 10             // topo do estrado
  const slatE = c.estrado === 'ripas' ? 20 : 15
  const railTop = ab - slatE
  const railH = Math.max(120, Math.min(180, railTop - 80))
  const pesH = railTop - railH
  const post = 70
  const xo = beliche ? post : 0             // deslocamento (colunas fora das laterais)
  const cabeceira = c.cabeceira === 'painel'
  const zo = cabeceira ? e : 0
  const B = res.blocos
  const nivel = (dy: number, idx: number): void => {
    const s = idx === 0 ? '' : ' superior'
    // laterais, cabeceira e pé (travessas)
    const idLat = addPeca(res, peca(p, 'Lateral da cama', 2, Lt, railH, 1, 0, true))
    B.push(bloco('Lateral esquerda' + s, 'lateral', xo, pesH + dy, zo, e, railH, Lt, 'estrutura', 'z', idLat))
    B.push(bloco('Lateral direita' + s, 'lateral', xo + W - e, pesH + dy, zo, e, railH, Lt, 'estrutura', 'z', idLat))
    const idTr = addPeca(res, peca(p, 'Travessa de cabeceira/pé', 2, W - 2 * e, railH, 1, 0, true))
    B.push(bloco('Travessa cabeceira' + s, 'saia', xo + e, pesH + dy, zo, W - 2 * e, railH, e, 'estrutura', 'x', idTr))
    B.push(bloco('Travessa pé' + s, 'saia', xo + e, pesH + dy, zo + Lt - e, W - 2 * e, railH, e, 'estrutura', 'x', idTr))
    // sarrafos de apoio
    const idS = addPeca(res, { nome: 'Sarrafo de apoio', qtd: 2, comp: Lt - 2 * e, larg: 40, esp: 30, material: 'Madeira maciça',
      padrao: p.estrutura_padrao, fita_c: 0, fita_l: 0, veio: true, obs: '' })
    B.push(bloco('Sarrafo' + s, 'saia', xo + e, railTop - 30 + dy, zo + e, 40, 30, Lt - 2 * e, 'perna', 'z', idS))
    B.push(bloco('Sarrafo' + s, 'saia', xo + W - e - 40, railTop - 30 + dy, zo + e, 40, 30, Lt - 2 * e, 'perna', 'z', idS))
    if (c.estrado === 'ripas') {
      const largR = 70, passo = 130
      const n = Math.max(6, Math.ceil((Lt - 2 * e - largR) / passo) + 1)
      const esp = (Lt - 2 * e - n * largR) / (n + 1)
      const idR = addPeca(res, { nome: 'Ripa do estrado', qtd: n, comp: W - 2 * e, larg: largR, esp: slatE, material: 'Madeira maciça',
        padrao: p.estrutura_padrao, fita_c: 0, fita_l: 0, veio: true, obs: `espaçamento ≈ ${fmtCm(esp)} cm` })
      for (let i = 0; i < n; i++) B.push(bloco(`Ripa ${i + 1}` + s, 'ripa', xo + e, railTop + dy, zo + e + esp + i * (largR + esp), W - 2 * e, slatE, largR, 'perna', 'x', idR))
    } else {
      const idE = addPeca(res, peca(p, 'Estrado (chapa)', 1, W - 2 * e, Lt - 2 * e, 1, 0, true, { esp: slatE, obs: 'furos de ventilação' }))
      B.push(bloco('Estrado' + s, 'ripa', xo + e, railTop + dy, zo + e, W - 2 * e, slatE, Lt - 2 * e, 'estrutura', 'x', idE))
    }
    // colchão (referência visual)
    B.push(bloco('Colchão' + s, 'colchao', xo + e + folga / 2, ab + dy, zo + e + folga / 2, Lc, 200, Cc, 'colchao', '', 0))
  }
  nivel(0, 0)
  let topo = Math.max(ab + 200, cabeceira ? c.cabeceira_altura * 10 : 0)

  if (beliche) {
    const dy = 1000
    nivel(dy, 1)
    const alt = ab + dy + 200 + 250           // altura dos montantes (guarda-corpo acima do colchão)
    const idC = addPeca(res, { nome: 'Coluna do beliche', qtd: 4, comp: alt, larg: post, esp: post, material: 'Madeira maciça',
      padrao: p.estrutura_padrao, fita_c: 0, fita_l: 0, veio: true, obs: '' })
    const pos: [number, number][] = [[0, zo], [xo + W, zo], [0, zo + Lt - post], [xo + W, zo + Lt - post]]
    pos.forEach(([x, z], i) => B.push(bloco(`Coluna ${i + 1}`, 'perna', x, 0, z, post, alt, post, 'perna', 'y', idC)))
    // guarda-corpo do andar de cima
    const gy = ab + dy + 100
    const idG = addPeca(res, peca(p, 'Guarda-corpo lateral', 2, Lt - 400, 250, 1, 0, true))
    B.push(bloco('Guarda-corpo esquerdo', 'saia', xo, gy, zo, e, 250, Lt - 400, 'estrutura', 'z', idG))
    B.push(bloco('Guarda-corpo direito', 'saia', xo + W - e, gy, zo, e, 250, Lt - 400, 'estrutura', 'z', idG))
    const idGe = addPeca(res, peca(p, 'Guarda-corpo de cabeceira/pé', 2, W - 2 * e, 250, 1, 0, true))
    B.push(bloco('Guarda-corpo cabeceira', 'saia', xo + e, gy, zo, W - 2 * e, 250, e, 'estrutura', 'x', idGe))
    B.push(bloco('Guarda-corpo pé', 'saia', xo + e, gy, zo + Lt - e, W - 2 * e, 250, e, 'estrutura', 'x', idGe))
    // escada vertical encostada na lateral direita, junto ao pé
    const xe = xo + W + post
    const idM = addPeca(res, { nome: 'Montante da escada', qtd: 2, comp: ab + dy, larg: 50, esp: 20, material: 'Madeira maciça',
      padrao: p.estrutura_padrao, fita_c: 0, fita_l: 0, veio: true, obs: '' })
    const zE = zo + Lt - 450
    B.push(bloco('Montante da escada', 'perna', xe, 0, zE, 20, ab + dy, 50, 'perna', 'y', idM))
    B.push(bloco('Montante da escada', 'perna', xe, 0, zE + 300, 20, ab + dy, 50, 'perna', 'y', idM))
    const idD = addPeca(res, { nome: 'Degrau da escada', qtd: 5, comp: 300, larg: 70, esp: 20, material: 'Madeira maciça',
      padrao: p.estrutura_padrao, fita_c: 0, fita_l: 0, veio: true, obs: '' })
    for (let i = 0; i < 5; i++) B.push(bloco(`Degrau ${i + 1}`, 'ripa', xe + 20, 250 + i * ((ab + dy - 350) / 4), zE + 50, 40, 20, 250, 'perna', 'x', idD))
    res.definicoes.push('Beliche: andar de cima a 100 cm do andar de baixo; guarda-corpo em três lados e escada fixa.')
    if (c.altura_base > 40) aviso(res, 'aviso', 'Beliche com base alta: confira o pé-direito do quarto.')
    topo = alt
  } else {
    // pés
    const nPes = W > 1300 ? 6 : 4
    const idP = addPeca(res, { nome: 'Pé da cama', qtd: nPes, comp: pesH, larg: 60, esp: 60, material: 'Madeira maciça',
      padrao: p.estrutura_padrao, fita_c: 0, fita_l: 0, veio: true, obs: '' })
    const xs = [xo, xo + W - 60]
    const zs = [zo + 0, zo + Lt - 60]
    for (const z of zs) for (const x of xs) B.push(bloco('Pé', 'perna', x, 0, z, 60, pesH, 60, 'perna', 'y', idP))
    if (nPes === 6) for (const x of xs) B.push(bloco('Pé central', 'perna', x, 0, zo + Lt / 2 - 30, 60, pesH, 60, 'perna', 'y', idP))
  }

  if (cabeceira) {
    const hc = c.cabeceira_altura * 10
    if (hc <= ab + 50) aviso(res, 'aviso', 'A cabeceira precisa ser mais alta que o estrado.')
    const w = W + (beliche ? 2 * post : 0)
    const larg = hc - 100
    const idC = addPeca(res, peca(p, 'Cabeceira', 1, w, larg, 1, 2, true))
    B.push(bloco('Cabeceira', 'tampo', 0, 100, 0, w, larg, e, 'estrutura', 'x', idC))
  }

  const bb = envolvente(B)
  const Wt = bb.x1 - bb.x0, Pt = bb.z1 - bb.z0, Ht = Math.max(bb.y1, topo)
  res.medidas = { ...res.medidas, L: Wt, H: Ht, Hm: Ht, P: Pt, e, bbox: bb, elev: 0, y0: 0, rod: 0, cama: { W, Lt, Lc, Cc, ab } }
  res.cotas.frontal = [{ t: 'h', a: 0, b: Wt, nivel: 1, lado: true }, { t: 'v', a: 0, b: Ht, nivel: 1, lado: false },
    { t: 'v', a: 0, b: ab, nivel: 1, lado: true, texto: fmtCm(ab) }]
  res.cotas.lateral = [{ t: 'h', a: 0, b: Pt, nivel: 1, lado: true }, { t: 'v', a: 0, b: Ht, nivel: 1, lado: false },
    { t: 'v', a: 0, b: ab, nivel: 1, lado: true }]
  res.cotas.planta = [{ t: 'h', a: 0, b: Wt, nivel: 1, lado: true }, { t: 'v', a: 0, b: Pt, nivel: 1, lado: true }]
  res.vistas = ['frontal', 'lateral', 'planta', '3d', 'explodida']
  res.conferencias.push(`Colchão: ${c.colchao_l} × ${c.colchao_c} cm  •  folga de ${fmtCm(folga)} cm  •  largura externa ${fmtCm(W)} cm  •  comprimento ${fmtCm(Lt)} cm`)
  res.definicoes.push(
    `Colchão ${TAMANHOS_CAMA[c.tamanho]?.nome ?? 'personalizado'}: ${c.colchao_l} × ${c.colchao_c} cm (folga de ${fmtCm(folga)} cm).`,
    `Estrado em ${c.estrado === 'ripas' ? 'ripas de madeira maciça (70 mm de largura)' : 'chapa com furos de ventilação'}, apoiado em sarrafos.`,
    `Altura do estrado: ${c.altura_base} cm do chão; laterais de ${fmtCm(railH)} cm.`,
    cabeceira ? `Cabeceira em painel de ${p.estrutura_material} ${e} mm, ${c.cabeceira_altura} cm de altura total.` : 'Sem cabeceira.',
    `Fita de borda: ${C.fita(cat, p.fita).nome} nas bordas visíveis.`)
  if (c.colchao_l < 60 || c.colchao_c < 120) aviso(res, 'aviso', 'Medidas de colchão muito pequenas.')
  void fo
}
