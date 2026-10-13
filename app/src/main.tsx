import { Component, StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

/** Último recurso: mostra o erro em vez de uma tela branca (e permite recarregar). */
class Raiz extends Component<{ children: ReactNode }, { erro: string }> {
  state = { erro: '' }
  static getDerivedStateFromError(e: unknown) { return { erro: e instanceof Error ? `${e.message}\n${e.stack ?? ''}` : String(e) } }
  render() {
    return this.state.erro
      ? <div style={{ padding: 24, font: '14px system-ui' }}><h2>Ocorreu um erro inesperado</h2>
          <p>Seus dados salvos não foram afetados. Clique em recarregar; se repetir, envie o texto abaixo ao suporte.</p>
          <button onClick={() => location.reload()}>Recarregar</button>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{this.state.erro}</pre></div>
      : this.props.children
  }
}

createRoot(document.getElementById('root')!).render(<StrictMode><Raiz><App /></Raiz></StrictMode>)
