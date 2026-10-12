// Processo principal do Electron: abre a janela do Projeta Móveis (interface React empacotada em dist/).
const { app, BrowserWindow, ipcMain, shell } = require('electron')
const fs = require('fs')
const path = require('path')

let janela = null
let arquivoPendente = null

const arquivoPmv = argv => argv.find(a => /\.pmv$/i.test(a) && fs.existsSync(a))

function enviarArquivo(caminho) {
  try {
    const texto = fs.readFileSync(caminho, 'utf-8')
    const dados = { nome: path.basename(caminho), texto }
    if (janela && !janela.webContents.isLoading()) janela.webContents.send('abrir-arquivo', dados)
    else arquivoPendente = dados
  } catch (e) { /* arquivo ilegível: ignora */ }
}

function criarJanela() {
  janela = new BrowserWindow({
    width: 1560, height: 940, minWidth: 1000, minHeight: 650,
    title: 'Projeta Móveis', backgroundColor: '#f3f4f8',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  })
  janela.setMenuBarVisibility(false)
  janela.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:\/\//.test(url)) shell.openExternal(url); return { action: 'deny' } })
  janela.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file:')) { e.preventDefault(); if (/^https?:\/\//.test(url)) shell.openExternal(url) } })
  janela.webContents.on('did-finish-load', () => { if (arquivoPendente) { janela.webContents.send('abrir-arquivo', arquivoPendente); arquivoPendente = null } })
  janela.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  janela.on('closed', () => { janela = null })
}

ipcMain.handle('abrir-externo', (_e, url) => { if (typeof url === 'string' && /^https?:\/\//.test(url)) return shell.openExternal(url) })

const unica = app.requestSingleInstanceLock()
if (!unica) app.quit()
else {
  app.on('second-instance', (_e, argv) => {
    if (janela) { if (janela.isMinimized()) janela.restore(); janela.focus() }
    const f = arquivoPmv(argv); if (f) enviarArquivo(f)
  })
  app.whenReady().then(() => {
    const f = arquivoPmv(process.argv); if (f) arquivoPendente = null, enviarArquivo(f)
    criarJanela()
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) criarJanela() })
  })
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
}
