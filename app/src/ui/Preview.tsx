import { useEffect, useMemo, useRef, useState } from 'react'
import type { Calculo } from '../core/calculo'
import { Component, type ReactNode } from 'react'
import { Visualizador3D } from './Visualizador3D'
import { NOMES_VISTAS, OPCOES_PADRAO, folhaVista, montarPaginas, paginasChapasPreview } from '../draw/folha'

/** Evita que um erro numa aba derrube o programa inteiro (tela branca). */
class Protegido extends Component<{ children: ReactNode }, { erro: string }> {
  state = { erro: '' }
  static getDerivedStateFromError(e: unknown) { return { erro: e instanceof Error ? e.message : String(e) } }
  render() {
    return this.state.erro
      ? <div className="erro-txt" style={{ padding: 20 }}><b>Não foi possível mostrar esta aba.</b><br />{this.state.erro}<br /><button onClick={() => this.setState({ erro: '' })}>Tentar de novo</button></div>
      : this.props.children
  }
}

export function Preview({ calc, editor, onSalvarVista }: { calc: Calculo; editor: React.ReactNode; onSalvarVista: (id: string) => void }) {
  const vistas = calc.resultado.vistas
  const modular = calc.projeto.familia === 'modular'
  const abas: { id: string; titulo: string }[] = [
    ...(modular ? [{ id: 'editor', titulo: '✎ Editor (montar)' }] : []),
    { id: 'real3d', titulo: '🎬 3D realista (abrir portas)' },
    { id: 'folha1', titulo: 'Folha do projeto' }, { id: 'folha2', titulo: 'Materiais e valores' }, { id: 'chapas', titulo: 'Plano de chapas' },
    ...vistas.map(v => ({ id: v, titulo: v === 'detalhe' ? (calc.resultado.detalhe === 'porta' ? 'Porta' : 'Gaveta') : NOMES_VISTAS[v] })),
  ]
  const [aba, setAba] = useState(modular ? 'editor' : 'folha1')
  const [zoom, setZoom] = useState(1)
  const [pagChapa, setPagChapa] = useState(1)
  const area = useRef<HTMLDivElement>(null)
  const ativa = abas.some(a => a.id === aba) ? aba : abas[0].id

  const paginas = useMemo(() => { try { return montarPaginas(calc, OPCOES_PADRAO) } catch { return [] as ReturnType<typeof montarPaginas> } }, [calc])
  const chapas = useMemo(() => { try { return paginasChapasPreview(calc) } catch { return [] as ReturnType<typeof paginasChapasPreview> } }, [calc])
  const retrato = ativa === 'folha1' || ativa === 'folha2' || ativa === 'chapas'
  const svg = useMemo(() => { try {
    if (ativa === 'editor' || ativa === 'real3d') return ''
    if (ativa === 'folha1') return paginas[0]?.svg() ?? ''
    if (ativa === 'folha2') return (paginas[1] ?? montarPaginas(calc, OPCOES_PADRAO)[0]).svg()
    if (ativa === 'chapas') return chapas.length ? chapas[Math.min(pagChapa, chapas.length) - 1].svg() : ''
    return folhaVista(calc, ativa)
  } catch (e) { return `<p style="padding:20px;color:#b42318"><b>Não foi possível desenhar esta vista.</b><br>${e instanceof Error ? e.message : String(e)}</p>` } }, [calc, ativa, paginas, chapas, pagChapa])

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
          <button className="salvar-vista" onClick={() => onSalvarVista(ativa === 'editor' ? 'frontal' : ativa)} title="Salvar só esta parte do projeto (PDF, PNG ou SVG)">Salvar esta vista…</button>
          {ativa === 'chapas' && chapas.length > 1 && (
            <>página <select value={Math.min(pagChapa, chapas.length)} onChange={e => setPagChapa(Number(e.target.value))}>
              {chapas.map((_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}</select> de {chapas.length} </>
          )}
          <button onClick={() => setZoom(z => Math.max(0.4, z / 1.2))} title="Diminuir">−</button>
          <button onClick={() => setZoom(1)} title="Ajustar à tela">{Math.round(zoom * 100)}%</button>
          <button onClick={() => setZoom(z => Math.min(4, z * 1.2))} title="Aumentar">+</button>
        </span>
      </div>
      {ativa === 'real3d' ? <Protegido key={ativa}><Visualizador3D calc={calc} /></Protegido> : ativa === 'editor' ? <div className="editor-area"><Protegido key={ativa}>{editor}</Protegido></div> : (
        <div className="folha-area" ref={area}>
          <div className={`folha ${retrato ? 'retrato' : ''}`} style={{ width: retrato ? `${78 * zoom}%` : `${zoom * 100}%` }} dangerouslySetInnerHTML={{ __html: svg }} />
        </div>
      )}
    </div>
  )
}
