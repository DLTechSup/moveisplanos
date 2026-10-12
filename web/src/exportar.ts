// Exportação (PDF vetorial A3, PNG por página) e arquivos de projeto (.pmv).
import { jsPDF } from 'jspdf'
import { svg2pdf } from 'svg2pdf.js'
import type { Calculo } from './core/calculo'
import { projetoPadrao } from './core/tipos'
import type { Projeto } from './core/tipos'
import { ALT, LARG, montarPaginas } from './draw/prancha'
import type { Modo } from './draw/prancha'

export function baixar(blob: Blob, nome: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = nome
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

export const nomeSeguro = (s: string) => s.replace(/[\\/:*?"<>|]+/g, '-').trim() || 'projeto'

export function nomeBase(p: Projeto, modo: Modo): string {
  let base = nomeSeguro(p.nome || 'projeto')
  if (p.cliente) base += ` - ${nomeSeguro(p.cliente)}`
  return modo === 'cliente' ? `${base} (cliente)` : base
}

export async function exportarPdf(calc: Calculo, modo: Modo): Promise<number> {
  const paginas = montarPaginas(calc, modo)
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3', compress: true })
  doc.setProperties({ title: calc.projeto.nome || 'Projeto', creator: 'Projeta Móveis' })
  const host = document.createElement('div')
  host.style.cssText = 'position:fixed;left:-99999px;top:0;width:4200px;height:2970px;'
  document.body.appendChild(host)
  try {
    for (let i = 0; i < paginas.length; i++) {
      if (i) doc.addPage('a3', 'landscape')
      host.innerHTML = paginas[i].svg()
      const el = host.querySelector('svg') as SVGElement
      await svg2pdf(el, doc, { x: 0, y: 0, width: 420, height: 297 })
    }
  } finally { host.remove() }
  baixar(doc.output('blob'), `${nomeBase(calc.projeto, modo)}.pdf`)
  return paginas.length
}

function svgParaPng(svg: string, largura: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const altura = Math.round((largura * ALT) / LARG)
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }))
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = largura; c.height = altura
      const ctx = c.getContext('2d')!
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, largura, altura)
      ctx.drawImage(img, 0, 0, largura, altura)
      URL.revokeObjectURL(url)
      c.toBlob(b => (b ? resolve(b) : reject(new Error('Falha ao gerar a imagem'))), 'image/png')
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Falha ao ler o desenho')) }
    img.src = url
  })
}

/** Uma imagem PNG por página (A3 a 300 dpi). */
export async function exportarPng(calc: Calculo, modo: Modo): Promise<number> {
  const paginas = montarPaginas(calc, modo)
  for (let i = 0; i < paginas.length; i++) {
    const blob = await svgParaPng(paginas[i].svg(), 4961)
    baixar(blob, `${nomeBase(calc.projeto, modo)}_pagina${i + 1}.png`)
    await new Promise(r => setTimeout(r, 350))
  }
  return paginas.length
}

export function salvarProjeto(p: Projeto): void {
  baixar(new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' }), `${nomeSeguro(p.nome)}.pmv`)
}

export async function abrirProjeto(arquivo: File): Promise<Projeto> {
  const dados = JSON.parse(await arquivo.text())
  const base = projetoPadrao()
  const out: any = { ...base }
  for (const k of Object.keys(base)) if (k in dados) out[k] = dados[k]
  return out as Projeto
}
