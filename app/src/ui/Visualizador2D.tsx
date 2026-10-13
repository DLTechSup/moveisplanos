// Modo compatível do 3D: desenha por software (Canvas 2D), sem WebGL. Gira com o mouse, portas e gavetas abrem.
import { useEffect, useRef, useState } from 'react'
import type { Calculo } from '../core/calculo'
import { corDoBloco } from '../draw/comum'
import { elementos, transformar } from '../draw/cena3d'
import { baixar } from '../exportar'

type V3 = [number, number, number]
const FACES: { n: V3; v: number[] }[] = [   // vértices: bit0=x, bit1=y, bit2=z (0 = mínimo, 1 = máximo)
  { n: [0, 0, 1], v: [4, 5, 7, 6] }, { n: [0, 0, -1], v: [1, 0, 2, 3] }, { n: [1, 0, 0], v: [5, 1, 3, 7] },
  { n: [-1, 0, 0], v: [0, 4, 6, 2] }, { n: [0, 1, 0], v: [2, 6, 7, 3] }, { n: [0, -1, 0], v: [0, 1, 5, 4] },
]
const mix = (hex: string, k: number) => {
  const h = hex.replace('#', ''), c = [0, 2, 4].map(i => Math.max(0, Math.min(255, Math.round(parseInt(h.slice(i, i + 2), 16) * k))))
  return `rgb(${c[0]},${c[1]},${c[2]})`
}

export function Visualizador2D({ calc }: { calc: Calculo }) {
  const cv = useRef<HTMLCanvasElement>(null)
  const est = useRef({ yaw: 0.6, pitch: 0.28, dist: 0, alvo: new Map<string, number>(), atual: new Map<string, number>(), sujo: true, poli: [] as { id: string; pts: [number, number][] }[] })
  const [abertura, setAbertura] = useState(0)
  const res = calc.resultado

  useEffect(() => {
    const canvas = cv.current!, ctx = canvas.getContext('2d')!, e = est.current
    const els = elementos(res.blocos, res.puxadores)
    const xs = res.blocos.flatMap(b => [b.x, b.x + b.dx]), ys = res.blocos.flatMap(b => [b.y, b.y + b.dy]), zs = res.blocos.flatMap(b => [b.z, b.z + b.dz])
    const c: V3 = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2, (Math.min(...zs) + Math.max(...zs)) / 2]
    const tam = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), Math.max(...zs) - Math.min(...zs))
    e.dist = tam * 2.6
    for (const el of els) { e.alvo.set(el.id, 0); e.atual.set(el.id, 0) }
    const cor = new Map<number, string>(); res.blocos.forEach((b, i) => cor.set(i, corDoBloco(calc, b)))

    const desenhar = () => {
      const W = canvas.clientWidth, H = canvas.clientHeight
      if (canvas.width !== W * devicePixelRatio) { canvas.width = W * devicePixelRatio; canvas.height = H * devicePixelRatio }
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)
      ctx.fillStyle = '#e9ebf0'; ctx.fillRect(0, 0, W, H)
      const cy = Math.cos(e.yaw), sy = Math.sin(e.yaw), cp = Math.cos(e.pitch), sp = Math.sin(e.pitch)
      const pos: V3 = [c[0] + e.dist * sy * cp, c[1] + e.dist * sp, c[2] + e.dist * cy * cp]
      const f: V3 = [-sy * cp, -sp, -cy * cp]
      const r: V3 = [cy, 0, -sy]                                  // direita = f × cima
      const u: V3 = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]]
      const foco = Math.min(W, H) * 1.5
      const proj = (p: V3): [number, number, number] => {
        const d: V3 = [p[0] - pos[0], p[1] - pos[1], p[2] - pos[2]]
        const z = d[0] * f[0] + d[1] * f[1] + d[2] * f[2]
        return [W / 2 + (foco * (d[0] * r[0] + d[1] * r[1] + d[2] * r[2])) / z, H / 2 - (foco * (d[0] * u[0] + d[1] * u[1] + d[2] * u[2])) / z, z]
      }
      const luz: V3 = [0.35, 0.8, 0.5]
      const faces: { z: number; pts: [number, number][]; cor: string; id: string }[] = []
      const hastes: { a: [number, number]; b: [number, number]; id: string }[] = []
      for (const el of els) {
        const t = transformar(el.movimento, e.atual.get(el.id) ?? 0)
        const cs = Math.cos(t.giro), sn = Math.sin(t.giro)
        const mover = (p: V3): V3 => {      // mesma rotação do three.js (eixo y) em torno do pivô
          const dx = p[0] - t.pivoX, dz = p[2] - t.pivoZ
          return [t.pivoX + dx * cs + dz * sn + t.dx, p[1], t.pivoZ - dx * sn + dz * cs + t.dz]
        }
        const rot = (n: V3): V3 => [n[0] * cs + n[2] * sn, n[1], -n[0] * sn + n[2] * cs]
        for (const i of el.blocos) {
          const b = res.blocos[i]
          if (b.grupo === 'cabideiro') continue
          const vs = Array.from({ length: 8 }, (_, k) => mover([b.x + (k & 1 ? b.dx : 0), b.y + (k & 2 ? b.dy : 0), b.z + (k & 4 ? b.dz : 0)]))
          for (const fc of FACES) {
            const n = rot(fc.n), p0 = vs[fc.v[0]]
            if ((p0[0] - pos[0]) * n[0] + (p0[1] - pos[1]) * n[1] + (p0[2] - pos[2]) * n[2] >= 0) continue   // face de costas
            const pp = fc.v.map(k => proj(vs[k]))
            if (pp.some(p => p[2] <= 1)) continue
            const k = 0.62 + 0.38 * Math.max(0, n[0] * luz[0] + n[1] * luz[1] + n[2] * luz[2])
            faces.push({ z: pp.reduce((s, p) => s + p[2], 0) / 4, pts: pp.map(p => [p[0], p[1]]), cor: mix(cor.get(i)!, k), id: el.id })
          }
        }
        for (const i of el.puxadores) {
          const p = res.puxadores[i], L = Math.max(30, p.comp) / 2
          const a = mover(p.vertical ? [p.x, p.y - L, p.z + 25] : [p.x - L, p.y, p.z + 25]), b = mover(p.vertical ? [p.x, p.y + L, p.z + 25] : [p.x + L, p.y, p.z + 25])
          const pa = proj(a), pb = proj(b)
          if (pa[2] > 1 && pb[2] > 1) hastes.push({ a: [pa[0], pa[1]], b: [pb[0], pb[1]], id: el.id })
        }
      }
      faces.sort((a, b) => b.z - a.z)
      e.poli = faces
      ctx.lineJoin = 'round'
      for (const fc of faces) {
        ctx.beginPath(); fc.pts.forEach((q, k) => (k ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.closePath()
        ctx.fillStyle = fc.cor; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 0.8; ctx.stroke()
      }
      ctx.lineCap = 'round'
      for (const h of hastes) { ctx.beginPath(); ctx.moveTo(h.a[0], h.a[1]); ctx.lineTo(h.b[0], h.b[1]); ctx.strokeStyle = '#8d939c'; ctx.lineWidth = 4; ctx.stroke() }
    }

    let raf = 0
    const loop = () => {
      raf = requestAnimationFrame(loop)
      for (const [id, alvo] of e.alvo) {
        const a = e.atual.get(id) ?? 0
        if (Math.abs(a - alvo) > 0.001) { const n = a + (alvo - a) * 0.14 + Math.sign(alvo - a) * 0.004; e.atual.set(id, Math.abs(n - alvo) < 0.01 ? alvo : n); e.sujo = true }
      }
      if (e.sujo) { e.sujo = false; desenhar() }
    }
    loop()
    const ro = new ResizeObserver(() => { e.sujo = true }); ro.observe(canvas)

    let ini: { x: number; y: number; yaw: number; pitch: number; mexeu: boolean } | null = null
    const dn = (ev: PointerEvent) => { canvas.setPointerCapture(ev.pointerId); ini = { x: ev.clientX, y: ev.clientY, yaw: e.yaw, pitch: e.pitch, mexeu: false } }
    const mv = (ev: PointerEvent) => {
      if (!ini) return
      const dx = ev.clientX - ini.x, dy = ev.clientY - ini.y
      if (Math.hypot(dx, dy) > 5) ini.mexeu = true
      e.yaw = ini.yaw - dx * 0.008; e.pitch = Math.max(0.02, Math.min(1.4, ini.pitch + dy * 0.006)); e.sujo = true
    }
    const up = (ev: PointerEvent) => {
      if (ini && !ini.mexeu) {
        const r = canvas.getBoundingClientRect(), x = ev.clientX - r.left, y = ev.clientY - r.top
        for (let k = e.poli.length - 1; k >= 0; k--) {
          const pts = e.poli[k].pts; let dentro = false
          for (let i = 0, j = pts.length - 1; i < pts.length; j = i++)
            if ((pts[i][1] > y) !== (pts[j][1] > y) && x < ((pts[j][0] - pts[i][0]) * (y - pts[i][1])) / (pts[j][1] - pts[i][1]) + pts[i][0]) dentro = !dentro
          if (dentro) { const id = e.poli[k].id; if (id !== 'fixo') { e.alvo.set(id, (e.alvo.get(id) ?? 0) > 0.5 ? 0 : 1); e.sujo = true } break }
        }
      }
      ini = null
    }
    const wh = (ev: WheelEvent) => { ev.preventDefault(); e.dist = Math.max(tam * 0.8, Math.min(tam * 6, e.dist * (ev.deltaY < 0 ? 0.92 : 1.08))); e.sujo = true }
    canvas.addEventListener('pointerdown', dn); canvas.addEventListener('pointermove', mv); canvas.addEventListener('pointerup', up)
    canvas.addEventListener('wheel', wh, { passive: false })
    return () => {
      cancelAnimationFrame(raf); ro.disconnect()
      canvas.removeEventListener('pointerdown', dn); canvas.removeEventListener('pointermove', mv); canvas.removeEventListener('pointerup', up); canvas.removeEventListener('wheel', wh)
    }
  }, [calc]) // eslint-disable-line react-hooks/exhaustive-deps

  const definir = (v: number) => { setAbertura(v); const e = est.current; e.alvo.forEach((_, k) => e.alvo.set(k, k === 'fixo' ? 0 : v)) }
  return (
    <div className="viz3d">
      <div className="viz3d-barra">
        <button onClick={() => definir(abertura > 0.5 ? 0 : 1)}>{abertura > 0.5 ? 'Fechar tudo' : 'Abrir tudo'}</button>
        <label>Abertura <input type="range" min={0} max={1} step={0.01} value={abertura} onChange={e => definir(Number(e.target.value))} /></label>
        <span className="dica">Modo compatível • arraste para girar, roda do mouse para aproximar, clique numa porta/gaveta para abrir</span>
        <button onClick={() => cv.current?.toBlob(b => b && baixar(b, `${calc.projeto.nome || 'projeto'} - imagem 3D.png`), 'image/png')}>Salvar imagem (PNG)</button>
      </div>
      <div className="viz3d-cena"><canvas ref={cv} style={{ touchAction: 'none', cursor: 'grab' }} /></div>
    </div>
  )
}
