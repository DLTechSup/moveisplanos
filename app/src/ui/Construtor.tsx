// Montagem visual do móvel: colunas e seções (gavetas, portas, vão aberto) com desenho que se atualiza a cada passo.
import { useState } from 'react'
import type { Calculo } from '../core/calculo'
import { secaoPadrao } from '../core/tipos'
import type { Coluna, Projeto, Secao, TipoSecao } from '../core/tipos'
import { Inteiro, Linha, Num, Select } from './campos'

const NOMES: Record<TipoSecao, string> = { gavetas: 'Gavetas', portas: 'Portas', aberto: 'Vão aberto' }

function alturasSecoes(secoes: Secao[], total: number): number[] {
  const n = secoes.length
  const fixos = secoes.map(s => (s.altura > 0 ? s.altura * 10 : 0))
  const soma = fixos.reduce((a, b) => a + b, 0)
  const livres = fixos.filter(v => v <= 0).length
  const util = total - (n - 1) * 15
  const resto = livres ? Math.max(util - soma, 0) / livres : 0
  return fixos.map(v => (v > 0 ? v : resto))
}

export function Construtor({ p, calc, set }: { p: Projeto; calc: Calculo; set: (patch: Partial<Projeto>) => void }) {
  const [sel, setSel] = useState<{ c: number; s: number }>({ c: 0, s: 0 })
  const cols = p.colunas
  const c = Math.min(sel.c, cols.length - 1)
  const s = Math.min(sel.s, cols[c].secoes.length - 1)
  const sec = cols[c].secoes[s]
  const m = calc.resultado.medidas
  const vaos: number[] = m.vaos ?? cols.map(() => 1)
  const Hi: number = m.Hi ?? 1000

  const trocarColunas = (novas: Coluna[]) => set({ colunas: novas })
  const editaSecao = (patch: Partial<Secao>) => trocarColunas(cols.map((cl, i) => (i !== c ? cl : { ...cl, secoes: cl.secoes.map((x, j) => (j === s ? { ...x, ...patch } : x)) })))
  const editaColuna = (patch: Partial<Coluna>) => trocarColunas(cols.map((cl, i) => (i === c ? { ...cl, ...patch } : cl)))
  const addSecao = (tipo: TipoSecao) => {
    const nova = secaoPadrao(tipo, tipo === 'gavetas' ? { n: 3 } : tipo === 'portas' ? { prateleiras: 2 } : {})
    trocarColunas(cols.map((cl, i) => (i !== c ? cl : { ...cl, secoes: [...cl.secoes.slice(0, s + 1), nova, ...cl.secoes.slice(s + 1)] })))
    setSel({ c, s: s + 1 })
  }
  const remSecao = () => {
    if (cols[c].secoes.length <= 1) return
    trocarColunas(cols.map((cl, i) => (i !== c ? cl : { ...cl, secoes: cl.secoes.filter((_, j) => j !== s) })))
    setSel({ c, s: Math.max(0, s - 1) })
  }
  const mover = (d: -1 | 1) => {
    const j = s + d
    if (j < 0 || j >= cols[c].secoes.length) return
    trocarColunas(cols.map((cl, i) => {
      if (i !== c) return cl
      const arr = [...cl.secoes];
      [arr[s], arr[j]] = [arr[j], arr[s]]
      return { ...cl, secoes: arr }
    }))
    setSel({ c, s: j })
  }
  const addColuna = () => { trocarColunas([...cols.slice(0, c + 1), { largura: 0, secoes: [secaoPadrao('aberto', { prateleiras: 3 })] }, ...cols.slice(c + 1)]); setSel({ c: c + 1, s: 0 }) }
  const dupColuna = () => { trocarColunas([...cols.slice(0, c + 1), JSON.parse(JSON.stringify(cols[c])), ...cols.slice(c + 1)]); setSel({ c: c + 1, s }) }
  const remColuna = () => { if (cols.length > 1) { trocarColunas(cols.filter((_, i) => i !== c)); setSel({ c: Math.max(0, c - 1), s: 0 }) } }

  // desenho esquemático (elevação frontal) proporcional às larguras e alturas
  const W = 380, H = 300
  const totalW = Math.max(1, vaos.reduce((a, b) => a + b, 0) + (vaos.length + 1) * 15)
  const kx = W / totalW, ky = H / Hi
  let x = 15 * kx
  const blocos: React.ReactNode[] = []
  const colsD = calc.projeto.colunas
  colsD.forEach((col, ci) => {
    const w = Math.max(4, (vaos[ci] ?? 1) * kx)
    const hs = alturasSecoes(col.secoes, Hi)
    let y = 0
    col.secoes.forEach((sc, si) => {
      const h = hs[si] * ky
      const ativo = ci === c && si === s
      const xi = x, yi = y
      const itens: React.ReactNode[] = []
      if (sc.tipo === 'gavetas') {
        const n = Math.max(1, sc.n)
        for (let k = 0; k < n; k++) {
          itens.push(<rect key={'g' + k} x={xi + 2} y={yi + (h / n) * k + 2} width={w - 4} height={h / n - 3} rx={2} fill="#d9b98c" stroke="#7a5a30" />)
          itens.push(<rect key={'p' + k} x={xi + w / 2 - w * 0.12} y={yi + (h / n) * (k + 0.5) - 1.5} width={w * 0.24} height={3} rx={1.5} fill="#555" />)
        }
      } else if (sc.tipo === 'portas') {
        const nd = sc.portas > 0 ? sc.portas : Math.max(1, Math.ceil((vaos[ci] ?? 600) / 600))
        for (let k = 0; k < nd; k++) {
          itens.push(<rect key={'d' + k} x={xi + 2 + (k * (w - 4)) / nd} y={yi + 2} width={(w - 4) / nd - 2} height={h - 4} rx={2} fill={sc.espelho ? '#cfe4ee' : '#d9b98c'} stroke="#7a5a30" />)
          itens.push(<rect key={'q' + k} x={xi + 2 + ((k + 1) * (w - 4)) / nd - 9} y={yi + h / 2 - 8} width={3} height={16} rx={1.5} fill="#555" />)
        }
      } else {
        itens.push(<rect key="a" x={xi + 2} y={yi + 2} width={w - 4} height={h - 4} fill="#f4efe6" stroke="#9a8a70" strokeDasharray="4 3" />)
        for (let k = 1; k <= sc.prateleiras; k++) itens.push(<line key={'s' + k} x1={xi + 2} x2={xi + w - 2} y1={yi + (h / (sc.prateleiras + 1)) * k} y2={yi + (h / (sc.prateleiras + 1)) * k} stroke="#9a8a70" strokeWidth={2} />)
      }
      if (sc.cabideiro) itens.push(<line key="cab" x1={xi + 6} x2={xi + w - 6} y1={yi + 12} y2={yi + 12} stroke="#667" strokeWidth={4} strokeLinecap="round" />)
      blocos.push(
        <g key={`${ci}-${si}`} onClick={() => setSel({ c: ci, s: si })} style={{ cursor: 'pointer' }}>
          <rect x={xi} y={yi} width={w} height={h} fill="transparent" />
          {itens}
          {ativo && <rect x={xi + 1} y={yi + 1} width={w - 2} height={h - 2} fill="none" stroke="#e8590c" strokeWidth={3} rx={3} />}
        </g>)
      y += (hs[si] + 15) * ky
    })
    x += (vaos[ci] + 15) * kx
  })

  return (
    <div className="construtor">
      <svg viewBox={`-6 -6 ${W + 12} ${H + 12}`} className="mini">
        <rect x={0} y={0} width={W} height={H} fill="#a68a64" rx={3} />
        {blocos}
      </svg>
      <p className="dica">Clique numa parte do desenho para editar. O projeto se monta ao lado conforme você adiciona.</p>
      <div className="botoes-linha">
        <button type="button" className="sec" onClick={addColuna}>+ coluna</button>
        <button type="button" className="sec" onClick={dupColuna}>duplicar coluna</button>
        <button type="button" className="sec" onClick={remColuna} disabled={cols.length <= 1}>remover coluna</button>
      </div>
      <div className="sel-info">Coluna {c + 1} de {cols.length} · seção {s + 1} de {cols[c].secoes.length}</div>
      <Linha rotulo="Largura do vão" dica="0 = divide igualmente o espaço que sobrar">
        <Num valor={cols[c].largura} max={400} casas={1} sufixo="cm" onChange={v => editaColuna({ largura: v })} />
      </Linha>
      <Linha rotulo="Tipo da seção">
        <Select valor={sec.tipo} opcoes={Object.entries(NOMES).map(([k, v]) => [v, k] as [string, TipoSecao])}
          onChange={t => editaSecao({ tipo: t, n: t === 'gavetas' ? Math.max(sec.n, 3) : sec.n })} />
      </Linha>
      <Linha rotulo="Altura da seção" dica="0 = automática"><Num valor={sec.altura} max={300} casas={1} sufixo="cm" onChange={v => editaSecao({ altura: v })} /></Linha>
      {sec.tipo === 'gavetas' && (<>
        <Linha rotulo="Gavetas"><Inteiro valor={sec.n} min={1} max={12} onChange={v => editaSecao({ n: v })} /></Linha>
        <Linha rotulo="Distribuição">
          <Select valor={sec.crescente ? 'c' : 'i'} opcoes={[['Iguais', 'i'], ['Crescente (maiores embaixo)', 'c']]} onChange={v => editaSecao({ crescente: v === 'c' })} />
        </Linha>
      </>)}
      {sec.tipo === 'portas' && (<>
        <Linha rotulo="Portas" dica="0 = automático pela largura"><Inteiro valor={sec.portas} min={0} max={4} onChange={v => editaSecao({ portas: v })} /></Linha>
        <Linha rotulo="Com espelho"><input type="checkbox" checked={sec.espelho} onChange={e => editaSecao({ espelho: e.target.checked })} /></Linha>
      </>)}
      {sec.tipo !== 'gavetas' && (<>
        <Linha rotulo="Prateleiras"><Inteiro valor={sec.prateleiras} min={0} max={12} onChange={v => editaSecao({ prateleiras: v })} /></Linha>
        <Linha rotulo="Cabideiro (varão)"><input type="checkbox" checked={sec.cabideiro} onChange={e => editaSecao({ cabideiro: e.target.checked })} /></Linha>
      </>)}
      <div className="botoes-linha">
        <button type="button" className="sec" onClick={() => addSecao('gavetas')}>+ gavetas</button>
        <button type="button" className="sec" onClick={() => addSecao('portas')}>+ portas</button>
        <button type="button" className="sec" onClick={() => addSecao('aberto')}>+ vão aberto</button>
      </div>
      <div className="botoes-linha">
        <button type="button" className="sec" onClick={() => mover(-1)} disabled={s === 0}>↑ subir</button>
        <button type="button" className="sec" onClick={() => mover(1)} disabled={s >= cols[c].secoes.length - 1}>↓ descer</button>
        <button type="button" className="sec" onClick={remSecao} disabled={cols[c].secoes.length <= 1}>remover seção</button>
      </div>
    </div>
  )
}
