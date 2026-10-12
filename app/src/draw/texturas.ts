// Texturas geradas por código (madeira, laminado, HDF) para amostras e fotos dos materiais.
// São imagens sintéticas (não fotografias); cada item do catálogo pode receber uma foto real em "imagem".
const cache = new Map<string, string>()

function hash(x: number, y: number, s: number): number {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295
}
const suave = (t: number) => t * t * (3 - 2 * t)
function ruido(x: number, y: number, s: number): number {
  const xi = Math.floor(x), yi = Math.floor(y)
  const fx = suave(x - xi), fy = suave(y - yi)
  const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s)
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy
}
function fbm(x: number, y: number, s: number, oit = 4): number {
  let v = 0, amp = 0.5, f = 1
  for (let i = 0; i < oit; i++) { v += amp * ruido(x * f, y * f, s + i * 17); amp *= 0.5; f *= 2 }
  return v
}
const rgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

export type TipoTextura = 'madeira' | 'liso' | 'hdf'

/** Devolve um data URL (PNG) ou '' quando não há canvas (testes em Node). */
export function textura(tipo: TipoTextura, cor: string, tam = 192, semente = 1): string {
  const chave = `${tipo}|${cor}|${tam}|${semente}`
  const c0 = cache.get(chave)
  if (c0 != null) return c0
  if (typeof document === 'undefined') return ''
  const canvas = document.createElement('canvas')
  canvas.width = tam; canvas.height = tam
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  const img = ctx.createImageData(tam, tam)
  const [r0, g0, b0] = rgb(cor)
  const dados = img.data
  for (let y = 0; y < tam; y++) for (let x = 0; x < tam; x++) {
    let tom: number
    if (tipo === 'madeira') {
      const anel = y * 0.055 + fbm(x * 0.004, y * 0.03, semente) * 2.4
      const t = anel - Math.floor(anel)
      const pulso = Math.pow(Math.sin(Math.PI * t), 1.3)
      const fibra = fbm(x * 0.09, y * 1.1, semente + 7, 3)
      const poro = ruido(x * 0.5, y * 3.4, semente + 3) > 0.86 ? 0.9 : 1
      tom = (0.88 + 0.16 * pulso) * (0.95 + 0.1 * fibra) * poro
    } else if (tipo === 'hdf') {
      tom = 0.9 + 0.2 * fbm(x * 0.9, y * 0.9, semente + 2, 3) - (hash(x, y, semente) > 0.985 ? 0.2 : 0)
    } else {
      tom = 0.96 + 0.07 * fbm(x * 0.5, y * 0.5, semente + 1, 3)
    }
    const i = (y * tam + x) * 4
    dados[i] = Math.max(0, Math.min(255, r0 * tom))
    dados[i + 1] = Math.max(0, Math.min(255, g0 * tom * (tipo === 'madeira' ? 0.985 : 1)))
    dados[i + 2] = Math.max(0, Math.min(255, b0 * tom * (tipo === 'madeira' ? 0.95 : 1)))
    dados[i + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
  const url = canvas.toDataURL('image/jpeg', 0.88)
  cache.set(chave, url)
  return url
}
