import { describe, expect, it } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { calcularProjeto } from '../src/core/calculo'
import { catalogoPadrao } from '../src/core/catalogo'
import { PRESETS, projetoDoModelo } from '../src/core/presets'
import { aplicarEstimativas } from '../src/core/precos'
import { folhaVista, montarPaginas } from '../src/draw/folha'

const cat = aplicarEstimativas(catalogoPadrao(), { uf: 'SP', sobrescrever: false })
const VISTAS = ['frontal', 'lateral', 'interna', 'interna_gavetas', 'planta', 'detalhe', '3d', 'explodida']

// Todas as folhas e vistas de todos os modelos precisam gerar SVG válido (sem NaN/undefined).
describe('desenhos', () => {
  it.each(PRESETS.map(p => p.id))('%s', id => {
    const calc = calcularProjeto(projetoDoModelo(id), cat)
    const pgs = montarPaginas(calc, { materiais: true, chapas: true, valores: 'itens' })
    expect(pgs.length).toBeGreaterThanOrEqual(2)
    for (const pg of pgs) {
      const s = pg.svg()
      expect(s.startsWith('<svg')).toBe(true)
      expect(s).not.toContain('NaN'); expect(s).not.toContain('undefined'); expect(s).not.toContain('Infinity')
    }
    for (const v of calc.resultado.vistas) {
      const s = folhaVista(calc, v === 'detalhe' ? 'detalhe' : v)
      expect(s).not.toContain('NaN')
    }
    for (const v of VISTAS) expect(folhaVista(calc, v)).not.toContain('NaN')
    if (process.env.SVG_OUT) {
      mkdirSync(process.env.SVG_OUT, { recursive: true })
      pgs.forEach((pg, i) => writeFileSync(`${process.env.SVG_OUT}/${id}_p${i + 1}.svg`, pg.svg()))
    }
  })
})
