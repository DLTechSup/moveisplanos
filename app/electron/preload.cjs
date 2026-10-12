const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('projeta', {
  abrirExterno: url => ipcRenderer.invoke('abrir-externo', url),
  onAbrirArquivo: cb => { ipcRenderer.on('abrir-arquivo', (_e, dados) => cb(dados)) },
  desktop: true,
})
