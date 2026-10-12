// Despacha o cálculo para o motor da família do móvel e junta as folgas efetivas e avisos gerais.
import { Folgas } from './folgas'
import * as C from './catalogo'
import { calcularCama } from './cama'
import { dividirPecasGrandes, folgasEfetivas } from './comum'
import { calcularMesa } from './mesa'
import { calcularModular } from './modular'
import { resultadoVazio, aviso } from './tipos'
import type { Catalogo, Projeto, Resultado } from './tipos'

export function calcular(p: Projeto, cat: Catalogo): Resultado {
  const res = resultadoVazio()
  const fo = new Folgas(p.folgas_travadas, C.corredica(cat, p.corredica).folga_lado)
  if (p.familia === 'mesa') calcularMesa(p, cat, fo, res)
  else if (p.familia === 'cama') calcularCama(p, cat, fo, res)
  else calcularModular(p, cat, fo, res)
  folgasEfetivas(fo, res)
  dividirPecasGrandes(res, cat, fo.valor('refilo'))
  const m = res.medidas
  if (p.familia === 'modular') {
    if (m.Hi <= 0) aviso(res, 'erro', 'Altura interna inválida: aumente a altura do móvel ou reduza a base.')
    if (m.vaos?.some((v: number) => v <= 0)) aviso(res, 'erro', 'Largura útil inválida para o número de colunas.')
    if (m.Dint <= 0) aviso(res, 'erro', 'Profundidade útil inválida.')
  }
  return res
}
