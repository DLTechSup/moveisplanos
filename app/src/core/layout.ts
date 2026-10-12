// Layout em árvore do móvel: o espaço interno é dividido em vãos, e qualquer vão pode ser dividido de novo
// (lado a lado ou um sobre o outro). As folhas da árvore são as seções (gavetas, portas, vão aberto).
import { secaoPadrao } from './tipos'
import type { Aviso, Coluna, Divisao, No, Regiao, Secao, TipoSecao } from './tipos'
import { ehDivisao } from './tipos'

export type Caminho = number[]

export interface FolhaR { caminho: Caminho; no: Secao; rect: Regiao }
export interface DivisorR {
  caminho: Caminho            // divisão (nó) a que pertence
  indice: number              // entre o filho `indice` e `indice + 1`
  dir: 'v' | 'h'
  rect: Regiao                // tábua (mm)
  pai: Regiao                 // espaço da divisão inteira (mm)
}
export interface Resolvido { folhas: FolhaR[]; divisores: DivisorR[] }

export const clonar = <T,>(x: T): T => JSON.parse(JSON.stringify(x))
export const mesmoCaminho = (a: Caminho | null, b: Caminho | null) => !!a && !!b && a.length === b.length && a.every((v, i) => v === b[i])
export const comecaCom = (c: Caminho, prefixo: Caminho) => prefixo.length <= c.length && prefixo.every((v, i) => v === c[i])

// ---- conversões ------------------------------------------------------------------------------------------------------
/** Modelo antigo (colunas × seções) → árvore. */
export function colunasParaLayout(colunas: Coluna[]): No {
  const cols: No[] = colunas.map(c => {
    if (c.secoes.length === 1) return { ...c.secoes[0], altura: 0 }
    return { dir: 'h', filhos: c.secoes.map(s => ({ ...s, altura: 0 })), tam: c.secoes.map(s => s.altura || 0) } as Divisao
  })
  if (cols.length === 1) return cols[0]
  return { dir: 'v', filhos: cols, tam: colunas.map(c => c.largura || 0) }
}

export const folhaPadrao = (tipo: TipoSecao = 'aberto', o: Partial<Secao> = {}): Secao => secaoPadrao(tipo, o)

// ---- acesso e edição -------------------------------------------------------------------------------------------------------
export function obter(raiz: No, caminho: Caminho): No | null {
  let no: No = raiz
  for (const i of caminho) {
    if (!ehDivisao(no) || !no.filhos[i]) return null
    no = no.filhos[i]
  }
  return no
}

/** Troca o nó do caminho por `novo` (devolve uma árvore nova). */
export function substituir(raiz: No, caminho: Caminho, novo: No): No {
  if (!caminho.length) return novo
  const r = clonar(raiz)
  let no = r as Divisao
  for (const i of caminho.slice(0, -1)) no = no.filhos[i] as Divisao
  no.filhos[caminho[caminho.length - 1]] = novo
  return r
}

export function editarFolha(raiz: No, caminho: Caminho, patch: Partial<Secao>): No {
  const alvo = obter(raiz, caminho)
  if (!alvo || ehDivisao(alvo)) return raiz
  return substituir(raiz, caminho, { ...alvo, ...patch })
}

/** Colapsa divisões com um filho só e junta divisões aninhadas de mesma direção sem tamanhos fixos. */
export function normalizar(no: No): No {
  if (!ehDivisao(no)) return no
  let filhos = no.filhos.map(normalizar)
  let tam = [...no.tam]
  // junta filhos que são divisões da mesma direção e estão em modo automático
  const novosFilhos: No[] = [], novosTam: number[] = []
  filhos.forEach((f, i) => {
    if (ehDivisao(f) && f.dir === no.dir && (tam[i] ?? 0) === 0 && f.tam.every(t => t === 0)) {
      f.filhos.forEach(ff => { novosFilhos.push(ff); novosTam.push(0) })
    } else { novosFilhos.push(f); novosTam.push(tam[i] ?? 0) }
  })
  filhos = novosFilhos; tam = novosTam
  if (filhos.length === 1) return filhos[0]
  return { dir: no.dir, filhos, tam }
}

/** Remove o nó; devolve a nova árvore (ou null se não pode remover a raiz). */
export function remover(raiz: No, caminho: Caminho): No | null {
  if (!caminho.length) return null
  const r = clonar(raiz)
  const paiCam = caminho.slice(0, -1)
  const pai = (paiCam.length ? obterMut(r, paiCam) : r) as Divisao
  const i = caminho[caminho.length - 1]
  const tamRemovido = pai.tam[i] ?? 0
  pai.filhos.splice(i, 1)
  pai.tam.splice(i, 1)
  // se o removido era fixo, o vizinho mais próximo herda o espaço liberado (mantém o conjunto fechado)
  if (tamRemovido > 0) {
    const j = Math.min(i, pai.filhos.length - 1)
    if (pai.tam[j] > 0) pai.tam[j] += tamRemovido
  }
  return normalizar(r)
}
function obterMut(raiz: No, caminho: Caminho): No {
  let no: No = raiz
  for (const i of caminho) no = (no as Divisao).filhos[i]
  return no
}

export type Zona = 'centro' | 'esquerda' | 'direita' | 'acima' | 'abaixo'

/** Encaixa `novo` na `zona` da folha indicada. Devolve a nova árvore e o caminho do item inserido. */
export function encaixar(raiz: No, alvo: Caminho, zona: Zona, novo: Secao, tamAlvoCm = 0): { raiz: No; caminho: Caminho } {
  const r = clonar(raiz)
  const noAlvo = obterMut(r, alvo)
  if (zona === 'centro') {
    // substitui o conteúdo do vão (mantém o espaço que ele ocupa)
    return { raiz: substituir(r, alvo, ehDivisao(noAlvo) ? noAlvo : { ...novo }), caminho: alvo }
  }
  const dir: 'v' | 'h' = zona === 'esquerda' || zona === 'direita' ? 'v' : 'h'
  const antes = zona === 'esquerda' || zona === 'acima'
  const paiCam = alvo.slice(0, -1)
  const pai = alvo.length ? (obterMut(r, paiCam) as Divisao) : null
  if (pai && pai.dir === dir) {
    const i = alvo[alvo.length - 1]
    const pos = antes ? i : i + 1
    // se o alvo tem tamanho fixo, divide esse tamanho entre os dois
    const t = pai.tam[i] ?? 0
    if (t > 0) {
      const metade = Math.round((t / 2) * 10) / 10
      pai.tam[i] = Math.round((t - metade) * 10) / 10
      pai.filhos.splice(pos, 0, novo)
      pai.tam.splice(pos, 0, metade)
    } else {
      pai.filhos.splice(pos, 0, novo)
      pai.tam.splice(pos, 0, 0)
    }
    void tamAlvoCm
    return { raiz: r, caminho: [...paiCam, pos] }
  }
  // cria uma divisão nova no lugar do alvo
  const div: Divisao = { dir, filhos: antes ? [novo, noAlvo] : [noAlvo, novo], tam: [0, 0] }
  return { raiz: substituir(r, alvo, div), caminho: [...alvo, antes ? 0 : 1] }
}

/** Move uma folha para outra posição (zona de outra folha). */
export function mover(raiz: No, de: Caminho, para: Caminho, zona: Zona): { raiz: No; caminho: Caminho } | null {
  if (mesmoCaminho(de, para) || comecaCom(para, de)) return null
  const item = obter(raiz, de)
  if (!item || ehDivisao(item)) return null
  if (zona === 'centro') {
    // troca o conteúdo dos dois vãos
    const destino = obter(raiz, para)
    if (!destino || ehDivisao(destino)) return null
    const r1 = substituir(raiz, de, destino)
    return { raiz: substituir(r1, para, item), caminho: para }
  }
  // para localizar o destino depois de remover o item, marcamos a folha de destino
  const marca = '__destino__'
  const r = clonar(raiz)
  const dest = obterMut(r, para) as Secao
  ;(dest as any)[marca] = true
  const sem = remover(r, de)
  if (!sem) return null
  const novoCam = acharMarca(sem, marca)
  if (!novoCam) return null
  const limpo = clonar(sem)
  delete (obterMut(limpo, novoCam) as any)[marca]
  return encaixar(limpo, novoCam, zona, item as Secao)
}
function acharMarca(no: No, marca: string, cam: Caminho = []): Caminho | null {
  if (!ehDivisao(no)) return (no as any)[marca] ? cam : null
  for (let i = 0; i < no.filhos.length; i++) { const r = acharMarca(no.filhos[i], marca, [...cam, i]); if (r) return r }
  return null
}

/** Divide a folha em duas (a original mais uma nova vazia). */
export function dividirFolha(raiz: No, caminho: Caminho, dir: 'v' | 'h'): { raiz: No; caminho: Caminho } {
  return encaixar(raiz, caminho, dir === 'v' ? 'direita' : 'abaixo', folhaPadrao('aberto', { prateleiras: 2 }))
}

/** Define o tamanho fixo (cm) de um filho dentro de uma divisão (0 = automático). */
export function definirTam(raiz: No, caminhoDivisao: Caminho, indice: number, cm: number): No {
  const r = clonar(raiz)
  const d = obterMut(r, caminhoDivisao) as Divisao
  d.tam[indice] = Math.max(0, Math.round(cm * 10) / 10)
  return r
}

/** Ancestral mais próximo com a direção pedida e o índice do filho que contém o caminho. */
export function ancestral(raiz: No, caminho: Caminho, dir: 'v' | 'h'): { cam: Caminho; indice: number } | null {
  for (let n = caminho.length - 1; n >= 0; n--) {
    const cam = caminho.slice(0, n)
    const d = obter(raiz, cam)
    if (d && ehDivisao(d) && d.dir === dir) return { cam, indice: caminho[n] }
  }
  return null
}

/** Todos os caminhos de folhas, em ordem. */
export function folhasDe(no: No, cam: Caminho = []): Caminho[] {
  if (!ehDivisao(no)) return [cam]
  return no.filhos.flatMap((f, i) => folhasDe(f, [...cam, i]))
}

// ---- cálculo de retângulos ----------------------------------------------------------------------------------------------------
export function repartir(total: number, fixosCm: number[], e: number, avisos?: Aviso[]): number[] {
  const n = fixosCm.length
  const util = total - (n - 1) * e
  const fixos = fixosCm.map(v => (v > 0 ? v * 10 : 0))
  let soma = fixos.reduce((a, b) => a + b, 0)
  const livres = fixos.filter(v => v <= 0).length
  const minLivre = 80
  if (soma > util - livres * minLivre && soma > 0) {
    avisos?.push({ nivel: 'aviso', texto: 'Alguns tamanhos fixos não cabem no espaço disponível: foram reduzidos proporcionalmente.' })
    const f = Math.max((util - livres * 150) / soma, 0.2)
    for (let i = 0; i < n; i++) fixos[i] *= f
    soma = fixos.reduce((a, b) => a + b, 0)
  }
  const resto = livres ? Math.max(util - soma, 0) / livres : 0
  return fixos.map(v => (v > 0 ? v : resto))
}

/** Calcula os retângulos (mm) de todas as folhas e as tábuas entre elas. */
export function resolver(raiz: No, interior: Regiao, e: number, avisos?: Aviso[]): Resolvido {
  const folhas: FolhaR[] = [], divisores: DivisorR[] = []
  const rec = (no: No, rect: Regiao, cam: Caminho) => {
    if (!ehDivisao(no)) { folhas.push({ caminho: cam, no, rect }); return }
    const n = no.filhos.length
    if (no.dir === 'v') {
      const ws = repartir(rect.w, no.tam, e, avisos)
      let x = rect.x
      no.filhos.forEach((f, i) => {
        rec(f, { x, y: rect.y, w: ws[i], h: rect.h }, [...cam, i])
        x += ws[i]
        if (i < n - 1) { divisores.push({ caminho: cam, indice: i, dir: 'v', rect: { x, y: rect.y, w: e, h: rect.h }, pai: rect }); x += e }
      })
    } else {
      const hs = repartir(rect.h, no.tam, e, avisos)
      let yTop = rect.y + rect.h
      no.filhos.forEach((f, i) => {
        const y = yTop - hs[i]
        rec(f, { x: rect.x, y, w: rect.w, h: hs[i] }, [...cam, i])
        yTop = y
        if (i < n - 1) { divisores.push({ caminho: cam, indice: i, dir: 'h', rect: { x: rect.x, y: yTop - e, w: rect.w, h: e }, pai: rect }); yTop -= e }
      })
    }
  }
  rec(raiz, interior, [])
  return { folhas, divisores }
}

export const contem = (r: Regiao, x: number, y: number, tol = 0.01) =>
  x >= r.x - tol && x <= r.x + r.w + tol && y >= r.y - tol && y <= r.y + r.h + tol
