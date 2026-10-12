# Projeta Móveis — versão React (web)

Mesma ferramenta do programa desktop, rodando no navegador (React + TypeScript + Vite). Nada é enviado a servidor:
o cálculo, os desenhos SVG e a exportação de PDF/PNG acontecem no próprio navegador.

```
cd web
npm install
npm run dev        # abre em http://localhost:5173
npm test           # testes (inclui o caso de referência 140 × 80 × 52 do PLANO.md, seção 7.7)
npm run build      # gera a pasta dist/ (hospede em qualquer servidor estático)
```

- **Projeto, folgas travadas e catálogo** ficam salvos no navegador (localStorage); **Salvar/Abrir** usa arquivos `.pmv`,
  compatíveis com a versão desktop.
- **Exportar PDF**: A3 paisagem vetorial (jsPDF + svg2pdf). **Exportar imagem**: um PNG A3 (300 dpi) por página.
  **PDF para o cliente**: só a apresentação (3D, frontal, cores, medidas e valor).
- Atalhos: Ctrl+S salvar · Ctrl+O abrir · Ctrl+E exportar PDF · Ctrl+K catálogo · Ctrl + roda do mouse = zoom.

Estrutura: `src/core` (motor de cálculo, folgas, catálogo, otimizador, orçamento) · `src/draw` (vistas e pranchas em SVG)
· `src/ui` (componentes React) · `src/exportar.ts`.
