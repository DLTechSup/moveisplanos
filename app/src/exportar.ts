// Exportação (PDF vetorial A3, PNG por folha) e arquivos de projeto (.pmv).
import { jsPDF } from 'jspdf'
import { svg2pdf } from 'svg2pdf.js'
import type { Calculo } from './core/calculo'
import { migrarProjeto } from './core/migrar'
import type { Projeto } from './core/tipos'
import { montarPaginas } from './draw/folha'
import type { OpcoesExport } from './draw/folha'

export function baixar(blob: Blob, nome: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = nome
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

export const nomeSeguro = (s: string) => s.replace(/[\\/:*?"<>|]+/g, '-').trim() || 'projeto'
export const nomeBase = (p: Projeto) => nomeSeguro(p.nome || 'projeto') + (p.cliente ? ` - ${nomeSeguro(p.cliente)}` : '')

export async function exportarPdf(calc: Calculo, opc: OpcoesExport): Promise<number> {
  const paginas = montarPaginas(calc, opc)
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a3', compress: true })
  doc.setProperties({ title: calc.projeto.nome || 'Projeto', creator: 'Projeta Móveis' })
  const host = document.createElement('div')
  host.style.cssText = 'position:fixed;left:-99999px;top:0;'
  document.body.appendChild(host)
  try {
    for (let i = 0; i < paginas.length; i++) {
      if (i) doc.addPage('a3', 'portrait')
      host.innerHTML = paginas[i].svg()
      const el = host.querySelector('svg') as SVGElement
      await svg2pdf(el, doc, { x: 0, y: 0, width: 297, height: 420 })
    }
  } finally { host.remove() }
  baixar(doc.output('blob'), `${nomeBase(calc.projeto)}.pdf`)
  return paginas.length
}

function svgParaPng(svg: string, largura: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const altura = Math.round((largura * 4200) / 2970)
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

/** Uma imagem PNG por folha (A3 retrato a 300 dpi). */
export async function exportarPng(calc: Calculo, opc: OpcoesExport): Promise<number> {
  const paginas = montarPaginas(calc, opc)
  for (let i = 0; i < paginas.length; i++) {
    const blob = await svgParaPng(paginas[i].svg(), 3508)
    baixar(blob, `${nomeBase(calc.projeto)}_folha${i + 1}.png`)
    await new Promise(r => setTimeout(r, 400))
  }
  return paginas.length
}

export function salvarProjeto(p: Projeto): void {
  baixar(new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' }), `${nomeSeguro(p.nome)}.pmv`)
}

export async function abrirProjeto(arquivo: File): Promise<Projeto> {
  return migrarProjeto(JSON.parse(await arquivo.text()))
}
