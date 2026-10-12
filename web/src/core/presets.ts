import type { Projeto } from './tipos'

export interface Preset { nome: string; motor: 'gavetas' | 'portas'; valores: Partial<Projeto> }

export const PRESETS: Record<string, Preset> = {
  comoda: { nome: 'Cômoda', motor: 'gavetas', valores: { largura: 140, altura: 80, profundidade: 52, colunas: 2,
    gavetas_por_coluna: 3, nicho: 0, base_tipo: 'rodape', base_altura: 5, tampo: 'sobreposto', frente_tipo: 'sobrepostas',
    distribuicao: 'iguais', puxador_posicao: 'centro' } },
  gaveteiro: { nome: 'Gaveteiro volante', motor: 'gavetas', valores: { largura: 40, altura: 60, profundidade: 50, colunas: 1,
    gavetas_por_coluna: 3, nicho: 0, base_tipo: 'rodizios', base_altura: 5, tampo: 'sobreposto', frente_tipo: 'sobrepostas',
    distribuicao: 'iguais' } },
  criado_mudo: { nome: 'Criado-mudo', motor: 'gavetas', valores: { largura: 50, altura: 55, profundidade: 40, colunas: 1,
    gavetas_por_coluna: 2, nicho: 15, base_tipo: 'pes', base_altura: 10, tampo: 'sobreposto', frente_tipo: 'sobrepostas',
    distribuicao: 'iguais' } },
  balcao_gavetas: { nome: 'Balcão de gavetas', motor: 'gavetas', valores: { largura: 80, altura: 85, profundidade: 55,
    colunas: 1, gavetas_por_coluna: 4, nicho: 0, base_tipo: 'rodape', base_altura: 10, tampo: 'sobreposto',
    frente_tipo: 'sobrepostas', distribuicao: 'crescente' } },
  sapateira: { nome: 'Sapateira (portas – basculante em fase futura)', motor: 'portas', valores: { largura: 80, altura: 100,
    profundidade: 35, portas: 2, prateleiras: 4, base_tipo: 'rodape', base_altura: 5, tampo: 'sobreposto',
    frente_tipo: 'sobrepostas', puxador_posicao: 'lateral' } },
  armario_2_portas: { nome: 'Armário 2 portas', motor: 'portas', valores: { largura: 80, altura: 180, profundidade: 55,
    portas: 2, prateleiras: 4, base_tipo: 'rodape', base_altura: 5, tampo: 'sobreposto', frente_tipo: 'sobrepostas',
    puxador_posicao: 'lateral' } },
  armario_4_portas: { nome: 'Armário 4 portas', motor: 'portas', valores: { largura: 160, altura: 210, profundidade: 55,
    portas: 4, prateleiras: 5, base_tipo: 'rodape', base_altura: 5, tampo: 'sobreposto', frente_tipo: 'sobrepostas',
    puxador_posicao: 'lateral' } },
  balcao_portas: { nome: 'Balcão de portas', motor: 'portas', valores: { largura: 80, altura: 85, profundidade: 55,
    portas: 2, prateleiras: 1, base_tipo: 'rodape', base_altura: 10, tampo: 'sobreposto', frente_tipo: 'sobrepostas',
    puxador_posicao: 'lateral' } },
}

/** Carrega no projeto os valores do tipo escolhido (mantém cliente, data e observações). */
export function aplicarPreset(p: Projeto, tipo: string): Projeto {
  const pr = PRESETS[tipo]
  const novo: Projeto = { ...p, ...pr.valores, tipo, motor: pr.motor, alturas_personalizadas: [], folgas_travadas: {},
    nome: pr.nome.split(' (')[0] }
  if (pr.motor === 'portas' && novo.puxador_posicao === 'centro') novo.puxador_posicao = 'lateral'
  return novo
}
