import { useEffect, useMemo, useRef, useState } from 'react'
import type { Calculo } from '../core/calculo'
import { NOMES_VISTAS, OPCOES_PADRAO, folhaVista, montarPaginas, paginasChapasPreview } from '../draw/folha'

export function Preview({ calc }: { calc: Calculo }) {
  const vistas = calc.resultado.vistas
  const abas: { id: string; titulo: string }[] = [
    { id: 'folha1', titulo: 'Folha do projeto' }, { id: 'folha2', titulo: 'Materiais e valores' }, { id: 'chapas', titulo: 'Plano de chapas' },
    ...vistas.map(v => ({ id: v, titulo: v === 'detalhe' ? (calc.resultado.detalhe === 'porta' ? 'Porta' : 'Gaveta') : NOMES_VISTAS[v] })),
  ]
  const [aba, setAba] = useState('folha1')
  const [zoom, setZoom] = useState(1)
  const [pagChapa, setPagChapa] = useState(1)
  const area = useRef<HTMLDivElement>(null)
  const ativa = abas.some(a => a.id === aba) ? aba : 'folha1'

  const paginas = useMemo(() => montarPaginas(calc, OPCOES_PADRAO), [calc])
  const chapas = useMemo(() => paginasChapasPreview(calc), [calc])
  const retrato = ativa === 'folha1' || ativa === 'folha2' || ativa === 'chapas'
  const svg = useMemo(() => {
    if (ativa === 'folha1') return paginas[0].svg()
    if (ativa === 'folha2') return (paginas[1] ?? montarPaginas(calc, OPCOES_PADRAO)[0]).svg()
    if (ativa === 'chapas') return chapas.length ? chapas[Math.min(pagChapa, chapas.length) - 1].svg() : ''
    return folhaVista(calc, ativa)
  }, [calc, ativa, paginas, chapas, pagChapa])

  // Ctrl + roda do mouse = zoom
  useEffect(() => {
    const el = area.current
    if (!el) return
    const f = (e: WheelEvent) => {
      if (!e.ctrlKey) return
      e.preventDefault()
      setZoom(z => Math.min(4, Math.max(0.4, z * (e.deltaY < 0 ? 1.12 : 1 / 1.12))))
    }
    el.addEventListener('wheel', f, { passive: false })
    return () => el.removeEventListener('wheel', f)
  }, [])

  return (
    <div className="preview">
      <div className="abas" role="tablist">
        {abas.map(a => <button key={a.id} role="tab" aria-selected={ativa === a.id} className={ativa === a.id ? 'ativa' : ''} onClick={() => setAba(a.id)}>{a.titulo}</button>)}
        <span className="zoom">
          {ativa === 'chapas' && chapas.length > 1 && (
            <>página <select value={Math.min(pagChapa, chapas.length)} onChange={e => setPagChapa(Number(e.target.value))}>
              {chapas.map((_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}</select> de {chapas.length} </>
          )}
          <button onClick={() => setZoom(z => Math.max(0.4, z / 1.2))} title="Diminuir">−</button>
          <button onClick={() => setZoom(1)} title="Ajustar à tela">{Math.round(zoom * 100)}%</button>
          <button onClick={() => setZoom(z => Math.min(4, z * 1.2))} title="Aumentar">+</button>
        </span>
      </div>
      <div className="folha-area" ref={area}>
        <div className={`folha ${retrato ? 'retrato' : ''}`} style={{ width: retrato ? `${78 * zoom}%` : `${zoom * 100}%` }} dangerouslySetInnerHTML={{ __html: svg }} />
      </div>
    </div>
  )
}
