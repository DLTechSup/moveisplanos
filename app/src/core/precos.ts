// Preços: estimativas de referência por região, links para pesquisar preços reais e importação/exportação em CSV.
//
// IMPORTANTE: os valores "estimados" abaixo são apenas ordens de grandeza para você começar o orçamento; NÃO são
// cotações de nenhuma loja. O programa grava a "fonte" e a data de cada preço para que cada valor fique rastreável.
import type { Alvo } from './orcamento'
import type { Catalogo, Chapa } from './tipos'

export const UFS = ['AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'] as const

/** Ajuste regional aproximado (logística/frete) sobre a base São Paulo = 1,00. */
export const FATOR_UF: Record<string, number> = {
  SP: 1, RJ: 1.04, MG: 1, ES: 1.03, PR: 0.99, SC: 0.99, RS: 1.01, MS: 1.04, MT: 1.07, GO: 1.03, DF: 1.06,
  BA: 1.05, SE: 1.06, AL: 1.06, PE: 1.05, PB: 1.06, RN: 1.06, CE: 1.05, PI: 1.08, MA: 1.08,
  PA: 1.1, AM: 1.15, RR: 1.17, AP: 1.15, AC: 1.18, RO: 1.12, TO: 1.08,
}

const CHAPA_BASE: Record<string, Record<number, number>> = {
  MDF: { 3: 95, 6: 150, 9: 190, 12: 240, 15: 290, 18: 330, 25: 470 },
  MDP: { 15: 230, 18: 270, 25: 380 },
  HDF: { 3: 85, 6: 135 },
  Compensado: { 6: 130, 10: 190, 15: 260, 18: 310 },
  'Madeira maciça': { 20: 1100, 25: 1350, 30: 1600, 40: 2100, 50: 2600, 60: 3100, 80: 4200 },   // R$/m²
}
const CORREDICA_BASE: Record<string, number> = { telescopica: 28, roldana: 16, oculta: 85 }
const PUXADOR_BASE = (tipo: string, ef: number, nome: string): number => {
  if (tipo === 'barra') return Math.round((6 + ef * 0.07 + (/dourad/i.test(nome) ? 8 : /preta/i.test(nome) ? 6 : 0)) * 100) / 100
  if (tipo === 'cava_usinada') return 8
  if (tipo === 'perfil_cava') return 38
  if (tipo === 'botao') return /dourad/i.test(nome) ? 9 : 6
  if (tipo === 'concha') return 18
  return 0
}
const INSUMO_BASE: Record<string, number> = { pe: 4.5, rodizio: 12, parafuso: 0.08, cavilha: 0.06, cola: 22, varao: 40, suporte_varao: 6,
  trilho_correr: 160, roldana_correr: 25, espelho: 180, suporte_aereo: 18, perfil_led: 60, cantoneira: 1.5 }
const FITA_BASE: Record<string, number> = { 'Fita PVC 22 mm': 0.9, 'Fita PVC 35 mm': 2.2, 'Fita PVC 45 mm': 3.8, 'Fita PVC 22 mm espessa': 1.6 }

const arred = (v: number) => Math.round(v * 100) / 100

export interface OpcaoEstimativa { uf: string; sobrescrever: boolean }

/** Preenche preços de referência no catálogo (sem apagar os que você já digitou, a menos que peça). */
export function aplicarEstimativas(cat: Catalogo, { uf, sobrescrever }: OpcaoEstimativa): Catalogo {
  const f = FATOR_UF[uf] ?? 1
  const hoje = new Date().toLocaleDateString('pt-BR')
  const fonte = `Estimativa do programa (ref. nacional, ajuste ${uf})`
  const marca = { fonte, atualizado: hoje }
  const pode = (preco: number) => sobrescrever || !preco
  const novo: Catalogo = JSON.parse(JSON.stringify(cat))
  for (const c of novo.chapas) {
    const b = CHAPA_BASE[c.material]?.[c.espessura]
    if (b && pode(c.preco)) { c.preco = arred(b * f); Object.assign(c, marca) }
  }
  for (const c of novo.corredicas) {
    const b = CORREDICA_BASE[c.tipo]
    if (b && pode(c.preco)) { c.preco = arred((b + (c.amortecimento ? 32 : 0)) * f); Object.assign(c, marca) }
  }
  for (const x of novo.puxadores) if (pode(x.preco)) { x.preco = arred(PUXADOR_BASE(x.tipo, x.entre_furos, x.nome) * f); Object.assign(x, marca) }
  for (const x of novo.fitas) { const b = FITA_BASE[x.nome]; if (b && pode(x.preco_metro)) { x.preco_metro = arred(b * f); Object.assign(x, marca) } }
  for (const x of novo.dobradicas) if (pode(x.preco)) { x.preco = arred((x.amortecimento ? 11 : 4.5) * f); Object.assign(x, marca) }
  for (const x of novo.insumos) { const b = INSUMO_BASE[x.chave]; if (b != null && pode(x.preco)) { x.preco = arred(b * f); Object.assign(x, marca) } }
  return novo
}

// ---- onde pesquisar preços reais --------------------------------------------------------------------------------------------------
export interface Loja { id: string; nome: string; tipo: string; url: (termo: string, cidade: string, uf: string) => string }
const enc = encodeURIComponent
export const LOJAS: Loja[] = [
  { id: 'google', nome: 'Google (preços e lojas)', tipo: 'Pesquisa geral', url: (t, c, u) => `https://www.google.com/search?q=${enc(`${t} preço ${c} ${u}`.trim())}` },
  { id: 'shopping', nome: 'Google Shopping', tipo: 'Comparador', url: t => `https://www.google.com/search?tbm=shop&q=${enc(t)}` },
  { id: 'ml', nome: 'Mercado Livre', tipo: 'Marketplace', url: t => `https://lista.mercadolivre.com.br/${enc(t.replace(/\s+/g, '-'))}` },
  { id: 'leroy', nome: 'Leroy Merlin', tipo: 'Home center', url: t => `https://www.leroymerlin.com.br/search?term=${enc(t)}` },
  { id: 'telha', nome: 'Telhanorte', tipo: 'Home center', url: t => `https://www.telhanorte.com.br/${enc(t)}?_q=${enc(t)}&map=ft` },
  { id: 'maps_mdf', nome: 'Revendas de MDF perto de você (Google Maps)', tipo: 'Loja local', url: (_t, c, u) => `https://www.google.com/maps/search/${enc(`revenda de MDF ${c} ${u}`.trim())}` },
  { id: 'maps_madeireira', nome: 'Madeireiras perto de você (Google Maps)', tipo: 'Loja local', url: (_t, c, u) => `https://www.google.com/maps/search/${enc(`madeireira ${c} ${u}`.trim())}` },
  { id: 'maps_ferragens', nome: 'Lojas de ferragens para marcenaria (Google Maps)', tipo: 'Loja local', url: (_t, c, u) => `https://www.google.com/maps/search/${enc(`ferragens para marcenaria ${c} ${u}`.trim())}` },
]

/** Termo de busca para um item do catálogo. */
export function termoBusca(secao: string, item: any): string {
  switch (secao) {
    case 'chapas': return item.material === 'Madeira maciça' ? `madeira maciça ${item.espessura}mm tábua` : `${item.material} ${item.espessura}mm ${item.comprimento}x${item.largura}`
    case 'padroes': return `MDF ${item.nome} 15mm`
    case 'puxadores': return `puxador ${item.nome}`
    case 'corredicas': return `corrediça ${item.nome} ${item.comprimentos?.[4] ?? 450}mm`
    case 'fitas': return `fita de borda ${item.nome.replace('Fita PVC ', '')}`
    case 'dobradicas': return item.nome
    default: return item.nome
  }
}

// ---- CSV ------------------------------------------------------------------------------------------------------------------------------------------
const precoDe = (s: string, x: any): number | undefined => (s === 'fitas' ? x.preco_metro : x.preco)

/** Exporta a tabela de preços (para editar em planilha ou compartilhar com a equipe). */
export function exportarCsv(cat: Catalogo): string {
  const linhas = ['secao;nome;detalhe;preco;fonte;atualizado']
  const q = (s: any) => `"${String(s ?? '').replace(/"/g, '""')}"`
  const add = (secao: string, nome: string, detalhe: string, x: any) => linhas.push([secao, q(nome), q(detalhe), String(precoDe(secao, x) ?? 0).replace('.', ','), q(x.fonte), q(x.atualizado)].join(';'))
  cat.chapas.forEach((x: Chapa) => add('chapas', x.material, String(x.espessura), x))
  cat.puxadores.forEach(x => add('puxadores', x.nome, '', x))
  cat.corredicas.forEach(x => add('corredicas', x.nome, '', x))
  cat.fitas.forEach(x => add('fitas', x.nome, '', x))
  cat.dobradicas.forEach(x => add('dobradicas', x.nome, '', x))
  cat.insumos.forEach(x => add('insumos', x.chave, x.nome, x))
  return '﻿' + linhas.join('\r\n')
}

function dividirCsv(linha: string): string[] {
  const out: string[] = []
  let atual = '', aspas = false
  for (let i = 0; i < linha.length; i++) {
    const ch = linha[i]
    if (aspas) { if (ch === '"') { if (linha[i + 1] === '"') { atual += '"'; i++ } else aspas = false } else atual += ch }
    else if (ch === '"') aspas = true
    else if (ch === ';') { out.push(atual); atual = '' }
    else atual += ch
  }
  out.push(atual)
  return out
}

/** Importa preços de um CSV gerado por exportarCsv (ou de uma planilha do fornecedor no mesmo formato). */
export function importarCsv(cat: Catalogo, texto: string): { catalogo: Catalogo; atualizados: number } {
  const novo: Catalogo = JSON.parse(JSON.stringify(cat))
  let n = 0
  const linhas = texto.replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim())
  for (const l of linhas.slice(1)) {
    const [secao, nome, detalhe, preco, fonte, atualizado] = dividirCsv(l)
    const v = parseFloat(String(preco).replace(/\./g, '').replace(',', '.'))
    if (!Number.isFinite(v)) continue
    let alvo: any
    if (secao === 'chapas') alvo = novo.chapas.find(c => c.material === nome && String(c.espessura) === detalhe)
    else if (secao === 'insumos') alvo = novo.insumos.find(c => c.chave === nome)
    else alvo = (novo as any)[secao]?.find((c: any) => c.nome === nome)
    if (!alvo) continue
    if (secao === 'fitas') alvo.preco_metro = v; else alvo.preco = v
    alvo.fonte = fonte || alvo.fonte
    alvo.atualizado = atualizado || new Date().toLocaleDateString('pt-BR')
    n++
  }
  return { catalogo: novo, atualizados: n }
}

/** Grava o preço (e a fonte) de um item do catálogo a partir de uma linha do orçamento. */
export function definirPreco(cat: Catalogo, alvo: Alvo, preco: number, fonte: string, fator = 1): Catalogo {
  const novo: Catalogo = JSON.parse(JSON.stringify(cat))
  const hoje = new Date().toLocaleDateString('pt-BR')
  const base = fator > 0 ? preco / fator : preco
  let item: any
  if (alvo.secao === 'chapas') item = novo.chapas.find(c => c.material === alvo.material && c.espessura === alvo.esp)
  else if (alvo.secao === 'insumos') item = novo.insumos.find(c => c.chave === alvo.chave)
  else item = (novo as any)[alvo.secao].find((c: any) => c.nome === alvo.nome)
  if (!item) return cat
  if (alvo.secao === 'fitas') item.preco_metro = Math.round(base * 10000) / 10000; else item.preco = Math.round(base * 10000) / 10000
  item.fonte = fonte || 'Preço informado pelo marceneiro'
  item.atualizado = hoje
  return novo
}
