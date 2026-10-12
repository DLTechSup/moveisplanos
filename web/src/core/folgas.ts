// Folgas automáticas (editáveis / travadas pelo usuário).
export interface FolgaDef {
  chave: string; nome: string; minimo: number; maximo: number; dica?: string
  auto: (ctx: Record<string, number | undefined>) => number
}

export const DEFINICOES: FolgaDef[] = [
  { chave: 'entre_frentes', nome: 'Entre frentes', minimo: 1, maximo: 6, auto: () => 3 },
  { chave: 'contorno_embutida', nome: 'Frente embutida (contorno)', minimo: 1, maximo: 5, auto: () => 2 },
  { chave: 'lateral_corredica', nome: 'Lateral da corrediça (por lado)', minimo: 0, maximo: 30,
    dica: 'vem do catálogo', auto: c => c.lateral_corredica ?? 12.7 },
  { chave: 'topo_caixa', nome: 'Topo da caixa no vão', minimo: 10, maximo: 60, dica: '25 mm (vãos ≥ 150 mm) ou 15 mm',
    auto: c => (c.vao_gaveta != null && c.vao_gaveta < 150 ? 15 : 25) },
  { chave: 'fundo_caixa', nome: 'Fundo da caixa no vão', minimo: 5, maximo: 40, auto: () => 15 },
  { chave: 'traseira_corredica', nome: 'Traseira da corrediça', minimo: 5, maximo: 50, auto: () => 10 },
  { chave: 'rasgo_prof', nome: 'Rasgo do fundo (profundidade)', minimo: 5, maximo: 12, auto: () => 8 },
  { chave: 'rasgo_dist', nome: 'Rasgo do fundo (distância da traseira)', minimo: 5, maximo: 30, auto: () => 10 },
  { chave: 'rasgo_sobra', nome: 'Encaixe do fundo no rasgo (sobra)', minimo: 0, maximo: 3, auto: () => 1 },
  { chave: 'prat_largura', nome: 'Prateleira solta (largura)', minimo: 0, maximo: 5, auto: () => 2 },
  { chave: 'prat_recuo', nome: 'Prateleira (recuo frontal)', minimo: 0, maximo: 80, auto: () => 20 },
  { chave: 'recuo_rodape', nome: 'Recuo do rodapé', minimo: 0, maximo: 100, auto: () => 30 },
  { chave: 'kerf', nome: 'Serra (kerf) no otimizador', minimo: 2, maximo: 6, auto: () => 4 },
  { chave: 'refilo', nome: 'Refilo da chapa (por borda)', minimo: 0, maximo: 20, auto: () => 10 },
]
export const POR_CHAVE: Record<string, FolgaDef> = Object.fromEntries(DEFINICOES.map(d => [d.chave, d]))

export class Folgas {
  travadas: Record<string, number>
  private base: Record<string, number>
  constructor(travadas: Record<string, number> = {}, lateralCorredica = 12.7) {
    this.travadas = { ...travadas }
    this.base = { lateral_corredica: lateralCorredica }
  }
  automatico(chave: string, ctx: Record<string, number | undefined> = {}): number {
    return POR_CHAVE[chave].auto({ ...this.base, ...ctx })
  }
  travada(chave: string): boolean { return chave in this.travadas }
  valor(chave: string, ctx: Record<string, number | undefined> = {}): number {
    return chave in this.travadas ? Number(this.travadas[chave]) : this.automatico(chave, ctx)
  }
  static fora(chave: string, valor: number): boolean {
    const d = POR_CHAVE[chave]
    return valor < d.minimo - 1e-9 || valor > d.maximo + 1e-9
  }
}
