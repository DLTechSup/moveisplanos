import * as C from '../core/catalogo'
import { TAMANHOS_CAMA } from '../core/cama'
import type { Calculo } from '../core/calculo'
import { DEFINICOES } from '../core/folgas'
import { porId } from '../core/presets'
import type { CamaCfg, Catalogo, Extra, MesaCfg, Projeto } from '../core/tipos'
import { PainelItem } from './PainelItem'
import type { EditarLayout } from './Editor'
import type { Caminho } from '../core/layout'
import { CampoCor, CampoMaterial, Grupo, Inteiro, Linha, Num, Select } from './campos'

interface Props {
  p: Projeto; catalogo: Catalogo; calc: Calculo
  set: (patch: Partial<Projeto>) => void
  novaCor: (nome: string, cor: string) => void
  selecao: Caminho | null; setSelecao: (c: Caminho | null) => void; editarLayout: EditarLayout
  abrirGaleria: () => void; abrirPrecos: () => void
}

export function Formulario({ p, catalogo, calc, set, novaCor, selecao, setSelecao, editarLayout, abrirGaleria, abrirPrecos }: Props) {
  const folgas = calc.resultado.folgas
  const nomes = (s: 'puxadores' | 'corredicas' | 'fitas' | 'dobradicas') => C.nomes(catalogo, s).map(n => [n, n] as [string, string])
  const cor = (v: string, k: keyof Projeto) => <CampoCor valor={v} catalogo={catalogo} onChange={n => set({ [k]: n } as any)} onNovaCor={novaCor} />
  const modular = p.familia === 'modular', mesa = p.familia === 'mesa', cama = p.familia === 'cama'
  const folhas = calc.resultado.layout?.folhas ?? []
  const temGavetas = calc.resultado.medidas.n_gavetas > 0 || (modular && folhas.some(f => f.tipo === 'gavetas'))
  const temPortas = modular && folhas.some(f => f.tipo === 'portas')
  const mm = calc.resultado.medidas
  const setExtra = (i: number, patch: Partial<Extra>) => set({ extras: p.extras.map((e, k) => (k === i ? { ...e, ...patch } : e)) })
  const setMesa = (patch: Partial<MesaCfg>) => set({ mesa: { ...p.mesa, ...patch } })
  const setCama = (patch: Partial<CamaCfg>) => set({ cama: { ...p.cama, ...patch } })
  const modelo = porId(p.tipo)

  return (
    <div className="formulario">
      <Grupo titulo="Projeto">
        <Linha rotulo="Nome do projeto"><input value={p.nome} onChange={e => set({ nome: e.target.value })} /></Linha>
        <Linha rotulo="Cliente"><input value={p.cliente} onChange={e => set({ cliente: e.target.value })} /></Linha>
        <Linha rotulo="Telefone"><input value={p.telefone} onChange={e => set({ telefone: e.target.value })} /></Linha>
        <Linha rotulo="Data"><input value={p.data} onChange={e => set({ data: e.target.value })} /></Linha>
        <Linha rotulo="Sua marcenaria"><input value={p.empresa} placeholder="aparece no cabeçalho" onChange={e => set({ empresa: e.target.value })} /></Linha>
        <Linha rotulo="Cidade / UF">
          <span className="duplo uf">
            <input value={p.cidade} placeholder="para pesquisar preços" onChange={e => set({ cidade: e.target.value })} />
            <input value={p.uf} maxLength={2} onChange={e => set({ uf: e.target.value.toUpperCase() })} />
          </span>
        </Linha>
      </Grupo>

      <Grupo titulo="Modelo do móvel">
        <button type="button" className="modelo-atual" onClick={abrirGaleria}>
          <b>{modelo?.nome ?? 'Modelo'}</b>
          <span>{modelo?.categoria ?? ''} — clique para trocar</span>
        </button>
        <p className="dica">Ao trocar o modelo, as medidas e a divisão são substituídas; materiais, cores e dados do cliente são mantidos.</p>
      </Grupo>

      {!cama && (
        <Grupo titulo="Medidas do móvel">
          <div className="sub-medidas">Externas (parte de fora)</div>
          <Linha rotulo={mesa && p.mesa.formato === 'redonda' ? 'Diâmetro' : 'Largura'}><Num valor={p.largura} min={10} max={700} sufixo="cm" onChange={v => set({ largura: v, ...(mesa && p.mesa.formato === 'redonda' ? { profundidade: v } : {}) })} /></Linha>
          <Linha rotulo="Altura"><Num valor={p.altura} min={5} max={320} sufixo="cm" onChange={v => set({ altura: v })} /></Linha>
          {!(mesa && p.mesa.formato === 'redonda') && <Linha rotulo="Profundidade"><Num valor={p.profundidade} min={5} max={160} sufixo="cm" onChange={v => set({ profundidade: v })} /></Linha>}
          {modular && <Linha rotulo="Altura do chão" dica="Para móveis suspensos na parede (aéreos, racks, criados)"><Num valor={p.elevacao} max={250} sufixo="cm" onChange={v => set({ elevacao: v })} /></Linha>}
          {modular && mm.Hi != null && <>
            <div className="sub-medidas">Internas (úteis) — calculadas; edite aqui se preferir partir do vão</div>
            <Linha rotulo="Largura interna" dica="Entre as laterais. Editar muda a largura externa."><Num valor={mm.largura_util / 10} min={5} max={700} sufixo="cm" onChange={v => set({ largura: v + (2 * mm.e) / 10 })} /></Linha>
            <Linha rotulo="Altura interna" dica="Do topo da base à parte de baixo do tampo. Editar muda a altura externa."><Num valor={mm.Hi / 10} min={5} max={320} sufixo="cm" onChange={v => set({ altura: p.altura + (v - mm.Hi / 10) })} /></Linha>
            <Linha rotulo="Profundidade útil" dica="Até a frente das gavetas/portas. Editar muda a profundidade externa."><Num valor={mm.Dint / 10} min={5} max={160} sufixo="cm" onChange={v => set({ profundidade: p.profundidade + (v - mm.Dint / 10) })} /></Linha>
          </>}
        </Grupo>
      )}

      {modular && (
        <Grupo titulo="Vão selecionado (medidas e opções)">
          <PainelItem calc={calc} selecao={selecao} setSelecao={setSelecao} editarLayout={editarLayout} />
        </Grupo>
      )}
      {modular && (
        <Grupo titulo="Portas">
          <Linha rotulo="Tipo de porta">
            <Select valor={p.porta_correr >= 2 ? 'correr' : 'abrir'} opcoes={[['De abrir (dobradiças)', 'abrir'], ['De correr (trilho)', 'correr']]}
              onChange={v => set({ porta_correr: v === 'correr' ? Math.max(2, Math.round(p.largura / 90)) : 0 })} />
          </Linha>
          {p.porta_correr >= 2 && <Linha rotulo="Número de portas"><Inteiro valor={p.porta_correr} min={2} max={6} onChange={v => set({ porta_correr: v })} /></Linha>}
          {temPortas && p.porta_correr < 2 && <Linha rotulo="Dobradiça"><Select valor={p.dobradica} opcoes={nomes('dobradicas')} onChange={v => set({ dobradica: v })} /></Linha>}
        </Grupo>
      )}

      {mesa && (
        <Grupo titulo="Mesa">
          <Linha rotulo="Formato"><Select valor={p.mesa.formato} opcoes={[['Retangular', 'retangular'], ['Redonda', 'redonda']]} onChange={v => setMesa({ formato: v })} /></Linha>
          <Linha rotulo="Material do tampo"><CampoMaterial material={p.mesa.tampo_material} esp={p.mesa.tampo_esp} catalogo={catalogo} onChange={(m, e) => setMesa({ tampo_material: m, tampo_esp: e })} /></Linha>
          <Linha rotulo="Apoio"><Select valor={p.mesa.pes} opcoes={[['Pernas quadradas', 'quadrado'], ['Painéis laterais', 'painel']]} onChange={v => setMesa({ pes: v })} /></Linha>
          {p.mesa.pes === 'quadrado' && <>
            <Linha rotulo="Seção da perna"><Num valor={p.mesa.perna} min={3} max={15} casas={1} sufixo="cm" onChange={v => setMesa({ perna: v })} /></Linha>
            <Linha rotulo="Material da perna"><Select valor={p.mesa.perna_material} opcoes={C.materiais(catalogo).map(m => [m, m] as [string, string])} onChange={v => setMesa({ perna_material: v })} /></Linha>
            {p.mesa.formato !== 'redonda' && <Linha rotulo="Saia (travessa)"><Num valor={p.mesa.saia} min={4} max={30} casas={1} sufixo="cm" onChange={v => setMesa({ saia: v })} /></Linha>}
          </>}
          <Linha rotulo="Prateleira inferior"><input type="checkbox" checked={p.mesa.prateleira_inferior} onChange={e => setMesa({ prateleira_inferior: e.target.checked })} /></Linha>
          <Linha rotulo="Gavetas sob o tampo"><Inteiro valor={p.mesa.gavetas} min={0} max={4} onChange={v => setMesa({ gavetas: v, saia: v > 0 && p.mesa.saia < 14 ? 16 : p.mesa.saia })} /></Linha>
        </Grupo>
      )}

      {cama && (
        <Grupo titulo="Cama">
          <Linha rotulo="Tamanho do colchão">
            <Select valor={p.cama.tamanho} opcoes={Object.entries(TAMANHOS_CAMA).map(([k, v]) => [v.nome + (v.l ? ` (${v.l}×${v.c})` : ''), k] as [string, string])}
              onChange={t => { const z = TAMANHOS_CAMA[t]; setCama(z.l ? { tamanho: t, colchao_l: z.l, colchao_c: z.c } : { tamanho: t }) }} />
          </Linha>
          <Linha rotulo="Largura do colchão"><Num valor={p.cama.colchao_l} min={50} max={250} sufixo="cm" onChange={v => setCama({ colchao_l: v, tamanho: 'personalizado' })} /></Linha>
          <Linha rotulo="Comprimento"><Num valor={p.cama.colchao_c} min={100} max={260} sufixo="cm" onChange={v => setCama({ colchao_c: v, tamanho: 'personalizado' })} /></Linha>
          <Linha rotulo="Altura do estrado"><Num valor={p.cama.altura_base} min={15} max={80} casas={1} sufixo="cm" onChange={v => setCama({ altura_base: v })} /></Linha>
          <Linha rotulo="Estrado"><Select valor={p.cama.estrado} opcoes={[['Ripas de madeira', 'ripas'], ['Chapa', 'chapa']]} onChange={v => setCama({ estrado: v })} /></Linha>
          <Linha rotulo="Cabeceira"><Select valor={p.cama.cabeceira} opcoes={[['Painel', 'painel'], ['Sem cabeceira', 'nenhuma']]} onChange={v => setCama({ cabeceira: v })} /></Linha>
          {p.cama.cabeceira === 'painel' && <Linha rotulo="Altura da cabeceira"><Num valor={p.cama.cabeceira_altura} min={40} max={200} sufixo="cm" onChange={v => setCama({ cabeceira_altura: v })} /></Linha>}
          <Linha rotulo="Andares"><Select valor={String(p.cama.andares)} opcoes={[['1 (cama simples)', '1'], ['2 (beliche)', '2']]} onChange={v => setCama({ andares: Number(v) as 1 | 2 })} /></Linha>
        </Grupo>
      )}

      <Grupo titulo={cama ? 'Material da cama' : mesa ? 'Estrutura (saia, painéis e prateleira)' : 'Estrutura'}>
        <Linha rotulo="Material"><CampoMaterial material={p.estrutura_material} esp={p.estrutura_esp} catalogo={catalogo} onChange={(m, e) => set({ estrutura_material: m, estrutura_esp: e })} /></Linha>
        <Linha rotulo="Cor ou madeira">{cor(p.estrutura_padrao, 'estrutura_padrao')}</Linha>
        {modular && <>
          <Linha rotulo="Tampo"><Select valor={p.tampo} opcoes={[['Sobreposto (cobre as laterais)', 'sobreposto'], ['Entre laterais', 'entre_laterais']]} onChange={v => set({ tampo: v })} /></Linha>
          <Linha rotulo="Base"><Select valor={p.base_tipo} opcoes={[['Rodapé', 'rodape'], ['Pés', 'pes'], ['Rodízios', 'rodizios'], ['Nenhuma', 'nenhuma']]} onChange={v => set({ base_tipo: v })} /></Linha>
          {p.base_tipo !== 'nenhuma' && <Linha rotulo="Altura da base"><Num valor={p.base_altura} max={40} casas={1} sufixo="cm" onChange={v => set({ base_altura: v })} /></Linha>}
          <Linha rotulo="Fundo"><Select valor={p.fundo_tipo} opcoes={[['Em rasgo', 'rasgo'], ['Pregado atrás', 'pregado']]} onChange={v => set({ fundo_tipo: v })} /></Linha>
          <Linha rotulo="Material do fundo"><CampoMaterial material={p.fundo_material} esp={p.fundo_esp} catalogo={catalogo} onChange={(m, e) => set({ fundo_material: m, fundo_esp: e })} /></Linha>
          <Linha rotulo="Cor do fundo">{cor(p.fundo_padrao, 'fundo_padrao')}</Linha>
        </>}
      </Grupo>

      {(modular || temGavetas) && (
        <Grupo titulo="Frentes e puxadores">
          {modular && <Linha rotulo="Tipo"><Select valor={p.frente_tipo} opcoes={[['Sobrepostas', 'sobrepostas'], ['Embutidas', 'embutidas']]} onChange={v => set({ frente_tipo: v })} /></Linha>}
          <Linha rotulo="Material"><CampoMaterial material={p.frente_material} esp={p.frente_esp} catalogo={catalogo} onChange={(m, e) => set({ frente_material: m, frente_esp: e })} /></Linha>
          <Linha rotulo="Cor ou madeira">{cor(p.frente_padrao, 'frente_padrao')}</Linha>
          <Linha rotulo="Puxador"><Select valor={p.puxador} opcoes={nomes('puxadores')} onChange={v => set({ puxador: v })} /></Linha>
          <Linha rotulo="Posição"><Select valor={p.puxador_posicao} opcoes={[['Centralizado', 'centro'], ['Superior', 'superior'], ['Lateral (portas)', 'lateral']]} onChange={v => set({ puxador_posicao: v })} /></Linha>
        </Grupo>
      )}

      {temGavetas && (
        <Grupo titulo="Gavetas (caixa e corrediça)">
          <Linha rotulo="Corrediça"><Select valor={p.corredica} opcoes={nomes('corredicas')} onChange={v => set({ corredica: v })} /></Linha>
          <Linha rotulo="Comprimento">
            <Select valor={p.corredica_comp} opcoes={[['Automático', 'auto'], ...[250, 300, 350, 400, 450, 500, 550, 600].map(c => [`${c} mm`, String(c)] as [string, string])]} onChange={v => set({ corredica_comp: v })} />
          </Linha>
          <Linha rotulo="Material da caixa"><CampoMaterial material={p.caixa_material} esp={p.caixa_esp} catalogo={catalogo} onChange={(m, e) => set({ caixa_material: m, caixa_esp: e })} /></Linha>
          <Linha rotulo="Cor da caixa">{cor(p.caixa_padrao, 'caixa_padrao')}</Linha>
          <Linha rotulo="Fundo da caixa"><CampoMaterial material={p.fundo_caixa_material} esp={p.fundo_caixa_esp} catalogo={catalogo} onChange={(m, e) => set({ fundo_caixa_material: m, fundo_caixa_esp: e })} /></Linha>
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

      <Grupo titulo="Orçamento e preços">
        <button type="button" className="sec largo" onClick={abrirPrecos}>Preços dos materiais (sugestões e pesquisa)…</button>
        <Linha rotulo="Mão de obra"><Num valor={p.mao_de_obra} max={1e7} sufixo="R$" onChange={v => set({ mao_de_obra: v })} /></Linha>
        <Linha rotulo="Margem"><Num valor={p.margem} max={500} casas={1} sufixo="%" onChange={v => set({ margem: v })} /></Linha>
        <Linha rotulo="Condições"><textarea rows={3} placeholder="Prazo, forma de pagamento, validade…" value={p.condicoes} onChange={e => set({ condicoes: e.target.value })} /></Linha>
        <Linha rotulo="Observações"><textarea rows={2} value={p.observacoes} onChange={e => set({ observacoes: e.target.value })} /></Linha>
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
