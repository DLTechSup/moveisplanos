import { useState } from 'react'
import { catalogoPadrao } from '../core/catalogo'
import { LOJAS, termoBusca } from '../core/precos'
import type { Catalogo, SecaoCatalogo } from '../core/tipos'
import { abrirExterno } from './externo'
import { lerImagem } from './campos'

type Tipo = string // texto | float | bool | cor | lista | foto | escolha:a,b
interface Col { campo: string; titulo: string; tipo: Tipo; larg: number }
const preco = (campo = 'preco', titulo = 'Preço (R$)'): Col => ({ campo, titulo, tipo: 'float', larg: 90 })
const fonte: Col = { campo: 'fonte', titulo: 'Fonte do preço (loja)', tipo: 'fonte', larg: 230 }
const data: Col = { campo: 'atualizado', titulo: 'Data', tipo: 'texto', larg: 90 }
const foto: Col = { campo: 'imagem', titulo: 'Foto', tipo: 'foto', larg: 110 }

const SECOES: Record<SecaoCatalogo, { titulo: string; ajuda?: string; cols: Col[] }> = {
  chapas: { titulo: 'Chapas e madeiras', ajuda: "Cada linha é um material + espessura. Cobrança 'm2' é para madeira maciça (preço por m²). O preço da chapa é multiplicado pelo fator de preço da cor (aba Cores).", cols: [
    { campo: 'material', titulo: 'Material', tipo: 'texto', larg: 150 }, { campo: 'espessura', titulo: 'Espessura (mm)', tipo: 'float', larg: 90 },
    { campo: 'comprimento', titulo: 'Comprimento (mm)', tipo: 'float', larg: 100 }, { campo: 'largura', titulo: 'Largura (mm)', tipo: 'float', larg: 90 },
    preco(), { campo: 'unidade', titulo: 'Cobrança', tipo: 'escolha:chapa,m2', larg: 90 }, fonte, data] },
  padroes: { titulo: 'Cores e madeiras', ajuda: "A cor aparece nos desenhos. 'Fator de preço' multiplica o preço da chapa (ex.: 1,2 para amadeirados). 'Foto' substitui a textura gerada pelo programa — use uma foto real do material.", cols: [
    { campo: 'nome', titulo: 'Nome', tipo: 'texto', larg: 200 }, { campo: 'tipo', titulo: 'Tipo', tipo: 'escolha:amadeirado,unicolor', larg: 120 },
    { campo: 'cor', titulo: 'Cor', tipo: 'cor', larg: 90 }, { campo: 'veio', titulo: 'Tem veio', tipo: 'bool', larg: 80 },
    { campo: 'fator', titulo: 'Fator de preço', tipo: 'float', larg: 90 }, foto] },
  puxadores: { titulo: 'Puxadores', cols: [
    { campo: 'nome', titulo: 'Nome', tipo: 'texto', larg: 190 }, { campo: 'tipo', titulo: 'Tipo', tipo: 'escolha:barra,cava_usinada,perfil_cava,botao,concha,toque', larg: 130 },
    { campo: 'comprimento', titulo: 'Comprimento (mm)', tipo: 'float', larg: 100 }, { campo: 'entre_furos', titulo: 'Entre furos (mm)', tipo: 'float', larg: 100 },
    { campo: 'cor', titulo: 'Cor', tipo: 'cor', larg: 70 }, preco(), fonte, data, foto] },
  corredicas: { titulo: 'Corrediças', cols: [
    { campo: 'nome', titulo: 'Nome', tipo: 'texto', larg: 180 }, { campo: 'tipo', titulo: 'Tipo', tipo: 'escolha:telescopica,oculta,roldana', larg: 120 },
    { campo: 'comprimentos', titulo: 'Comprimentos (mm)', tipo: 'lista', larg: 230 }, { campo: 'folga_lado', titulo: 'Folga/lado (mm)', tipo: 'float', larg: 90 },
    { campo: 'altura_min_caixa', titulo: 'Alt. mín. caixa', tipo: 'float', larg: 90 }, { campo: 'amortecimento', titulo: 'Amortec.', tipo: 'bool', larg: 70 },
    preco('preco', 'Preço do par (R$)'), fonte, data, foto] },
  fitas: { titulo: 'Fitas de borda', cols: [
    { campo: 'nome', titulo: 'Nome', tipo: 'texto', larg: 220 }, { campo: 'largura', titulo: 'Largura (mm)', tipo: 'float', larg: 100 },
    { campo: 'espessura', titulo: 'Espessura (mm)', tipo: 'float', larg: 110 }, preco('preco_metro', 'Preço por metro (R$)'), fonte, data, foto] },
  dobradicas: { titulo: 'Dobradiças', cols: [
    { campo: 'nome', titulo: 'Nome', tipo: 'texto', larg: 240 }, { campo: 'tipo', titulo: 'Tipo', tipo: 'escolha:reta,curva,supercurva', larg: 110 },
    { campo: 'amortecimento', titulo: 'Amortec.', tipo: 'bool', larg: 80 }, preco(), fonte, data, foto] },
  insumos: { titulo: 'Insumos e ferragens', ajuda: 'Códigos usados pelo programa: pe, rodizio, parafuso, cavilha, cola, varao, suporte_varao, trilho_correr, roldana_correr, espelho, suporte_aereo, cantoneira (não altere o código).', cols: [
    { campo: 'chave', titulo: 'Código', tipo: 'texto', larg: 110 }, { campo: 'nome', titulo: 'Nome', tipo: 'texto', larg: 240 },
    { campo: 'unidade', titulo: 'Unidade', tipo: 'texto', larg: 70 }, preco(), fonte, data, foto] },
}

const num = (t: string) => { const n = parseFloat(t.replace(',', '.')); return Number.isFinite(n) ? n : 0 }
const hoje = () => new Date().toLocaleDateString('pt-BR')

export function CatalogoDialogo({ catalogo, cidade, uf, onSalvar, onFechar }: {
  catalogo: Catalogo; cidade: string; uf: string; onSalvar: (c: Catalogo) => void; onFechar: () => void
}) {
  const [dados, setDados] = useState<Catalogo>(() => JSON.parse(JSON.stringify(catalogo)))
  const [secao, setSecao] = useState<SecaoCatalogo>('padroes')
  const def = SECOES[secao]
  const linhas = dados[secao] as any[]
  const setLinhas = (l: any[]) => setDados({ ...dados, [secao]: l })
  const edita = (i: number, campo: string, v: any) => setLinhas(linhas.map((x, k) => {
    if (k !== i) return x
    const n = { ...x, [campo]: v }
    if (campo === 'preco' || campo === 'preco_metro') {
      n.atualizado = hoje()
      if (!n.fonte || String(n.fonte).startsWith('Estimativa')) n.fonte = ''
    }
    return n
  }))

  const nova = () => {
    const o: any = {}
    for (const c of def.cols) o[c.campo] = c.tipo === 'float' ? (c.campo === 'fator' ? 1 : 0) : c.tipo === 'texto' ? 'Novo' : c.tipo === 'bool' ? false
      : c.tipo === 'cor' ? '#CCCCCC' : c.tipo === 'lista' ? [250, 300, 350, 400, 450, 500, 550] : c.tipo.startsWith('escolha') ? c.tipo.split(':')[1].split(',')[0] : ''
    setLinhas([...linhas, o])
  }

  return (
    <div className="modal-fundo" onMouseDown={e => { if (e.target === e.currentTarget) onFechar() }}>
      <div className="modal catalogo">
        <h2>Catálogo de materiais, cores, ferragens e preços</h2>
        <div className="abas">
          {(Object.keys(SECOES) as SecaoCatalogo[]).map(k => <button key={k} className={k === secao ? 'ativa' : ''} onClick={() => setSecao(k)}>{SECOES[k].titulo}</button>)}
        </div>
        {def.ajuda && <p className="dica">{def.ajuda}</p>}
        <datalist id="lojas">{LOJAS.map(l => <option key={l.id} value={l.nome} />)}<option value="Preço informado pelo marceneiro" /></datalist>
        <div className="tabela-scroll">
          <table>
            <thead><tr><th>#</th>{def.cols.map(c => <th key={c.campo} style={{ minWidth: c.larg }}>{c.titulo}</th>)}<th /></tr></thead>
            <tbody>
              {linhas.map((l, i) => (
                <tr key={i}>
                  <td className="idx">{i + 1}</td>
                  {def.cols.map(c => (
                    <td key={c.campo}>
                      {c.tipo === 'bool' ? <input type="checkbox" checked={!!l[c.campo]} onChange={e => edita(i, c.campo, e.target.checked)} />
                        : c.tipo === 'cor' ? <input type="color" value={l[c.campo]} onChange={e => edita(i, c.campo, e.target.value.toUpperCase())} />
                        : c.tipo === 'lista' ? <input defaultValue={(l[c.campo] as number[]).join(', ')} onBlur={e => edita(i, c.campo, e.target.value.split(/[;,]/).map(s => s.trim()).filter(Boolean).map(num))} />
                        : c.tipo === 'foto' ? (
                          <span className="foto-cel">
                            {l.imagem ? <img src={l.imagem} alt="" /> : <i>—</i>}
                            <label className="mini-bt" title="Escolher uma foto do material">foto…<input type="file" accept="image/*" hidden onChange={async e => { const f = e.target.files?.[0]; if (f) edita(i, 'imagem', await lerImagem(f)); e.target.value = '' }} /></label>
                            {l.imagem && <button className="mini-bt" onClick={() => edita(i, 'imagem', undefined)} title="Remover foto">×</button>}
                          </span>)
                        : c.tipo === 'fonte' ? <input list="lojas" value={l.fonte ?? ''} placeholder="loja / site" onChange={e => edita(i, 'fonte', e.target.value)} />
                        : c.tipo.startsWith('escolha') ? (
                          <select value={l[c.campo]} onChange={e => edita(i, c.campo, e.target.value)}>{c.tipo.split(':')[1].split(',').map(o => <option key={o}>{o}</option>)}</select>)
                        : c.tipo === 'float' ? <input className="n" defaultValue={String(l[c.campo] ?? 0).replace('.', ',')} key={`${secao}${i}${l[c.campo]}`} onBlur={e => edita(i, c.campo, num(e.target.value))} />
                        : <input value={l[c.campo] ?? ''} onChange={e => edita(i, c.campo, e.target.value)} />}
                    </td>
                  ))}
                  <td className="acoes">
                    {secao !== 'padroes' || true ? (
                      <details className="busca"><summary title="Pesquisar preço online">🔎</summary>
                        <div className="menu-busca">
                          {LOJAS.map(lj => <button key={lj.id} onClick={() => abrirExterno(lj.url(termoBusca(secao, l), cidade, uf))}>{lj.nome}</button>)}
                        </div>
                      </details>) : null}
                    <button title="Duplicar" onClick={() => setLinhas([...linhas.slice(0, i + 1), { ...l }, ...linhas.slice(i + 1)])}>⧉</button>
                    <button title="Remover" onClick={() => setLinhas(linhas.filter((_, k) => k !== i))}>×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="rodape-modal">
          <button className="sec" onClick={nova}>Adicionar linha</button>
          <button className="sec" onClick={() => { if (confirm('Voltar esta aba aos valores padrão do programa (apaga seus preços desta aba)?')) setLinhas((catalogoPadrao() as any)[secao]) }}>Restaurar padrão desta aba</button>
          <span style={{ flex: 1 }} />
          <button className="sec" onClick={onFechar}>Cancelar</button>
          <button className="prim" onClick={() => {
            for (const k of Object.keys(SECOES) as SecaoCatalogo[]) if (!(dados[k] as any[]).length) { alert(`A aba '${SECOES[k].titulo}' não pode ficar vazia.`); return }
            onSalvar(dados)
          }}>Salvar catálogo</button>
        </div>
      </div>
    </div>
  )
}
