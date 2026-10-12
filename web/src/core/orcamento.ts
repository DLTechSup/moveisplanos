import * as C from './catalogo'
import { metrosFita } from './tipos'
import type { Catalogo, Ferragem, Projeto, Resultado } from './tipos'
import type { Plano } from './otimizador'

export interface Linha { categoria: string; item: string; qtd: number; unidade: string; preco: number; detalhe: string }
export interface Orcamento {
  linhas: Linha[]; mao_de_obra: number; margem_pct: number; fita_metros: number; sem_precos: boolean
  materiais: number; subtotal: number; margem_valor: number; total: number
}

export const totalLinha = (l: Linha) => l.qtd * l.preco

export function montarOrcamento(p: Projeto, res: Resultado, plano: Plano, cat: Catalogo): Orcamento {
  const L: Linha[] = []
  for (const g of plano.grupos) {
    if (!g.chapas.length) continue
    if (g.unidade === 'm2') {
      const area = (g.comprimento * g.largura) / 1e6 * g.chapas.length
      L.push({ categoria: 'chapa', item: `${g.material} ${g.esp} mm – ${g.padrao}`, qtd: area, unidade: 'm²', preco: g.preco,
        detalhe: `${g.chapas.length} tábua(s) de ${g.comprimento} × ${g.largura}` })
    } else {
      L.push({ categoria: 'chapa', item: `${g.material} ${g.esp} mm – ${g.padrao}`, qtd: g.chapas.length, unidade: 'chapa',
        preco: g.preco, detalhe: `${g.comprimento} × ${g.largura} mm` })
    }
  }
  const metros = res.pecas.reduce((a, pc) => a + metrosFita(pc), 0) * 1.1
  const fita = C.fita(cat, p.fita)
  if (metros > 0) L.push({ categoria: 'fita', item: fita.nome, qtd: Math.round(metros * 100) / 100, unidade: 'm',
    preco: fita.preco_metro, detalhe: 'inclui 10% de sobra' })

  for (const f of res.ferragens) {
    let preco = precoFerragem(f, cat)
    if (f.categoria === 'base') preco = C.insumo(cat, f.nome.includes('Pé') ? 'pe' : 'rodizio').preco
    L.push({ categoria: f.categoria, item: f.nome, qtd: f.qtd, unidade: f.unidade, preco, detalhe: f.detalhe })
  }

  const pecas = res.pecas.reduce((a, pc) => a + pc.qtd, 0)
  L.push({ categoria: 'insumo', item: C.insumo(cat, 'parafuso').nome, qtd: pecas * 6, unidade: 'un', preco: C.insumo(cat, 'parafuso').preco, detalhe: 'estimativa' })
  L.push({ categoria: 'insumo', item: C.insumo(cat, 'cavilha').nome, qtd: pecas * 4, unidade: 'un', preco: C.insumo(cat, 'cavilha').preco, detalhe: 'estimativa' })
  L.push({ categoria: 'insumo', item: C.insumo(cat, 'cola').nome, qtd: 1, unidade: 'un', preco: C.insumo(cat, 'cola').preco, detalhe: '' })

  for (const ex of p.extras || []) {
    const qtd = Number(ex.qtd) || 0, preco = Number(ex.preco) || 0
    if (ex.descricao && qtd > 0) L.push({ categoria: 'extra', item: ex.descricao, qtd, unidade: 'un', preco, detalhe: '' })
  }
  const materiais = L.reduce((a, l) => a + totalLinha(l), 0)
  const subtotal = materiais + p.mao_de_obra
  const margem_valor = (subtotal * p.margem) / 100
  return { linhas: L, mao_de_obra: p.mao_de_obra, margem_pct: p.margem, fita_metros: metros,
    sem_precos: L.every(l => l.preco === 0), materiais, subtotal, margem_valor, total: subtotal + margem_valor }
}

function precoFerragem(f: Ferragem, cat: Catalogo): number {
  if (f.categoria === 'corrediça') return C.corredica(cat, f.nome).preco
  if (f.categoria === 'puxador') return cat.puxadores.find(x => x.nome === f.nome)?.preco ?? 0
  if (f.categoria === 'dobradiça') return C.dobradica(cat, f.nome).preco
  return 0
}
