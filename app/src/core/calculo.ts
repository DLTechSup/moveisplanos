import { calcular } from './motor'
import { otimizar } from './otimizador'
import type { Plano } from './otimizador'
import { montarOrcamento } from './orcamento'
import type { Orcamento } from './orcamento'
import type { Catalogo, Projeto, Resultado } from './tipos'

export interface Calculo { projeto: Projeto; catalogo: Catalogo; resultado: Resultado; plano: Plano; orcamento: Orcamento }

export function calcularProjeto(projeto: Projeto, catalogo: Catalogo): Calculo {
  const resultado = calcular(projeto, catalogo)
  const plano = otimizar(resultado, catalogo, resultado.folgas.kerf.valor, resultado.folgas.refilo.valor)
  const orcamento = montarOrcamento(projeto, resultado, plano, catalogo)
  return { projeto, catalogo, resultado, plano, orcamento }
}
