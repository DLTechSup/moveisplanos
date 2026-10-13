// Lógica (sem WebGL) que descreve como cada peça do móvel se move no visualizador 3D:
// portas de abrir giram na dobradiça, portas de correr deslizam, gavetas saem para a frente.
import type { Bloco, Puxador } from '../core/tipos'

export type Movimento =
  | { tipo: 'fixo' }
  | { tipo: 'dobradica'; pivoX: number; pivoZ: number; sentido: 1 | -1 }
  | { tipo: 'correr'; deslocamento: number }
  | { tipo: 'gaveta'; curso: number }

export interface Elemento {
  id: string                       // 'porta:3', 'gaveta:2' ou 'fixo'
  movimento: Movimento
  blocos: number[]                 // índices em res.blocos
  puxadores: number[]              // índices em res.puxadores
}

const ehPortaCorrer = (b: Bloco) => b.grupo === 'porta' && /correr/i.test(b.nome)

/** Agrupa os blocos em elementos móveis (cada porta, cada gaveta) e um grupo fixo. */
export function elementos(blocos: Bloco[], puxadores: Puxador[]): Elemento[] {
  const saida: Elemento[] = []
  const usados = new Set<number>()

  // gavetas: frente + caixa compartilham o mesmo número de gaveta
  const gavetas = new Map<number, number[]>()
  blocos.forEach((b, i) => { if (b.gaveta >= 0 && b.grupo !== 'porta') (gavetas.get(b.gaveta) ?? gavetas.set(b.gaveta, []).get(b.gaveta)!).push(i) })
  for (const [g, idx] of gavetas) {
    const caixa = idx.map(i => blocos[i]).filter(b => b.grupo !== 'frente')
    const prof = caixa.length ? Math.max(...caixa.map(b => b.dz)) : 300
    saida.push({ id: `gaveta:${g}`, movimento: { tipo: 'gaveta', curso: Math.max(120, prof * 0.85) }, blocos: idx, puxadores: [] })
    idx.forEach(i => usados.add(i))
  }

  // portas de abrir: pares adjacentes de mesma largura e altura abrem para lados opostos
  const portas = blocos.map((b, i) => ({ b, i })).filter(({ b, i }) => b.grupo === 'porta' && !ehPortaCorrer(b) && !usados.has(i))
    .sort((a, c) => a.b.y - c.b.y || a.b.x - c.b.x)
  const feitas = new Set<number>()
  portas.forEach(({ b, i }, k) => {
    if (feitas.has(i)) return
    const par = portas.slice(k + 1).find(o => !feitas.has(o.i) && Math.abs(o.b.y - b.y) < 2 && Math.abs(o.b.dy - b.dy) < 2 &&
      Math.abs(o.b.dx - b.dx) < 2 && o.b.x - (b.x + b.dx) >= -1 && o.b.x - (b.x + b.dx) < 8)
    const esq = (bb: Bloco): Movimento => ({ tipo: 'dobradica', pivoX: bb.x, pivoZ: bb.z + bb.dz, sentido: -1 })
    const dir = (bb: Bloco): Movimento => ({ tipo: 'dobradica', pivoX: bb.x + bb.dx, pivoZ: bb.z + bb.dz, sentido: 1 })
    saida.push({ id: `porta:${i}`, movimento: esq(b), blocos: [i], puxadores: [] })
    feitas.add(i)
    if (par) { saida.push({ id: `porta:${par.i}`, movimento: dir(par.b), blocos: [par.i], puxadores: [] }); feitas.add(par.i) }
  })

  // portas de correr
  const correr = blocos.map((b, i) => ({ b, i })).filter(({ b }) => ehPortaCorrer(b)).sort((a, c) => a.b.x - c.b.x)
  correr.forEach(({ b, i }, k) => {
    saida.push({ id: `porta:${i}`, movimento: { tipo: 'correr', deslocamento: (k % 2 === 0 ? 1 : -1) * b.dx * 0.92 }, blocos: [i], puxadores: [] })
    usados.add(i)
  })

  // o que sobrou é fixo
  const emMovimento = new Set(saida.flatMap(e => e.blocos))
  const fixos = blocos.map((_, i) => i).filter(i => !emMovimento.has(i))
  saida.push({ id: 'fixo', movimento: { tipo: 'fixo' }, blocos: fixos, puxadores: [] })

  // cada puxador acompanha a frente em que está montado
  puxadores.forEach((px, pi) => {
    const dono = saida.find(e => e.movimento.tipo !== 'fixo' && e.blocos.some(i => {
      const b = blocos[i]
      return (b.grupo === 'porta' || b.grupo === 'frente') &&
        px.frente_x >= b.x - 2 && px.frente_x + px.frente_w <= b.x + b.dx + 2 && px.frente_y >= b.y - 2 && px.frente_y + px.frente_h <= b.y + b.dy + 2
    }))
    ;(dono ?? saida[saida.length - 1]).puxadores.push(pi)
  })
  return saida.filter(e => e.blocos.length || e.puxadores.length)
}

/** Posição/rotação de um elemento para uma abertura `t` (0 = fechado, 1 = totalmente aberto). */
export function transformar(m: Movimento, t: number): { dx: number; dz: number; giro: number; pivoX: number; pivoZ: number } {
  const z = { dx: 0, dz: 0, giro: 0, pivoX: 0, pivoZ: 0 }
  if (m.tipo === 'gaveta') return { ...z, dz: m.curso * t }
  if (m.tipo === 'correr') return { ...z, dx: m.deslocamento * t }
  if (m.tipo === 'dobradica') return { ...z, giro: m.sentido * (Math.PI / 2) * 1.05 * t, pivoX: m.pivoX, pivoZ: m.pivoZ }
  return z
}
