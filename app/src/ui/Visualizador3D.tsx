// Visualizador 3D realista: luz, sombras, reflexos, texturas de madeira; portas e gavetas abrem e fecham.
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import type { Calculo } from '../core/calculo'
import * as C from '../core/catalogo'
import type { Bloco } from '../core/tipos'
import { COR_COLCHAO, COR_ESPELHO, COR_FERRAGEM } from '../draw/comum'
import { elementos, transformar } from '../draw/cena3d'
import { textura } from '../draw/texturas'
import { baixar } from '../exportar'

const MM = 0.001
const loader = new THREE.TextureLoader()
const cacheTex = new Map<string, THREE.Texture>()
function texBase(tipo: 'madeira' | 'liso' | 'hdf', cor: string, imagem?: string): THREE.Texture {
  const k = `${tipo}|${cor}|${imagem ?? ''}`
  let t = cacheTex.get(k)
  if (!t) {
    t = loader.load(imagem || textura(tipo, cor, 256, 3))
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
    cacheTex.set(k, t)
  }
  return t
}

function material(calc: Calculo, b: Bloco): THREE.Material {
  if (b.cor === 'espelho') return new THREE.MeshStandardMaterial({ color: COR_ESPELHO, metalness: 1, roughness: 0.04 })
  if (b.cor === 'colchao') return new THREE.MeshStandardMaterial({ color: COR_COLCHAO, roughness: 0.95 })
  const p = calc.projeto
  const nome = { estrutura: p.estrutura_padrao, frente: p.frente_padrao, caixa: p.caixa_padrao, fundo: p.fundo_padrao, perna: p.estrutura_padrao }[b.cor as 'estrutura']
  if (!nome || b.grupo === 'cabideiro') return new THREE.MeshStandardMaterial({ color: COR_FERRAGEM, metalness: 0.85, roughness: 0.3 })
  const pad = C.padrao(calc.catalogo, nome)
  const tipo = b.cor === 'fundo' ? 'hdf' : pad.veio ? 'madeira' : 'liso'
  const base = texBase(tipo, b.cor === 'fundo' ? '#E9E4D8' : pad.cor, pad.imagem)
  const t = base.clone(); t.needsUpdate = true
  // textura = ~450 mm; o veio acompanha o sentido do bloco
  const comprimento = b.veio === 'y' ? b.dy : b.veio === 'z' ? b.dz : Math.max(b.dx, b.dz)
  t.repeat.set(Math.max(0.2, comprimento / 450), Math.max(0.2, Math.max(b.dy, b.dz, b.dx) === comprimento ? Math.min(b.dy, b.dx || b.dz) / 450 : Math.max(b.dy, b.dx) / 450))
  if (b.veio === 'y') t.rotation = Math.PI / 2
  const brilho = b.cor === 'frente' ? 0.38 : 0.55
  return new THREE.MeshStandardMaterial({ map: t, roughness: brilho, metalness: 0 })
}

function geometriaPuxador(tipo: string, comp: number, vertical: boolean, mat: THREE.Material): THREE.Object3D {
  const g = new THREE.Group()
  const L = Math.max(30, comp) * MM
  if (tipo === 'bola' || tipo === 'botao' || tipo === 'knob') {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.014, 24, 16), mat); m.position.z = 0.018; g.add(m); return g
  }
  if (tipo === 'perfil_cava' || tipo === 'cava_usinada') {
    const m = new THREE.Mesh(new THREE.BoxGeometry(vertical ? 0.012 : L, vertical ? L : 0.012, 0.004), new THREE.MeshStandardMaterial({ color: '#2b2b2b', roughness: 0.6 }))
    m.position.z = 0.001; g.add(m); return g
  }
  const barra = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, L, 20), mat)
  if (!vertical) barra.rotation.z = Math.PI / 2
  barra.position.z = 0.03; g.add(barra)
  for (const s of [-1, 1]) {
    const pino = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.03, 12), mat)
    pino.rotation.x = Math.PI / 2; pino.position.z = 0.015
    if (vertical) pino.position.y = s * (L / 2 - 0.008); else pino.position.x = s * (L / 2 - 0.008)
    g.add(pino)
  }
  return g
}

interface Cena { renderer: THREE.WebGLRenderer; cam: THREE.PerspectiveCamera; scene: THREE.Scene; controles: OrbitControls
  alvo: Map<string, number>; atual: Map<string, number>; grupos: Map<string, { g: THREE.Group; el: ReturnType<typeof elementos>[number] }>; raf: number; sujo: boolean }

export function Visualizador3D({ calc }: { calc: Calculo }) {
  const host = useRef<HTMLDivElement>(null)
  const cena = useRef<Cena | null>(null)
  const [abertura, setAbertura] = useState(0)
  const [info, setInfo] = useState('')
  const res = calc.resultado

  useEffect(() => {
    const el = host.current!
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio))
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05
    el.appendChild(renderer.domElement)
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#e9ebf0')
    const pmrem = new THREE.PMREMGenerator(renderer)
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    const sol = new THREE.DirectionalLight('#fff4e5', 2.2)
    sol.castShadow = true; sol.shadow.mapSize.set(2048, 2048); sol.shadow.bias = -0.0004; sol.shadow.normalBias = 0.01
    scene.add(sol)

    const blocos = res.blocos
    const xs = blocos.flatMap(b => [b.x, b.x + b.dx]), ys = blocos.flatMap(b => [b.y, b.y + b.dy]), zs = blocos.flatMap(b => [b.z, b.z + b.dz])
    const min = [Math.min(...xs), Math.min(...ys), Math.min(...zs)], max = [Math.max(...xs), Math.max(...ys), Math.max(...zs)]
    const cx = (min[0] + max[0]) / 2, cz = (min[2] + max[2]) / 2
    const tam = Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]) * MM
    const raiz = new THREE.Group(); scene.add(raiz)
    raiz.position.set(-cx * MM, -min[1] * MM, -cz * MM)

    const piso = new THREE.Mesh(new THREE.PlaneGeometry(tam * 12, tam * 12), new THREE.MeshStandardMaterial({ color: '#d9d4cb', roughness: 0.85 }))
    piso.rotation.x = -Math.PI / 2; piso.receiveShadow = true; scene.add(piso)

    const px = C.puxador(calc.catalogo, calc.projeto.puxador)
    const matPux = new THREE.MeshStandardMaterial({ color: px.cor || '#b7bcc4', metalness: 0.9, roughness: 0.25 })
    const grupos = new Map<string, { g: THREE.Group; el: ReturnType<typeof elementos>[number] }>()
    for (const e of elementos(blocos, res.puxadores)) {
      const g = new THREE.Group(); g.userData.id = e.id; raiz.add(g)
      for (const i of e.blocos) {
        const b = blocos[i]
        const geo = b.forma === 'redondo' ? new THREE.CylinderGeometry(b.dx * MM / 2, b.dx * MM / 2, b.dy * MM, 64)
          : b.grupo === 'cabideiro' ? new THREE.CylinderGeometry(0.0125, 0.0125, b.dx * MM, 20)
          : new THREE.BoxGeometry(b.dx * MM, b.dy * MM, b.dz * MM)
        const m = new THREE.Mesh(geo, material(calc, b))
        if (b.grupo === 'cabideiro') m.rotation.z = Math.PI / 2
        m.position.set((b.x + b.dx / 2) * MM, (b.y + b.dy / 2) * MM, (b.z + b.dz / 2) * MM)
        m.castShadow = b.cor !== 'espelho'; m.receiveShadow = true; m.userData.id = e.id
        g.add(m)
      }
      for (const i of e.puxadores) {
        const p = res.puxadores[i]
        const o = geometriaPuxador(p.tipo, p.comp, p.vertical, matPux)
        o.position.set(p.x * MM, p.y * MM, p.z * MM); o.traverse(c => { c.userData.id = e.id; (c as THREE.Mesh).castShadow = true })
        g.add(o)
      }
      grupos.set(e.id, { g, el: e })
    }
    sol.position.set(tam * 1.6, tam * 2.4, tam * 1.8)
    const d = tam * 1.8
    Object.assign(sol.shadow.camera, { left: -d, right: d, top: d, bottom: -d, near: 0.1, far: tam * 8 })
    sol.shadow.camera.updateProjectionMatrix()

    const cam = new THREE.PerspectiveCamera(32, 1, 0.05, 100)
    cam.position.set(tam * 0.9, tam * 0.75, tam * 2.1)
    const controles = new OrbitControls(cam, renderer.domElement)
    controles.target.set(0, (max[1] - min[1]) * MM * 0.5, 0); controles.enableDamping = true
    controles.maxPolarAngle = Math.PI / 2 - 0.02; controles.minDistance = tam * 0.6; controles.maxDistance = tam * 6
    const c: Cena = { renderer, cam, scene, controles, alvo: new Map(), atual: new Map(), grupos, raf: 0, sujo: true }
    cena.current = c

    const ajustar = () => {
      const w = el.clientWidth, h = el.clientHeight
      renderer.setSize(w, h); cam.aspect = w / Math.max(1, h); cam.updateProjectionMatrix(); c.sujo = true
    }
    const ro = new ResizeObserver(ajustar); ro.observe(el); ajustar()

    const aplicar = (id: string, t: number) => {
      const o = grupos.get(id)!; const tr = transformar(o.el.movimento, t)
      o.g.position.set(tr.pivoX * MM + tr.dx * MM, 0, tr.pivoZ * MM + tr.dz * MM)
      o.g.rotation.y = tr.giro
      o.g.children.forEach(ch => {
        if (!ch.userData.base) ch.userData.base = ch.position.clone()
        ch.position.copy(ch.userData.base).add(new THREE.Vector3(-tr.pivoX * MM, 0, -tr.pivoZ * MM))
      })
    }
    for (const id of grupos.keys()) { c.atual.set(id, 0); c.alvo.set(id, 0); aplicar(id, 0) }

    const loop = () => {
      c.raf = requestAnimationFrame(loop)
      let mexeu = c.sujo
      for (const [id, alvo] of c.alvo) {
        const a = c.atual.get(id) ?? 0
        if (Math.abs(a - alvo) > 0.001) { const n = a + (alvo - a) * 0.14 + Math.sign(alvo - a) * 0.004; c.atual.set(id, Math.abs(n - alvo) < 0.01 ? alvo : n); aplicar(id, c.atual.get(id)!); mexeu = true }
      }
      if (controles.update()) mexeu = true
      if (mexeu) { renderer.render(scene, cam); c.sujo = false }
    }
    loop()

    // clique em uma porta ou gaveta abre/fecha só ela
    const ray = new THREE.Raycaster(), ptr = new THREE.Vector2()
    let ini: [number, number] | null = null
    const dn = (e: PointerEvent) => { ini = [e.clientX, e.clientY] }
    const up = (e: PointerEvent) => {
      if (!ini || Math.hypot(e.clientX - ini[0], e.clientY - ini[1]) > 5) return
      const r = renderer.domElement.getBoundingClientRect()
      ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
      ray.setFromCamera(ptr, cam)
      const hit = ray.intersectObjects(raiz.children, true).find(h => h.object.userData.id && h.object.userData.id !== 'fixo')
      if (hit) { const id = hit.object.userData.id as string; c.alvo.set(id, (c.alvo.get(id) ?? 0) > 0.5 ? 0 : 1) }
    }
    renderer.domElement.addEventListener('pointerdown', dn); renderer.domElement.addEventListener('pointerup', up)
    setInfo(`${[...grupos.keys()].filter(k => k.startsWith('gaveta')).length} gaveta(s) e ${[...grupos.keys()].filter(k => k.startsWith('porta')).length} porta(s) • clique para abrir/fechar uma peça`)

    return () => {
      cancelAnimationFrame(c.raf); ro.disconnect(); controles.dispose()
      renderer.domElement.removeEventListener('pointerdown', dn); renderer.domElement.removeEventListener('pointerup', up)
      scene.traverse(o => { const m = o as THREE.Mesh; m.geometry?.dispose?.(); const mm = m.material as THREE.Material | undefined; if (mm) { (mm as THREE.MeshStandardMaterial).map?.dispose?.(); mm.dispose() } })
      renderer.dispose(); renderer.domElement.remove(); cena.current = null
    }
  }, [calc]) // eslint-disable-line react-hooks/exhaustive-deps

  const definir = (v: number) => { setAbertura(v); cena.current?.alvo.forEach((_, k) => cena.current!.alvo.set(k, k === 'fixo' ? 0 : v)) }
  const salvar = () => {
    const c = cena.current; if (!c) return
    c.renderer.render(c.scene, c.cam)
    c.renderer.domElement.toBlob(b => b && baixar(b, `${calc.projeto.nome || 'projeto'} - imagem 3D.png`), 'image/png')
  }
  return (
    <div className="viz3d">
      <div className="viz3d-barra">
        <button onClick={() => definir(abertura > 0.5 ? 0 : 1)}>{abertura > 0.5 ? 'Fechar tudo' : 'Abrir tudo'}</button>
        <label>Abertura <input type="range" min={0} max={1} step={0.01} value={abertura} onChange={e => definir(Number(e.target.value))} /></label>
        <span className="dica">{info}</span>
        <button onClick={salvar} title="Salva a imagem atual do 3D, na posição da câmera e com portas/gavetas como estão">Salvar imagem (PNG)</button>
      </div>
      <div className="viz3d-cena" ref={host} />
    </div>
  )
}
