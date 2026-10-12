// Primitivas SVG e a classe Vista (escala, cotas, peças com veio). Unidades lógicas de 0,1 mm: folha A3 = 4200 × 2970.
import { fmtCm } from '../core/formato'

export const AZUL_COTA = '#14285A'
export const CONTORNO = '#2B2B2B'
export const OCULTO = '#7A7A7A'
export const PASSO_COTA = 105
export const AFASTA_COTA = 75
export const TAM_TEXTO = 30
export const FONTE = 'Arial, Helvetica, sans-serif'

export interface Area { x: number; y: number; w: number; h: number }
export type Saida = string[]

export const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
export const n2 = (v: number) => String(Math.round(v * 100) / 100)

// ---- cores -----------------------------------------------------------------------------------------
export function rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}
const toHex = (c: [number, number, number]) => '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')
/** Escurece como o darker(f) do Qt (f = 100 mantém; 200 = metade). */
export const escurecer = (hex: string, f: number) => toHex(rgb(hex).map(v => (v * 100) / f) as [number, number, number])
export const clarear = (hex: string, f: number) => toHex(rgb(hex).map(v => v * f / 100) as [number, number, number])
export const luminosidade = (hex: string) => { const [r, g, b] = rgb(hex); return (Math.max(r, g, b) + Math.min(r, g, b)) / 2 }

function rng(seed: number): () => number {
  let a = (seed * 2654435761) >>> 0 || 1
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ---- texto -----------------------------------------------------------------------------------------------
export const larguraTexto = (s: string, tam: number, negrito = false) => s.length * tam * (negrito ? 0.58 : 0.52)

export function texto(out: Saida, x: number, y: number, s: string, tam = TAM_TEXTO, cor = CONTORNO, negrito = false,
  alinh: 'e' | 'c' | 'd' = 'e', italico = false): number {
  const anchor = alinh === 'c' ? 'middle' : alinh === 'd' ? 'end' : 'start'
  out.push(`<text x="${n2(x)}" y="${n2(y)}" font-size="${tam}" fill="${cor}" text-anchor="${anchor}" font-family="${FONTE}"` +
    `${negrito ? ' font-weight="bold"' : ''}${italico ? ' font-style="italic"' : ''}>${esc(s)}</text>`)
  return larguraTexto(s, tam, negrito)
}

export function textoQuebrado(out: Saida, x: number, y: number, largura: number, s: string, tam = TAM_TEXTO, cor = CONTORNO, entrelinha = 1.25): number {
  let atual = ''
  const linhas: string[] = []
  for (const palavra of s.split(/\s+/).filter(Boolean)) {
    const teste = (atual + ' ' + palavra).trim()
    if (larguraTexto(teste, tam) <= largura) atual = teste
    else { linhas.push(atual); atual = palavra }
  }
  if (atual) linhas.push(atual)
  for (const ln of linhas) { texto(out, x, y, ln, tam, cor); y += tam * entrelinha }
  return y
}

export function cortar(s: string, largura: number, tam: number, negrito = false): string {
  if (larguraTexto(s, tam, negrito) <= largura) return s
  while (s && larguraTexto(s + '…', tam, negrito) > largura) s = s.slice(0, -1)
  return s + '…'
}

export function retangulo(out: Saida, x: number, y: number, w: number, h: number, fill: string, stroke = CONTORNO,
  sw = 3.5, dash = ''): void {
  out.push(`<rect x="${n2(x)}" y="${n2(y)}" width="${n2(w)}" height="${n2(h)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"` +
    `${dash ? ` stroke-dasharray="${dash}"` : ''}/>`)
}
export function linhaSvg(out: Saida, x1: number, y1: number, x2: number, y2: number, cor = CONTORNO, sw = 2.5, dash = ''): void {
  out.push(`<line x1="${n2(x1)}" y1="${n2(y1)}" x2="${n2(x2)}" y2="${n2(y2)}" stroke="${cor}" stroke-width="${sw}"` +
    `${dash ? ` stroke-dasharray="${dash}"` : ''}/>`)
}

/** Linhas suaves de veio de madeira dentro do retângulo (em unidades lógicas). */
export function veioEmRetangulo(out: Saida, r: Area, cor: string, horizontal: boolean, semente = 0): void {
  if (r.w < 6 || r.h < 6) return
  const rnd = rng(semente + 11)
  const escuro = escurecer(cor, 118), claro = clarear(cor, 112)
  const passo = 22
  const espal = horizontal ? r.h : r.w
  const comp = horizontal ? r.w : r.h
  const n = Math.floor(espal / passo) + 1
  const partes: string[] = []
  for (let i = 0; i < n; i++) {
    const pos = Math.min(Math.max(i * passo + (rnd() * 10 - 5), 2), espal - 2)
    const amp = Math.min(rnd() * 4 + 1.5, 4)
    const cor2 = i % 3 ? escuro : claro
    const sw = i % 4 ? 2.2 : 3.4
    const op = i % 3 ? 0.45 : 0.35
    const d = horizontal
      ? `M${n2(r.x)} ${n2(r.y + pos)}Q${n2(r.x + comp / 2)} ${n2(r.y + pos + amp * (i % 2 ? 1 : -1))} ${n2(r.x + comp)} ${n2(r.y + pos)}`
      : `M${n2(r.x + pos)} ${n2(r.y)}Q${n2(r.x + pos + amp * (i % 2 ? 1 : -1))} ${n2(r.y + comp / 2)} ${n2(r.x + pos)} ${n2(r.y + comp)}`
    partes.push(`<path d="${d}" fill="none" stroke="${cor2}" stroke-width="${sw}" stroke-opacity="${op}"/>`)
  }
  out.push(partes.join(''))
}

export function desenharPuxador(out: Saida, tipo: string, cor: string, cx: number, cy: number, comp: number, vertical: boolean): void {
  const contorno = escurecer(cor, 220)
  if (tipo === 'barra') {
    const esp = Math.min(Math.max(9, comp * 0.07), 22)
    const [w, h] = vertical ? [esp, comp] : [comp, esp]
    out.push(`<rect x="${n2(cx - w / 2)}" y="${n2(cy - h / 2)}" width="${n2(w)}" height="${n2(h)}" rx="${n2(esp / 2)}" fill="${cor}" stroke="${contorno}" stroke-width="2"/>`)
  } else if (tipo === 'concha') {
    const [w, h] = vertical ? [comp * 0.45, comp] : [comp, comp * 0.45]
    out.push(`<ellipse cx="${n2(cx)}" cy="${n2(cy)}" rx="${n2(w / 2)}" ry="${n2(h / 2)}" fill="${cor}" stroke="${contorno}" stroke-width="2"/>`)
    out.push(`<ellipse cx="${n2(cx)}" cy="${n2(cy)}" rx="${n2(w * 0.3)}" ry="${n2(h * 0.3)}" fill="${escurecer(cor, 140)}" stroke="${contorno}" stroke-width="2"/>`)
  } else if (tipo === 'botao') {
    const d = Math.max(comp, 24)
    out.push(`<circle cx="${n2(cx)}" cy="${n2(cy)}" r="${n2(d / 2)}" fill="${cor}" stroke="${contorno}" stroke-width="2"/>`)
    out.push(`<circle cx="${n2(cx - d * 0.06)}" cy="${n2(cy - d * 0.11)}" r="${n2(d * 0.14)}" fill="${clarear(cor, 150)}"/>`)
  } else if (tipo === 'cava_usinada') {
    out.push(`<rect x="${n2(cx - comp / 2)}" y="${n2(cy - 12)}" width="${n2(comp)}" height="26" rx="8" fill="#000" fill-opacity="0.6" stroke="#000" stroke-width="2"/>`)
    out.push(`<rect x="${n2(cx - comp / 2 + 6)}" y="${n2(cy + 6)}" width="${n2(comp - 12)}" height="5" fill="#fff" fill-opacity="0.27"/>`)
  } else if (tipo === 'perfil_cava') {
    out.push(`<rect x="${n2(cx - comp / 2)}" y="${n2(cy - 11)}" width="${n2(comp)}" height="24" fill="${cor}" stroke="${contorno}" stroke-width="2"/>`)
    out.push(`<rect x="${n2(cx - comp / 2 + 2)}" y="${n2(cy - 3)}" width="${n2(comp - 4)}" height="7" fill="#000" fill-opacity="0.47"/>`)
  }
}

/** Mapeia coordenadas do móvel (mm, Y para cima) para a área de desenho. */
export class Vista {
  esc: number; ox: number; oy: number; pxW: number; pxH: number
  constructor(public out: Saida, public area: Area, public larg: number, public alt: number,
    margem: [number, number, number, number] = [330, 90, 330, 330], public inverterH = false) {
    const [ml, mt, mr, mb] = margem
    const utilW = Math.max(area.w - ml - mr, 10)
    const utilH = Math.max(area.h - mt - mb, 10)
    this.esc = Math.min(utilW / Math.max(larg, 1), utilH / Math.max(alt, 1))
    this.pxW = larg * this.esc; this.pxH = alt * this.esc
    this.ox = area.x + ml + (utilW - this.pxW) / 2
    this.oy = area.y + mt + (utilH - this.pxH) / 2 + this.pxH
  }
  X(x: number) { return this.inverterH ? this.ox + (this.larg - x) * this.esc : this.ox + x * this.esc }
  Y(y: number) { return this.oy - y * this.esc }
  L(v: number) { return v * this.esc }
  rect(x: number, y: number, w: number, h: number): Area {
    const x1 = this.X(x), x2 = this.X(x + w), y1 = this.Y(y + h), y2 = this.Y(y)
    return { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) }
  }

  /** veio: 'h' linhas horizontais, 'v' verticais, '' sem veio. */
  peca(x: number, y: number, w: number, h: number, cor: string, veio: 'h' | 'v' | '' = '', semente = 0,
    o: { tracejado?: boolean; soContorno?: boolean; espessura?: number } = {}): Area {
    const r = this.rect(x, y, w, h)
    const sw = o.espessura ?? 3.5
    if (o.tracejado) retangulo(this.out, r.x, r.y, r.w, r.h, 'none', OCULTO, 2.5, '14 10')
    else if (o.soContorno) retangulo(this.out, r.x, r.y, r.w, r.h, 'none', CONTORNO, sw)
    else {
      retangulo(this.out, r.x, r.y, r.w, r.h, cor, CONTORNO, sw)
      if (veio) {
        veioEmRetangulo(this.out, r, cor, veio === 'h', semente)
        retangulo(this.out, r.x, r.y, r.w, r.h, 'none', CONTORNO, sw)
      }
    }
    return r
  }
  linha(x1: number, y1: number, x2: number, y2: number, cor = CONTORNO, sw = 2.5, dash = '') {
    linhaSvg(this.out, this.X(x1), this.Y(y1), this.X(x2), this.Y(y2), cor, sw, dash)
  }
  rotulo(x: number, y: number, s: string, tam = TAM_TEXTO, cor = CONTORNO, negrito = false, alinh: 'e' | 'c' | 'd' = 'c') {
    texto(this.out, this.X(x), this.Y(y), s, tam, cor, negrito, alinh)
  }

  private tick(px: number, py: number) { linhaSvg(this.out, px - 14, py + 14, px + 14, py - 14, AZUL_COTA, 2.2) }

  cotaH(x1: number, x2: number, nivel = 1, abaixo = true, valor?: number, yRef?: number, textoCustom?: string) {
    const yRefPx = this.Y(yRef ?? (abaixo ? 0 : this.alt))
    const yl = abaixo ? this.Y(0) + AFASTA_COTA + (nivel - 1) * PASSO_COTA : this.Y(this.alt) - AFASTA_COTA - (nivel - 1) * PASSO_COTA
    let xa = this.X(x1), xb = this.X(x2)
    if (xa > xb) [xa, xb] = [xb, xa]
    const ext = abaixo ? 18 : -18
    const off = abaixo ? 8 : -8
    linhaSvg(this.out, xa, yRefPx + off, xa, yl + ext, AZUL_COTA, 2.2)
    linhaSvg(this.out, xb, yRefPx + off, xb, yl + ext, AZUL_COTA, 2.2)
    linhaSvg(this.out, xa, yl, xb, yl, AZUL_COTA, 2.2)
    this.tick(xa, yl); this.tick(xb, yl)
    texto(this.out, (xa + xb) / 2, yl - 10, textoCustom ?? fmtCm(valor ?? Math.abs(x2 - x1)), TAM_TEXTO, AZUL_COTA, false, 'c')
  }

  cotaV(y1: number, y2: number, nivel = 1, esquerda = true, valor?: number, xRef?: number, textoCustom?: string) {
    const xRefPx = this.X(xRef ?? (esquerda ? 0 : this.larg))
    const bEsq = Math.min(this.X(0), this.X(this.larg)), bDir = Math.max(this.X(0), this.X(this.larg))
    const xl = esquerda ? bEsq - AFASTA_COTA - (nivel - 1) * PASSO_COTA : bDir + AFASTA_COTA + (nivel - 1) * PASSO_COTA
    let ya = this.Y(y1), yb = this.Y(y2)
    if (ya < yb) [ya, yb] = [yb, ya]
    const sentido = esquerda ? -1 : 1
    linhaSvg(this.out, xRefPx + 8 * sentido, ya, xl - 18 * sentido, ya, AZUL_COTA, 2.2)
    linhaSvg(this.out, xRefPx + 8 * sentido, yb, xl - 18 * sentido, yb, AZUL_COTA, 2.2)
    linhaSvg(this.out, xl, ya, xl, yb, AZUL_COTA, 2.2)
    this.tick(xl, ya); this.tick(xl, yb)
    const tx = xl - 10, ty = (ya + yb) / 2
    this.out.push(`<text transform="translate(${n2(tx)} ${n2(ty)}) rotate(-90)" font-size="${TAM_TEXTO}" fill="${AZUL_COTA}" text-anchor="middle" font-family="${FONTE}">` +
      `${esc(textoCustom ?? fmtCm(valor ?? Math.abs(y2 - y1)))}</text>`)
  }
}
