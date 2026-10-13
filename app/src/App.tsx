import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { calcularProjeto } from './core/calculo'
import { adicionarPadrao, carregarCatalogo, completarCatalogo, salvarCatalogo } from './core/catalogo'
import { fmtBrl } from './core/formato'
import { obter } from './core/layout'
import type { Caminho } from './core/layout'
import { migrarProjeto } from './core/migrar'
import { aplicarPreset, projetoDoModelo } from './core/presets'
import type { Catalogo, No, Projeto } from './core/tipos'
import { ehDivisao } from './core/tipos'
import { OPCOES_PADRAO, itensExportar } from './draw/folha'
import type { OpcoesExport } from './draw/folha'
import { abrirProjeto, exportarPdf, exportarSelecao, salvarProjeto } from './exportar'
import type { FormatoExport } from './exportar'
import { CatalogoDialogo } from './ui/CatalogoDialogo'
import { Editor } from './ui/Editor'
import type { EditarLayout } from './ui/Editor'
import { Formulario } from './ui/Formulario'
import { Galeria } from './ui/Galeria'
import { Preview } from './ui/Preview'
import { LicencaDialogo, useLicenca } from './ui/Licenca'
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
  const projetoRef = useRef<Projeto>(inicio.p)
  const passado = useRef<Projeto[]>([])
  const futuro = useRef<Projeto[]>([])
  const ultimaChave = useRef<{ k: string; t: number } | null>(null)
  const [, forcar] = useState(0)
  const [selecao, setSelecaoEstado] = useState<Caminho | null>(null)
  const [catalogo, setCatalogo] = useState<Catalogo>(carregarCatalogo)
  const [galeria, setGaleria] = useState(inicio.novo)
  const [catAberto, setCatAberto] = useState(false)
  const lic = useLicenca()
  const [precosAberto, setPrecosAberto] = useState(false)
  const [exportando, setExportando] = useState<null | { ids: string[]; formato: FormatoExport }>(null)
  const [opc, setOpc] = useState<OpcoesExport>(OPCOES_PADRAO)
  const [msg, setMsg] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const arquivo = useRef<HTMLInputElement>(null)

  // ---- estado do projeto com desfazer/refazer ------------------------------------------------------------------------------------------------
  const aplicar = useCallback((fn: (p: Projeto) => Projeto, chave?: string) => {
    const atual = projetoRef.current
    const novo = fn(atual)
    if (novo === atual) return
    const agora = Date.now()
    const junta = !!chave && ultimaChave.current?.k === chave && agora - ultimaChave.current.t < 1200
    if (!junta) { passado.current.push(atual); if (passado.current.length > 120) passado.current.shift() }
    ultimaChave.current = chave ? { k: chave, t: agora } : null
    futuro.current = []
    projetoRef.current = novo
    setProjeto(novo)
    forcar(n => n + 1)
  }, [])
  const trocarProjeto = useCallback((novo: Projeto) => { aplicar(() => novo); setSelecaoEstado(null) }, [aplicar])
  const desfazer = useCallback(() => {
    const anterior = passado.current.pop()
    if (!anterior) return
    futuro.current.push(projetoRef.current)
    projetoRef.current = anterior; ultimaChave.current = null
    setProjeto(anterior); forcar(n => n + 1)
  }, [])
  const refazer = useCallback(() => {
    const prox = futuro.current.pop()
    if (!prox) return
    passado.current.push(projetoRef.current)
    projetoRef.current = prox; ultimaChave.current = null
    setProjeto(prox); forcar(n => n + 1)
  }, [])

  const set = useCallback((patch: Partial<Projeto>) => aplicar(p => ({ ...p, ...patch }), Object.keys(patch).join(',')), [aplicar])
  const editarLayout: EditarLayout = useCallback((fn, chave) => {
    let novaSel: Caminho | null | undefined
    aplicar(p => {
      const r = fn(p.layout)
      if (!r) return p
      novaSel = r.selecao
      return { ...p, layout: r.layout }
    }, chave ? 'layout:' + chave : undefined)
    if (novaSel !== undefined) setSelecaoEstado(novaSel)
  }, [aplicar])
  const editarDims = useCallback((patch: { largura?: number; altura?: number }) => aplicar(p => ({ ...p, ...patch }), 'dims'), [aplicar])
  const setSelecao = useCallback((c: Caminho | null) => setSelecaoEstado(c), [])

  // a seleção some se o vão deixar de existir
  useEffect(() => {
    if (selecao && !(obter(projeto.layout, selecao) && !ehDivisao(obter(projeto.layout, selecao) as No))) setSelecaoEstado(null)
  }, [projeto.layout, selecao])

  const adiado = useDeferredValue(projeto)
  const calc = useMemo(() => {
    try { return calcularProjeto(adiado, catalogo) } catch (e) { console.error(e); return null }
  }, [adiado, catalogo])
  const ultimo = useRef(calc)
  if (calc) ultimo.current = calc
  const c = calc ?? ultimo.current!

  useEffect(() => { try { localStorage.setItem(CHAVE_PROJETO, JSON.stringify(projeto)) } catch { /* sem armazenamento */ } }, [projeto])
  useEffect(() => { document.title = `Projeta Móveis — ${projeto.nome || 'sem título'}` }, [projeto.nome])
  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(''), 6000); return () => clearTimeout(t) }, [msg])
  useEffect(() => {
    const w = window as any
    if (w.projeta?.onAbrirArquivo) w.projeta.onAbrirArquivo((d: { nome: string; texto: string }) => {
      try { trocarProjeto(migrarProjeto(JSON.parse(d.texto))); setGaleria(false); setMsg(`Projeto "${d.nome}" aberto.`) } catch { alert('Arquivo de projeto inválido.') }
    })
  }, [trocarProjeto])

  const salvarCat = useCallback((n: Catalogo) => { const cc = completarCatalogo(n); salvarCatalogo(cc); setCatalogo(cc) }, [])
  const novaCor = useCallback((nome: string, cor: string) => {
    setCatalogo(c0 => { const n = adicionarPadrao(c0, nome, cor); salvarCatalogo(n); return n })
  }, [])

  const abrir = async (f: File | undefined) => {
    if (!f) return
    try { trocarProjeto(await abrirProjeto(f)); setMsg(`Projeto "${f.name}" aberto.`) } catch (e) { alert(`Não foi possível abrir o arquivo:\n${e}`) }
    if (arquivo.current) arquivo.current.value = ''
  }
  const exportarRapido = async () => {
    setOcupado(true)
    try { const n = await exportarPdf(c, OPCOES_PADRAO); setMsg(`PDF com ${n} folha(s) gerado.`) } catch (e) { alert(`Falha ao exportar:\n${e}`) }
    setOcupado(false)
  }
  const exportarEscolha = async () => {
    if (!exportando) return
    const { ids, formato } = exportando
    setExportando(null); setOcupado(true)
    try { const n = await exportarSelecao(c, ids, formato, opc); setMsg(`${n} arquivo(s)/folha(s) gerado(s) (${formato.toUpperCase()}).`) } catch (e) { alert(`Falha ao exportar:\n${e}`) }
    setOcupado(false)
  }
  const abrirExportar = (ids?: string[]) => setExportando({ ids: ids ?? ['folha1', 'folha2'], formato: 'pdf' })

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      const alvo = e.target as HTMLElement
      const emCampo = /INPUT|TEXTAREA|SELECT/.test(alvo.tagName)
      const t = e.key.toLowerCase()
      if (t === 's') { e.preventDefault(); salvarProjeto(projetoRef.current) }
      else if (t === 'e') { e.preventDefault(); abrirExportar() }
      else if (t === 'o') { e.preventDefault(); arquivo.current?.click() }
      else if (t === 'k') { e.preventDefault(); setCatAberto(true) }
      else if (t === 'z' && !emCampo) { e.preventDefault(); e.shiftKey ? refazer() : desfazer() }
      else if (t === 'y' && !emCampo) { e.preventDefault(); refazer() }
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [desfazer, refazer])

  const avisos = c.resultado.avisos
  const temErro = avisos.some(a => a.nivel === 'erro')
  const orc = c.orcamento
  const itens = useMemo(() => itensExportar(c), [c])

  return (
    <div className="app">
      <header className="barra">
        <img src="./icone.png" alt="" />
        <strong>Projeta Móveis</strong>
        <button onClick={() => setGaleria(true)} title="Escolher um modelo / novo projeto">Novo / modelos</button>
        <button onClick={() => arquivo.current?.click()} title="Ctrl+O">Abrir</button>
        <button onClick={() => salvarProjeto(projeto)} title="Ctrl+S">Salvar</button>
        <span className="sep" />
        <button onClick={desfazer} disabled={!passado.current.length} title="Desfazer (Ctrl+Z)">↶ Desfazer</button>
        <button onClick={refazer} disabled={!futuro.current.length} title="Refazer (Ctrl+Y)">↷ Refazer</button>
        <span className="sep" />
        <button className="prim" onClick={exportarRapido} title="2 folhas: projeto + materiais e valores">PDF para o cliente</button>
        <button onClick={() => abrirExportar()} title="Ctrl+E — escolha exatamente o que salvar">Exportar partes…</button>
        <span className="sep" />
        <button onClick={() => setPrecosAberto(true)}>Preços</button>
        <button onClick={() => setCatAberto(true)} title="Ctrl+K">Catálogo</button>
        {lic.est && lic.est.estado !== 'dev' && (
          <button className={lic.est.estado === 'licenciado' ? '' : 'prim'} onClick={lic.abrir}>
            {lic.est.estado === 'licenciado' ? 'Licença' : lic.est.estado === 'teste' ? `Teste: ${lic.est.dias} dia(s) — Ativar` : 'Ativar'}
          </button>
        )}
        <input ref={arquivo} type="file" accept=".pmv,application/json" hidden onChange={e => abrir(e.target.files?.[0])} />
      </header>

      <main className="principal">
        <aside className="lateral">
          <Formulario p={projeto} catalogo={catalogo} calc={c} set={set} novaCor={novaCor} selecao={selecao} setSelecao={setSelecao}
            editarLayout={editarLayout} abrirGaleria={() => setGaleria(true)} abrirPrecos={() => setPrecosAberto(true)} />
        </aside>
        <section className="direita">
          <Preview calc={c} onSalvarVista={id => abrirExportar([id])}
            editor={<Editor calc={c} projeto={projeto} selecao={selecao} setSelecao={setSelecao} editarLayout={editarLayout} editarDims={editarDims} />} />
        </section>
      </main>

      {lic.est && lic.est.estado !== 'dev' && (lic.dialogo || lic.est.estado === 'bloqueado') && (
        <LicencaDialogo est={lic.est} bloqueado={lic.est.estado === 'bloqueado'} onFechar={lic.fechar} onEstado={lic.setEst} />
      )}
      <footer className={`status ${avisos.length ? (temErro ? 'erro' : 'aviso') : 'ok'}`}>
        <span className="avisos">{avisos.length ? avisos.map(a => a.texto).join('  •  ') : 'Sem avisos.'}</span>
        {msg && <span className="msg">{msg}</span>}
        <strong>{orc.total > 0 ? `Total: ${fmtBrl(orc.total)}${orc.incompleto ? ' (há itens sem preço)' : ''}` : 'Total: informe os preços (botão Preços)'}</strong>
      </footer>

      {galeria && <Galeria catalogo={catalogo} atual={projeto.tipo} onFechar={() => setGaleria(false)}
        onEscolher={id => { aplicar(p => ({ ...aplicarPreset(p, id), data: p.data || hoje() })); setSelecaoEstado(null); setGaleria(false) }} />}

      {catAberto && <CatalogoDialogo catalogo={catalogo} cidade={projeto.cidade} uf={projeto.uf} onFechar={() => setCatAberto(false)}
        onSalvar={n => { salvarCat(n); setCatAberto(false) }} />}

      {precosAberto && <PrecosDialogo calc={c} cidade={projeto.cidade} uf={projeto.uf} setLocal={(cidade, uf) => set({ cidade, uf })}
        onCatalogo={salvarCat} onFechar={() => setPrecosAberto(false)} />}

      {exportando && (
        <div className="modal-fundo" onMouseDown={e => { if (e.target === e.currentTarget) setExportando(null) }}>
          <div className="modal exportar">
            <h2>Exportar partes do projeto</h2>
            <p className="dica">Marque o que quer salvar. Cada parte pode sair sozinha (por exemplo, só a vista explodida) ou o projeto inteiro.</p>
            <div className="botoes-linha">
              <button className="sec" onClick={() => setExportando({ ...exportando, ids: ['folha1', 'folha2'] })}>Projeto inteiro (2 folhas)</button>
              <button className="sec" onClick={() => setExportando({ ...exportando, ids: itens.map(i => i.id) })}>Tudo</button>
              <button className="sec" onClick={() => setExportando({ ...exportando, ids: itens.filter(i => i.grupo === 'vista').map(i => i.id) })}>Todas as vistas</button>
              <button className="sec" onClick={() => setExportando({ ...exportando, ids: [] })}>Limpar</button>
            </div>
            <div className="lista-export">
              {itens.map(i => (
                <label key={i.id} className="radio"><input type="checkbox" checked={exportando.ids.includes(i.id)}
                  onChange={e => setExportando({ ...exportando, ids: e.target.checked ? [...exportando.ids, i.id] : exportando.ids.filter(x => x !== i.id) })} /> {i.titulo}</label>
              ))}
            </div>
            <div className="linha-fmt">
              <b>Formato:</b>
              {(['pdf', 'png', 'svg'] as const).map(f => (
                <label key={f} className="radio"><input type="radio" name="fmt" checked={exportando.formato === f} onChange={() => setExportando({ ...exportando, formato: f })} /> {f === 'pdf' ? 'PDF (um arquivo)' : f === 'png' ? 'Imagem PNG (um por parte)' : 'SVG (vetor, um por parte)'}</label>
              ))}
            </div>
            {exportando.ids.includes('folha2') && <div className="linha-fmt"><b>Valores na folha de materiais:</b>
              {([['itens', 'cada item e total'], ['total', 'só o total'], ['nenhum', 'sem valores']] as const).map(([k, t]) => (
                <label key={k} className="radio"><input type="radio" name="val" checked={opc.valores === k} onChange={() => setOpc({ ...opc, valores: k })} /> {t}</label>
              ))}</div>}
            <div className="rodape-modal">
              <span style={{ flex: 1 }} />
              <button className="sec" onClick={() => setExportando(null)}>Cancelar</button>
              <button className="prim" disabled={!exportando.ids.length} onClick={exportarEscolha}>Exportar</button>
            </div>
          </div>
        </div>
      )}
      {ocupado && <div className="ocupado">Gerando arquivo…</div>}
    </div>
  )
}
