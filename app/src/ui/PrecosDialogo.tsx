import { useRef, useState } from 'react'
import type { Calculo } from '../core/calculo'
import { fmtBrl, fmtNum } from '../core/formato'
import { totalLinha } from '../core/orcamento'
import { FATOR_UF, LOJAS, UFS, aplicarEstimativas, definirPreco, exportarCsv, importarCsv } from '../core/precos'
import type { Catalogo } from '../core/tipos'
import { baixar } from '../exportar'
import { abrirExterno } from './externo'
import { Num } from './campos'

export function PrecosDialogo({ calc, cidade, uf, setLocal, onCatalogo, onFechar }: {
  calc: Calculo; cidade: string; uf: string; setLocal: (cidade: string, uf: string) => void
  onCatalogo: (c: Catalogo) => void; onFechar: () => void
}) {
  const orc = calc.orcamento
  const [msg, setMsg] = useState('')
  const arq = useRef<HTMLInputElement>(null)
  const cat = calc.catalogo

  return (
    <div className="modal-fundo" onMouseDown={e => { if (e.target === e.currentTarget) onFechar() }}>
      <div className="modal precos">
        <h2>Preços dos materiais deste projeto</h2>
        <div className="aviso-preco">
          <b>Como funciona:</b> digite o preço que você conseguiu com seu fornecedor (e a loja/fonte). O programa guarda o valor, a fonte e a data no catálogo e usa nos próximos projetos.
          Os <b>preços estimados</b> são apenas uma referência nacional aproximada, ajustada pela sua região — <b>não são cotações de nenhuma loja</b>. Confirme com seu fornecedor antes de enviar o orçamento.
        </div>
        <div className="linha-regiao">
          <label>Cidade <input value={cidade} onChange={e => setLocal(e.target.value, uf)} placeholder="ex.: Campinas" /></label>
          <label>UF <select value={uf} onChange={e => setLocal(cidade, e.target.value)}>{UFS.map(u => <option key={u}>{u}</option>)}</select></label>
          <span className="dica">ajuste regional aprox.: ×{fmtNum(FATOR_UF[uf] ?? 1, 2)}</span>
          <button className="sec" onClick={() => { onCatalogo(aplicarEstimativas(cat, { uf, sobrescrever: false })); setMsg('Estimativas aplicadas aos itens sem preço.') }}>Preencher itens sem preço com estimativa</button>
          <button className="sec" onClick={() => { if (confirm('Substituir TODOS os preços do catálogo por estimativas? Seus preços digitados serão perdidos.')) { onCatalogo(aplicarEstimativas(cat, { uf, sobrescrever: true })); setMsg('Todos os preços foram substituídos por estimativas.') } }}>Substituir todos por estimativas</button>
        </div>
        <div className="linha-regiao">
          <span><b>Lojas perto de você:</b></span>
          {LOJAS.filter(l => l.id.startsWith('maps')).map(l => <button key={l.id} className="sec" onClick={() => abrirExterno(l.url('', cidade, uf))}>{l.nome.replace(' (Google Maps)', '')}</button>)}
          <span style={{ flex: 1 }} />
          <button className="sec" onClick={() => baixar(new Blob([exportarCsv(cat)], { type: 'text/csv;charset=utf-8' }), 'precos-projeta-moveis.csv')}>Exportar tabela (CSV)</button>
          <button className="sec" onClick={() => arq.current?.click()}>Importar tabela (CSV)</button>
          <input ref={arq} type="file" accept=".csv,text/csv" hidden onChange={async e => {
            const f = e.target.files?.[0]; if (!f) return
            const r = importarCsv(cat, await f.text()); onCatalogo(r.catalogo); setMsg(`${r.atualizados} preço(s) importado(s).`); e.target.value = ''
          }} />
        </div>
        {msg && <p className="msg-ok">{msg}</p>}
        <div className="tabela-scroll">
          <table>
            <thead><tr><th>Item</th><th>Qtd</th><th style={{ minWidth: 130 }}>Preço unitário</th><th style={{ minWidth: 260 }}>Fonte (loja / site)</th><th>Total</th><th>Pesquisar</th></tr></thead>
            <tbody>
              {orc.linhas.map((l, i) => (
                <tr key={i} className={l.preco ? '' : 'sem-preco'}>
                  <td><b>{l.item}</b>{l.detalhe && <small> — {l.detalhe}</small>}</td>
                  <td className="n">{fmtNum(l.qtd, Number.isInteger(l.qtd) ? 0 : 2)} {l.unidade}</td>
                  <td>{l.alvo ? <Num valor={l.preco} max={1e7} sufixo="R$" onChange={v => onCatalogo(definirPreco(cat, l.alvo!, v, l.fonte && !l.fonte.startsWith('Estimativa') ? l.fonte : '', l.fator ?? 1))} /> : <span className="dica">(item extra)</span>}</td>
                  <td>{l.alvo && <input list="lojas2" defaultValue={l.fonte ?? ''} key={l.item + (l.fonte ?? '')} placeholder="onde você pesquisou" onBlur={e => { if (e.target.value !== (l.fonte ?? '')) onCatalogo(definirPreco(cat, l.alvo!, l.preco, e.target.value, l.fator ?? 1)) }} />}</td>
                  <td className="n">{l.preco ? fmtBrl(totalLinha(l)) : '—'}</td>
                  <td>
                    <details className="busca"><summary title="Abrir pesquisa de preço">🔎</summary>
                      <div className="menu-busca">
                        {LOJAS.filter(x => !x.id.startsWith('maps')).map(x => <button key={x.id} onClick={() => abrirExterno(x.url(l.item.replace(/—/g, ''), cidade, uf))}>{x.nome}</button>)}
                      </div>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <datalist id="lojas2">{LOJAS.map(l => <option key={l.id} value={l.nome} />)}<option value="Preço informado pelo marceneiro" /></datalist>
        </div>
        <div className="rodape-modal">
          <strong>Total dos materiais: {fmtBrl(orc.materiais)}</strong>
          <span style={{ flex: 1 }} />
          <button className="prim" onClick={onFechar}>Concluir</button>
        </div>
      </div>
    </div>
  )
}
