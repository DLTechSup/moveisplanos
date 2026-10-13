// Licenciamento offline: a chave é um texto assinado (Ed25519) pelo gerador de licenças.
// O programa só guarda a chave PÚBLICA (electron/chave-publica.pem); a privada fica só com o vendedor.
const crypto = require('crypto')
const fs = require('fs')
const os = require('os')
const path = require('path')

const PREFIXO = 'PMV1'
const DIAS_TESTE = 15
const b64u = b => Buffer.from(b).toString('base64url')

/** Identificador desta máquina (para licenças presas a um computador). */
function idMaquina() {
  const macs = Object.values(os.networkInterfaces()).flat().filter(i => i && !i.internal && i.mac && i.mac !== '00:00:00:00:00:00').map(i => i.mac).sort()
  const base = [os.hostname(), os.platform(), os.cpus()[0]?.model ?? '', macs[0] ?? ''].join('|')
  const h = crypto.createHash('sha256').update(base).digest('hex').slice(0, 16).toUpperCase()
  return h.match(/.{4}/g).join('-')
}

function assinar(dados, chavePrivadaPem) {
  const payload = b64u(JSON.stringify({ v: 1, ...dados }))
  const sig = crypto.sign(null, Buffer.from(payload), chavePrivadaPem)
  return `${PREFIXO}.${payload}.${b64u(sig)}`
}

/** Confere a chave. Devolve { ok, motivo?, dados? }. */
function verificar(chave, chavePublicaPem, idLocal = idMaquina(), agora = new Date()) {
  const partes = String(chave || '').trim().replace(/\s+/g, '').split('.')
  if (partes.length !== 3 || partes[0] !== PREFIXO) return { ok: false, motivo: 'Chave de licença inválida.' }
  let dados
  try {
    const valida = crypto.verify(null, Buffer.from(partes[1]), chavePublicaPem, Buffer.from(partes[2], 'base64url'))
    if (!valida) return { ok: false, motivo: 'Chave de licença inválida (assinatura não confere).' }
    dados = JSON.parse(Buffer.from(partes[1], 'base64url').toString('utf-8'))
  } catch { return { ok: false, motivo: 'Chave de licença inválida.' } }
  if (dados.maquina && dados.maquina !== idLocal) return { ok: false, motivo: 'Esta licença foi emitida para outro computador.', dados }
  if (dados.validade && new Date(dados.validade + 'T23:59:59') < agora) return { ok: false, motivo: `Licença expirada em ${dados.validade.split('-').reverse().join('/')}.`, dados }
  return { ok: true, dados }
}

function chavePublica() {
  try { return fs.readFileSync(path.join(__dirname, 'chave-publica.pem'), 'utf-8') } catch { return null }
}

/** Estado de licenciamento: dev (sem chave pública embutida), licenciado, teste ou bloqueado. */
function estado(pasta, agora = new Date()) {
  const pub = chavePublica()
  if (!pub) return { estado: 'dev', idMaquina: idMaquina() }
  const id = idMaquina()
  try {
    const chave = fs.readFileSync(path.join(pasta, 'licenca.txt'), 'utf-8')
    const v = verificar(chave, pub, id, agora)
    if (v.ok) return { estado: 'licenciado', dados: v.dados, idMaquina: id }
    var motivo = v.motivo
  } catch { /* sem licença salva */ }
  // período de teste (com proteção simples contra voltar o relógio)
  const arq = path.join(pasta, 'teste.json')
  let t = { inicio: agora.toISOString(), ultimo: agora.toISOString() }
  try { t = JSON.parse(fs.readFileSync(arq, 'utf-8')) } catch { /* primeiro uso */ }
  const voltou = new Date(t.ultimo).getTime() - agora.getTime() > 36e5
  if (!voltou) t.ultimo = agora.toISOString()
  try { fs.mkdirSync(pasta, { recursive: true }); fs.writeFileSync(arq, JSON.stringify(t)) } catch { /* sem permissão */ }
  const dias = Math.ceil(DIAS_TESTE - (agora.getTime() - new Date(t.inicio).getTime()) / 864e5)
  if (voltou || dias <= 0) return { estado: 'bloqueado', motivo: motivo || (voltou ? 'Data do computador inconsistente.' : 'O período de teste terminou.'), idMaquina: id }
  return { estado: 'teste', dias, motivo, idMaquina: id }
}

function ativar(pasta, chave) {
  const pub = chavePublica()
  if (!pub) return { ok: true, dados: null }
  const v = verificar(chave, pub)
  if (v.ok) { fs.mkdirSync(pasta, { recursive: true }); fs.writeFileSync(path.join(pasta, 'licenca.txt'), String(chave).trim()) }
  return v
}

module.exports = { idMaquina, assinar, verificar, estado, ativar, DIAS_TESTE }
