const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('projeta', {
  abrirExterno: url => ipcRenderer.invoke('abrir-externo', url),
  onAbrirArquivo: cb => { ipcRenderer.on('abrir-arquivo', (_e, dados) => cb(dados)) },
  licencaEstado: () => ipcRenderer.invoke('licenca-estado'),
  licencaAtivar: chave => ipcRenderer.invoke('licenca-ativar', chave),
  desktop: true,
})
