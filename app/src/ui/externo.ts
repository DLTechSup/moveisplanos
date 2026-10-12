/** Abre um link no navegador do sistema (no aplicativo instalado) ou numa nova aba (na versão web). */
export function abrirExterno(url: string): void {
  const w = window as any
  if (w.projeta?.abrirExterno) w.projeta.abrirExterno(url)
  else window.open(url, '_blank', 'noopener')
}
