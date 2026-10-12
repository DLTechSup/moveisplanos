import { describe, expect, it } from 'vitest'
import { calcularProjeto } from '../src/core/calculo'
import { catalogoPadrao } from '../src/core/catalogo'
import { ancestral, definirTam, encaixar, folhaPadrao, mover, normalizar, obter, remover, resolver } from '../src/core/layout'
import { projetoDoModelo } from '../src/core/presets'
import { ehDivisao } from '../src/core/tipos'
import type { Divisao, No } from '../src/core/tipos'

const cat = catalogoPadrao()
const G = (n = 3) => folhaPadrao('gavetas', { n })
const A = () => folhaPadrao('aberto', { prateleiras: 2 })

describe('layout em árvore', () => {
  it('gavetas embaixo de um vão aberto, sem criar nova coluna', () => {
    // guarda-roupa de 3 colunas; solta gavetas na parte de baixo da coluna do meio
    const p = projetoDoModelo('closet_aberto')
    const raiz = p.layout as Divisao
    const alvo = [1]                       // coluna do meio (vão aberto)
    const r = encaixar(raiz, alvo, 'abaixo', G(2))
    const filho: any = obter(r.raiz, alvo)
    expect(ehDivisao(filho) && filho.dir === 'h').toBe(true)
    expect(filho.filhos.map((f: any) => f.tipo)).toEqual(['aberto', 'gavetas'])
    expect((r.raiz as Divisao).filhos.length).toBe(raiz.filhos.length)   // continua com o mesmo número de colunas
    const c = calcularProjeto({ ...p, layout: r.raiz }, cat)
    expect(c.resultado.medidas.n_gavetas).toBeGreaterThanOrEqual(2 + 5)
    expect(c.resultado.avisos.filter(a => a.nivel === 'erro')).toEqual([])
  })

  it('dividir um vão em dois lado a lado dentro de uma linha de cima, com gavetas ocupando a largura toda embaixo', () => {
    const raiz: No = { dir: 'h', filhos: [A(), G(3)], tam: [0, 0] }
    const r = encaixar(raiz, [0], 'direita', A())
    const topo: any = obter(r.raiz, [0])
    expect(topo.dir).toBe('v')
    const p = { ...projetoDoModelo('comoda_6'), layout: r.raiz }
    const c = calcularProjeto(p, cat)
    const gaveta = c.resultado.layout!.folhas.find(f => f.tipo === 'gavetas')!
    const abertos = c.resultado.layout!.folhas.filter(f => f.tipo === 'aberto')
    expect(abertos.length).toBe(2)
    expect(gaveta.rect.w).toBeCloseTo(c.resultado.medidas.largura_util, 4)     // gavetas na largura toda
    expect(abertos[0].rect.w + abertos[1].rect.w + 15).toBeCloseTo(gaveta.rect.w, 4)
  })

  it('arrastar a divisória (tamanho fixo) muda só os dois vãos vizinhos e mantém o total', () => {
    const p = projetoDoModelo('guarda_casal_3')
    const antes = calcularProjeto(p, cat).resultado.layout!.folhas
    const larguras = (fs: typeof antes) => fs.filter(f => f.caminho.length === 2 && f.caminho[1] === 0).map(f => f.rect.w)
    const raiz = definirTam(definirTam(p.layout, [], 0, 40), [], 1, 80)
    const depois = calcularProjeto({ ...p, layout: raiz }, cat).resultado.layout!.folhas
    const w = larguras(depois)
    expect(w[0]).toBeCloseTo(400); expect(w[1]).toBeCloseTo(800)
    expect(w.reduce((a, b) => a + b, 0)).toBeLessThan(larguras(antes).reduce((a, b) => a + b, 0) + 1)
  })

  it('remover e mover mantêm a árvore consistente', () => {
    const raiz: No = { dir: 'v', filhos: [A(), { dir: 'h', filhos: [A(), G(2)], tam: [0, 0] }, A()], tam: [0, 0, 0] }
    const sem = remover(raiz, [1, 1])!
    expect(ehDivisao(obter(sem, [1])!)).toBe(false)             // a divisão com um filho só colapsou
    const mv = mover(raiz, [1, 1], [0], 'abaixo')!
    expect((mv.raiz as Divisao).filhos.length).toBe(3)
    const folhas = resolver(mv.raiz, { x: 15, y: 65, w: 1000, h: 700 }, 15).folhas
    expect(folhas.filter(f => f.no.tipo === 'gavetas').length).toBe(1)
    expect(ancestral(mv.raiz, mv.caminho, 'h')).not.toBeNull()
    expect(normalizar(mv.raiz)).toBeTruthy()
  })

  it('qualquer layout vira peças sem NaN', () => {
    const raiz: No = { dir: 'h', filhos: [{ dir: 'v', filhos: [A(), folhaPadrao('portas', { prateleiras: 1 }), A()], tam: [20, 0, 0] }, G(4)], tam: [120, 0] }
    const c = calcularProjeto({ ...projetoDoModelo('comoda_6'), largura: 160, altura: 200, layout: raiz }, cat)
    expect(JSON.stringify(c.resultado.blocos)).not.toContain('NaN')
    expect(c.resultado.pecas.length).toBeGreaterThan(6)
  })
})
