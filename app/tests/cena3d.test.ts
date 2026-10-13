import { describe, expect, it } from 'vitest'
import { calcularProjeto } from '../src/core/calculo'
import { catalogoPadrao } from '../src/core/catalogo'
import { projetoDoModelo } from '../src/core/presets'
import { elementos, transformar } from '../src/draw/cena3d'

const cat = catalogoPadrao()
const els = (id: string) => { const r = calcularProjeto(projetoDoModelo(id), cat).resultado; return { r, e: elementos(r.blocos, r.puxadores) } }

describe('movimento das peças no 3D', () => {
  it('portas de abrir: pares abrem para lados opostos, cada porta é um elemento', () => {
    const { r, e } = els('guarda_casal_6')
    const portas = e.filter(x => x.movimento.tipo === 'dobradica')
    expect(portas.length).toBe(r.blocos.filter(b => b.grupo === 'porta').length)
    const sentidos = portas.map(x => (x.movimento as any).sentido)
    expect(sentidos.filter((s: number) => s === 1).length).toBe(sentidos.filter((s: number) => s === -1).length)
  })
  it('gavetas: frente e caixa andam juntas; portas de correr deslizam', () => {
    const g = els('guarda_casal_6').e.filter(x => x.movimento.tipo === 'gaveta')
    expect(g.length).toBeGreaterThan(0)
    expect(g.every(x => x.blocos.length > 1)).toBe(true)
    expect(transformar(g[0].movimento, 1).dz).toBeGreaterThan(100)
    const c = els('guarda_correr_2').e.filter(x => x.movimento.tipo === 'correr')
    expect(c.length).toBe(2)
    expect(Math.sign((c[0].movimento as any).deslocamento)).not.toBe(Math.sign((c[1].movimento as any).deslocamento))
  })
  it('todo bloco pertence a exatamente um elemento', () => {
    const { r, e } = els('guarda_casal_6')
    expect(e.flatMap(x => x.blocos).sort((a, b) => a - b)).toEqual(r.blocos.map((_, i) => i))
  })
})
