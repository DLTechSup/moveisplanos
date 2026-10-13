#!/usr/bin/env node
// Gerador de licenças do Projeta Móveis (uso do VENDEDOR — não distribua esta pasta nem a chave privada).
//
//   node gerador.cjs chaves                      cria o par de chaves (uma única vez!)
//   node gerador.cjs emitir --cliente "Maria" [--email x@y] [--tipo vitalicia|anual|mensal|teste]
//                           [--dias 365] [--maquina XXXX-XXXX-XXXX-XXXX]
//   node gerador.cjs verificar "<chave>"         confere uma chave
//   node gerador.cjs                             abre a janela do gerador no navegador
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const lic = require('../../app/electron/licenca.cjs')

const PRIV = path.join(__dirname, 'chave-privada.pem')
const PUB = path.join(__dirname, '..', '..', 'app', 'electron', 'chave-publica.pem')
const REGISTRO = path.join(__dirname, 'licencas-emitidas.csv')

function criarChaves() {
  if (fs.existsSync(PRIV)) throw new Error('Já existe uma chave privada em ' + PRIV + '. Apagar invalida TODAS as licenças já vendidas — faça backup antes de qualquer mudança.')
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519')
  fs.writeFileSync(PRIV, privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600 })
  fs.writeFileSync(PUB, publicKey.export({ type: 'spki', format: 'pem' }))
  return 'Chaves criadas.\n  PRIVADA (guarde com segurança, faça backup, nunca envie): ' + PRIV + '\n  PÚBLICA (vai dentro do programa): ' + PUB + '\nAgora gere o instalador de novo para embutir a chave pública.'
}

const hoje = () => new Date().toISOString().slice(0, 10)
const somar = (dias) => { const d = new Date(); d.setDate(d.getDate() + dias); return d.toISOString().slice(0, 10) }

function emitir({ cliente, email = '', tipo = 'vitalicia', dias, maquina = '' }) {
  if (!cliente) throw new Error('Informe o nome do cliente.')
  if (!fs.existsSync(PRIV)) throw new Error('Chave privada não encontrada. Rode primeiro: node gerador.cjs chaves')
  const padrao = { vitalicia: 0, anual: 365, mensal: 30, teste: 30 }
  const d = Number(dias ?? padrao[tipo] ?? 0)
  const dados = { cliente, email, tipo, emissao: hoje(), validade: d > 0 ? somar(d) : null, maquina: maquina.trim().toUpperCase() || null }
  const chave = lic.assinar(dados, fs.readFileSync(PRIV, 'utf-8'))
  const novo = !fs.existsSync(REGISTRO)
  fs.appendFileSync(REGISTRO, (novo ? 'emissao;cliente;email;tipo;validade;maquina\n' : '') + [dados.emissao, cliente, email, tipo, dados.validade ?? 'sem validade', dados.maquina ?? 'qualquer'].map(c => String(c).replace(/;/g, ',')).join(';') + '\n')
  return { chave, dados }
}

function conferir(chave) {
  if (!fs.existsSync(PUB)) throw new Error('Chave pública não encontrada.')
  return lic.verificar(chave, fs.readFileSync(PUB, 'utf-8'), undefined)
}

function args(a) { const o = {}; for (let i = 0; i < a.length; i++) if (a[i].startsWith('--')) o[a[i].slice(2)] = a[++i]; return o }

function janela() {
  const http = require('http')
  const pagina = fs.readFileSync(path.join(__dirname, 'gerador.html'), 'utf-8')
  const srv = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/emitir') {
      let corpo = ''; req.on('data', c => { corpo += c }); req.on('end', () => {
        try { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(emitir(JSON.parse(corpo)))) }
        catch (e) { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ erro: e.message })) }
      }); return
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(pagina)
  })
  srv.listen(0, '127.0.0.1', () => {
    const url = `http://127.0.0.1:${srv.address().port}/`
    console.log('Gerador de licenças aberto em ' + url + '  (feche esta janela para sair)')
    const { exec } = require('child_process')
    exec(process.platform === 'win32' ? `start "" "${url}"` : process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`)
  })
}

if (require.main === module) {
  const [cmd, ...resto] = process.argv.slice(2)
  try {
    if (cmd === 'chaves') console.log(criarChaves())
    else if (cmd === 'emitir') { const r = emitir(args(resto)); console.log('\nLicença para ' + r.dados.cliente + ' (' + r.dados.tipo + ', validade: ' + (r.dados.validade ?? 'sem validade') + ')\n\n' + r.chave + '\n') }
    else if (cmd === 'verificar') console.log(JSON.stringify(conferir(resto[0]), null, 2))
    else if (!cmd) janela()
    else console.log('Comandos: chaves | emitir | verificar | (sem comando abre a janela)')
  } catch (e) { console.error('Erro: ' + e.message); process.exit(1) }
}
module.exports = { emitir, conferir, criarChaves }
