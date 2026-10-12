import { useState } from 'react'
import { catalogoPadrao } from '../core/catalogo'
import type { Catalogo, SecaoCatalogo } from '../core/tipos'

type Tipo = 'texto' | 'float' | 'bool' | 'cor' | 'lista' | string // 'escolha:a,b'
interface Col { campo: string; titulo: string; tipo: Tipo; larg: number }
const SECOES: Record<SecaoCatalogo, { titulo: string; ajuda?: string; cols: Col[] }> = {
  chapas: { titulo: 'Chapas', ajuda: "Cada linha é um material + espessura. Cobrança 'm2' é para madeira maciça (preço por m²).", cols: [
    { campo: 'material', titulo: 'Material', tipo: 'texto', larg: 150 }, { campo: 'espessura', titulo: 'Espessura (mm)', tipo: 'float', larg: 90 },
    { campo: 'comprimento', titulo: 'Comprimento (mm)', tipo: 'float', larg: 100 }, { campo: 'largura', titulo: 'Largura (mm)', tipo: 'float', larg: 90 },
    { campo: 'preco', titulo: 'Preço (R$)', tipo: 'float', larg: 90 }, { campo: 'unidade', titulo: 'Cobrança', tipo: 'escolha:chapa,m2', larg: 90 }] },
  padroes: { titulo: 'Cores e madeiras', ajuda: "A cor aparece nos desenhos. 'Tem veio' desenha linhas de madeira e impede girar a peça no plano de corte.", cols: [
    { campo: 'nome', titulo: 'Nome', tipo: 'texto', larg: 200 }, { campo: 'tipo', titulo: 'Tipo', tipo: 'escolha:amadeirado,unicolor', larg: 120 },
    { campo: 'cor', titulo: 'Cor', tipo: 'cor', larg: 90 }, { campo: 'veio', titulo: 'Tem veio', tipo: 'bool', larg: 80 }] },
  puxadores: { titulo: 'Puxadores', cols: [
    { campo: 'nome', titulo: 'Nome', tipo: 'texto', larg: 190 }, { campo: 'tipo', titulo: 'Tipo', tipo: 'escolha:barra,cava_usinada,perfil_cava,botao,concha,toque', larg: 130 },
    { campo: 'comprimento', titulo: 'Comprimento (mm)', tipo: 'float', larg: 100 }, { campo: 'entre_furos', titulo: 'Entre furos (mm)', tipo: 'float', larg: 100 },
    { campo: 'cor', titulo: 'Cor', tipo: 'cor', larg: 70 }, { campo: 'preco', titulo: 'Preço (R$)', tipo: 'float', larg: 90 }] },
  corredicas: { titulo: 'Corrediças', cols: [
    { campo: 'nome', titulo: 'Nome', tipo: 'texto', larg: 180 }, { campo: 'tipo', titulo: 'Tipo', tipo: 'escolha:telescopica,oculta,roldana', larg: 120 },
    { campo: 'comprimentos', titulo: 'Comprimentos (mm)', tipo: 'lista', larg: 230 }, { campo: 'folga_lado', titulo: 'Folga/lado (mm)', tipo: 'float', larg: 90 },
    { campo: 'altura_min_caixa', titulo: 'Alt. mín. caixa', tipo: 'float', larg: 90 }, { campo: 'amortecimento', titulo: 'Amortec.', tipo: 'bool', larg: 70 },
    { campo: 'preco', titulo: 'Preço do par (R$)', tipo: 'float', larg: 100 }] },
  fitas: { titulo: 'Fitas de borda', cols: [
    { campo: 'nome', titulo: 'Nome', tipo: 'texto', larg: 220 }, { campo: 'largura', titulo: 'Largura (mm)', tipo: 'float', larg: 100 },
    { campo: 'espessura', titulo: 'Espessura (mm)', tipo: 'float', larg: 110 }, { campo: 'preco_metro', titulo: 'Preço por metro (R$)', tipo: 'float', larg: 130 }] },
  dobradicas: { titulo: 'Dobradiças', cols: [
    { campo: 'nome', titulo: 'Nome', tipo: 'texto', larg: 240 }, { campo: 'tipo', titulo: 'Tipo', tipo: 'escolha:reta,curva,supercurva', larg: 120 },
    { campo: 'amortecimento', titulo: 'Amortec.', tipo: 'bool', larg: 80 }, { campo: 'preco', titulo: 'Preço (R$)', tipo: 'float', larg: 90 }] },
  insumos: { titulo: 'Insumos e pés', ajuda: 'Códigos usados pelo programa: pe, rodizio, parafuso, cavilha, cola (não altere o código).', cols: [
    { campo: 'chave', titulo: 'Código', tipo: 'texto', larg: 110 }, { campo: 'nome', titulo: 'Nome', tipo: 'texto', larg: 240 },
    { campo: 'unidade', titulo: 'Unidade', tipo: 'texto', larg: 80 }, { campo: 'preco', titulo: 'Preço (R$)', tipo: 'float', larg: 90 }] },
}

const num = (t: string) => { const n = parseFloat(t.replace(',', '.')); return Number.isFinite(n) ? n : 0 }

export function CatalogoDialogo({ catalogo, onSalvar, onFechar }: {
  catalogo: Catalogo; onSalvar: (c: Catalogo) => void; onFechar: () => void
}) {
  const [dados, setDados] = useState<Catalogo>(() => JSON.parse(JSON.stringify(catalogo)))
  const [secao, setSecao] = useState<SecaoCatalogo>('padroes')
  const def = SECOES[secao]
  const linhas = dados[secao] as any[]
  const setLinhas = (l: any[]) => setDados({ ...dados, [secao]: l })
  const edita = (i: number, campo: string, v: any) => setLinhas(linhas.map((x, k) => (k === i ? { ...x, [campo]: v } : x)))

  const nova = () => {
    const o: any = {}
    for (const c of def.cols) o[c.campo] = c.tipo === 'float' ? 0 : c.tipo === 'texto' ? 'Novo' : c.tipo === 'bool' ? false
      : c.tipo === 'cor' ? '#CCCCCC' : c.tipo === 'lista' ? [250, 300, 350, 400, 450, 500, 550] : c.tipo.split(':')[1].split(',')[0]
    setLinhas([...linhas, o])
  }

  return (
    <div className="modal-fundo" onMouseDown={e => { if (e.target === e.currentTarget) onFechar() }}>
      <div className="modal catalogo">
        <h2>Catálogo de materiais, cores, ferragens e preços</h2>
        <div className="abas">
          {(Object.keys(SECOES) as SecaoCatalogo[]).map(k => (
            <button key={k} className={k === secao ? 'ativa' : ''} onClick={() => setSecao(k)}>{SECOES[k].titulo}</button>
          ))}
        </div>
        {def.ajuda && <p className="dica">{def.ajuda}</p>}
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
                        : c.tipo === 'lista' ? <input defaultValue={(l[c.campo] as number[]).join(', ')}
                            onBlur={e => edita(i, c.campo, e.target.value.split(/[;,]/).map(s => s.trim()).filter(Boolean).map(num))} />
                        : c.tipo.startsWith('escolha') ? (
                          <select value={l[c.campo]} onChange={e => edita(i, c.campo, e.target.value)}>
                            {c.tipo.split(':')[1].split(',').map(o => <option key={o}>{o}</option>)}
                          </select>)
                        : c.tipo === 'float' ? <input className="n" defaultValue={String(l[c.campo]).replace('.', ',')} key={`${secao}${i}${l[c.campo]}`}
                            onBlur={e => edita(i, c.campo, num(e.target.value))} />
                        : <input value={l[c.campo]} onChange={e => edita(i, c.campo, e.target.value)} />}
                    </td>
                  ))}
                  <td className="acoes">
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
          <button className="sec" onClick={() => { if (confirm('Voltar esta aba aos valores padrão do programa?')) setLinhas((catalogoPadrao() as any)[secao]) }}>Restaurar padrão desta aba</button>
          <span style={{ flex: 1 }} />
          <button className="sec" onClick={onFechar}>Cancelar</button>
          <button className="prim" onClick={() => {
            for (const k of Object.keys(SECOES) as SecaoCatalogo[]) {
              if (!(dados[k] as any[]).length) { alert(`A aba '${SECOES[k].titulo}' não pode ficar vazia.`); return }
            }
            onSalvar(dados)
          }}>Salvar catálogo</button>
        </div>
      </div>
    </div>
  )
}
