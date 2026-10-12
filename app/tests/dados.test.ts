import { describe, expect, it } from 'vitest'
import { calcularProjeto } from '../src/core/calculo'
import { catalogoPadrao, completarCatalogo } from '../src/core/catalogo'
import { migrarProjeto } from '../src/core/migrar'
import { aplicarEstimativas, definirPreco, exportarCsv, importarCsv } from '../src/core/precos'
import { projetoDoModelo } from '../src/core/presets'

describe('preços', () => {
  it('estimativas preenchem só o que está vazio e guardam fonte e data', () => {
    const cat = catalogoPadrao()
    cat.chapas[4].preco = 999    // MDF 15: o usuário já digitou
    const est = aplicarEstimativas(cat, { uf: 'AM', sobrescrever: false })
    expect(est.chapas[4].preco).toBe(999)
    expect(est.chapas[5].preco).toBeGreaterThan(0)
    expect(est.chapas[5].fonte).toContain('Estimativa')
    const base = aplicarEstimativas(cat, { uf: 'SP', sobrescrever: true })
    expect(est.chapas[5].preco).toBeGreaterThan(base.chapas[5].preco)   // AM mais caro que SP
  })
  it('orçamento usa o preço digitado, o fator da cor e a fonte', () => {
    let cat = catalogoPadrao()
    const p = projetoDoModelo('comoda_6')
    const calc0 = calcularProjeto(p, cat)
    const linha = calc0.orcamento.linhas.find(l => l.alvo?.secao === 'chapas' && l.item.includes('Carvalho'))!
    cat = definirPreco(cat, linha.alvo!, 360, 'Madeireira Exemplo', linha.fator)    // 360 já com fator 1,2 → base 300
    expect(cat.chapas.find(c => c.material === 'MDF' && c.espessura === 15)!.preco).toBeCloseTo(300)
    const calc = calcularProjeto(p, cat)
    const l2 = calc.orcamento.linhas.find(l => l.item === linha.item)!
    expect(l2.preco).toBeCloseTo(360)
    expect(l2.fonte).toBe('Madeireira Exemplo')
    expect(calc.orcamento.total).toBeGreaterThan(0)
  })
  it('CSV: exporta e importa de volta', () => {
    const cat = aplicarEstimativas(catalogoPadrao(), { uf: 'SP', sobrescrever: true })
    const csv = exportarCsv(cat)
    const zerado = catalogoPadrao()
    const r = importarCsv(zerado, csv)
    expect(r.atualizados).toBeGreaterThan(40)
    expect(r.catalogo.corredicas[0].preco).toBeCloseTo(cat.corredicas[0].preco)
  })
})

describe('arquivos', () => {
  it('abre projeto da versão antiga (colunas numéricas)', () => {
    const p = migrarProjeto({ nome: 'Antigo', motor: 'gavetas', colunas: 2, gavetas_por_coluna: 4, nicho: 15, largura: 100, altura: 80, profundidade: 45 })
    expect(p.colunas.length).toBe(2)
    expect(p.colunas[0].secoes.map(s => s.tipo)).toEqual(['aberto', 'gavetas'])
    expect(calcularProjeto(p, catalogoPadrao()).resultado.medidas.n_gavetas).toBe(8)
  })
  it('catálogo antigo ganha os itens novos', () => {
    const c = completarCatalogo({ ...catalogoPadrao(), insumos: [] } as any)
    expect(c.insumos.some(i => i.chave === 'trilho_correr')).toBe(true)
  })
})
