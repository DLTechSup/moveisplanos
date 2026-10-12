import { useEffect, useState } from 'react'
import * as C from '../core/catalogo'
import type { Catalogo } from '../core/tipos'

/** Número com vírgula decimal; só confirma valores válidos. */
export function Num({ valor, onChange, min = 0, max = 100000, sufixo, casas = 2, className }: {
  valor: number; onChange: (v: number) => void; min?: number; max?: number; sufixo?: string; casas?: number; className?: string
}) {
  const fmt = (v: number) => String(Math.round(v * 10 ** casas) / 10 ** casas).replace('.', ',')
  const [texto, setTexto] = useState(fmt(valor))
  const [foco, setFoco] = useState(false)
  useEffect(() => { if (!foco) setTexto(fmt(valor)) }, [valor, foco])
  const confirmar = (t: string) => {
    const n = parseFloat(t.replace(',', '.'))
    if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)))
  }
  return (
    <span className={`num ${className ?? ''}`}>
      <input inputMode="decimal" value={texto} onFocus={() => setFoco(true)}
        onChange={e => { setTexto(e.target.value); confirmar(e.target.value) }}
        onBlur={() => { setFoco(false); setTexto(fmt(valor)) }}
        onKeyDown={e => {
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault()
            const passo = e.shiftKey ? 10 : 1
            onChange(Math.min(max, Math.max(min, valor + (e.key === 'ArrowUp' ? passo : -passo))))
          }
        }} />
      {sufixo && <em>{sufixo}</em>}
    </span>
  )
}

export function Inteiro({ valor, onChange, min = 0, max = 99 }: { valor: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <span className="stepper">
      <button type="button" onClick={() => onChange(Math.max(min, valor - 1))}>−</button>
      <b>{valor}</b>
      <button type="button" onClick={() => onChange(Math.min(max, valor + 1))}>+</button>
    </span>
  )
}

export function Select<T extends string>({ valor, opcoes, onChange }: {
  valor: T; opcoes: [string, T][]; onChange: (v: T) => void
}) {
  return (
    <select value={valor} onChange={e => onChange(e.target.value as T)}>
      {opcoes.map(([t, v]) => <option key={v} value={v}>{t}</option>)}
    </select>
  )
}

export function CampoCor({ valor, catalogo, onChange, onNovaCor }: {
  valor: string; catalogo: Catalogo; onChange: (nome: string) => void; onNovaCor: (nome: string, cor: string) => void
}) {
  const cor = C.padrao(catalogo, valor).cor
  const [aberto, setAberto] = useState(false)
  const grupos: [string, typeof catalogo.padroes][] = [
    ['Madeiras e amadeirados', catalogo.padroes.filter(p => p.tipo === 'amadeirado')],
    ['Cores lisas', catalogo.padroes.filter(p => p.tipo !== 'amadeirado')],
  ]
  return (
    <div className="campo-cor">
      <button type="button" className="cor-atual" onClick={() => setAberto(!aberto)}>
        <i style={{ background: cor }} /> {valor} <span>▾</span>
      </button>
      <label className="nova-cor" title="Criar uma cor personalizada e adicioná-la ao catálogo">
        + cor
        <input type="color" value={cor.length === 7 ? cor : '#cccccc'} onChange={e => {
          const hex = e.target.value.toUpperCase()
          const nome = window.prompt('Nome para esta cor:', `Personalizada ${hex}`)
          if (nome && nome.trim()) onNovaCor(nome.trim(), hex)
        }} />
      </label>
      {aberto && (
        <div className="paleta" onMouseLeave={() => setAberto(false)}>
          {grupos.map(([titulo, lista]) => (
            <div key={titulo}>
              <h5>{titulo}</h5>
              <div className="amostras">
                {lista.map(p => (
                  <button type="button" key={p.nome} title={p.nome} className={p.nome === valor ? 'sel' : ''}
                    onClick={() => { onChange(p.nome); setAberto(false) }}>
                    <i style={{ background: p.cor }} /><span>{p.nome}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function CampoMaterial({ material, esp, catalogo, onChange }: {
  material: string; esp: number; catalogo: Catalogo; onChange: (m: string, e: number) => void
}) {
  const esps = C.espessuras(catalogo, material)
  return (
    <span className="duplo">
      <select value={material} onChange={e => {
        const m = e.target.value
        const lista = C.espessuras(catalogo, m)
        onChange(m, lista.includes(esp) ? esp : lista[0])
      }}>
        {C.materiais(catalogo).map(m => <option key={m}>{m}</option>)}
      </select>
      <select value={esp} onChange={e => onChange(material, Number(e.target.value))}>
        {esps.map(x => <option key={x} value={x}>{x} mm</option>)}
        {!esps.includes(esp) && <option value={esp}>{esp} mm</option>}
      </select>
    </span>
  )
}

export function Linha({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return <label className="linha"><span>{rotulo}</span><div>{children}</div></label>
}

export function Grupo({ titulo, children, aberto = true }: { titulo: string; children: React.ReactNode; aberto?: boolean }) {
  return (
    <details className="grupo" open={aberto}>
      <summary>{titulo}</summary>
      <div className="corpo">{children}</div>
    </details>
  )
}
