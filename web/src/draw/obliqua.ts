// Perspectiva oblíqua (3D) e vista explodida.
import type { Calculo } from '../core/calculo'
import * as C from '../core/catalogo'
import type { Bloco } from '../core/tipos'
import { corDoBloco, direcaoVeio } from './comum'
import { Area, CONTORNO, Saida, clarear, desenharPuxador, escurecer, n2, texto } from './svg'

const ANGULO = (38 * Math.PI) / 180
const PROF = 0.55
const EXTERNOS = new Set(['tampo', 'lateral', 'frente', 'porta', 'rodape', 'pe', 'rodizio'])
type Pt = [number, number]

class Projecao {
  kx = PROF * Math.cos(ANGULO); ky = PROF * Math.sin(ANGULO)
  zmax: number; minx: number; maxx: number; miny: number; maxy: number; esc: number; ox: number; oy: number
  constructor(blocos: Bloco[], area: Area, margem: [number, number, number, number] = [60, 60, 60, 60], reservaDir = 0) {
    this.zmax = Math.max(...blocos.map(b => b.z + b.dz))
    const xs = blocos.flatMap(b => [b.x, b.x + b.dx]), ys = blocos.flatMap(b => [b.y, b.y + b.dy]), zs = blocos.flatMap(b => [b.z, b.z + b.dz])
    const pts: Pt[] = []
    for (const x of [Math.min(...xs), Math.max(...xs)]) for (const y of [Math.min(...ys), Math.max(...ys)])
      for (const z of [Math.min(...zs), Math.max(...zs)]) pts.push(this.bruto(x, y, z))
    this.minx = Math.min(...pts.map(p => p[0])); this.maxx = Math.max(...pts.map(p => p[0]))
    this.miny = Math.min(...pts.map(p => p[1])); this.maxy = Math.max(...pts.map(p => p[1]))
    const [ml, mt, mr, mb] = margem
    const utilW = area.w - ml - mr - reservaDir, utilH = area.h - mt - mb
    this.esc = Math.min(utilW / (this.maxx - this.minx), utilH / (this.maxy - this.miny))
    this.ox = area.x + ml + (utilW - (this.maxx - this.minx) * this.esc) / 2
    this.oy = area.y + mt + (utilH - (this.maxy - this.miny) * this.esc) / 2 + (this.maxy - this.miny) * this.esc
  }
  private bruto(x: number, y: number, z: number): Pt { const d = this.zmax - z; return [x + d * this.kx, y + d * this.ky] }
  p(x: number, y: number, z: number): Pt {
    const [bx, by] = this.bruto(x, y, z)
    return [this.ox + (bx - this.minx) * this.esc, this.oy - (by - this.miny) * this.esc]
  }
}

/** Ordenação topológica de trás para frente (algoritmo do pintor). */
function ordem(blocos: Bloco[]): Bloco[] {
  const eps = 0.01, n = blocos.length
  const antes: Set<number>[] = Array.from({ length: n }, () => new Set())
  const x2 = (b: Bloco) => b.x + b.dx, y2 = (b: Bloco) => b.y + b.dy, z2 = (b: Bloco) => b.z + b.dz
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    if (i === j) continue
    const a = blocos[i], b = blocos[j]
    if (z2(a) <= b.z + eps) antes[j].add(i)
    else if (x2(a) <= b.x + eps && !(z2(b) <= a.z + eps)) antes[j].add(i)
    else if (y2(a) <= b.y + eps && !(z2(b) <= a.z + eps) && !(x2(b) <= a.x + eps)) antes[j].add(i)
  }
  const chave = blocos.map(b => [Math.round(z2(b) * 100), Math.round(x2(b) * 100), Math.round(y2(b) * 100)])
  const menor = (i: number, j: number) => chave[i][0] - chave[j][0] || chave[i][1] - chave[j][1] || chave[i][2] - chave[j][2]
  const pendentes = new Set(Array.from({ length: n }, (_, i) => i))
  const saida: Bloco[] = []
  while (pendentes.size) {
    const todos = [...pendentes]
    const livres = todos.filter(i => ![...antes[i]].some(k => pendentes.has(k)))
    const cands = livres.length ? livres : todos
    const esc = cands.reduce((a, b) => (menor(a, b) <= 0 ? a : b))
    saida.push(blocos[esc]); pendentes.delete(esc)
  }
  return saida
}

const poli = (out: Saida, pts: Pt[], fill: string, sw = 2.6) =>
  out.push(`<polygon points="${pts.map(p => `${n2(p[0])},${n2(p[1])}`).join(' ')}" fill="${fill}" stroke="${CONTORNO}" stroke-width="${sw}" stroke-linejoin="round"/>`)

/** Quadrilátero A, A+U, A+U+V; grao: 'u' (linhas paralelas a U), 'v' ou ''. */
function face(out: Saida, pr: Projecao, a: number[], u: number[], v: number[], cor: string, grao: '' | 'u' | 'v'): void {
  const A = pr.p(a[0], a[1], a[2]), B = pr.p(a[0] + u[0], a[1] + u[1], a[2] + u[2])
  const Cc = pr.p(a[0] + u[0] + v[0], a[1] + u[1] + v[1], a[2] + u[2] + v[2]), D = pr.p(a[0] + v[0], a[1] + v[1], a[2] + v[2])
  poli(out, [A, B, Cc, D], cor)
  if (grao) {
    const escuro = escurecer(cor, 118)
    const nL = 7
    const ls: string[] = []
    for (let i = 1; i < nL; i++) {
      const t = i / nL
      const [p1, p2] = grao === 'u'
        ? [[A[0] + (D[0] - A[0]) * t, A[1] + (D[1] - A[1]) * t], [B[0] + (Cc[0] - B[0]) * t, B[1] + (Cc[1] - B[1]) * t]]
        : [[A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t], [D[0] + (Cc[0] - D[0]) * t, D[1] + (Cc[1] - D[1]) * t]]
      ls.push(`<line x1="${n2(p1[0])}" y1="${n2(p1[1])}" x2="${n2(p2[0])}" y2="${n2(p2[1])}"/>`)
    }
    out.push(`<g stroke="${escuro}" stroke-width="2" stroke-opacity="0.42">${ls.join('')}</g>`)
  }
}

function desenharBloco(out: Saida, pr: Projecao, calc: Calculo, b: Bloco): void {
  const cor = corDoBloco(calc, b)
  const tem = direcaoVeio(calc, b, 'xy') || direcaoVeio(calc, b, 'zy')
  const veio = tem ? b.veio : ''
  const { x, y, z, dx, dy, dz } = b
  face(out, pr, [x, y, z + dz], [dx, 0, 0], [0, dy, 0], cor, veio === 'x' ? 'u' : veio === 'y' ? 'v' : '')
  face(out, pr, [x + dx, y, z + dz], [0, 0, -dz], [0, dy, 0], escurecer(cor, 122), veio === 'z' ? 'u' : veio === 'y' ? 'v' : '')
  face(out, pr, [x, y + dy, z + dz], [dx, 0, 0], [0, 0, -dz], clarear(cor, 108), veio === 'x' ? 'u' : veio === 'z' ? 'v' : '')
}

function puxadores3d(out: Saida, pr: Projecao, calc: Calculo): void {
  const cor = C.puxador(calc.catalogo, calc.projeto.puxador).cor
  for (const pu of calc.resultado.puxadores) {
    const [cx, cy] = pr.p(pu.x, pu.y, pu.z)
    desenharPuxador(out, pu.tipo, cor, cx, cy, pu.comp * pr.esc, pu.vertical)
  }
}

export function desenhar3d(out: Saida, area: Area, calc: Calculo): void {
  const m = calc.resultado.medidas
  const blocos = calc.resultado.blocos.filter(b => EXTERNOS.has(b.grupo))
  const pr = new Projecao(blocos, area)
  const c = (x: number, y: number, z: number) => pr.p(x, y, z)
  poli(out, [c(0, 0, 0), c(m.L, 0, 0), c(m.L + 40, 0, m.P + 10), c(-20, 0, m.P + 10)], 'rgba(0,0,0,0.16)', 0)
  for (const b of ordem(blocos)) {
    if (b.grupo === 'rodizio') {
      const [px, py] = pr.p(b.x, b.y + b.dy, b.z + b.dz)
      out.push(`<ellipse cx="${n2(px + b.dx * pr.esc / 2)}" cy="${n2(py + b.dy * pr.esc / 2)}" rx="${n2(b.dx * pr.esc / 2)}" ry="${n2(b.dy * pr.esc / 2)}" fill="#333" stroke="${CONTORNO}" stroke-width="2.5"/>`)
      continue
    }
    desenharBloco(out, pr, calc, b)
  }
  puxadores3d(out, pr, calc)
}

function explodir(blocos: Bloco[], m: Record<string, any>): Bloco[] {
  const S = 0.16 * Math.max(m.L, m.H, m.P)
  const cx = m.L / 2
  return blocos.map(b => {
    let dx = 0, dy = 0, dz = 0
    if (b.grupo === 'lateral') dx = b.x + b.dx / 2 < cx ? -S * 1.1 : S * 1.1
    else if (b.grupo === 'tampo') dy = S * 2.1
    else if (b.grupo === 'rodape') { dy = -S * 1.5; dz = S * 0.3 }
    else if (b.grupo === 'pe' || b.grupo === 'rodizio') dy = -S * 1.5
    else if (b.grupo === 'base') dy = -S * 0.9
    else if (b.grupo === 'fundo' && b.nome === 'Fundo') dz = -S * 1.1
    else if (b.grupo === 'frente' || b.grupo === 'porta') { dz = S * 2.3; dy = -S * 0.45 }
    else if (['caixa_lateral', 'caixa_frente', 'caixa_fundo', 'corredica'].includes(b.grupo)) dz = S
    else if (b.grupo === 'divisoria') dy = S
    return { ...b, x: b.x + dx, y: b.y + dy, z: b.z + dz }
  })
}

function poligonos(pr: Projecao, b: Bloco): Pt[][] {
  const { x, y, z } = b, x2 = b.x + b.dx, y2 = b.y + b.dy, z2 = b.z + b.dz, p = pr.p.bind(pr)
  return [[p(x, y, z2), p(x2, y, z2), p(x2, y2, z2), p(x, y2, z2)], [p(x2, y, z2), p(x2, y, z), p(x2, y2, z), p(x2, y2, z2)],
    [p(x, y2, z2), p(x2, y2, z2), p(x2, y2, z), p(x, y2, z)]]
}
function dentro(pt: Pt, poly: Pt[]): boolean {
  let d = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j]
    if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) d = !d
  }
  return d
}
function pontoVisivel(pr: Projecao, b: Bloco, depois: Bloco[]): Pt {
  const cob = depois.flatMap(o => poligonos(pr, o))
  const fs = [0.5, 0.25, 0.75, 0.1, 0.9]
  const cands: Pt[] = []
  for (const fx of fs) for (const fy of fs) {
    cands.push(pr.p(b.x + b.dx * fx, b.y + b.dy * fy, b.z + b.dz))
    cands.push(pr.p(b.x + b.dx * fx, b.y + b.dy, b.z + b.dz - b.dz * fy))
    cands.push(pr.p(b.x + b.dx, b.y + b.dy * fy, b.z + b.dz - b.dz * fx))
  }
  return cands.find(c => !cob.some(poly => dentro(c, poly))) ?? cands[0]
}

export function desenharExplodida(out: Saida, area: Area, calc: Calculo): void {
  const res = calc.resultado
  const reserva = Math.min(760, area.w * 0.34)
  const blocos = explodir(res.blocos, res.medidas)
  const pr = new Projecao(blocos, area, [60, 80, 60, 60], reserva)
  const ord = ordem(blocos).filter(b => b.grupo !== 'rodizio')
  for (const b of ord) desenharBloco(out, pr, calc, b)
  const alvo = new Map<number, number>()
  ord.forEach((b, i) => { if (b.peca && b.grupo !== 'corredica') alvo.set(b.peca, i) })
  for (const [num, i] of alvo) {
    const [cx, cy] = pontoVisivel(pr, ord[i], ord.slice(i + 1))
    out.push(`<circle cx="${n2(cx)}" cy="${n2(cy)}" r="21" fill="#fff" stroke="#14285A" stroke-width="2.5"/>`)
    texto(out, cx, cy + 10, String(num), 26, '#14285A', true, 'c')
  }
  const x = area.x + area.w - reserva + 30
  let y = area.y + 110
  const tam = reserva > 600 ? 28 : 22
  texto(out, x, y, 'Legenda das peças', tam + 6, '#222222', true)
  y += tam * 2
  for (const pc of res.pecas) { texto(out, x, y, `${String(pc.id).padStart(2)}  ${pc.nome} (${pc.qtd}x)`, tam, '#222222'); y += tam * 1.45 }
}
