import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { calcularProjeto } from './core/calculo'
import { adicionarPadrao, carregarCatalogo, completarCatalogo, salvarCatalogo } from './core/catalogo'
import { fmtBrl } from './core/formato'
import { migrarProjeto } from './core/migrar'
import { aplicarPreset, projetoDoModelo } from './core/presets'
import type { Catalogo, Projeto } from './core/tipos'
import { OPCOES_PADRAO } from './draw/folha'
import type { OpcoesExport } from './draw/folha'
import { abrirProjeto, exportarPdf, exportarPng, salvarProjeto } from './exportar'
import { CatalogoDialogo } from './ui/CatalogoDialogo'
import { Formulario } from './ui/Formulario'
import { Galeria } from './ui/Galeria'
import { Preview } from './ui/Preview'
import { PrecosDialogo } from './ui/PrecosDialogo'

const CHAVE_PROJETO = 'projeta-moveis:projeto'
const hoje = () => new Date().toLocaleDateString('pt-BR')

function projetoInicial(): { p: Projeto; novo: boolean } {
  try {
    const t = localStorage.getItem(CHAVE_PROJETO)
    if (t) return { p: migrarProjeto(JSON.parse(t)), novo: false }
  } catch { /* começa do zero */ }
  const p = projetoDoModelo('comoda_6')
  p.data = hoje()
  return { p, novo: true }
}

export default function App() {
  const inicio = useMemo(projetoInicial, [])
  const [projeto, setProjeto] = useState<Projeto>(inicio.p)
  const [catalogo, setCatalogo] = useState<Catalogo>(carregarCatalogo)
  const [galeria, setGaleria] = useState(inicio.novo)
  const [catAberto, setCatAberto] = useState(false)
  const [precosAberto, setPrecosAberto] = useState(false)
  const [exportando, setExportando] = useState<null | 'pdf' | 'png'>(null)
  const [opc, setOpc] = useState<OpcoesExport>(OPCOES_PADRAO)
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
  useEffect(() => {
    const w = window as any
    if (w.projeta?.onAbrirArquivo) w.projeta.onAbrirArquivo((d: { nome: string; texto: string }) => {
      try { setProjeto(migrarProjeto(JSON.parse(d.texto))); setGaleria(false); setMsg(`Projeto "${d.nome}" aberto.`) } catch { alert('Arquivo de projeto inválido.') }
    })
  }, [])
  useEffect(() => { document.title = `Projeta Móveis — ${projeto.nome || 'sem título'}` }, [projeto.nome])
  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(''), 6000); return () => clearTimeout(t) }, [msg])

  const set = useCallback((patch: Partial<Projeto>) => setProjeto(p => ({ ...p, ...patch })), [])
  const salvarCat = useCallback((n: Catalogo) => { const cc = completarCatalogo(n); salvarCatalogo(cc); setCatalogo(cc) }, [])
  const novaCor = useCallback((nome: string, cor: string) => {
    setCatalogo(c0 => { const n = adicionarPadrao(c0, nome, cor); salvarCatalogo(n); return n })
  }, [])

  const abrir = async (f: File | undefined) => {
    if (!f) return
    try { setProjeto(await abrirProjeto(f)); setMsg(`Projeto "${f.name}" aberto.`) } catch (e) { alert(`Não foi possível abrir o arquivo:\n${e}`) }
    if (arquivo.current) arquivo.current.value = ''
  }
  const exportar = async (tipo: 'pdf' | 'png', o: OpcoesExport) => {
    setExportando(null); setOcupado(true)
    try {
      const n = tipo === 'pdf' ? await exportarPdf(c, o) : await exportarPng(c, o)
      setMsg(tipo === 'pdf' ? `PDF com ${n} folha(s) gerado.` : `${n} imagem(ns) gerada(s).`)
    } catch (e) { alert(`Falha ao exportar:\n${e}`) }
    setOcupado(false)
  }

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      const t = e.key.toLowerCase()
      if (t === 's') { e.preventDefault(); salvarProjeto(projeto) }
      else if (t === 'e') { e.preventDefault(); setExportando('pdf') }
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
        <button onClick={() => setGaleria(true)} title="Escolher um modelo / novo projeto">Novo / modelos</button>
        <button onClick={() => arquivo.current?.click()} title="Ctrl+O">Abrir</button>
        <button onClick={() => salvarProjeto(projeto)} title="Ctrl+S">Salvar</button>
        <span className="sep" />
        <button className="prim" onClick={() => exportar('pdf', OPCOES_PADRAO)} title="2 folhas: projeto + materiais e valores">PDF para o cliente</button>
        <button onClick={() => setExportando('pdf')} title="Ctrl+E">Exportar PDF…</button>
        <button onClick={() => setExportando('png')}>Exportar imagens…</button>
        <span className="sep" />
        <button onClick={() => setPrecosAberto(true)}>Preços</button>
        <button onClick={() => setCatAberto(true)} title="Ctrl+K">Catálogo</button>
        <input ref={arquivo} type="file" accept=".pmv,application/json" hidden onChange={e => abrir(e.target.files?.[0])} />
      </header>

      <main className="principal">
        <aside className="lateral">
          <Formulario p={projeto} catalogo={catalogo} calc={c} set={set} novaCor={novaCor} abrirGaleria={() => setGaleria(true)} abrirPrecos={() => setPrecosAberto(true)} />
        </aside>
        <section className="direita"><Preview calc={c} /></section>
      </main>

      <footer className={`status ${avisos.length ? (temErro ? 'erro' : 'aviso') : 'ok'}`}>
        <span className="avisos">{avisos.length ? avisos.map(a => a.texto).join('  •  ') : 'Sem avisos.'}</span>
        {msg && <span className="msg">{msg}</span>}
        <strong>{orc.total > 0 ? `Total: ${fmtBrl(orc.total)}${orc.incompleto ? ' (há itens sem preço)' : ''}` : 'Total: informe os preços (botão Preços)'}</strong>
      </footer>

      {galeria && <Galeria catalogo={catalogo} atual={projeto.tipo} onFechar={() => setGaleria(false)}
        onEscolher={id => { setProjeto(p => (p.tipo === id && !inicio.novo ? aplicarPreset(p, id) : { ...aplicarPreset(p, id), data: p.data || hoje() })); setGaleria(false) }} />}

      {catAberto && <CatalogoDialogo catalogo={catalogo} cidade={projeto.cidade} uf={projeto.uf} onFechar={() => setCatAberto(false)}
        onSalvar={n => { salvarCat(n); setCatAberto(false) }} />}

      {precosAberto && <PrecosDialogo calc={c} cidade={projeto.cidade} uf={projeto.uf} setLocal={(cidade, uf) => set({ cidade, uf })}
        onCatalogo={salvarCat} onFechar={() => setPrecosAberto(false)} />}

      {exportando && (
        <div className="modal-fundo" onMouseDown={e => { if (e.target === e.currentTarget) setExportando(null) }}>
          <div className="modal pequeno">
            <h2>{exportando === 'pdf' ? 'Exportar PDF' : 'Exportar imagens (um PNG por folha)'}</h2>
            <p>A <b>folha 1</b> traz o projeto completo (vistas, medidas, definições, materiais e plano de corte). Escolha o que mais incluir:</p>
            <label className="radio"><input type="checkbox" checked={opc.materiais} onChange={e => setOpc({ ...opc, materiais: e.target.checked })} /> Folha 2: relação de materiais e valores</label>
            <label className="radio"><input type="checkbox" checked={opc.chapas} onChange={e => setOpc({ ...opc, chapas: e.target.checked })} /> Plano de chapas (corte otimizado, folhas extras)</label>
            {opc.materiais && <>
              <p className="sub">Valores na folha 2:</p>
              {([['itens', 'Mostrar valor de cada item e o total'], ['total', 'Mostrar só o total'], ['nenhum', 'Não mostrar valores (lista de materiais apenas)']] as const).map(([k, t]) => (
                <label key={k} className="radio"><input type="radio" name="val" checked={opc.valores === k} onChange={() => setOpc({ ...opc, valores: k })} /> {t}</label>
              ))}
            </>}
            <div className="rodape-modal">
              <span style={{ flex: 1 }} />
              <button className="sec" onClick={() => setExportando(null)}>Cancelar</button>
              <button className="prim" onClick={() => exportar(exportando, opc)}>Exportar</button>
            </div>
          </div>
        </div>
      )}
      {ocupado && <div className="ocupado">Gerando arquivo…</div>}
    </div>
  )
}
