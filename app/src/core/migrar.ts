// Abre arquivos .pmv de qualquer versão (inclusive os criados pelas versões anteriores do programa).
import { projetoPadrao, secaoPadrao, VERSAO_PROJETO } from './tipos'
import type { Coluna, Projeto } from './tipos'

export function migrarProjeto(dados: any): Projeto {
  const base = projetoPadrao()
  const out: any = { ...base }
  for (const k of Object.keys(base)) if (dados[k] !== undefined) out[k] = dados[k]
  if (typeof dados.colunas === 'number' || dados.motor) {
    // formato antigo (versões 1 e 2): colunas numéricas + gavetas por coluna ou portas
    let colunas: Coluna[]
    if (dados.motor === 'portas') {
      const n = Math.max(1, dados.portas ?? 2)
      colunas = Array.from({ length: Math.ceil(n / 2) }, () => ({ largura: 0, secoes: [secaoPadrao('portas', { prateleiras: dados.prateleiras ?? 1, portas: n > 1 ? 2 : 1 })] }))
    } else {
      const nc = Math.max(1, dados.colunas ?? 1)
      const secs = [] as ReturnType<typeof secaoPadrao>[]
      if ((dados.nicho ?? 0) > 0) secs.push(secaoPadrao('aberto', { altura: dados.nicho }))
      secs.push(secaoPadrao('gavetas', { n: dados.gavetas_por_coluna ?? 3, crescente: dados.distribuicao === 'crescente', alturas: dados.alturas_personalizadas ?? [] }))
      colunas = Array.from({ length: nc }, () => ({ largura: 0, secoes: JSON.parse(JSON.stringify(secs)) }))
    }
    out.colunas = colunas
    out.familia = 'modular'
  }
  out.versao = VERSAO_PROJETO
  out.mesa = { ...base.mesa, ...(dados.mesa ?? {}) }
  out.cama = { ...base.cama, ...(dados.cama ?? {}) }
  return out as Projeto
}
