import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { calcularProjeto } from './core/calculo'
import { adicionarPadrao, carregarCatalogo, completarCatalogo, salvarCatalogo } from './core/catalogo'
import { fmtBrl } from './core/formato'
import { projetoPadrao } from './core/tipos'
import type { Catalogo, Projeto } from './core/tipos'
import { abrirProjeto, exportarPdf, exportarPng, salvarProjeto } from './exportar'
import type { Modo } from './draw/prancha'
import { CatalogoDialogo } from './ui/CatalogoDialogo'
import { Formulario } from './ui/Formulario'
import { Preview } from './ui/Preview'

const CHAVE_PROJETO = 'projeta-moveis:projeto'

function projetoInicial(): Projeto {
  try {
    const t = localStorage.getItem(CHAVE_PROJETO)
    if (t) return { ...projetoPadrao(), ...JSON.parse(t) }
  } catch { /* começa vazio */ }
  const p = projetoPadrao()
  p.data = new Date().toLocaleDateString('pt-BR')
  return p
}

const MODOS: [Modo, string][] = [
  ['completo', 'Projeto completo (desenho técnico, corte, chapas e página do cliente)'],
  ['tecnico', 'Somente técnico para o marceneiro (sem página do cliente)'],
  ['cliente', 'Somente a página do cliente (3D, frontal, cores, medidas e valor)'],
]

export default function App() {
  const [projeto, setProjeto] = useState<Projeto>(projetoInicial)
  const [catalogo, setCatalogo] = useState<Catalogo>(carregarCatalogo)
  const [catAberto, setCatAberto] = useState(false)
  const [exportando, setExportando] = useState<null | { tipo: 'pdf' | 'png' }>(null)
  const [modo, setModo] = useState<Modo>('completo')
  const [msg, setMsg] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const arquivo = useRef<HTMLInputElement>(null)

  const adiado = useDeferredValue(projeto)
  const calc = useMemo(() => {
    try { return calcularProjeto(adiado, catalogo) } catch (e) { console.error(e); return null }
  }, [adiado, catalogo])
  const ultimo = useRef(calc)
  if (calc) ultimo.current = calc
  const c = calc ?? ultimo.current!

  useEffect(() => { try { localStorage.setItem(CHAVE_PROJETO, JSON.stringify(projeto)) } catch { /* sem armazenamento */ } }, [projeto])
  useEffect(() => { document.title = `Projeta Móveis — ${projeto.nome || 'sem título'}` }, [projeto.nome])
  useEffect(() => {
    if (!msg) return
    const t = setTimeout(() => setMsg(''), 6000)
    return () => clearTimeout(t)
  }, [msg])

  const set = useCallback((patch: Partial<Projeto>) => setProjeto(p => ({ ...p, ...patch })), [])
  const novaCor = useCallback((nome: string, cor: string) => {
    setCatalogo(c0 => { const n = adicionarPadrao(c0, nome, cor); salvarCatalogo(n); return n })
  }, [])

  const novo = () => {
    if (!confirm('Começar um projeto novo? As alterações não salvas serão perdidas.')) return
    const p = projetoPadrao(); p.data = new Date().toLocaleDateString('pt-BR'); setProjeto(p)
  }
  const abrir = async (f: File | undefined) => {
    if (!f) return
    try { setProjeto(await abrirProjeto(f)); setMsg(`Projeto "${f.name}" aberto.`) }
    catch (e) { alert(`Não foi possível abrir o arquivo:\n${e}`) }
    if (arquivo.current) arquivo.current.value = ''
  }
  const exportar = async (tipo: 'pdf' | 'png', m: Modo) => {
    setExportando(null); setOcupado(true)
    try {
      const n = tipo === 'pdf' ? await exportarPdf(c, m) : await exportarPng(c, m)
      setMsg(tipo === 'pdf' ? `PDF com ${n} página(s) gerado.` : `${n} imagem(ns) gerada(s).`)
    } catch (e) { alert(`Falha ao exportar:\n${e}`) }
    setOcupado(false)
  }

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      const t = e.key.toLowerCase()
      if (t === 's') { e.preventDefault(); salvarProjeto(projeto) }
      else if (t === 'e') { e.preventDefault(); setModo('completo'); setExportando({ tipo: 'pdf' }) }
      else if (t === 'o') { e.preventDefault(); arquivo.current?.click() }
      else if (t === 'k') { e.preventDefault(); setCatAberto(true) }
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [projeto])

  const avisos = c.resultado.avisos
  const temErro = avisos.some(a => a.nivel === 'erro')
  const orc = c.orcamento

  return (
    <div className="app">
      <header className="barra">
        <img src="./icone.png" alt="" />
        <strong>Projeta Móveis</strong>
        <button onClick={novo}>Novo</button>
        <button onClick={() => arquivo.current?.click()} title="Ctrl+O">Abrir</button>
        <button onClick={() => salvarProjeto(projeto)} title="Ctrl+S">Salvar</button>
        <span className="sep" />
        <button className="prim" onClick={() => { setModo('completo'); setExportando({ tipo: 'pdf' }) }} title="Ctrl+E">Exportar PDF</button>
        <button onClick={() => { setModo('completo'); setExportando({ tipo: 'png' }) }}>Exportar imagem</button>
        <button onClick={() => exportar('pdf', 'cliente')}>PDF para o cliente</button>
        <span className="sep" />
        <button onClick={() => setCatAberto(true)} title="Ctrl+K">Catálogo</button>
        <input ref={arquivo} type="file" accept=".pmv,application/json" hidden onChange={e => abrir(e.target.files?.[0])} />
      </header>

      <main className="principal">
        <aside className="lateral">
          <Formulario p={projeto} catalogo={catalogo} folgas={c.resultado.folgas} set={set} setProjeto={setProjeto} novaCor={novaCor} />
        </aside>
        <section className="direita"><Preview calc={c} /></section>
      </main>

      <footer className={`status ${avisos.length ? (temErro ? 'erro' : 'aviso') : 'ok'}`}>
        <span className="avisos">{avisos.length ? avisos.map(a => a.texto).join('  •  ') : 'Sem avisos.'}</span>
        {msg && <span className="msg">{msg}</span>}
        <strong>{orc.total > 0 ? `Total: ${fmtBrl(orc.total)}` : 'Total: preencha os preços no Catálogo'}</strong>
      </footer>

      {catAberto && <CatalogoDialogo catalogo={catalogo} onFechar={() => setCatAberto(false)}
        onSalvar={n => { const cc = completarCatalogo(n); salvarCatalogo(cc); setCatalogo(cc); setCatAberto(false) }} />}

      {exportando && (
        <div className="modal-fundo" onMouseDown={e => { if (e.target === e.currentTarget) setExportando(null) }}>
          <div className="modal pequeno">
            <h2>{exportando.tipo === 'pdf' ? 'Exportar PDF' : 'Exportar imagem (um PNG por página)'}</h2>
            <p>O que deseja exportar?</p>
            {MODOS.map(([k, t]) => (
              <label key={k} className="radio"><input type="radio" name="modo" checked={modo === k} onChange={() => setModo(k)} /> {t}</label>
            ))}
            <div className="rodape-modal">
              <span style={{ flex: 1 }} />
              <button className="sec" onClick={() => setExportando(null)}>Cancelar</button>
              <button className="prim" onClick={() => exportar(exportando.tipo, modo)}>Exportar</button>
            </div>
          </div>
        </div>
      )}
      {ocupado && <div className="ocupado">Gerando arquivo…</div>}
    </div>
  )
}
