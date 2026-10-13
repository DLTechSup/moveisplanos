import { createRequire } from 'node:module'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const lic = createRequire(import.meta.url)('../electron/licenca.cjs')
const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519')
const pub = publicKey.export({ type: 'spki', format: 'pem' }) as string
const priv = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string
const dados = { cliente: 'Maria', tipo: 'vitalicia', emissao: '2026-10-13', validade: null, maquina: null }

describe('licença', () => {
  it('aceita chave assinada e recusa adulterada ou de outra chave', () => {
    const k = lic.assinar(dados, priv)
    expect(lic.verificar(k, pub).ok).toBe(true)
    const [a, p, s] = k.split('.')
    const forjado = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(p, 'base64url').toString()), cliente: 'Outro' })).toString('base64url')
    expect(lic.verificar(`${a}.${forjado}.${s}`, pub).ok).toBe(false)
    const outra = crypto.generateKeyPairSync('ed25519').privateKey.export({ type: 'pkcs8', format: 'pem' }) as string
    expect(lic.verificar(lic.assinar(dados, outra), pub).ok).toBe(false)
    expect(lic.verificar('lixo', pub).ok).toBe(false)
  })
  it('respeita validade e máquina', () => {
    const exp = lic.assinar({ ...dados, validade: '2026-01-01' }, priv)
    expect(lic.verificar(exp, pub, undefined, new Date('2026-10-13')).motivo).toMatch(/expirada/)
    expect(lic.verificar(lic.assinar({ ...dados, validade: '2027-01-01' }, priv), pub, undefined, new Date('2026-10-13')).ok).toBe(true)
    const presa = lic.assinar({ ...dados, maquina: 'AAAA-BBBB-CCCC-DDDD' }, priv)
    expect(lic.verificar(presa, pub, 'AAAA-BBBB-CCCC-DDDD').ok).toBe(true)
    expect(lic.verificar(presa, pub, 'ZZZZ-ZZZZ-ZZZZ-ZZZZ').ok).toBe(false)
  })
  it('id da máquina é estável', () => { expect(lic.idMaquina()).toBe(lic.idMaquina()); expect(lic.idMaquina()).toMatch(/^[0-9A-F]{4}(-[0-9A-F]{4}){3}$/) })
  it('sem chave pública embutida o app roda em modo dev', () => {
    const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'lic-'))
    const e = lic.estado(pasta)
    expect(['dev', 'teste']).toContain(e.estado)
  })
})
