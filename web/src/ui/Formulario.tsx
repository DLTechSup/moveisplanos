import * as C from '../core/catalogo'
import { DEFINICOES } from '../core/folgas'
import { PRESETS, aplicarPreset } from '../core/presets'
import type { Catalogo, Extra, FolgaInfo, Projeto } from '../core/tipos'
import { CampoCor, CampoMaterial, Grupo, Inteiro, Linha, Num, Select } from './campos'

interface Props {
  p: Projeto; catalogo: Catalogo; folgas: Record<string, FolgaInfo>
  set: (patch: Partial<Projeto>) => void; setProjeto: (p: Projeto) => void
  novaCor: (nome: string, cor: string) => void
}

export function Formulario({ p, catalogo, folgas, set, setProjeto, novaCor }: Props) {
  const nomes = (s: 'puxadores' | 'corredicas' | 'fitas' | 'dobradicas') => C.nomes(catalogo, s).map(n => [n, n] as [string, string])
  const cor = (v: string, k: keyof Projeto) => <CampoCor valor={v} catalogo={catalogo} onChange={n => set({ [k]: n } as any)} onNovaCor={novaCor} />
  const gav = p.motor === 'gavetas'

  const setExtra = (i: number, patch: Partial<Extra>) => set({ extras: p.extras.map((e, k) => (k === i ? { ...e, ...patch } : e)) })

  const alturas = p.alturas_personalizadas.map(v => String(v).replace('.', ',')).join('; ')

  return (
    <div className="formulario">
      <Grupo titulo="Projeto">
        <Linha rotulo="Nome do projeto"><input value={p.nome} onChange={e => set({ nome: e.target.value })} /></Linha>
        <Linha rotulo="Cliente"><input value={p.cliente} onChange={e => set({ cliente: e.target.value })} /></Linha>
        <Linha rotulo="Telefone"><input value={p.telefone} onChange={e => set({ telefone: e.target.value })} /></Linha>
        <Linha rotulo="Data"><input value={p.data} onChange={e => set({ data: e.target.value })} /></Linha>
        <Linha rotulo="Observações"><textarea rows={3} value={p.observacoes} onChange={e => set({ observacoes: e.target.value })} /></Linha>
      </Grupo>

      <Grupo titulo="Tipo de móvel">
        <Linha rotulo="Tipo">
          <Select valor={p.tipo} opcoes={Object.entries(PRESETS).map(([k, v]) => [v.nome, k] as [string, string])}
            onChange={t => setProjeto(aplicarPreset(p, t))} />
        </Linha>
        <p className="dica">Ao trocar o tipo, as medidas e a divisão são substituídas pelo modelo padrão.</p>
      </Grupo>

      <Grupo titulo="Medidas externas">
        <Linha rotulo="Largura"><Num valor={p.largura} min={10} max={600} sufixo="cm" onChange={v => set({ largura: v })} /></Linha>
        <Linha rotulo="Altura"><Num valor={p.altura} min={10} max={300} sufixo="cm" onChange={v => set({ altura: v })} /></Linha>
        <Linha rotulo="Profundidade"><Num valor={p.profundidade} min={10} max={120} sufixo="cm" onChange={v => set({ profundidade: v })} /></Linha>
      </Grupo>

      {gav ? (
        <Grupo titulo="Divisão (gavetas)">
          <Linha rotulo="Colunas"><Inteiro valor={p.colunas} min={1} max={6} onChange={v => set({ colunas: v })} /></Linha>
          <Linha rotulo="Gavetas por coluna"><Inteiro valor={p.gavetas_por_coluna} min={1} max={12} onChange={v => set({ gavetas_por_coluna: v })} /></Linha>
          <Linha rotulo="Distribuição">
            <Select valor={p.distribuicao} opcoes={[['Iguais', 'iguais'], ['Crescente (maiores embaixo)', 'crescente']]} onChange={v => set({ distribuicao: v })} />
          </Linha>
          <Linha rotulo="Alturas das frentes">
            <input defaultValue={alturas} key={p.tipo + p.gavetas_por_coluna} placeholder="opcional: 18; 0; 25 (cm, de cima p/ baixo, 0 = auto)"
              onChange={e => set({ alturas_personalizadas: e.target.value.replace(/,/g, '.').split(/[;\s]+/).map(Number).filter(n => Number.isFinite(n)) })} />
          </Linha>
          <Linha rotulo="Nicho superior"><Num valor={p.nicho} max={100} sufixo="cm" onChange={v => set({ nicho: v })} /></Linha>
        </Grupo>
      ) : (
        <Grupo titulo="Divisão (portas)">
          <Linha rotulo="Número de portas"><Inteiro valor={p.portas} min={1} max={8} onChange={v => set({ portas: v })} /></Linha>
          <Linha rotulo="Prateleiras por vão"><Inteiro valor={p.prateleiras} min={0} max={12} onChange={v => set({ prateleiras: v })} /></Linha>
          <Linha rotulo="Dobradiça"><Select valor={p.dobradica} opcoes={nomes('dobradicas')} onChange={v => set({ dobradica: v })} /></Linha>
        </Grupo>
      )}

      <Grupo titulo="Estrutura">
        <Linha rotulo="Material"><CampoMaterial material={p.estrutura_material} esp={p.estrutura_esp} catalogo={catalogo}
          onChange={(m, e) => set({ estrutura_material: m, estrutura_esp: e })} /></Linha>
        <Linha rotulo="Cor">{cor(p.estrutura_padrao, 'estrutura_padrao')}</Linha>
        <Linha rotulo="Tampo"><Select valor={p.tampo} opcoes={[['Sobreposto (cobre as laterais)', 'sobreposto'], ['Entre laterais', 'entre_laterais']]} onChange={v => set({ tampo: v })} /></Linha>
        <Linha rotulo="Base"><Select valor={p.base_tipo} opcoes={[['Rodapé', 'rodape'], ['Pés', 'pes'], ['Rodízios', 'rodizios'], ['Nenhuma', 'nenhuma']]} onChange={v => set({ base_tipo: v })} /></Linha>
        <Linha rotulo="Altura da base"><Num valor={p.base_altura} max={40} casas={1} sufixo="cm" onChange={v => set({ base_altura: v })} /></Linha>
        <Linha rotulo="Fundo"><Select valor={p.fundo_tipo} opcoes={[['Em rasgo', 'rasgo'], ['Pregado atrás', 'pregado']]} onChange={v => set({ fundo_tipo: v })} /></Linha>
        <Linha rotulo="Material do fundo"><CampoMaterial material={p.fundo_material} esp={p.fundo_esp} catalogo={catalogo}
          onChange={(m, e) => set({ fundo_material: m, fundo_esp: e })} /></Linha>
        <Linha rotulo="Cor do fundo">{cor(p.fundo_padrao, 'fundo_padrao')}</Linha>
      </Grupo>

      <Grupo titulo="Frentes e puxadores">
        <Linha rotulo="Tipo"><Select valor={p.frente_tipo} opcoes={[['Sobrepostas', 'sobrepostas'], ['Embutidas', 'embutidas']]} onChange={v => set({ frente_tipo: v })} /></Linha>
        <Linha rotulo="Material"><CampoMaterial material={p.frente_material} esp={p.frente_esp} catalogo={catalogo}
          onChange={(m, e) => set({ frente_material: m, frente_esp: e })} /></Linha>
        <Linha rotulo="Cor">{cor(p.frente_padrao, 'frente_padrao')}</Linha>
        <Linha rotulo="Puxador"><Select valor={p.puxador} opcoes={nomes('puxadores')} onChange={v => set({ puxador: v })} /></Linha>
        <Linha rotulo="Posição"><Select valor={p.puxador_posicao} opcoes={[['Centralizado', 'centro'], ['Superior', 'superior'], ['Lateral (portas)', 'lateral']]} onChange={v => set({ puxador_posicao: v })} /></Linha>
      </Grupo>

      {gav && (
        <Grupo titulo="Gavetas (caixa e corrediça)">
          <Linha rotulo="Corrediça"><Select valor={p.corredica} opcoes={nomes('corredicas')} onChange={v => set({ corredica: v })} /></Linha>
          <Linha rotulo="Comprimento">
            <Select valor={p.corredica_comp} opcoes={[['Automático', 'auto'], ...[250, 300, 350, 400, 450, 500, 550, 600].map(c => [`${c} mm`, String(c)] as [string, string])]}
              onChange={v => set({ corredica_comp: v })} />
          </Linha>
          <Linha rotulo="Material da caixa"><CampoMaterial material={p.caixa_material} esp={p.caixa_esp} catalogo={catalogo}
            onChange={(m, e) => set({ caixa_material: m, caixa_esp: e })} /></Linha>
          <Linha rotulo="Cor da caixa">{cor(p.caixa_padrao, 'caixa_padrao')}</Linha>
          <Linha rotulo="Fundo da caixa"><CampoMaterial material={p.fundo_caixa_material} esp={p.fundo_caixa_esp} catalogo={catalogo}
            onChange={(m, e) => set({ fundo_caixa_material: m, fundo_caixa_esp: e })} /></Linha>
        </Grupo>
      )}

      <Grupo titulo="Fita de borda">
        <Linha rotulo="Modelo"><Select valor={p.fita} opcoes={nomes('fitas')} onChange={v => set({ fita: v })} /></Linha>
      </Grupo>

      <Grupo titulo="Folgas (mm)" aberto={false}>
        <div className="folgas">
          {DEFINICOES.map(d => {
            const f = folgas[d.chave]
            if (!f) return null
            const trava = (v: number) => set({ folgas_travadas: { ...p.folgas_travadas, [d.chave]: v } })
            const solta = () => { const n = { ...p.folgas_travadas }; delete n[d.chave]; set({ folgas_travadas: n }) }
            return (
              <div key={d.chave} className={`folga ${f.fora ? 'fora' : ''} ${f.travada ? '' : 'auto'}`} title={d.dica || `Faixa permitida: ${d.minimo} a ${d.maximo} mm`}>
                <span>{d.nome}</span>
                <Num valor={f.valor} max={500} casas={2} sufixo="mm" onChange={trava} />
                <button type="button" className={`cadeado ${f.travada ? 'fechado' : ''}`} title="Cadeado fechado: valor fixo. Aberto: recalcula sozinho."
                  onClick={() => (f.travada ? solta() : trava(f.valor))}>{f.travada ? '🔒' : '🔓'}</button>
                <button type="button" className="auto" disabled={!f.travada} title="Restaurar o valor automático" onClick={solta}>auto</button>
              </div>
            )
          })}
          <button type="button" className="sec" onClick={() => set({ folgas_travadas: {} })}>Restaurar todas as folgas automáticas</button>
        </div>
      </Grupo>

      <Grupo titulo="Orçamento">
        <Linha rotulo="Mão de obra"><Num valor={p.mao_de_obra} max={1e7} sufixo="R$" onChange={v => set({ mao_de_obra: v })} /></Linha>
        <Linha rotulo="Margem"><Num valor={p.margem} max={500} casas={1} sufixo="%" onChange={v => set({ margem: v })} /></Linha>
        <div className="extras">
          <h5>Itens extras (LED, fechadura, vidro…)</h5>
          {p.extras.map((e, i) => (
            <div key={i} className="extra">
              <input placeholder="Descrição" value={e.descricao} onChange={ev => setExtra(i, { descricao: ev.target.value })} />
              <Num valor={e.qtd} className="peq" casas={2} onChange={v => setExtra(i, { qtd: v })} />
              <Num valor={e.preco} className="med" casas={2} sufixo="R$" onChange={v => setExtra(i, { preco: v })} />
              <button type="button" onClick={() => set({ extras: p.extras.filter((_, k) => k !== i) })} title="Remover">×</button>
            </div>
          ))}
          <button type="button" className="sec" onClick={() => set({ extras: [...p.extras, { descricao: '', qtd: 1, preco: 0 }] })}>+ item extra</button>
        </div>
      </Grupo>
    </div>
  )
}
