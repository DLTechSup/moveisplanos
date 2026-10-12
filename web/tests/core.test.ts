import { describe, expect, it } from 'vitest'
import { calcularProjeto } from '../src/core/calculo'
import { catalogoPadrao } from '../src/core/catalogo'
import { calcular } from '../src/core/motor'
import { PRESETS, aplicarPreset } from '../src/core/presets'
import { projetoPadrao } from '../src/core/tipos'
import { totalChapas } from '../src/core/otimizador'

const cat = catalogoPadrao()
const ref = () => {
  const p = projetoPadrao()
  p.estrutura_padrao = p.frente_padrao = p.caixa_padrao = p.fundo_padrao = 'Branco'
  return p
}
const peca = (res: ReturnType<typeof calcular>, nome: string) => {
  const l = res.pecas.filter(x => x.nome === nome)
  expect(l.length).toBe(1)
  return l[0]
}

describe('caso de referência 7.7 (cômoda 140 × 80 × 52)', () => {
  const res = calcular(ref(), cat)
  const esperado: [string, number, number, number][] = [
    ['Tampo', 1, 1400, 520], ['Lateral', 2, 785, 505], ['Divisória', 1, 720, 489], ['Base', 1, 1370, 505],
    ['Rodapé', 1, 1370, 50], ['Frente de gaveta', 6, 698.5, 243], ['Lateral da gaveta', 12, 450, 200],
    ['Frente/traseira da gaveta', 12, 622, 200], ['Fundo da gaveta', 6, 636, 434], ['Fundo do móvel', 1, 1384, 734],
  ]
  it.each(esperado)('%s', (nome, qtd, comp, larg) => {
    const x = peca(res, nome)
    expect(x.qtd).toBe(qtd)
    expect(x.comp).toBeCloseTo(comp, 6)
    expect(x.larg).toBeCloseTo(larg, 6)
  })
  it('materiais, conferências e sem avisos', () => {
    expect(peca(res, 'Fundo do móvel').material).toBe('HDF')
    expect(peca(res, 'Fundo da gaveta').esp).toBe(6)
    expect(res.medidas.rod + 15 + res.medidas.Hi + 15).toBeCloseTo(800)
    expect(res.medidas.caixa.larg).toBe(652)
    expect(res.avisos).toEqual([])
  })
  it('cabe em 2 chapas de MDF 15', () => {
    expect(totalChapas(calcularProjeto(ref(), cat).plano, 'MDF', 15)).toBe(2)
  })
})

describe('folgas', () => {
  it('folga travada altera o cálculo e fora da faixa avisa', () => {
    const p = projetoPadrao()
    p.folgas_travadas = { entre_frentes: 5 }
    const f = calcular(p, cat).pecas.find(x => x.nome === 'Frente de gaveta')!
    expect(f.comp).toBeCloseTo((1400 - 5) / 2)
    p.folgas_travadas = { entre_frentes: 20 }
    const r = calcular(p, cat)
    expect(r.folgas.entre_frentes.fora).toBe(true)
  })
  it('corrediça oculta usa 21 mm', () => {
    const p = projetoPadrao(); p.corredica = 'Oculta'
    expect(calcular(p, cat).medidas.caixa.larg).toBe(Math.floor(677.5 - 42))
  })
})

describe('presets', () => {
  it.each(Object.keys(PRESETS))('%s calcula sem erro', tipo => {
    const c = calcularProjeto(aplicarPreset(projetoPadrao(), tipo), cat)
    expect(c.resultado.pecas.length).toBeGreaterThan(0)
    expect(c.resultado.avisos.filter(a => a.nivel === 'erro')).toEqual([])
  })
})
