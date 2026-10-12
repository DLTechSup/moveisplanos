// Painel do vão selecionado: largura, altura e profundidade bem claras, opções do vão e medida de cada peça.
import type { Calculo } from '../core/calculo'
import { fmtCm } from '../core/formato'
import { ancestral, definirTam, editarFolha, encaixar, folhaPadrao, obter, remover } from '../core/layout'
import type { Caminho } from '../core/layout'
import type { Divisao, TipoSecao } from '../core/tipos'
import { ehDivisao } from '../core/tipos'
import type { EditarLayout } from './Editor'
import { Inteiro, Num, Select } from './campos'

const NOMES: Record<TipoSecao, string> = { gavetas: 'Gavetas', portas: 'Portas', aberto: 'Vão aberto' }

export function PainelItem({ calc, selecao, setSelecao, editarLayout }: {
  calc: Calculo; selecao: Caminho | null; setSelecao: (c: Caminho | null) => void; editarLayout: EditarLayout
}) {
  const info = selecao ? calc.resultado.layout?.folhas.find(f => f.caminho.length === selecao.length && f.caminho.every((v, i) => v === selecao[i])) : null
  const layout = calc.projeto.layout
  const no = selecao ? obter(layout, selecao) : null
  if (!selecao || !info || !no || ehDivisao(no)) {
    return <p className="dica">Clique em um vão no desenho (aba <b>Editor</b>) para ver e editar a largura, a altura e a profundidade dele e de cada peça.</p>
  }
  const idx = calc.resultado.layout!.folhas.indexOf(info) + 1
  const dirV = ancestral(layout, selecao, 'v'), dirH = ancestral(layout, selecao, 'h')
  const tamDe = (a: { cam: Caminho; indice: number } | null) => (a ? (obter(layout, a.cam) as Divisao).tam[a.indice] : 0)
  const ed = (patch: Parameters<typeof editarFolha>[2], chave = 'vao') => editarLayout(l => ({ layout: editarFolha(l, selecao, patch) }), chave)

  const Medida = ({ rotulo, valor, a, max }: { rotulo: string; valor: number; a: { cam: Caminho; indice: number } | null; max: number }) => {
    const fixo = tamDe(a) > 0
    return (
      <div className={`medida ${fixo ? 'fixa' : 'auto'}`}>
        <span className="rot">{rotulo}</span>
        {a ? <Num valor={valor} max={max} casas={2} sufixo="cm" onChange={v => editarLayout(l => ({ layout: definirTam(l, a.cam, a.indice, v) }), 'tam' + rotulo)} />
          : <span className="num desativado"><input disabled value={String(valor).replace('.', ',')} /><em>cm</em></span>}
        <span className="est">{!a ? 'toda a área' : fixo ? 'fixa' : 'auto'}</span>
        {a && fixo && <button type="button" className="mini-bt" title="Voltar ao tamanho automático" onClick={() => editarLayout(l => ({ layout: definirTam(l, a.cam, a.indice, 0) }), 'auto' + rotulo)}>auto</button>}
      </div>
    )
  }

  return (
    <div className="painel-item">
      <div className="titulo-item"><b>Vão {idx}</b> — {NOMES[no.tipo]}</div>
      <Medida rotulo="Largura do vão" valor={info.rect.w / 10} a={dirV} max={600} />
      <Medida rotulo="Altura do vão" valor={info.rect.h / 10} a={dirH} max={320} />
      <div className="medida auto"><span className="rot">Profundidade útil</span><span className="num desativado"><input disabled value={fmtCm(calc.resultado.medidas.Dint)} /><em>cm</em></span><span className="est">do móvel</span></div>
      <p className="dica">Largura e altura são as medidas <b>internas</b> deste vão (sem as tábuas). Ao digitar, o valor fica <b>fixo</b>; o restante se ajusta sozinho. Também dá para arrastar as divisórias no desenho.</p>

      <div className="linha-item"><span>Tipo</span>
        <Select valor={no.tipo} opcoes={Object.entries(NOMES).map(([k, v]) => [v, k] as [string, TipoSecao])} onChange={t => ed({ tipo: t, n: t === 'gavetas' ? Math.max(no.n, 3) : no.n }, 'tipo')} />
      </div>
      {no.tipo === 'gavetas' && <>
        <div className="linha-item"><span>Gavetas</span><Inteiro valor={no.n} min={1} max={12} onChange={v => ed({ n: v })} /></div>
        <div className="linha-item"><span>Distribuição</span>
          <Select valor={no.crescente ? 'c' : 'i'} opcoes={[['Iguais', 'i'], ['Crescente (maiores embaixo)', 'c']]} onChange={v => ed({ crescente: v === 'c' })} /></div>
        <div className="linha-item"><span>Alturas das frentes (cm)</span>
          <input key={selecao.join('.') + no.n} defaultValue={(no.alturas || []).join('; ')} placeholder="opcional: 18; 0; 25 (0 = auto)"
            onChange={e => ed({ alturas: e.target.value.replace(/,/g, '.').split(/[;\s]+/).map(Number).filter(n => Number.isFinite(n)) }, 'alturas')} /></div>
      </>}
      {no.tipo === 'portas' && <>
        <div className="linha-item"><span>Portas (0 = automático)</span><Inteiro valor={no.portas} min={0} max={4} onChange={v => ed({ portas: v })} /></div>
        <div className="linha-item"><span>Com espelho</span><input type="checkbox" checked={no.espelho} onChange={e => ed({ espelho: e.target.checked })} /></div>
      </>}
      {no.tipo !== 'gavetas' && <>
        <div className="linha-item"><span>Prateleiras soltas</span><Inteiro valor={no.prateleiras} min={0} max={12} onChange={v => ed({ prateleiras: v })} /></div>
        <div className="linha-item"><span>Cabideiro (varão)</span><input type="checkbox" checked={no.cabideiro} onChange={e => ed({ cabideiro: e.target.checked })} /></div>
      </>}

      <div className="botoes-linha">
        <button type="button" className="sec" onClick={() => editarLayout(l => { const r = encaixar(l, selecao, 'direita', folhaPadrao('aberto', { prateleiras: 2 })); return { layout: r.raiz, selecao: r.caminho } }, 'dividir')}>Dividir ↔</button>
        <button type="button" className="sec" onClick={() => editarLayout(l => { const r = encaixar(l, selecao, 'abaixo', folhaPadrao('gavetas', { n: 2 })); return { layout: r.raiz, selecao: r.caminho } }, 'dividir')}>+ gavetas abaixo</button>
        <button type="button" className="sec" onClick={() => editarLayout(l => { const r = encaixar(l, selecao, 'acima', folhaPadrao('portas', { prateleiras: 1 })); return { layout: r.raiz, selecao: r.caminho } }, 'dividir')}>+ portas acima</button>
        <button type="button" className="sec perigo" onClick={() => { editarLayout(l => { const r = remover(l, selecao); return r ? { layout: r, selecao: null } : null }, 'excluir'); setSelecao(null) }} disabled={calc.resultado.layout!.folhas.length <= 1}>Excluir vão</button>
      </div>

      {info.itens.length > 0 && (
        <table className="tab-itens">
          <thead><tr><th>Peça deste vão</th><th>Qtd</th><th title="largura × altura × profundidade (em cm)">L × A × P (cm)</th></tr></thead>
          <tbody>{info.itens.map((it, i) => <tr key={i}><td>{it.rotulo}</td><td>{it.qtd}</td><td>{fmtCm(it.w)} × {fmtCm(it.h)} × {fmtCm(it.d)}</td></tr>)}</tbody>
        </table>
      )}
    </div>
  )
}
