// Tela de ativação / período de teste (só no aplicativo Windows; no navegador de desenvolvimento não pede licença).
import { useEffect, useState } from 'react'

export interface EstadoLicenca {
  estado: 'dev' | 'licenciado' | 'teste' | 'bloqueado'
  dias?: number; motivo?: string; idMaquina?: string
  dados?: { cliente: string; email?: string; tipo: string; validade: string | null }
}
type Api = { licencaEstado: () => Promise<EstadoLicenca>; licencaAtivar: (c: string) => Promise<{ ok: boolean; motivo?: string; estado: EstadoLicenca }> }
const api = (): Api | undefined => (window as unknown as { projeta?: Api }).projeta?.licencaEstado ? (window as unknown as { projeta: Api }).projeta : undefined

export function useLicenca() {
  const [est, setEst] = useState<EstadoLicenca | null>(null)
  const [dialogo, setDialogo] = useState(false)
  useEffect(() => { api()?.licencaEstado().then(setEst) }, [])
  return { est, dialogo, abrir: () => setDialogo(true), fechar: () => setDialogo(false), setEst }
}

export function LicencaDialogo({ est, bloqueado, onFechar, onEstado }: { est: EstadoLicenca; bloqueado: boolean; onFechar: () => void; onEstado: (e: EstadoLicenca) => void }) {
  const [chave, setChave] = useState('')
  const [erro, setErro] = useState('')
  const [copiado, setCopiado] = useState(false)
  const ativar = async () => {
    const r = await api()?.licencaAtivar(chave)
    if (!r) return
    if (r.ok) { onEstado(r.estado); onFechar() } else setErro(r.motivo || 'Chave inválida.')
  }
  return (
    <div className="modal-fundo">
      <div className="modal licenca">
        <h2>{est.estado === 'licenciado' ? 'Licença' : 'Ativar o Projeta Móveis'}</h2>
        {est.estado === 'licenciado' && est.dados && (
          <p>Licenciado para <b>{est.dados.cliente}</b> — {est.dados.tipo}{est.dados.validade ? `, válida até ${est.dados.validade.split('-').reverse().join('/')}` : ', sem data de validade'}.</p>
        )}
        {est.estado === 'teste' && <p>Versão de teste: restam <b>{est.dias} dia(s)</b>.</p>}
        {est.estado === 'bloqueado' && <p className="erro-txt"><b>{est.motivo}</b> Informe sua chave de licença para continuar usando.</p>}
        {est.estado !== 'licenciado' && (
          <>
            <label>Chave de licença
              <textarea rows={5} value={chave} onChange={e => { setChave(e.target.value); setErro('') }} placeholder="PMV1.…" spellCheck={false} />
            </label>
            {erro && <p className="erro-txt">{erro}</p>}
            <p className="dica">ID deste computador (informe ao vendedor se sua licença for presa a uma máquina):{' '}
              <code>{est.idMaquina}</code>{' '}
              <button onClick={() => { navigator.clipboard?.writeText(est.idMaquina || ''); setCopiado(true) }}>{copiado ? 'copiado' : 'copiar'}</button></p>
          </>
        )}
        <div className="acoes">
          {est.estado !== 'licenciado' && <button className="prim" disabled={!chave.trim()} onClick={ativar}>Ativar</button>}
          {!bloqueado && <button onClick={onFechar}>{est.estado === 'licenciado' ? 'Fechar' : 'Continuar testando'}</button>}
        </div>
      </div>
    </div>
  )
}
