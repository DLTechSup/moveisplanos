import { it, expect } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { calcularProjeto } from '../src/core/calculo'
import { catalogoPadrao } from '../src/core/catalogo'
import { aplicarPreset, PRESETS } from '../src/core/presets'
import { projetoPadrao } from '../src/core/tipos'
import { folhaVista, montarPaginas } from '../src/draw/prancha'

// Garante que todas as páginas e vistas de todos os presets geram SVG bem formado.
it.each(Object.keys(PRESETS))('desenha %s', tipo => {
  const calc = calcularProjeto(aplicarPreset(projetoPadrao(), tipo), catalogoPadrao())
  const pgs = montarPaginas(calc, 'completo')
  expect(pgs.length).toBeGreaterThanOrEqual(4)
  for (const pg of pgs) { const s = pg.svg(); expect(s.startsWith('<svg')).toBe(true); expect(s).not.toContain('NaN'); expect(s).not.toContain('undefined') }
  for (const v of ['frontal', 'lateral', 'interna', 'interna_gavetas', 'caixa', '3d', 'explodida']) {
    const s = folhaVista(calc, v); expect(s).not.toContain('NaN')
  }
  if (process.env.SVG_OUT) {
    mkdirSync(process.env.SVG_OUT, { recursive: true })
    pgs.forEach((pg, i) => writeFileSync(`${process.env.SVG_OUT}/${tipo}_p${i + 1}.svg`, pg.svg()))
    writeFileSync(`${process.env.SVG_OUT}/${tipo}_expl.svg`, folhaVista(calc, 'explodida'))
  }
})
