// Ilustrações vetoriais (com sombreado) das ferragens e insumos, para a folha de materiais.
import * as C from '../core/catalogo'
import type { Calculo } from '../core/calculo'
import type { RefImagem } from '../core/orcamento'
import { clarear, escurecer, n2 } from './svg'
import { textura } from './texturas'

let contador = 0
const uid = () => `g${++contador}`

const metal = (id: string, base = '#C8CDD3') =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${clarear(base, 125)}"/><stop offset="0.45" stop-color="${base}"/><stop offset="1" stop-color="${escurecer(base, 150)}"/></linearGradient>`
const radial = (id: string, base: string) =>
  `<radialGradient id="${id}" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stop-color="${clarear(base, 140)}"/><stop offset="1" stop-color="${escurecer(base, 160)}"/></radialGradient>`

/** Desenha uma ilustração dentro do retângulo (x, y, w, h). */
export function ilustracao(ref: RefImagem, calc: Calculo, x: number, y: number, w: number, h: number): string {
  const cat = calc.catalogo
  const cx = x + w / 2, cy = y + h / 2
  const r = Math.min(w, h)
  const fundo = `<rect x="${n2(x)}" y="${n2(y)}" width="${n2(w)}" height="${n2(h)}" rx="10" fill="#fff" stroke="#c9d6e6" stroke-width="2"/>`
  let g = ''
  const id = uid()
  switch (ref.tipo) {
    case 'padrao': case 'chapa': {
      const pad = ref.tipo === 'chapa' ? null : C.padrao(cat, ref.nome)
      const foto = pad?.imagem || textura(ref.tipo === 'chapa' ? 'hdf' : pad!.veio ? 'madeira' : 'liso', ref.tipo === 'chapa' ? '#B58B5B' : pad!.cor, 192, 3)
      if (foto) return `<image x="${n2(x)}" y="${n2(y)}" width="${n2(w)}" height="${n2(h)}" preserveAspectRatio="xMidYMid slice" href="${foto}"/>` +
        `<rect x="${n2(x)}" y="${n2(y)}" width="${n2(w)}" height="${n2(h)}" rx="6" fill="none" stroke="#9fb3c8" stroke-width="2"/>`
      return `<rect x="${n2(x)}" y="${n2(y)}" width="${n2(w)}" height="${n2(h)}" rx="6" fill="${pad?.cor ?? '#B58B5B'}" stroke="#9fb3c8" stroke-width="2"/>`
    }
    case 'puxador': {
      const px = C.puxador(cat, ref.nome)
      if (px.imagem) return `<image x="${n2(x)}" y="${n2(y)}" width="${n2(w)}" height="${n2(h)}" preserveAspectRatio="xMidYMid meet" href="${px.imagem}"/>`
      g = `<defs>${metal(id, px.cor)}${radial(id + 'r', px.cor)}</defs>`
      if (px.tipo === 'barra') {
        const L = w * 0.78
        g += `<rect x="${n2(cx - L / 2)}" y="${n2(cy - r * 0.07)}" width="${n2(L)}" height="${n2(r * 0.14)}" rx="${n2(r * 0.07)}" fill="url(#${id})" stroke="${escurecer(px.cor, 200)}" stroke-width="1.5"/>`
        for (const dx of [-L * 0.36, L * 0.36]) g += `<rect x="${n2(cx + dx - r * 0.05)}" y="${n2(cy + r * 0.05)}" width="${n2(r * 0.1)}" height="${n2(r * 0.13)}" fill="url(#${id})" stroke="${escurecer(px.cor, 200)}" stroke-width="1.2"/>`
      } else if (px.tipo === 'botao') g += `<circle cx="${n2(cx)}" cy="${n2(cy)}" r="${n2(r * 0.28)}" fill="url(#${id}r)" stroke="${escurecer(px.cor, 200)}" stroke-width="1.5"/>`
      else if (px.tipo === 'concha') g += `<ellipse cx="${n2(cx)}" cy="${n2(cy)}" rx="${n2(w * 0.3)}" ry="${n2(h * 0.2)}" fill="url(#${id})" stroke="${escurecer(px.cor, 200)}" stroke-width="1.5"/><ellipse cx="${n2(cx)}" cy="${n2(cy)}" rx="${n2(w * 0.2)}" ry="${n2(h * 0.11)}" fill="${escurecer(px.cor, 150)}"/>`
      else if (px.tipo === 'perfil_cava') g += `<rect x="${n2(x + w * 0.08)}" y="${n2(cy - r * 0.1)}" width="${n2(w * 0.84)}" height="${n2(r * 0.2)}" fill="url(#${id})" stroke="${escurecer(px.cor, 200)}" stroke-width="1.5"/><rect x="${n2(x + w * 0.1)}" y="${n2(cy - r * 0.02)}" width="${n2(w * 0.8)}" height="${n2(r * 0.06)}" fill="#000" fill-opacity="0.45"/>`
      else if (px.tipo === 'cava_usinada') g += `<rect x="${n2(x + w * 0.15)}" y="${n2(cy - r * 0.08)}" width="${n2(w * 0.7)}" height="${n2(r * 0.16)}" rx="${n2(r * 0.08)}" fill="#2a1d14" stroke="#000" stroke-width="1.5"/>`
      else g += `<text x="${n2(cx)}" y="${n2(cy)}" font-size="${n2(r * 0.14)}" text-anchor="middle" fill="#667" font-family="Arial">sem puxador</text>`
      break
    }
    case 'corredica': {
      const c = C.corredica(cat, ref.nome)
      if (c.imagem) return `<image x="${n2(x)}" y="${n2(y)}" width="${n2(w)}" height="${n2(h)}" preserveAspectRatio="xMidYMid meet" href="${c.imagem}"/>`
      g = `<defs>${metal(id, '#C6CBD1')}${metal(id + 'b', '#9AA1AA')}</defs>`
      const L = w * 0.82, hh = r * 0.11
      const yy = cy - hh * 1.5
      if (c.tipo === 'oculta') {
        g += `<rect x="${n2(cx - L / 2)}" y="${n2(cy - hh * 0.6)}" width="${n2(L)}" height="${n2(hh * 1.2)}" fill="url(#${id}b)" stroke="#555" stroke-width="1.2"/><rect x="${n2(cx - L / 2)}" y="${n2(cy + hh * 0.7)}" width="${n2(L * 0.7)}" height="${n2(hh * 0.5)}" fill="url(#${id})" stroke="#555" stroke-width="1"/>`
      } else {
        g += `<rect x="${n2(cx - L / 2)}" y="${n2(yy)}" width="${n2(L)}" height="${n2(hh)}" rx="3" fill="url(#${id})" stroke="#555" stroke-width="1.2"/>` +
          `<rect x="${n2(cx - L / 2 + L * 0.12)}" y="${n2(yy + hh * 1.05)}" width="${n2(L * 0.88)}" height="${n2(hh)}" rx="3" fill="url(#${id}b)" stroke="#555" stroke-width="1.2"/>` +
          `<rect x="${n2(cx - L / 2)}" y="${n2(yy + hh * 2.1)}" width="${n2(L)}" height="${n2(hh)}" rx="3" fill="url(#${id})" stroke="#555" stroke-width="1.2"/>`
        for (let i = 0; i < 6; i++) g += `<circle cx="${n2(cx - L / 2 + L * (0.1 + i * 0.16))}" cy="${n2(yy + hh * 1.55)}" r="${n2(hh * 0.18)}" fill="#6b727b"/>`
      }
      break
    }
    case 'dobradica': {
      const d = C.dobradica(cat, ref.nome)
      if (d.imagem) return `<image x="${n2(x)}" y="${n2(y)}" width="${n2(w)}" height="${n2(h)}" preserveAspectRatio="xMidYMid meet" href="${d.imagem}"/>`
      g = `<defs>${metal(id, '#C8CDD3')}${radial(id + 'r', '#B8BEC6')}</defs>`
      g += `<rect x="${n2(cx - r * 0.02)}" y="${n2(cy - r * 0.1)}" width="${n2(r * 0.46)}" height="${n2(r * 0.2)}" rx="4" fill="url(#${id})" stroke="#555" stroke-width="1.3"/>` +
        `<circle cx="${n2(cx - r * 0.18)}" cy="${n2(cy)}" r="${n2(r * 0.26)}" fill="url(#${id}r)" stroke="#555" stroke-width="1.5"/>` +
        `<circle cx="${n2(cx - r * 0.18)}" cy="${n2(cy)}" r="${n2(r * 0.17)}" fill="#E9ECEF" stroke="#777" stroke-width="1"/>` +
        `<circle cx="${n2(cx + r * 0.32)}" cy="${n2(cy)}" r="${n2(r * 0.05)}" fill="#6b727b"/>`
      break
    }
    case 'fita': {
      const f = C.fita(cat, ref.nome)
      if (f.imagem) return `<image x="${n2(x)}" y="${n2(y)}" width="${n2(w)}" height="${n2(h)}" preserveAspectRatio="xMidYMid meet" href="${f.imagem}"/>`
      const cor = C.padrao(cat, calc.projeto.estrutura_padrao).cor
      g = `<defs>${radial(id, cor)}</defs>` +
        `<ellipse cx="${n2(cx - w * 0.08)}" cy="${n2(cy)}" rx="${n2(r * 0.36)}" ry="${n2(r * 0.36)}" fill="url(#${id})" stroke="${escurecer(cor, 200)}" stroke-width="2"/>` +
        `<circle cx="${n2(cx - w * 0.08)}" cy="${n2(cy)}" r="${n2(r * 0.16)}" fill="#fff" stroke="#bbb" stroke-width="1.5"/>` +
        `<rect x="${n2(cx - w * 0.08)}" y="${n2(cy + r * 0.3)}" width="${n2(w * 0.4)}" height="${n2(r * 0.07)}" fill="${cor}" stroke="${escurecer(cor, 200)}" stroke-width="1.2"/>`
      break
    }
    case 'insumo': {
      const ins = C.insumo(cat, ref.nome)
      if (ins.imagem) return `<image x="${n2(x)}" y="${n2(y)}" width="${n2(w)}" height="${n2(h)}" preserveAspectRatio="xMidYMid meet" href="${ins.imagem}"/>`
      g = `<defs>${metal(id, '#C8CDD3')}${radial(id + 'r', '#B8BEC6')}${metal(id + 'w', '#C9A66B')}</defs>`
      const k = ref.nome
      if (k === 'pe') g += `<rect x="${n2(cx - r * 0.04)}" y="${n2(cy - r * 0.3)}" width="${n2(r * 0.08)}" height="${n2(r * 0.4)}" fill="url(#${id})" stroke="#555" stroke-width="1"/><ellipse cx="${n2(cx)}" cy="${n2(cy + r * 0.18)}" rx="${n2(r * 0.22)}" ry="${n2(r * 0.07)}" fill="#3a3d42"/>`
      else if (k === 'rodizio') g += `<rect x="${n2(cx - r * 0.1)}" y="${n2(cy - r * 0.3)}" width="${n2(r * 0.2)}" height="${n2(r * 0.12)}" fill="url(#${id})" stroke="#555"/><circle cx="${n2(cx)}" cy="${n2(cy + r * 0.08)}" r="${n2(r * 0.22)}" fill="#2B2B2B" stroke="#111" stroke-width="2"/><circle cx="${n2(cx)}" cy="${n2(cy + r * 0.08)}" r="${n2(r * 0.07)}" fill="url(#${id})"/>`
      else if (k === 'varao') g += `<rect x="${n2(x + w * 0.08)}" y="${n2(cy - r * 0.09)}" width="${n2(w * 0.84)}" height="${n2(r * 0.18)}" rx="${n2(r * 0.09)}" fill="url(#${id})" stroke="#555" stroke-width="1.3"/>`
      else if (k === 'suporte_varao') g += `<rect x="${n2(cx - r * 0.22)}" y="${n2(cy - r * 0.2)}" width="${n2(r * 0.44)}" height="${n2(r * 0.4)}" rx="4" fill="url(#${id})" stroke="#555" stroke-width="1.3"/><ellipse cx="${n2(cx)}" cy="${n2(cy)}" rx="${n2(r * 0.14)}" ry="${n2(r * 0.08)}" fill="#e7eaee" stroke="#777"/>`
      else if (k === 'trilho_correr') g += `<rect x="${n2(x + w * 0.06)}" y="${n2(cy - r * 0.12)}" width="${n2(w * 0.88)}" height="${n2(r * 0.24)}" fill="url(#${id})" stroke="#555" stroke-width="1.3"/><rect x="${n2(x + w * 0.08)}" y="${n2(cy - r * 0.06)}" width="${n2(w * 0.84)}" height="${n2(r * 0.04)}" fill="#6b727b"/><rect x="${n2(x + w * 0.08)}" y="${n2(cy + r * 0.02)}" width="${n2(w * 0.84)}" height="${n2(r * 0.04)}" fill="#6b727b"/>`
      else if (k === 'roldana_correr') g += `<circle cx="${n2(cx)}" cy="${n2(cy)}" r="${n2(r * 0.22)}" fill="#2B2B2B" stroke="#111" stroke-width="2"/><circle cx="${n2(cx)}" cy="${n2(cy)}" r="${n2(r * 0.1)}" fill="url(#${id})"/><rect x="${n2(cx - r * 0.06)}" y="${n2(cy - r * 0.4)}" width="${n2(r * 0.12)}" height="${n2(r * 0.2)}" fill="url(#${id})" stroke="#555"/>`
      else if (k === 'espelho') g += `<rect x="${n2(x + w * 0.2)}" y="${n2(y + h * 0.12)}" width="${n2(w * 0.6)}" height="${n2(h * 0.76)}" fill="#d6e8f2" stroke="#9db8c8" stroke-width="2"/><polygon points="${n2(x + w * 0.3)},${n2(y + h * 0.88)} ${n2(x + w * 0.52)},${n2(y + h * 0.12)} ${n2(x + w * 0.62)},${n2(y + h * 0.12)} ${n2(x + w * 0.4)},${n2(y + h * 0.88)}" fill="#fff" fill-opacity="0.55"/>`
      else if (k === 'cola') g += `<rect x="${n2(cx - r * 0.16)}" y="${n2(cy - r * 0.18)}" width="${n2(r * 0.32)}" height="${n2(r * 0.42)}" rx="8" fill="#F4F1E8" stroke="#aaa" stroke-width="1.5"/><rect x="${n2(cx - r * 0.1)}" y="${n2(cy - r * 0.3)}" width="${n2(r * 0.2)}" height="${n2(r * 0.12)}" fill="#E8A33B" stroke="#a66" stroke-width="1"/><rect x="${n2(cx - r * 0.16)}" y="${n2(cy - r * 0.02)}" width="${n2(r * 0.32)}" height="${n2(r * 0.14)}" fill="#2D6CB5"/>`
      else if (k === 'parafuso') g += `<rect x="${n2(cx - r * 0.02)}" y="${n2(cy - r * 0.25)}" width="${n2(r * 0.04)}" height="${n2(r * 0.5)}" fill="url(#${id})" stroke="#555" stroke-width="0.8"/><ellipse cx="${n2(cx)}" cy="${n2(cy - r * 0.26)}" rx="${n2(r * 0.09)}" ry="${n2(r * 0.03)}" fill="#999" stroke="#555"/>`
      else if (k === 'cavilha') g += `<rect x="${n2(cx - r * 0.05)}" y="${n2(cy - r * 0.22)}" width="${n2(r * 0.1)}" height="${n2(r * 0.44)}" rx="3" fill="url(#${id}w)" stroke="#8a6a3a" stroke-width="1.2"/>`
      else if (k === 'suporte_aereo' || k === 'cantoneira') g += `<path d="M${n2(cx - r * 0.22)} ${n2(cy - r * 0.22)} h${n2(r * 0.1)} v${n2(r * 0.34)} h${n2(r * 0.34)} v${n2(r * 0.1)} h${n2(-r * 0.44)} z" fill="url(#${id})" stroke="#555" stroke-width="1.3"/>`
      else if (k === 'perfil_led') g += `<rect x="${n2(x + w * 0.08)}" y="${n2(cy - r * 0.07)}" width="${n2(w * 0.84)}" height="${n2(r * 0.14)}" fill="#F5F5EF" stroke="#bbb"/>${[0.15, 0.3, 0.45, 0.6, 0.75].map(t => `<circle cx="${n2(x + w * t)}" cy="${n2(cy)}" r="${n2(r * 0.03)}" fill="#FFD76A"/>`).join('')}`
      else g += `<text x="${n2(cx)}" y="${n2(cy)}" font-size="${n2(r * 0.12)}" text-anchor="middle" fill="#667" font-family="Arial">${ins.nome.slice(0, 14)}</text>`
      break
    }
    default: return ''
  }
  return fundo + g
}
