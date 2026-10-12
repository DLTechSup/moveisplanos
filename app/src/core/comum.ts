// Funções compartilhadas pelos motores de cálculo.
import * as C from './catalogo'
import { DEFINICOES, Folgas } from './folgas'
import { aviso } from './tipos'
import type { Bloco, Catalogo, Cor, Peca, Projeto, Resultado } from './tipos'

export const bloco = (nome: string, grupo: string, x: number, y: number, z: number, dx: number, dy: number, dz: number,
  cor: Cor, veio: Bloco['veio'] = '', peca = 0, gaveta = -1, extra: Partial<Bloco> = {}): Bloco =>
  ({ nome, grupo, x, y, z, dx, dy, dz, cor, veio, peca, gaveta, ...extra })

export const r3 = (v: number) => Math.round(v * 1000) / 1000

export function peca(p: Projeto, nome: string, qtd: number, comp: number, larg: number, fita_c = 0, fita_l = 0, veio = true,
  extra: Partial<Peca> = {}): Omit<Peca, 'id'> {
  return { nome, qtd, comp: r3(comp), larg: r3(larg), esp: extra.esp ?? p.estrutura_esp,
    material: extra.material ?? p.estrutura_material, padrao: extra.padrao ?? p.estrutura_padrao,
    fita_c, fita_l, veio, obs: extra.obs ?? '' }
}

/** Divide `total` em n partes proporcionais aos pesos; `fixos` (mm, 0 = livre) mantêm o valor. */
export function distribuir(total: number, n: number, pesos: number[], fixos: number[] = []): number[] {
  const fx = Array.from({ length: n }, (_, i) => fixos[i] ?? 0)
  const somaFixos = fx.filter(v => v > 0).reduce((a, b) => a + b, 0)
  const livres = fx.map((v, i) => (v <= 0 ? i : -1)).filter(i => i >= 0)
  const restante = Math.max(total - somaFixos, 0)
  const somaPesos = livres.reduce((a, i) => a + (pesos[i] ?? 1), 0) || 1
  return fx.map((v, i) => (v > 0 ? v : (restante * (pesos[i] ?? 1)) / somaPesos))
}

export const pesosGavetas = (crescente: boolean, n: number) =>
  Array.from({ length: n }, (_, i) => (crescente ? 1 + 0.15 * i : 1))

export const numeroDobradicas = (alturaMm: number) => (alturaMm <= 900 ? 2 : alturaMm <= 1600 ? 3 : 4)

export function posicoesDobradicas(altura: number, qtd: number): number[] {
  if (qtd === 1) return [altura / 2]
  const margem = 100
  const passo = (altura - 2 * margem) / (qtd - 1)
  return Array.from({ length: qtd }, (_, i) => margem + i * passo)
}

export function colocarPuxador(p: Projeto, cat: Catalogo, res: Resultado, fx: number, fy: number, fw: number, fh: number,
  zFace: number, vertical = false, xLivre?: number): void {
  const px = C.puxador(cat, p.puxador)
  const tipo = px.tipo
  if (tipo === 'toque') return
  let comp = Number(px.comprimento || 0)
  let cx = fx + fw / 2, cy = fy + fh / 2
  const base = { z: zFace, tipo, vertical, frente_x: fx, frente_y: fy, frente_w: fw, frente_h: fh }
  if (tipo === 'perfil_cava') { res.puxadores.push({ ...base, x: cx, y: fy + fh - 12, comp: fw, vertical: false }); return }
  if (tipo === 'cava_usinada') {
    res.puxadores.push({ ...base, x: cx, y: fy + fh - 15, comp: Math.min(comp || 150, fw - 40), vertical: false }); return
  }
  if (p.puxador_posicao === 'superior' && !vertical) cy = fy + fh - 45
  if (vertical) {
    if (xLivre != null) cx = xLivre
    if (fh > 1200) {
      cy = fy + Math.min(1000 - fy, fh - 150)
      cy = Math.max(cy, fy + 150)
    }
  }
  const maximo = (vertical ? fh : fw) - 40
  if (tipo === 'barra' || tipo === 'concha') comp = Math.min(comp || 128, maximo)
  res.puxadores.push({ ...base, x: cx, y: cy, comp })
}

export function ferragemPuxador(p: Projeto, cat: Catalogo, res: Resultado, qtd: number): void {
  if (qtd <= 0) return
  const px = C.puxador(cat, p.puxador)
  if (px.tipo === 'cava_usinada') res.ferragens.push({ nome: 'Usinagem de cava', qtd, unidade: 'un', categoria: 'puxador', detalhe: '' })
  else if (px.tipo === 'perfil_cava') res.ferragens.push({ nome: px.nome, qtd, unidade: 'peça', categoria: 'puxador', detalhe: '' })
  else if (px.tipo !== 'toque') res.ferragens.push({ nome: px.nome, qtd, unidade: 'un', categoria: 'puxador', detalhe: '' })
}

export function blocosCaixa(x: number, y: number, z: number, w: number, alt: number, prof: number, ec: number, r: number, s: number,
  idLat: number, idFt: number, idFd: number, espFundo: number, gid: number): Bloco[] {
  const off = r - s
  return [
    bloco('Lateral da gaveta', 'caixa_lateral', x, y, z, ec, alt, prof, 'caixa', 'z', idLat, gid),
    bloco('Lateral da gaveta', 'caixa_lateral', x + w - ec, y, z, ec, alt, prof, 'caixa', 'z', idLat, gid),
    bloco('Frente da caixa', 'caixa_frente', x + ec, y, z + prof - ec, w - 2 * ec, alt, ec, 'caixa', 'x', idFt, gid),
    bloco('Traseira da caixa', 'caixa_frente', x + ec, y, z, w - 2 * ec, alt, ec, 'caixa', 'x', idFt, gid),
    bloco('Fundo da gaveta', 'caixa_fundo', x + ec - off, y + 10, z + ec - off, w - 2 * ec + 2 * off, espFundo,
      prof - 2 * ec + 2 * off, 'fundo', '', idFd, gid),
  ]
}

export function blocosCorredica(tipo: string, x: number, y: number, zEnd: number, w: number, alt: number, lat: number,
  comp: number, gid: number): Bloco[] {
  if (tipo === 'oculta') {
    return [x + 10, x + w - 30].map(xx => bloco('Corrediça', 'corredica', xx, y - 8, zEnd - comp, 20, 8, comp, 'ferragem', '', 0, gid))
  }
  const altura = 35
  const yy = y + alt / 2 - altura / 2
  return [
    bloco('Corrediça', 'corredica', x - lat, yy, zEnd - comp, lat, altura, comp, 'ferragem', '', 0, gid),
    bloco('Corrediça', 'corredica', x + w, yy, zEnd - comp, lat, altura, comp, 'ferragem', '', 0, gid),
  ]
}

/** Escolhe o comprimento da corrediça (automático = maior do catálogo que cabe). */
export function escolherCorredica(p: Projeto, cat: Catalogo, fo: Folgas, res: Resultado, Dint: number) {
  const cor = C.corredica(cat, p.corredica)
  const trasei = fo.valor('traseira_corredica')
  const comprimentos = [...cor.comprimentos].sort((a, b) => a - b)
  let comp: number
  if (String(p.corredica_comp).toLowerCase() === 'auto') {
    const cabem = comprimentos.filter(x => x <= Dint - trasei + 1e-9)
    if (cabem.length) comp = Number(cabem[cabem.length - 1])
    else { comp = Number(comprimentos[0]); aviso(res, 'erro', 'Profundidade insuficiente para a menor corrediça do catálogo.') }
  } else {
    comp = Number(p.corredica_comp)
    if (comp > Dint - trasei + 1e-9) aviso(res, 'aviso', `Corrediça de ${comp} mm é grande demais para a profundidade útil.`)
  }
  return { cor, comp, lat: fo.valor('lateral_corredica') }
}

export function folgasEfetivas(fo: Folgas, res: Resultado): void {
  const vaos: number[] = res.medidas.vaos_gaveta || []
  const menor = vaos.length ? Math.min(...vaos) : undefined
  for (const d of DEFINICOES) {
    const ctx = d.chave === 'topo_caixa' ? { vao_gaveta: menor } : {}
    const valor = fo.valor(d.chave, ctx)
    const fora = Folgas.fora(d.chave, valor)
    res.folgas[d.chave] = { valor, auto: fo.automatico(d.chave, ctx), travada: fo.travada(d.chave), fora }
    if (fora) aviso(res, 'aviso', `Folga '${d.nome}' fora da faixa permitida (${d.minimo}–${d.maximo} mm).`)
  }
}

/** Caixa envolvente de todos os blocos. */
export function envolvente(bl: Bloco[]) {
  return {
    x0: Math.min(...bl.map(b => b.x)), x1: Math.max(...bl.map(b => b.x + b.dx)),
    y0: Math.min(...bl.map(b => b.y)), y1: Math.max(...bl.map(b => b.y + b.dy)),
    z0: Math.min(...bl.map(b => b.z)), z1: Math.max(...bl.map(b => b.z + b.dz)),
  }
}

/** Peças maiores que a chapa são divididas em partes iguais (emenda) e a observação avisa no plano de corte. */
export function dividirPecasGrandes(res: Resultado, cat: Catalogo, refilo: number): void {
  const divididas: string[] = []
  for (const pc of res.pecas) {
    const ch = C.chapa(cat, pc.material, pc.esp)
    const W = ch.comprimento - 2 * refilo, H = ch.largura - 2 * refilo
    const cabe = (a: number, b: number) => (a <= W && b <= H) || (!pc.veio && b <= W && a <= H)
    if (cabe(pc.comp, pc.larg)) continue
    let k = 1, onde: 'comp' | 'larg' = 'comp'
    for (let tent = 2; tent <= 6; tent++) {
      const opcoes: ['comp' | 'larg', number, number][] = [['comp', pc.comp / tent, pc.larg], ['larg', pc.comp, pc.larg / tent]]
      const boa = opcoes.find(([, a, b]) => cabe(a, b))
      if (boa) { k = tent; onde = boa[0]; break }
    }
    if (k === 1) continue                                    // continua sendo avisado pelo otimizador
    if (onde === 'comp') pc.comp = r3(pc.comp / k); else pc.larg = r3(pc.larg / k)
    pc.qtd *= k
    pc.obs = `${pc.obs ? pc.obs + ' · ' : ''}emenda: ${k} partes`
    divididas.push(pc.nome)
  }
  if (divididas.length) aviso(res, 'aviso', `Peças maiores que a chapa foram divididas em partes iguais (emenda): ${[...new Set(divididas)].join(', ')}.`)
}
