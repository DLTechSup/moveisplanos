import * as C from './catalogo'
import { metrosFita } from './tipos'
import type { Catalogo, Ferragem, Projeto, Resultado } from './tipos'
import type { Plano } from './otimizador'

export type RefImagem = { tipo: 'padrao' | 'puxador' | 'corredica' | 'fita' | 'dobradica' | 'insumo' | 'chapa' | 'nenhuma'; nome: string }

export interface Linha {
  categoria: string; item: string; qtd: number; unidade: string; preco: number; detalhe: string
  fonte?: string; atualizado?: string; ref: RefImagem
  alvo?: Alvo; fator?: number
}
export interface Alvo { secao: 'chapas' | 'fitas' | 'corredicas' | 'dobradicas' | 'puxadores' | 'insumos'; material?: string; esp?: number; nome?: string; chave?: string }
export interface Orcamento {
  linhas: Linha[]; mao_de_obra: number; margem_pct: number; fita_metros: number; sem_precos: boolean
  materiais: number; subtotal: number; margem_valor: number; total: number; incompleto: boolean
}

export const totalLinha = (l: Linha) => l.qtd * l.preco
const ROTULOS: Record<string, string> = { chapa: 'Chapas e madeiras', fita: 'Fita de borda', 'corrediça': 'Corrediças', puxador: 'Puxadores',
  'dobradiça': 'Dobradiças', cabideiro: 'Cabideiros', 'porta de correr': 'Portas de correr', espelho: 'Espelhos', 'fixação': 'Fixação',
  base: 'Pés e rodízios', insumo: 'Insumos', extra: 'Itens extras' }
export const rotuloCategoria = (c: string) => ROTULOS[c] ?? c

export function montarOrcamento(p: Projeto, res: Resultado, plano: Plano, cat: Catalogo): Orcamento {
  const L: Linha[] = []
  for (const g of plano.grupos) {
    if (!g.chapas.length) continue
    const ch = C.chapa(cat, g.material, g.esp)
    const fator = C.padrao(cat, g.padrao).fator ?? 1
    const usaFator = g.material !== 'Madeira maciça' && g.material !== 'HDF'
    const preco = ch.preco * (usaFator ? fator : 1)
    const ref: RefImagem = { tipo: g.material === 'HDF' ? 'chapa' : 'padrao', nome: g.material === 'HDF' ? 'HDF' : g.padrao }
    if (g.unidade === 'm2') {
      const area = (g.comprimento * g.largura) / 1e6 * g.chapas.length
      L.push({ categoria: 'chapa', item: `${g.material} ${g.esp} mm — ${g.padrao}`, qtd: Math.round(area * 100) / 100, unidade: 'm²', preco,
        detalhe: `${g.chapas.length} tábua(s) de ${g.comprimento} × ${g.largura}`, fonte: ch.fonte, atualizado: ch.atualizado, ref,
        alvo: { secao: 'chapas', material: g.material, esp: g.esp }, fator: usaFator ? fator : 1 })
    } else {
      L.push({ categoria: 'chapa', item: `${g.material} ${g.esp} mm — ${g.padrao}`, qtd: g.chapas.length, unidade: 'chapa', preco,
        detalhe: `${g.comprimento} × ${g.largura} mm`, fonte: ch.fonte, atualizado: ch.atualizado, ref,
        alvo: { secao: 'chapas', material: g.material, esp: g.esp }, fator: usaFator ? fator : 1 })
    }
  }
  const metros = res.pecas.reduce((a, pc) => a + metrosFita(pc), 0) * 1.1
  const fita = C.fita(cat, p.fita)
  if (metros > 0) L.push({ categoria: 'fita', item: fita.nome, qtd: Math.round(metros * 100) / 100, unidade: 'm', preco: fita.preco_metro,
    detalhe: 'inclui 10% de sobra', fonte: fita.fonte, atualizado: fita.atualizado, ref: { tipo: 'fita', nome: fita.nome }, alvo: { secao: 'fitas', nome: fita.nome } })

  for (const f of res.ferragens) L.push(linhaFerragem(f, cat))

  const pecas = res.pecas.reduce((a, pc) => a + pc.qtd, 0)
  const ins = (chave: string, qtd: number, detalhe: string): Linha => {
    const i = C.insumo(cat, chave)
    return { categoria: 'insumo', item: i.nome, qtd, unidade: i.unidade, preco: i.preco, detalhe, fonte: i.fonte, atualizado: i.atualizado, ref: { tipo: 'insumo', nome: chave }, alvo: { secao: 'insumos', chave } }
  }
  L.push(ins('parafuso', pecas * 6, 'estimativa'), ins('cavilha', pecas * 4, 'estimativa'), ins('cola', 1, ''))
  for (const ex of p.extras || []) {
    const qtd = Number(ex.qtd) || 0, preco = Number(ex.preco) || 0
    if (ex.descricao && qtd > 0) L.push({ categoria: 'extra', item: ex.descricao, qtd, unidade: 'un', preco, detalhe: '', ref: { tipo: 'nenhuma', nome: '' } })
  }
  const materiais = L.reduce((a, l) => a + totalLinha(l), 0)
  const subtotal = materiais + p.mao_de_obra
  const margem_valor = (subtotal * p.margem) / 100
  return { linhas: L, mao_de_obra: p.mao_de_obra, margem_pct: p.margem, fita_metros: metros, sem_precos: L.every(l => l.preco === 0),
    incompleto: L.some(l => l.preco === 0), materiais, subtotal, margem_valor, total: subtotal + margem_valor }
}

function linhaFerragem(f: Ferragem, cat: Catalogo): Linha {
  const base = { categoria: f.categoria, item: f.nome, qtd: f.qtd, unidade: f.unidade, detalhe: f.detalhe }
  if (f.categoria === 'corrediça') { const c = C.corredica(cat, f.nome); return { ...base, preco: c.preco, fonte: c.fonte, atualizado: c.atualizado, ref: { tipo: 'corredica', nome: c.nome }, alvo: { secao: 'corredicas', nome: c.nome } } }
  if (f.categoria === 'dobradiça') { const d = C.dobradica(cat, f.nome); return { ...base, preco: d.preco, fonte: d.fonte, atualizado: d.atualizado, ref: { tipo: 'dobradica', nome: d.nome }, alvo: { secao: 'dobradicas', nome: d.nome } } }
  if (f.categoria === 'puxador') {
    const x = cat.puxadores.find(q => q.nome === f.nome)
    return { ...base, preco: x?.preco ?? 0, fonte: x?.fonte, atualizado: x?.atualizado, ref: { tipo: 'puxador', nome: x?.nome ?? f.nome }, alvo: x ? { secao: 'puxadores', nome: x.nome } : undefined }
  }
  const chave = f.chave ?? (f.categoria === 'base' ? (f.nome.includes('Pé') ? 'pe' : 'rodizio') : '')
  if (chave) { const i = C.insumo(cat, chave); return { ...base, preco: i.preco, fonte: i.fonte, atualizado: i.atualizado, ref: { tipo: 'insumo', nome: chave }, alvo: { secao: 'insumos', chave } } }
  return { ...base, preco: 0, ref: { tipo: 'nenhuma', nome: '' } }
}
