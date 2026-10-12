// Galeria de modelos com miniaturas geradas pelo próprio motor do programa.
import { useMemo, useState } from 'react'
import { calcularProjeto } from '../core/calculo'
import { CATEGORIAS, PRESETS, projetoDoModelo } from '../core/presets'
import type { Catalogo } from '../core/tipos'
import { desenhar3d } from '../draw/obliqua'

function miniatura(id: string, cat: Catalogo): string {
  try {
    const calc = calcularProjeto(projetoDoModelo(id), cat)
    const out: string[] = []
    desenhar3d(out, { x: 0, y: 0, w: 800, h: 560 }, calc)
    return `<svg viewBox="0 0 800 560" xmlns="http://www.w3.org/2000/svg">${out.join('')}</svg>`
  } catch { return '' }
}

export function Galeria({ catalogo, atual, onEscolher, onFechar }: {
  catalogo: Catalogo; atual: string; onEscolher: (id: string) => void; onFechar: () => void
}) {
  const [busca, setBusca] = useState('')
  const [cat, setCat] = useState('Todos')
  const miniaturas = useMemo(() => Object.fromEntries(PRESETS.map(p => [p.id, miniatura(p.id, catalogo)])), [catalogo])
  const lista = PRESETS.filter(p => (cat === 'Todos' || p.categoria === cat) &&
    (!busca || `${p.nome} ${p.descricao} ${p.categoria}`.toLowerCase().includes(busca.toLowerCase())))
  return (
    <div className="modal-fundo" onMouseDown={e => { if (e.target === e.currentTarget) onFechar() }}>
      <div className="modal galeria">
        <div className="topo-galeria">
          <h2>Escolha o modelo do móvel</h2>
          <input autoFocus placeholder="Buscar (ex.: guarda-roupa, mesa, cama, rack…)" value={busca} onChange={e => setBusca(e.target.value)} />
          <button className="sec" onClick={onFechar}>Fechar</button>
        </div>
        <div className="abas">
          {['Todos', ...CATEGORIAS].map(c => <button key={c} className={c === cat ? 'ativa' : ''} onClick={() => setCat(c)}>{c}</button>)}
        </div>
        <div className="grade-modelos">
          {lista.map(p => (
            <button key={p.id} className={`cartao ${p.id === atual ? 'sel' : ''}`} onClick={() => onEscolher(p.id)}>
              <div className="mini3d" dangerouslySetInnerHTML={{ __html: miniaturas[p.id] }} />
              <b>{p.nome}</b>
              <span>{p.descricao}</span>
              <small>{p.categoria}</small>
            </button>
          ))}
          {!lista.length && <p className="dica">Nenhum modelo encontrado.</p>}
        </div>
      </div>
    </div>
  )
}
