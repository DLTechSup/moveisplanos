// Modelos prontos de móveis. Cada modelo é só dados: medidas, colunas/seções (ou configuração de mesa/cama).
import { colunasParaLayout, clonar as clonarLayout } from './layout'
import { projetoPadrao, secaoPadrao } from './tipos'
import type { CamaCfg, Coluna, Familia, MesaCfg, Projeto, Secao } from './tipos'

export interface Preset {
  id: string; nome: string; categoria: string; familia: Familia; descricao: string
  valores: Partial<Projeto>
  colunas?: Coluna[]
  mesa?: Partial<MesaCfg>
  cama?: Partial<CamaCfg>
}

const G = (n: number, o: Partial<Secao> = {}) => secaoPadrao('gavetas', { n, ...o })
const Pt = (o: Partial<Secao> = {}) => secaoPadrao('portas', o)
const Ab = (o: Partial<Secao> = {}) => secaoPadrao('aberto', o)
const col = (largura: number, ...secoes: Secao[]): Coluna => ({ largura, secoes })

const Armario = { tampo: 'sobreposto', base_tipo: 'rodape', base_altura: 5, frente_tipo: 'sobrepostas', puxador_posicao: 'lateral' } as const
const Gav = { tampo: 'sobreposto', base_tipo: 'rodape', base_altura: 5, frente_tipo: 'sobrepostas', puxador_posicao: 'centro' } as const
const Aereo = { tampo: 'sobreposto', base_tipo: 'nenhuma', base_altura: 0, frente_tipo: 'sobrepostas', puxador_posicao: 'lateral' } as const
const Pes = { tampo: 'sobreposto', base_tipo: 'pes', base_altura: 15, frente_tipo: 'sobrepostas', puxador_posicao: 'lateral' } as const

const GR = 'Guarda-roupas'
const CG = 'Cômodas e gaveteiros'
const QU = 'Quarto'
const AR = 'Armários e balcões'
const CB = 'Cozinha, banheiro e lavanderia'
const ER = 'Estantes, racks e aparadores'
const ME = 'Mesas e escrivaninhas'
const CA = 'Camas e beliches'

const m = (id: string, nome: string, categoria: string, descricao: string, valores: Partial<Projeto>, colunas: Coluna[]): Preset =>
  ({ id, nome, categoria, familia: 'modular', descricao, valores, colunas })

const maleiro = (extra: Partial<Secao> = {}) => Pt({ altura: 50, ...extra })

export const PRESETS: Preset[] = [
  // ---- guarda-roupas ----------------------------------------------------------------------------------------------------
  m('guarda_solteiro_2', 'Guarda-roupa solteiro 2 portas', GR, 'Cabideiro de um lado, prateleiras e gavetas do outro.',
    { ...Armario, largura: 80, altura: 180, profundidade: 50 },
    [col(0, Pt({ cabideiro: true })), col(0, Pt({ prateleiras: 4 }), G(2, { altura: 30 }))]),
  m('guarda_solteiro_3', 'Guarda-roupa solteiro 3 portas', GR, 'Três vãos: cabideiro, prateleiras e gavetas.',
    { ...Armario, largura: 120, altura: 200, profundidade: 50 },
    [col(0, Pt({ cabideiro: true })), col(0, Pt({ prateleiras: 5 })), col(0, Pt({ prateleiras: 3 }), G(3, { altura: 40 }))]),
  m('guarda_casal_3', 'Guarda-roupa casal 3 portas', GR, 'Maleiros no alto, cabideiros nas pontas e gavetas no centro.',
    { ...Armario, largura: 160, altura: 220, profundidade: 55 },
    [col(0, maleiro(), Pt({ cabideiro: true })), col(0, maleiro(), Pt({ prateleiras: 4 }), G(2, { altura: 30 })), col(0, maleiro(), Pt({ cabideiro: true }))]),
  m('guarda_casal_4', 'Guarda-roupa casal 4 portas', GR, 'Duas colunas de duas portas com maleiros.',
    { ...Armario, largura: 200, altura: 240, profundidade: 55 },
    [col(0, maleiro(), Pt({ cabideiro: true })), col(0, maleiro(), Pt({ prateleiras: 5 }), G(3, { altura: 45 }))]),
  m('guarda_casal_6', 'Guarda-roupa casal 6 portas', GR, 'Três colunas de duas portas, gavetas centrais.',
    { ...Armario, largura: 300, altura: 240, profundidade: 60 },
    [col(0, maleiro(), Pt({ cabideiro: true })), col(0, maleiro(), Pt({ prateleiras: 5 }), G(4, { altura: 60 })), col(0, maleiro(), Pt({ cabideiro: true }))]),
  m('guarda_casal_6_espelho', 'Guarda-roupa casal 6 portas com espelho', GR, 'Igual ao de 6 portas, com espelho nas portas do meio.',
    { ...Armario, largura: 300, altura: 240, profundidade: 60 },
    [col(0, maleiro(), Pt({ cabideiro: true })), col(0, maleiro({ espelho: true }), Pt({ prateleiras: 5, espelho: true }), G(4, { altura: 60 })), col(0, maleiro(), Pt({ cabideiro: true }))]),
  m('guarda_correr_2', 'Guarda-roupa casal 2 portas de correr', GR, 'Duas portas de correr; interior com cabideiro, prateleiras e gavetas.',
    { ...Armario, largura: 200, altura: 240, profundidade: 60, porta_correr: 2 },
    [col(0, Ab({ cabideiro: true })), col(0, Ab({ prateleiras: 5 }), G(2, { altura: 35 }))]),
  m('guarda_correr_2_espelho', 'Guarda-roupa 2 portas de correr com espelho', GR, 'Portas de correr espelhadas.',
    { ...Armario, largura: 200, altura: 240, profundidade: 60, porta_correr: 2 },
    [col(0, Ab({ cabideiro: true, espelho: true })), col(0, Ab({ prateleiras: 5 }), G(2, { altura: 35 }))]),
  m('guarda_correr_3', 'Guarda-roupa casal 3 portas de correr', GR, 'Três portas de correr em trilho duplo.',
    { ...Armario, largura: 270, altura: 240, profundidade: 60, porta_correr: 3 },
    [col(0, Ab({ cabideiro: true })), col(0, Ab({ prateleiras: 5 }), G(3, { altura: 45 })), col(0, Ab({ cabideiro: true }))]),
  m('guarda_correr_4', 'Guarda-roupa 4 portas de correr', GR, 'Quatro portas de correr para vãos largos.',
    { ...Armario, largura: 360, altura: 240, profundidade: 60, porta_correr: 4 },
    [col(0, Ab({ cabideiro: true })), col(0, Ab({ prateleiras: 5 }), G(3, { altura: 45 })), col(0, Ab({ cabideiro: true })), col(0, Ab({ prateleiras: 6 }))]),
  m('guarda_infantil_2', 'Guarda-roupa infantil 2 portas', GR, 'Altura baixa, ao alcance das crianças.',
    { ...Armario, largura: 90, altura: 150, profundidade: 45 },
    [col(0, Pt({ cabideiro: true })), col(0, Pt({ prateleiras: 3 }), G(2, { altura: 28 }))]),
  m('guarda_infantil_3', 'Guarda-roupa infantil 3 portas', GR, 'Cabideiro, prateleiras e gavetas.',
    { ...Armario, largura: 120, altura: 170, profundidade: 45 },
    [col(0, Pt({ cabideiro: true })), col(0, Pt({ prateleiras: 4 })), col(0, Pt({ prateleiras: 2 }), G(3, { altura: 36 }))]),
  m('roupeiro_infantil_nicho', 'Roupeiro infantil com nicho', GR, 'Nicho aberto no alto e portas embaixo.',
    { ...Armario, largura: 100, altura: 160, profundidade: 45 },
    [col(0, Ab({ altura: 40, prateleiras: 0 }), Pt({ cabideiro: true })), col(0, G(4, { crescente: true }))]),
  m('closet_aberto', 'Closet aberto (cabideiros e gavetas)', GR, 'Sem portas: cabideiro duplo, prateleiras e gaveteiro.',
    { tampo: 'sobreposto', base_tipo: 'rodape', base_altura: 8, frente_tipo: 'sobrepostas', puxador_posicao: 'centro', largura: 240, altura: 240, profundidade: 50 },
    [col(0, Ab({ cabideiro: true, altura: 110 }), Ab({ cabideiro: true })), col(0, Ab({ prateleiras: 6 })), col(40, G(5, { crescente: true })), col(0, Ab({ cabideiro: true }))]),

  // ---- cômodas e gaveteiros ------------------------------------------------------------------------------------------
  m('comoda_6', 'Cômoda 6 gavetas', CG, 'Duas colunas de três gavetas (modelo de referência do plano).',
    { ...Gav, largura: 140, altura: 80, profundidade: 52 }, [col(0, G(3)), col(0, G(3))]),
  m('comoda_4', 'Cômoda 4 gavetas', CG, 'Gavetas maiores embaixo.', { ...Gav, largura: 80, altura: 85, profundidade: 45 }, [col(0, G(4, { crescente: true }))]),
  m('comoda_5', 'Cômoda alta 5 gavetas', CG, 'Cômoda estreita e alta.', { ...Gav, largura: 70, altura: 110, profundidade: 45 }, [col(0, G(5, { crescente: true }))]),
  m('comoda_8', 'Cômoda 8 gavetas', CG, 'Duas colunas de quatro gavetas.', { ...Gav, largura: 160, altura: 85, profundidade: 50 }, [col(0, G(4)), col(0, G(4))]),
  m('comoda_3_larga', 'Cômoda 3 gavetas larga', CG, 'Três gavetas largas.', { ...Gav, largura: 120, altura: 70, profundidade: 45 }, [col(0, G(3))]),
  m('comoda_infantil', 'Cômoda infantil', CG, 'Altura baixa para trocador ou quarto infantil.', { ...Gav, largura: 100, altura: 85, profundidade: 45 }, [col(0, G(3)), col(0, G(3))]),
  m('semainier', 'Sinfonier (7 gavetas)', CG, 'Estreito e alto.', { ...Gav, largura: 60, altura: 130, profundidade: 40 }, [col(0, G(7))]),
  m('comoda_porta', 'Cômoda com portas e gavetas', CG, 'Uma coluna de portas e outra de gavetas.', { ...Armario, largura: 120, altura: 85, profundidade: 45 },
    [col(0, Pt({ prateleiras: 1 })), col(0, G(4, { crescente: true }))]),
  m('gaveteiro_volante', 'Gaveteiro volante', CG, 'Com rodízios para mesa de trabalho.', { tampo: 'sobreposto', base_tipo: 'rodizios', base_altura: 5, frente_tipo: 'sobrepostas', puxador_posicao: 'centro', largura: 40, altura: 60, profundidade: 50 },
    [col(0, G(3))]),

  // ---- quarto ---------------------------------------------------------------------------------------------------------------
  m('criado_mudo', 'Criado-mudo com nicho', QU, 'Nicho aberto no alto e duas gavetas.', { tampo: 'sobreposto', base_tipo: 'pes', base_altura: 10, frente_tipo: 'sobrepostas', puxador_posicao: 'centro', largura: 50, altura: 55, profundidade: 40 },
    [col(0, Ab({ altura: 15 }), G(2))]),
  m('criado_suspenso', 'Criado-mudo suspenso', QU, 'Fixado na parede, com uma gaveta.', { ...Aereo, puxador_posicao: 'centro', largura: 45, altura: 22, profundidade: 35, elevacao: 30 }, [col(0, G(1))]),
  m('criado_3gav', 'Criado-mudo 3 gavetas', QU, 'Três gavetas e pés.', { tampo: 'sobreposto', base_tipo: 'pes', base_altura: 12, frente_tipo: 'sobrepostas', puxador_posicao: 'centro', largura: 45, altura: 60, profundidade: 40 }, [col(0, G(3))]),
  m('penteadeira', 'Penteadeira', QU, 'Gavetas de um lado e vão para o banco do outro.', { tampo: 'sobreposto', base_tipo: 'pes', base_altura: 12, frente_tipo: 'sobrepostas', puxador_posicao: 'centro', largura: 100, altura: 76, profundidade: 42 },
    [col(0, G(3)), col(0, Ab())]),
  m('sapateira', 'Sapateira de portas', QU, 'Duas portas e cinco prateleiras (basculante em fase futura).', { ...Armario, largura: 80, altura: 100, profundidade: 35 }, [col(0, Pt({ prateleiras: 4 }))]),

  // ---- armários e balcões ----------------------------------------------------------------------------------------------------
  m('armario_2_portas', 'Armário 2 portas', AR, 'Armário alto com prateleiras.', { ...Armario, largura: 80, altura: 180, profundidade: 55 }, [col(0, Pt({ prateleiras: 4, portas: 2 }))]),
  m('armario_4_portas', 'Armário 4 portas', AR, 'Duas colunas de duas portas.', { ...Armario, largura: 160, altura: 210, profundidade: 55 }, [col(0, Pt({ prateleiras: 5, portas: 2 })), col(0, Pt({ prateleiras: 5, portas: 2 }))]),
  m('armario_multiuso', 'Armário multiuso (despensa)', AR, 'Porta alta, prateleiras e gavetas embaixo.', { ...Armario, largura: 80, altura: 200, profundidade: 40 }, [col(0, Pt({ prateleiras: 5, portas: 2 }), G(2, { altura: 25 }))]),
  m('vassoureiro', 'Vassoureiro', AR, 'Estreito e alto, uma porta.', { ...Armario, largura: 40, altura: 200, profundidade: 40 }, [col(0, Pt({ prateleiras: 3 }))]),
  m('balcao_portas', 'Balcão de portas', AR, 'Duas portas e uma prateleira.', { ...Armario, base_altura: 10, largura: 80, altura: 85, profundidade: 55 }, [col(0, Pt({ prateleiras: 1, portas: 2 }))]),
  m('balcao_gavetas', 'Balcão de gavetas', AR, 'Quatro gavetas, maiores embaixo.', { ...Gav, base_altura: 10, largura: 80, altura: 85, profundidade: 55 }, [col(0, G(4, { crescente: true }))]),
  m('balcao_misto', 'Balcão com gaveta e portas', AR, 'Gaveta no alto e duas portas.', { ...Armario, base_altura: 10, largura: 80, altura: 85, profundidade: 55 }, [col(0, G(1, { altura: 16 }), Pt({ prateleiras: 1, portas: 2 }))]),
  m('aereo_2', 'Armário aéreo 2 portas', AR, 'Suspenso na parede.', { ...Aereo, largura: 80, altura: 70, profundidade: 35, elevacao: 140 }, [col(0, Pt({ prateleiras: 1, portas: 2 }))]),
  m('aereo_3', 'Armário aéreo 3 portas', AR, 'Suspenso, 120 cm.', { ...Aereo, largura: 120, altura: 70, profundidade: 35, elevacao: 140 }, [col(0, Pt({ prateleiras: 1, portas: 3 }))]),
  m('aereo_4', 'Armário aéreo 4 portas', AR, 'Duas colunas suspensas.', { ...Aereo, largura: 160, altura: 70, profundidade: 35, elevacao: 140 }, [col(0, Pt({ prateleiras: 1, portas: 2 })), col(0, Pt({ prateleiras: 1, portas: 2 }))]),

  // ---- cozinha, banheiro, lavanderia -------------------------------------------------------------------------------------------
  m('cozinha_balcao_2p', 'Balcão de cozinha 2 portas', CB, 'Para pia ou bancada.', { ...Armario, base_altura: 10, largura: 80, altura: 85, profundidade: 55 }, [col(0, Pt({ prateleiras: 1, portas: 2 }))]),
  m('cozinha_gaveteiro', 'Gaveteiro de cozinha 3 gavetas', CB, 'Gavetas de talheres e utensílios.', { ...Gav, base_altura: 10, largura: 60, altura: 85, profundidade: 55 }, [col(0, G(3, { crescente: true }))]),
  m('cozinha_pia_120', 'Balcão de pia 120 cm', CB, 'Gaveteiro e portas.', { ...Armario, base_altura: 10, largura: 120, altura: 85, profundidade: 55 }, [col(40, G(3, { crescente: true })), col(0, Pt({ prateleiras: 1, portas: 2 }))]),
  m('paneleiro', 'Paneleiro', CB, 'Alto, com portas e gavetas.', { ...Armario, base_altura: 8, largura: 60, altura: 220, profundidade: 55 }, [col(0, Pt({ altura: 80, prateleiras: 2 }), Pt({ prateleiras: 2 }), G(2, { altura: 30 }))]),
  m('banheiro_gabinete', 'Gabinete de banheiro suspenso', CB, 'Porta e gavetas sob a cuba.', { ...Aereo, largura: 80, altura: 50, profundidade: 45, elevacao: 40, puxador_posicao: 'centro' }, [col(0, Pt({ prateleiras: 1 })), col(0, G(2))]),
  m('banheiro_espelheira', 'Armário de banheiro com espelho', CB, 'Porta espelhada.', { ...Aereo, largura: 60, altura: 70, profundidade: 15, elevacao: 100 }, [col(0, Pt({ prateleiras: 2, espelho: true }))]),
  m('lavanderia_aereo', 'Armário de lavanderia aéreo', CB, 'Duas portas, suspenso.', { ...Aereo, largura: 100, altura: 70, profundidade: 35, elevacao: 130 }, [col(0, Pt({ prateleiras: 1, portas: 2 }))]),

  // ---- estantes, racks, aparadores --------------------------------------------------------------------------------------------
  m('estante_livros', 'Estante de livros', ER, 'Aberta, com prateleiras.', { tampo: 'sobreposto', base_tipo: 'rodape', base_altura: 5, frente_tipo: 'sobrepostas', puxador_posicao: 'centro', largura: 80, altura: 180, profundidade: 30 }, [col(0, Ab({ prateleiras: 5 }))]),
  m('estante_larga', 'Estante larga (3 vãos)', ER, 'Três vãos abertos.', { tampo: 'sobreposto', base_tipo: 'rodape', base_altura: 5, frente_tipo: 'sobrepostas', puxador_posicao: 'centro', largura: 120, altura: 200, profundidade: 35 }, [col(0, Ab({ prateleiras: 5 })), col(0, Ab({ prateleiras: 5 })), col(0, Ab({ prateleiras: 5 }))]),
  m('estante_portas', 'Estante com portas embaixo', ER, 'Parte alta aberta e parte baixa fechada.', { ...Armario, largura: 80, altura: 180, profundidade: 35 }, [col(0, Ab({ prateleiras: 3, altura: 110 }), Pt({ prateleiras: 1 }))]),
  m('rack_tv', 'Rack para TV com pés', ER, 'Portas nas pontas e nicho no centro.', { ...Pes, base_altura: 12, largura: 160, altura: 50, profundidade: 40 }, [col(0, Pt({ prateleiras: 1 })), col(0, Ab({ prateleiras: 1 })), col(0, Pt({ prateleiras: 1 }))]),
  m('rack_tv_suspenso', 'Rack suspenso para TV', ER, 'Fixado na parede, com gavetas.', { ...Aereo, puxador_posicao: 'centro', largura: 180, altura: 35, profundidade: 38, elevacao: 40 }, [col(0, G(1)), col(0, Ab()), col(0, G(1))]),
  m('aparador', 'Aparador', ER, 'Portas e gavetas centrais.', { ...Pes, largura: 120, altura: 80, profundidade: 40 }, [col(0, Pt({ prateleiras: 1 })), col(0, G(3)), col(0, Pt({ prateleiras: 1 }))]),
  m('buffet', 'Buffet / balcão de sala', ER, 'Gavetas e portas com pés.', { ...Pes, largura: 180, altura: 85, profundidade: 45 }, [col(0, Pt({ prateleiras: 1 })), col(0, G(3)), col(0, Pt({ prateleiras: 1 }))]),
  m('home_office', 'Armário de home office', ER, 'Portas altas e prateleiras abertas.', { ...Armario, largura: 120, altura: 180, profundidade: 40 }, [col(0, Ab({ prateleiras: 3, altura: 100 }), Pt({ prateleiras: 1 })), col(0, Ab({ prateleiras: 3, altura: 100 }), Pt({ prateleiras: 1 }))]),
  m('livre', 'Montagem livre (comece do zero)', 'Montagem livre', 'Defina a largura e vá adicionando colunas, portas, gavetas e prateleiras.', { ...Armario, base_altura: 5, largura: 100, altura: 180, profundidade: 45 }, [col(0, Ab())]),

  // ---- mesas ---------------------------------------------------------------------------------------------------------------------------
  { id: 'mesa_jantar_4', nome: 'Mesa de jantar 4 lugares', categoria: ME, familia: 'mesa', descricao: 'Tampo retangular e pernas quadradas.', valores: { largura: 120, altura: 75, profundidade: 75 }, mesa: { formato: 'retangular', pes: 'quadrado', tampo_esp: 25, saia: 8, gavetas: 0, prateleira_inferior: false } },
  { id: 'mesa_jantar_6', nome: 'Mesa de jantar 6 lugares', categoria: ME, familia: 'mesa', descricao: 'Tampo de 160 × 90 cm.', valores: { largura: 160, altura: 75, profundidade: 90 }, mesa: { formato: 'retangular', pes: 'quadrado', tampo_esp: 25, saia: 8, gavetas: 0 } },
  { id: 'mesa_jantar_8', nome: 'Mesa de jantar 8 lugares', categoria: ME, familia: 'mesa', descricao: 'Tampo de 220 × 100 cm.', valores: { largura: 220, altura: 75, profundidade: 100 }, mesa: { formato: 'retangular', pes: 'quadrado', tampo_esp: 30, saia: 10, perna: 8, gavetas: 0 } },
  { id: 'mesa_redonda', nome: 'Mesa redonda', categoria: ME, familia: 'mesa', descricao: 'Tampo redondo de 100 cm.', valores: { largura: 100, altura: 75, profundidade: 100 }, mesa: { formato: 'redonda', pes: 'quadrado', tampo_esp: 25, saia: 0, gavetas: 0 } },
  { id: 'mesa_centro', nome: 'Mesa de centro', categoria: ME, familia: 'mesa', descricao: 'Baixa, com prateleira inferior.', valores: { largura: 100, altura: 40, profundidade: 55 }, mesa: { formato: 'retangular', pes: 'quadrado', tampo_esp: 25, saia: 6, perna: 5, prateleira_inferior: true, gavetas: 0 } },
  { id: 'mesa_lateral', nome: 'Mesa lateral / de canto', categoria: ME, familia: 'mesa', descricao: 'Pequena, para o lado do sofá.', valores: { largura: 45, altura: 50, profundidade: 45 }, mesa: { formato: 'retangular', pes: 'quadrado', tampo_esp: 20, saia: 6, perna: 4, gavetas: 0 } },
  { id: 'escrivaninha', nome: 'Escrivaninha com gavetas', categoria: ME, familia: 'mesa', descricao: 'Duas gavetas sob o tampo.', valores: { largura: 120, altura: 75, profundidade: 60, puxador_posicao: 'centro' }, mesa: { formato: 'retangular', pes: 'quadrado', tampo_esp: 25, saia: 16, perna: 6, gavetas: 2 } },
  { id: 'escrivaninha_painel', nome: 'Escrivaninha com painéis laterais', categoria: ME, familia: 'mesa', descricao: 'Dois painéis e prateleira inferior.', valores: { largura: 140, altura: 75, profundidade: 60 }, mesa: { formato: 'retangular', pes: 'painel', tampo_esp: 25, saia: 8, prateleira_inferior: true, gavetas: 0 } },
  { id: 'mesa_bancada', nome: 'Bancada / mesa alta', categoria: ME, familia: 'mesa', descricao: 'Altura de 90 cm.', valores: { largura: 180, altura: 90, profundidade: 60 }, mesa: { formato: 'retangular', pes: 'painel', tampo_esp: 30, saia: 8, prateleira_inferior: true, gavetas: 0 } },

  // ---- camas ------------------------------------------------------------------------------------------------------------------------------
  { id: 'cama_solteiro', nome: 'Cama solteiro', categoria: CA, familia: 'cama', descricao: 'Colchão 88 × 188 cm.', valores: {}, cama: { tamanho: 'solteiro', colchao_l: 88, colchao_c: 188, altura_base: 35, cabeceira: 'painel', cabeceira_altura: 90, estrado: 'ripas', andares: 1 } },
  { id: 'cama_solteiro_king', nome: 'Cama solteiro king', categoria: CA, familia: 'cama', descricao: 'Colchão 96 × 203 cm.', valores: {}, cama: { tamanho: 'solteiro_king', colchao_l: 96, colchao_c: 203, altura_base: 35, cabeceira: 'painel', cabeceira_altura: 90, estrado: 'ripas', andares: 1 } },
  { id: 'cama_casal', nome: 'Cama casal', categoria: CA, familia: 'cama', descricao: 'Colchão 138 × 188 cm.', valores: {}, cama: { tamanho: 'casal', colchao_l: 138, colchao_c: 188, altura_base: 35, cabeceira: 'painel', cabeceira_altura: 100, estrado: 'ripas', andares: 1 } },
  { id: 'cama_queen', nome: 'Cama queen', categoria: CA, familia: 'cama', descricao: 'Colchão 158 × 198 cm.', valores: {}, cama: { tamanho: 'queen', colchao_l: 158, colchao_c: 198, altura_base: 35, cabeceira: 'painel', cabeceira_altura: 110, estrado: 'ripas', andares: 1 } },
  { id: 'cama_king', nome: 'Cama king', categoria: CA, familia: 'cama', descricao: 'Colchão 193 × 203 cm.', valores: {}, cama: { tamanho: 'king', colchao_l: 193, colchao_c: 203, altura_base: 35, cabeceira: 'painel', cabeceira_altura: 110, estrado: 'ripas', andares: 1 } },
  { id: 'cama_infantil', nome: 'Cama infantil (mini cama)', categoria: CA, familia: 'cama', descricao: 'Colchão 70 × 150 cm, baixa.', valores: {}, cama: { tamanho: 'infantil', colchao_l: 70, colchao_c: 150, altura_base: 25, cabeceira: 'painel', cabeceira_altura: 70, estrado: 'ripas', andares: 1 } },
  { id: 'cama_sem_cabeceira', nome: 'Cama casal sem cabeceira', categoria: CA, familia: 'cama', descricao: 'Só a base, para usar com painel na parede.', valores: {}, cama: { tamanho: 'casal', colchao_l: 138, colchao_c: 188, altura_base: 30, cabeceira: 'nenhuma', cabeceira_altura: 0, estrado: 'chapa', andares: 1 } },
  { id: 'beliche', nome: 'Beliche', categoria: CA, familia: 'cama', descricao: 'Dois andares com guarda-corpo e escada.', valores: {}, cama: { tamanho: 'solteiro', colchao_l: 88, colchao_c: 188, altura_base: 30, cabeceira: 'nenhuma', cabeceira_altura: 0, estrado: 'ripas', andares: 2 } },
]

export const CATEGORIAS = [GR, CG, QU, AR, CB, ER, ME, CA, 'Montagem livre']
export const porId = (id: string) => PRESETS.find(p => p.id === id)

const clonar = <T,>(x: T): T => clonarLayout(x)

/** Aplica um modelo ao projeto, mantendo dados do cliente, materiais, cores e ferragens escolhidos. */
export function aplicarPreset(atual: Projeto, id: string): Projeto {
  const pr = porId(id) ?? PRESETS[0]
  const base = projetoPadrao()
  const out: Projeto = {
    ...atual,
    familia: pr.familia, tipo: pr.id, nome: pr.nome,
    // estrutura geométrica volta ao padrão antes de aplicar o modelo
    largura: base.largura, altura: base.altura, profundidade: base.profundidade, elevacao: 0, porta_correr: 0,
    tampo: 'sobreposto', base_tipo: 'rodape', base_altura: 5, frente_tipo: 'sobrepostas', puxador_posicao: 'centro',
    folgas_travadas: {},
    ...clonar(pr.valores),
    layout: colunasParaLayout(clonar(pr.colunas ?? [col(0, Ab())])),
    mesa: { ...base.mesa, ...(atual.mesa ?? {}), ...clonar(pr.mesa ?? {}) },
    cama: { ...base.cama, ...clonar(pr.cama ?? {}) },
  }
  if (pr.familia === 'cama') { out.largura = out.cama.colchao_l; out.profundidade = out.cama.colchao_c; out.altura = out.cama.cabeceira_altura || out.cama.altura_base }
  if (pr.familia === 'mesa') {
    out.mesa.perna_material = out.mesa.perna_material || 'Madeira maciça'
  }
  return out
}

/** Projeto novo a partir de um modelo (usa os padrões do programa). */
export function projetoDoModelo(id: string): Projeto {
  const p = aplicarPreset(projetoPadrao(), id)
  const pr = porId(id)
  if (pr?.familia === 'mesa') { p.estrutura_material = 'MDF'; p.estrutura_esp = 18 }
  return p
}
