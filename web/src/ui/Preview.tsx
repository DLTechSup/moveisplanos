import { useEffect, useMemo, useRef, useState } from 'react'
import type { Calculo } from '../core/calculo'
import { folhaVista, montarPaginas } from '../draw/prancha'

type Aba = { id: string; titulo: string }

export function Preview({ calc }: { calc: Calculo }) {
  const gav = calc.projeto.motor === 'gavetas'
  const abas: Aba[] = [
    { id: 'prancha', titulo: 'Prancha' }, { id: 'corte', titulo: 'Corte e materiais' }, { id: 'chapas', titulo: 'Chapas' },
    { id: 'frontal', titulo: 'Frontal' }, { id: 'lateral', titulo: 'Lateral' }, { id: 'interna', titulo: 'Interna' },
    { id: 'interna_gavetas', titulo: gav ? 'Interna com gavetas' : 'Interna (prateleiras)' },
    { id: 'caixa', titulo: gav ? 'Gaveta' : 'Porta' }, { id: '3d', titulo: '3D' }, { id: 'explodida', titulo: 'Explodida' },
    { id: 'cliente', titulo: 'Cliente' },
  ]
  const [aba, setAba] = useState('prancha')
  const [zoom, setZoom] = useState(1)
  const [pagChapa, setPagChapa] = useState(1)
  const area = useRef<HTMLDivElement>(null)

  const paginas = useMemo(() => montarPaginas(calc, 'completo'), [calc])
  const nChapas = Math.max(paginas.length - 3, 0)
  const svg = useMemo(() => {
    if (aba === 'prancha') return paginas[0].svg()
    if (aba === 'corte') return paginas[1].svg()
    if (aba === 'chapas') return nChapas ? paginas[2 + Math.min(pagChapa, nChapas) - 1].svg() : ''
    if (aba === 'cliente') return montarPaginas(calc, 'cliente')[0].svg()
    return folhaVista(calc, aba)
  }, [calc, aba, paginas, pagChapa, nChapas])

  // Ctrl + roda do mouse = zoom (precisa de listener não passivo para impedir o zoom do navegador)
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
        {abas.map(a => (
          <button key={a.id} role="tab" aria-selected={aba === a.id} className={aba === a.id ? 'ativa' : ''} onClick={() => setAba(a.id)}>{a.titulo}</button>
        ))}
        <span className="zoom">
          {aba === 'chapas' && nChapas > 1 && (
            <>página <select value={Math.min(pagChapa, nChapas)} onChange={e => setPagChapa(Number(e.target.value))}>
              {Array.from({ length: nChapas }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}</select> de {nChapas} </>
          )}
          <button onClick={() => setZoom(z => Math.max(0.4, z / 1.2))} title="Diminuir">−</button>
          <button onClick={() => setZoom(1)} title="Ajustar à tela">{Math.round(zoom * 100)}%</button>
          <button onClick={() => setZoom(z => Math.min(4, z * 1.2))} title="Aumentar">+</button>
        </span>
      </div>
      <div className="folha-area" ref={area}>
        <div className="folha" style={{ width: `${zoom * 100}%` }} dangerouslySetInnerHTML={{ __html: svg }} />
      </div>
    </div>
  )
}
