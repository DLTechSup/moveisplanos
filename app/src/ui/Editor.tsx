// Editor interativo: o móvel desenhado em escala; clique para selecionar um vão, arraste as divisórias para redimensionar,
// arraste os blocos da paleta (ou um vão selecionado) para encaixar em qualquer lugar.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as C from '../core/catalogo'
import type { Calculo } from '../core/calculo'
import { fmtCm } from '../core/formato'
import { ancestral, contem, definirTam, encaixar, folhaPadrao, mover, obter, remover, repartir, resolver } from '../core/layout'
import type { Caminho, Zona } from '../core/layout'
import type { Divisao, No, Projeto, Regiao, Secao } from '../core/tipos'
import { ehDivisao } from '../core/tipos'
import { distribuir, pesosGavetas } from '../core/comum'
import { textura } from '../draw/texturas'

export type EditarLayout = (fn: (l: No) => { layout: No; selecao?: Caminho | null } | null, chave?: string) => void

interface Props {
  calc: Calculo; projeto: Projeto
  selecao: Caminho | null; setSelecao: (c: Caminho | null) => void
  editarLayout: EditarLayout
  editarDims: (patch: { largura?: number; altura?: number }) => void
}

type Drag =
  | { tipo: 'divisor'; caminho: Caminho; indice: number; dir: 'v' | 'h'; x0: number; y0: number; sa: number; sb: number }
  | { tipo: 'paleta'; secao: Secao; rotulo: string }
  | { tipo: 'mover'; de: Caminho }
  | { tipo: 'borda'; eixo: 'L' | 'H'; x0: number; y0: number; v0: number }

const PALETA: { rotulo: string; icone: string; secao: () => Secao }[] = [
  { rotulo: 'Gavetas', icone: '▤', secao: () => folhaPadrao('gavetas', { n: 3 }) },
  { rotulo: 'Portas', icone: '▯▯', secao: () => folhaPadrao('portas', { prateleiras: 2 }) },
  { rotulo: 'Vão aberto', icone: '▭', secao: () => folhaPadrao('aberto', { prateleiras: 3 }) },
  { rotulo: 'Cabideiro', icone: '┬', secao: () => folhaPadrao('aberto', { cabideiro: true }) },
  { rotulo: 'Nicho', icone: '□', secao: () => folhaPadrao('aberto', { prateleiras: 0 }) },
]
const NOME_TIPO = { gavetas: 'Gavetas', portas: 'Portas', aberto: 'Vão aberto' } as const
const ZONAS: Record<Zona, string> = { centro: 'Substituir este vão', esquerda: 'Inserir à esquerda', direita: 'Inserir à direita', acima: 'Inserir acima', abaixo: 'Inserir abaixo' }

function zonaDe(r: Regiao, x: number, y: number): Zona {
  const rx = (x - r.x) / r.w, ry = (y - r.y) / r.h        // y para cima
  const faixa = 0.27
  const d: [Zona, number][] = [['esquerda', rx], ['direita', 1 - rx], ['abaixo', ry], ['acima', 1 - ry]]
  d.sort((a, b) => a[1] - b[1])
  return d[0][1] < faixa ? d[0][0] : 'centro'
}

export function Editor({ calc, projeto, selecao, setSelecao, editarLayout, editarDims }: Props) {
  const m = calc.resultado.medidas
  const cat = calc.catalogo
  const e: number = m.e, L: number = m.L, Ht: number = m.H
  const interior: Regiao = useMemo(() => ({ x: e, y: m.ybase_int, w: L - 2 * e, h: m.Hi }), [e, L, m.ybase_int, m.Hi])
  const R = useMemo(() => resolver(projeto.layout, interior, e), [projeto.layout, interior, e])
  const caixa = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [tam, setTam] = useState({ w: 800, h: 560 })
  const [drag, setDrag] = useState<Drag | null>(null)
  const dragRef = useRef<Drag | null>(null)
  const [ponteiro, setPonteiro] = useState<{ x: number; y: number; cx: number; cy: number } | null>(null)
  const [hover, setHover] = useState<Caminho | null>(null)
  const [dica, setDica] = useState('')

  useEffect(() => {
    const el = caixa.current
    if (!el) return
    const ro = new ResizeObserver(() => setTam({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el); setTam({ w: el.clientWidth, h: el.clientHeight })
    return () => ro.disconnect()
  }, [])

  // escala e origem (px)
  const ml = 90, mr = 110, mt = 60, mb = 56
  const k = Math.max(0.01, Math.min((tam.w - ml - mr) / L, (tam.h - mt - mb) / Ht))
  const ox = ml + (tam.w - ml - mr - L * k) / 2
  const oy = mt + (tam.h - mt - mb - Ht * k) / 2 + Ht * k
  const X = (x: number) => ox + x * k
  const Y = (y: number) => oy - y * k
  const doPx = useCallback((cx: number, cy: number) => {
    const b = svgRef.current!.getBoundingClientRect()
    return { x: (cx - b.left - ox) / k, y: (oy - (cy - b.top)) / k }
  }, [ox, oy, k])

  const corEstr = C.padrao(cat, projeto.estrutura_padrao)
  const corFre = C.padrao(cat, projeto.frente_padrao)
  const texEstr = corEstr.imagem || textura(corEstr.veio ? 'madeira' : 'liso', corEstr.cor, 128, 3)
  const texFre = corFre.imagem || textura(corFre.veio ? 'madeira' : 'liso', corFre.cor, 128, 5)
  const fundoCor = C.padrao(cat, projeto.fundo_padrao).cor

  const folhaEm = (x: number, y: number) => R.folhas.find(f => contem(f.rect, x, y, 0))
  const alvoDrop = (x: number, y: number) => {
    const f = folhaEm(x, y)
    if (!f) return null
    return { f, zona: zonaDe(f.rect, x, y) }
  }

  // ---- ações ---------------------------------------------------------------------------------------------------------------------------------------
  const iniciarDrag = (d: Drag, ev: React.PointerEvent) => {
    ev.preventDefault(); ev.stopPropagation()
    dragRef.current = d; setDrag(d)
    setPonteiro({ x: 0, y: 0, cx: ev.clientX, cy: ev.clientY })
  }

  useEffect(() => {
    if (!drag) return
    const mover_ = (ev: PointerEvent) => {
      const d = dragRef.current
      if (!d || !svgRef.current) return
      const p = doPx(ev.clientX, ev.clientY)
      setPonteiro({ x: p.x, y: p.y, cx: ev.clientX, cy: ev.clientY })
      if (d.tipo === 'divisor') {
        const delta = d.dir === 'v' ? p.x - d.x0 : p.y - d.y0
        const passo = ev.shiftKey ? 1 : 5                 // 0,5 cm (Shift = 1 mm)
        const soma = d.sa + d.sb
        let sa = d.dir === 'v' ? d.sa + delta : d.sa - delta
        sa = Math.round(sa / passo) * passo
        sa = Math.min(Math.max(sa, 60), soma - 60)
        const sb = soma - sa
        setDica(`${fmtCm(sa)} cm  |  ${fmtCm(sb)} cm`)
        editarLayout(l => {
          const l1 = definirTam(l, d.caminho, d.indice, sa / 10)
          return { layout: definirTam(l1, d.caminho, d.indice + 1, sb / 10) }
        }, 'divisor')
      } else if (d.tipo === 'borda') {
        if (d.eixo === 'L') {
          const v = Math.max(20, Math.round((d.v0 + (p.x - d.x0) / 10) * 2) / 2)
          setDica(`largura ${v} cm`); editarDims({ largura: v })
        } else {
          const v = Math.max(20, Math.round((d.v0 + (p.y - d.y0) / 10) * 2) / 2)
          setDica(`altura ${v} cm`); editarDims({ altura: v })
        }
      } else {
        const a = alvoDrop(p.x, p.y)
        setDica(a ? ZONAS[a.zona] : '')
      }
    }
    const soltar = (ev: PointerEvent) => {
      const d = dragRef.current
      dragRef.current = null; setDrag(null); setDica('')
      if (!d || !svgRef.current) return
      if (d.tipo === 'paleta' || d.tipo === 'mover') {
        const p = doPx(ev.clientX, ev.clientY)
        const a = alvoDrop(p.x, p.y)
        if (!a) return
        if (d.tipo === 'paleta') {
          editarLayout(l => { const r = encaixar(l, a.f.caminho, a.zona, d.secao); return { layout: r.raiz, selecao: r.caminho } }, 'encaixar')
        } else {
          editarLayout(l => { const r = mover(l, d.de, a.f.caminho, a.zona); return r ? { layout: r.raiz, selecao: r.caminho } : null }, 'mover')
        }
      }
    }
    const tecla = (ev: KeyboardEvent) => { if (ev.key === 'Escape') { dragRef.current = null; setDrag(null); setDica('') } }
    window.addEventListener('pointermove', mover_); window.addEventListener('pointerup', soltar); window.addEventListener('keydown', tecla)
    return () => { window.removeEventListener('pointermove', mover_); window.removeEventListener('pointerup', soltar); window.removeEventListener('keydown', tecla) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag, doPx, R])

  // Delete remove o vão selecionado
  useEffect(() => {
    const f = (ev: KeyboardEvent) => {
      const alvo = ev.target as HTMLElement
      if (/INPUT|TEXTAREA|SELECT/.test(alvo.tagName)) return
      if ((ev.key === 'Delete' || ev.key === 'Backspace') && selecao) { ev.preventDefault(); excluir() }
    }
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  })

  const excluir = () => {
    if (!selecao) return
    editarLayout(l => { const r = remover(l, selecao); return r ? { layout: r, selecao: null } : null }, 'excluir')
  }
  const dividir = (dir: 'v' | 'h') => {
    if (!selecao) return
    editarLayout(l => { const r = encaixar(l, selecao, dir === 'v' ? 'direita' : 'abaixo', folhaPadrao('aberto', { prateleiras: 2 })); return { layout: r.raiz, selecao: r.caminho } }, 'dividir')
  }
  const duplicar = () => {
    if (!selecao) return
    const no = obter(projeto.layout, selecao)
    if (!no || ehDivisao(no)) return
    const pai = selecao.length ? obter(projeto.layout, selecao.slice(0, -1)) : null
    const dir = pai && ehDivisao(pai) && pai.dir === 'h' ? 'abaixo' : 'direita'
    editarLayout(l => { const r = encaixar(l, selecao, dir, JSON.parse(JSON.stringify(no))); return { layout: r.raiz, selecao: r.caminho } }, 'duplicar')
  }

  const selFolha = selecao ? R.folhas.find(f => f.caminho.length === selecao.length && f.caminho.every((v, i) => v === selecao[i])) : null
  const alvo = drag && (drag.tipo === 'paleta' || drag.tipo === 'mover') && ponteiro ? alvoDrop(ponteiro.x, ponteiro.y) : null

  const rectPx = (r: Regiao) => ({ x: X(r.x), y: Y(r.y + r.h), w: r.w * k, h: r.h * k })

  // ---- desenho de cada tipo de vão -----------------------------------------------------------------------------------------------------------------
  const conteudo = (f: typeof R.folhas[number]) => {
    const r = rectPx(f.rect), s = f.no
    const els: React.ReactNode[] = []
    const ins = 3
    if (s.tipo === 'gavetas') {
      const n = Math.max(1, s.n)
      const hs = distribuir(r.h - ins * 2 - (n - 1) * 3, n, pesosGavetas(s.crescente, n), (s.alturas || []).map(v => v * 10 * k))
      let y = r.y + ins
      hs.forEach((h, j) => {
        els.push(<rect key={'g' + j} x={r.x + ins} y={y} width={Math.max(0, r.w - ins * 2)} height={Math.max(0, h)} rx={2} fill="url(#tex-fre)" stroke="#5a4020" strokeWidth={1.4} />)
        els.push(<rect key={'p' + j} x={r.x + r.w / 2 - Math.min(r.w * 0.12, 22)} y={y + h / 2 - 1.5} width={Math.min(r.w * 0.24, 44)} height={3} rx={1.5} fill="#444" />)
        y += h + 3
      })
    } else if (s.tipo === 'portas') {
      const wFront = r.w / k
      const nd = s.portas > 0 ? s.portas : Math.max(1, Math.ceil(wFront / 600 - 1e-9))
      const dw = (r.w - ins * 2 - (nd - 1) * 3) / nd
      for (let j = 0; j < nd; j++) {
        const x = r.x + ins + j * (dw + 3)
        els.push(<rect key={'d' + j} x={x} y={r.y + ins} width={Math.max(0, dw)} height={Math.max(0, r.h - ins * 2)} rx={2} fill={s.espelho ? '#cfe4ee' : 'url(#tex-fre)'} stroke="#5a4020" strokeWidth={1.4} />)
        const esq = nd > 1 ? j < Math.floor((nd + 1) / 2) : true
        els.push(<rect key={'q' + j} x={esq ? x + dw - 9 : x + 6} y={r.y + r.h / 2 - 12} width={3.5} height={24} rx={1.7} fill="#444" />)
      }
      if (s.prateleiras || s.cabideiro) els.push(<text key="in" x={r.x + r.w / 2} y={r.y + r.h - 8} fontSize={10} fill="#fff" textAnchor="middle" opacity={0.85}>{s.cabideiro ? 'cabideiro' : `${s.prateleiras} prat.`}</text>)
    } else {
      els.push(<rect key="a" x={r.x + 1} y={r.y + 1} width={Math.max(0, r.w - 2)} height={Math.max(0, r.h - 2)} fill={fundoCor} />)
      els.push(<rect key="s1" x={r.x + 1} y={r.y + 1} width={Math.max(0, r.w - 2)} height={Math.min(18, r.h)} fill="#000" opacity={0.13} />)
      els.push(<rect key="s2" x={r.x + 1} y={r.y + 1} width={Math.min(14, r.w)} height={Math.max(0, r.h - 2)} fill="#000" opacity={0.09} />)
      const nprat = Math.max(0, s.prateleiras)
      const livre = (f.rect.h - nprat * e) / (nprat + 1)
      for (let j = 1; j <= nprat; j++) {
        const y = f.rect.y + j * livre + (j - 1) * e
        const rr = rectPx({ x: f.rect.x + 8, y, w: f.rect.w - 16, h: e })
        els.push(<rect key={'s' + j} x={rr.x} y={rr.y} width={rr.w} height={Math.max(3, rr.h)} fill="url(#tex-estr)" stroke="#5a4020" strokeWidth={1} />)
      }
      if (s.cabideiro) {
        const yr = Y(f.rect.y + f.rect.h - 95)
        els.push(<line key="cab" x1={r.x + 5} x2={r.x + r.w - 5} y1={yr} y2={yr} stroke="#8a8f98" strokeWidth={4.5} strokeLinecap="round" />)
        for (let j = 1; j <= 3; j++) els.push(<path key={'h' + j} d={`M${r.x + (r.w * j) / 4} ${yr} l-7 14 h14 z`} fill="none" stroke="#667" strokeWidth={1.4} />)
      }
    }
    return els
  }

  const rotuloFolha = (f: typeof R.folhas[number]) => {
    const r = rectPx(f.rect)
    if (r.w < 70 || r.h < 40) return null
    return (
      <g pointerEvents="none">
        <rect x={r.x + r.w / 2 - 47} y={r.y + r.h / 2 - 11} width={94} height={22} rx={11} fill="#fff" opacity={0.88} />
        <text x={r.x + r.w / 2} y={r.y + r.h / 2 + 4} fontSize={11.5} fontWeight={700} fill="#1b4a7a" textAnchor="middle">{fmtCm(f.rect.w)} × {fmtCm(f.rect.h)}</text>
      </g>
    )
  }

  return (
    <div className="editor">
      <div className="paleta-editor">
        <span className="rot">Arraste para o desenho:</span>
        {PALETA.map(p => (
          <button key={p.rotulo} type="button" className="chip-paleta" onPointerDown={ev => iniciarDrag({ tipo: 'paleta', secao: p.secao(), rotulo: p.rotulo }, ev)} title={`Arraste "${p.rotulo}" para um vão (solte perto da borda para encaixar ao lado)`}>
            <b>{p.icone}</b> {p.rotulo}
          </button>
        ))}
        <span className="sep" />
        <button type="button" className="sec" disabled={!selecao} onClick={() => dividir('v')} title="Divide o vão selecionado em dois lado a lado">Dividir ↔</button>
        <button type="button" className="sec" disabled={!selecao} onClick={() => dividir('h')} title="Divide o vão selecionado em dois, um sobre o outro">Dividir ↕</button>
        <button type="button" className="sec" disabled={!selecao} onClick={duplicar}>Duplicar</button>
        <button type="button" className="sec perigo" disabled={!selecao || R.folhas.length <= 1} onClick={excluir} title="Delete">Excluir</button>
      </div>
      <div className="editor-quadro" ref={caixa}>
        <svg ref={svgRef} width={tam.w} height={tam.h} className={drag ? 'arrastando' : ''} onPointerDown={() => setSelecao(null)}>
          <defs>
            {texEstr && <pattern id="tex-estr" patternUnits="userSpaceOnUse" width={96} height={96}><image href={texEstr} width={96} height={96} /></pattern>}
            {texFre && <pattern id="tex-fre" patternUnits="userSpaceOnUse" width={110} height={110}><image href={texFre} width={110} height={110} /></pattern>}
          </defs>
          {!texEstr && <style>{'#tex-estr{}'}</style>}
          {/* chão */}
          <line x1={X(-60)} x2={X(L + 60)} y1={Y(0)} y2={Y(0)} stroke="#9aa7b5" strokeWidth={2} />
          {/* estrutura */}
          {(() => {
            const fill = texEstr ? 'url(#tex-estr)' : corEstr.cor
            const bx = (x: number, y: number, w: number, h: number, key: string) => { const r = rectPx({ x, y, w, h }); return <rect key={key} x={r.x} y={r.y} width={r.w} height={r.h} fill={fill} stroke="#5a4020" strokeWidth={1.5} /> }
            return [
              <rect key="int" x={X(e)} y={Y(m.ytop_int)} width={(L - 2 * e) * k} height={m.Hi * k} fill="#3a352d" />,
              bx(0, m.y0, e, m.topo_lat - m.y0, 'le'), bx(L - e, m.y0, e, m.topo_lat - m.y0, 'ld'),
              bx(0, m.H - e, L, e, 'tp'), bx(e, m.y0 + m.rod, L - 2 * e, e, 'bs'),
              ...(m.rod > 0 ? [bx(e, m.y0, L - 2 * e, m.rod, 'rd')] : []),
            ]
          })()}
          {/* vãos */}
          {R.folhas.map(f => {
            const r = rectPx(f.rect)
            const sel = selecao && f.caminho.length === selecao.length && f.caminho.every((v, i) => v === selecao[i])
            const hov = hover && f.caminho.length === hover.length && f.caminho.every((v, i) => v === hover[i])
            return (
              <g key={f.caminho.join('-') || 'raiz'}
                onPointerEnter={() => setHover(f.caminho)} onPointerLeave={() => setHover(null)}
                onPointerDown={ev => { ev.stopPropagation(); setSelecao(f.caminho) }} style={{ cursor: 'pointer' }}>
                <rect x={r.x} y={r.y} width={r.w} height={r.h} fill="#2c2820" />
                {conteudo(f)}
                {hov && !sel && <rect x={r.x} y={r.y} width={r.w} height={r.h} fill="#4aa3ff" opacity={0.16} />}
                {rotuloFolha(f)}
                <text x={r.x + 6} y={r.y + 14} fontSize={10.5} fill="#fff" opacity={0.0}>{NOME_TIPO[f.no.tipo]}</text>
              </g>
            )
          })}
          {/* divisórias (tábuas) arrastáveis */}
          {R.divisores.map(d => {
            const r = rectPx(d.rect)
            const pad = 7
            const tamPai = d.dir === 'v' ? d.pai.w : d.pai.h
            const no = obter(projeto.layout, d.caminho) as Divisao
            const sizes = repartir(tamPai, no.tam, e)
            return (
              <g key={`${d.caminho.join('-')}:${d.indice}`}>
                <rect x={r.x} y={r.y} width={Math.max(r.w, 2)} height={Math.max(r.h, 2)} fill={texEstr ? 'url(#tex-estr)' : corEstr.cor} stroke="#5a4020" strokeWidth={1.2} pointerEvents="none" />
                <rect x={r.x - (d.dir === 'v' ? pad : 0)} y={r.y - (d.dir === 'h' ? pad : 0)} width={r.w + (d.dir === 'v' ? pad * 2 : 0)} height={r.h + (d.dir === 'h' ? pad * 2 : 0)} fill="transparent"
                  style={{ cursor: d.dir === 'v' ? 'col-resize' : 'row-resize' }}
                  onPointerDown={ev => { const p = doPx(ev.clientX, ev.clientY); iniciarDrag({ tipo: 'divisor', caminho: d.caminho, indice: d.indice, dir: d.dir, x0: p.x, y0: p.y, sa: sizes[d.indice], sb: sizes[d.indice + 1] }, ev) }} />
                {/* pegador */}
                <rect x={r.x + r.w / 2 - (d.dir === 'v' ? 3 : 14)} y={r.y + r.h / 2 - (d.dir === 'v' ? 14 : 3)} width={d.dir === 'v' ? 6 : 28} height={d.dir === 'v' ? 28 : 6} rx={3} fill="#1b4a7a" opacity={0.75} pointerEvents="none" />
              </g>
            )
          })}
          {/* seleção + medidas do vão */}
          {selFolha && (() => {
            const r = rectPx(selFolha.rect)
            const wC = selFolha.rect.w, hC = selFolha.rect.h
            return (
              <g>
                <rect x={r.x} y={r.y} width={r.w} height={r.h} fill="none" stroke="#e8590c" strokeWidth={3} pointerEvents="none" />
                {/* largura */}
                <line x1={r.x} x2={r.x + r.w} y1={r.y - 14} y2={r.y - 14} stroke="#e8590c" strokeWidth={1.6} />
                <line x1={r.x} x2={r.x} y1={r.y - 20} y2={r.y - 8} stroke="#e8590c" strokeWidth={1.6} /><line x1={r.x + r.w} x2={r.x + r.w} y1={r.y - 20} y2={r.y - 8} stroke="#e8590c" strokeWidth={1.6} />
                <rect x={r.x + r.w / 2 - 38} y={r.y - 29} width={76} height={19} rx={9} fill="#e8590c" />
                <text x={r.x + r.w / 2} y={r.y - 15.5} fontSize={11.5} fontWeight={700} fill="#fff" textAnchor="middle">{fmtCm(wC)} cm</text>
                {/* altura */}
                <line x1={r.x - 14} x2={r.x - 14} y1={r.y} y2={r.y + r.h} stroke="#e8590c" strokeWidth={1.6} />
                <line x1={r.x - 20} x2={r.x - 8} y1={r.y} y2={r.y} stroke="#e8590c" strokeWidth={1.6} /><line x1={r.x - 20} x2={r.x - 8} y1={r.y + r.h} y2={r.y + r.h} stroke="#e8590c" strokeWidth={1.6} />
                <g transform={`translate(${r.x - 15} ${r.y + r.h / 2}) rotate(-90)`}><rect x={-38} y={-19} width={76} height={19} rx={9} fill="#e8590c" /><text x={0} y={-5.5} fontSize={11.5} fontWeight={700} fill="#fff" textAnchor="middle">{fmtCm(hC)} cm</text></g>
                {/* pegador para mover o vão */}
                <g style={{ cursor: 'grab' }} onPointerDown={ev => iniciarDrag({ tipo: 'mover', de: selFolha.caminho }, ev)}>
                  <rect x={r.x + 6} y={r.y + 6} width={78} height={22} rx={11} fill="#1b4a7a" />
                  <text x={r.x + 45} y={r.y + 21} fontSize={11} fontWeight={700} fill="#fff" textAnchor="middle">⠿ mover</text>
                </g>
              </g>
            )
          })()}
          {/* medidas externas e alças */}
          <g pointerEvents="none" fontSize={12} fontWeight={700} fill="#1b4a7a">
            <line x1={X(0)} x2={X(L)} y1={Y(Ht) - 26} y2={Y(Ht) - 26} stroke="#1b4a7a" /><text x={X(L / 2)} y={Y(Ht) - 31} textAnchor="middle">{fmtCm(L)} cm (largura externa)</text>
            <line x1={X(L) + 26} x2={X(L) + 26} y1={Y(0)} y2={Y(Ht)} stroke="#1b4a7a" />
            <g transform={`translate(${X(L) + 40} ${Y(Ht / 2)}) rotate(90)`}><text textAnchor="middle">{fmtCm(Ht)} cm (altura)</text></g>
            <text x={X(L / 2)} y={Y(0) + 24} textAnchor="middle" fill="#5d6b7a" fontWeight={500}>profundidade {fmtCm(m.P)} cm • interna útil {fmtCm(m.Dint)} cm</text>
          </g>
          <g>
            <circle cx={X(L)} cy={Y(Ht / 2)} r={7} fill="#1b4a7a" stroke="#fff" strokeWidth={2} style={{ cursor: 'ew-resize' }}
              onPointerDown={ev => { const p = doPx(ev.clientX, ev.clientY); iniciarDrag({ tipo: 'borda', eixo: 'L', x0: p.x, y0: p.y, v0: projeto.largura }, ev) }}><title>Arraste para mudar a largura</title></circle>
            <circle cx={X(L / 2)} cy={Y(Ht)} r={7} fill="#1b4a7a" stroke="#fff" strokeWidth={2} style={{ cursor: 'ns-resize' }}
              onPointerDown={ev => { const p = doPx(ev.clientX, ev.clientY); iniciarDrag({ tipo: 'borda', eixo: 'H', x0: p.x, y0: p.y, v0: projeto.altura }, ev) }}><title>Arraste para mudar a altura</title></circle>
          </g>
          {/* zona de encaixe */}
          {alvo && (() => {
            const r = rectPx(alvo.f.rect)
            const z = alvo.zona
            const fx = 0.3
            const zr = z === 'centro' ? r : z === 'esquerda' ? { x: r.x, y: r.y, w: r.w * fx, h: r.h } : z === 'direita' ? { x: r.x + r.w * (1 - fx), y: r.y, w: r.w * fx, h: r.h }
              : z === 'acima' ? { x: r.x, y: r.y, w: r.w, h: r.h * fx } : { x: r.x, y: r.y + r.h * (1 - fx), w: r.w, h: r.h * fx }
            return <g pointerEvents="none"><rect x={zr.x} y={zr.y} width={zr.w} height={zr.h} fill="#2f9e44" opacity={0.38} stroke="#2f9e44" strokeWidth={3} strokeDasharray="6 4" /></g>
          })()}
        </svg>
        {drag && ponteiro && (drag.tipo === 'paleta' || drag.tipo === 'mover') && (
          <div className="fantasma" style={{ left: ponteiro.cx + 14, top: ponteiro.cy + 10 }}>{drag.tipo === 'paleta' ? drag.rotulo : 'mover vão'}{dica ? ` — ${dica}` : ''}</div>
        )}
        {drag && (drag.tipo === 'divisor' || drag.tipo === 'borda') && dica && ponteiro && <div className="fantasma" style={{ left: ponteiro.cx + 14, top: ponteiro.cy + 10 }}>{dica}</div>}
        {!selecao && !drag && <div className="dica-editor">Clique num vão para ver e editar suas medidas. Arraste as divisórias para redimensionar e os blocos da paleta para encaixar.</div>}
      </div>
    </div>
  )
}
