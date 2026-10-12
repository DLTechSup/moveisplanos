import { describe, expect, it } from 'vitest'
import { calcularProjeto } from '../src/core/calculo'
import { catalogoPadrao } from '../src/core/catalogo'
import { calcular } from '../src/core/motor'
import { PRESETS, projetoDoModelo } from '../src/core/presets'
import { totalChapas } from '../src/core/otimizador'
import type { Projeto } from '../src/core/tipos'

const cat = catalogoPadrao()
const ref = (): Projeto => {
  const p = projetoDoModelo('comoda_6')
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
    expect(res.conferencias.length).toBeGreaterThanOrEqual(2)
  })
  it('cabe em 2 chapas de MDF 15', () => {
    expect(totalChapas(calcularProjeto(ref(), cat).plano, 'MDF', 15)).toBe(2)
  })
})

describe('folgas', () => {
  it('folga travada altera o cálculo e fora da faixa avisa', () => {
    const p = ref()
    p.folgas_travadas = { entre_frentes: 5 }
    const f = calcular(p, cat).pecas.find(x => x.nome === 'Frente de gaveta')!
    expect(f.comp).toBeCloseTo((1400 - 5) / 2)
    p.folgas_travadas = { entre_frentes: 20 }
    expect(calcular(p, cat).folgas.entre_frentes.fora).toBe(true)
  })
  it('corrediça oculta usa 21 mm', () => {
    const p = ref(); p.corredica = 'Oculta'
    expect(calcular(p, cat).medidas.caixa.larg).toBe(Math.floor(677.5 - 42))
  })
})

describe('montagem modular', () => {
  it('nicho + gavetas (criado-mudo) mantém a lógica do plano', () => {
    const r = calcular(projetoDoModelo('criado_mudo'), cat)
    expect(r.pecas.find(x => x.nome === 'Prateleira fixa')).toBeTruthy()
    expect(r.medidas.n_gavetas).toBe(2)
  })
  it('guarda-roupa de correr gera portas de correr, trilho e roldanas', () => {
    const r = calcular(projetoDoModelo('guarda_correr_3'), cat)
    expect(r.pecas.find(x => x.nome === 'Porta de correr')!.qtd).toBe(3)
    expect(r.ferragens.some(f => f.chave === 'trilho_correr')).toBe(true)
    expect(r.ferragens.some(f => f.chave === 'varao')).toBe(true)
  })
  it('colunas com largura fixa respeitam o vão pedido', () => {
    const p = projetoDoModelo('closet_aberto')
    const r = calcular(p, cat)
    expect(r.medidas.vaos[2]).toBeCloseTo(400)
    const soma = r.medidas.vaos.reduce((a: number, b: number) => a + b, 0) + (r.medidas.vaos.length + 1) * 15
    expect(soma).toBeCloseTo(p.largura * 10, 4)
  })
  it('móvel suspenso sobe o móvel e pede suporte', () => {
    const r = calcular(projetoDoModelo('aereo_2'), cat)
    expect(r.ferragens.some(f => f.chave === 'suporte_aereo')).toBe(true)
    expect(Math.min(...r.blocos.map(b => b.y))).toBeGreaterThanOrEqual(1400)
  })
  it('espelho vira ferragem em m²', () => {
    const r = calcular(projetoDoModelo('guarda_correr_2_espelho'), cat)
    expect(r.ferragens.find(f => f.chave === 'espelho')!.qtd).toBeGreaterThan(1)
  })
})

describe('todos os modelos', () => {
  it.each(PRESETS.map(p => [p.id, p.nome]))('%s (%s) calcula sem erro nem NaN', id => {
    const c = calcularProjeto(projetoDoModelo(id), cat)
    expect(c.resultado.pecas.length).toBeGreaterThan(0)
    expect(c.resultado.avisos.filter(a => a.nivel === 'erro')).toEqual([])
    const txt = JSON.stringify([c.resultado.pecas, c.resultado.blocos, c.resultado.cotas, c.resultado.medidas])
    expect(txt).not.toContain('null')
    expect(txt).not.toContain('NaN')
    for (const pc of c.resultado.pecas) { expect(pc.comp).toBeGreaterThan(0); expect(pc.larg).toBeGreaterThan(0) }
    expect(c.plano.grupos.every(g => g.nao_cabem.length === 0)).toBe(true)
  })
})
