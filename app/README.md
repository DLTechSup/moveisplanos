# Projeta Móveis (React + Electron)

Programa para Windows que gera **projetos executivos de marcenaria**: desenho técnico cotado, plano de corte, relação de
materiais e orçamento, a partir das medidas digitadas — com preview ao vivo.

## O que ele faz
- **Mais de 70 modelos** prontos (guarda-roupas de abrir e de correr — solteiro, casal, infantil, closet —, cômodas, criados,
  armários, balcões, aéreos, cozinha, banheiro, estantes, racks, aparadores, mesas, escrivaninhas, camas e beliche) e a
  **Montagem livre**: você define a largura e vai adicionando colunas, portas, gavetas, nichos, prateleiras e cabideiros; o
  desenho e a lista de peças se montam na hora.
- **Folha do projeto** (A3) no estilo de prancha para o cliente: vista frontal, lateral, interna, caixa da gaveta, definições,
  perspectiva 3D, materiais e ferragens (com fotos) e plano de corte. **Folha 2**: relação de materiais e valores.
  O plano de chapas (corte otimizado) é opcional.
- **Materiais, cores e madeiras** com amostras (textura gerada; você pode trocar por uma **foto real** de cada item no Catálogo).
- **Preços**: digite o valor que conseguiu e a loja (fica guardado com a data), importe/exporte tabela CSV, abra pesquisas de
  preço nas lojas e revendas da sua cidade, ou use as **estimativas de referência** por região (não são cotações de lojas).
- Folgas automáticas com **cadeado** (edite qualquer folga), peças maiores que a chapa são emendadas automaticamente.

## Instalar no Windows
Baixe o `Instalador-Projeta-Moveis-*.exe` na página de **Releases** do repositório (gerado automaticamente pelo GitHub
Actions) e execute. Há também a versão **portátil** (`Projeta-Moveis-Portatil-*.exe`), sem instalação.

Se o Windows mostrar "O Windows protegeu seu computador": **Mais informações → Executar assim mesmo**.

## Desenvolvimento
```
cd app
npm install
npm run dev          # versão web em http://localhost:5173
npm run app          # abre a janela do Electron com a versão compilada
npm test             # testes (caso de referência do PLANO.md + todos os modelos e desenhos)
npm run dist:win     # gera o instalador em app/release (no Windows)
```
- `src/core`: motor de cálculo (modular, mesa, cama), folgas, catálogo, otimizador, orçamento e preços.
- `src/draw`: vistas e folhas em SVG (mesmo desenho na tela, no PDF e no PNG).
- `src/ui`: interface React. `electron/`: janela do aplicativo.

## Editor de montagem (aba "Montagem livre")

- Layout em árvore: qualquer vão (aberto, gavetas, portas, prateleiras…) pode ser encaixado em qualquer lugar de uma coluna, sem criar nova coluna.
- Arraste itens da paleta até a borda de um vão (centro/esquerda/direita/acima/abaixo) para encaixar; arraste as divisórias para redimensionar; use "mover" para reposicionar.
- Campos de Largura/Altura/Profundidade do vão selecionado (fixa/auto) e do móvel (medidas externas/internas) — o preview acompanha sem alterar o que já foi digitado.
- Desfazer/refazer: Ctrl+Z / Ctrl+Y.
- "Salvar esta vista…" e "Exportar partes…" exportam cada parte (vista explodida, frontal, plano de corte, materiais…) em PDF/PNG/SVG; o projeto sai com todas as medidas alteradas.

## 3D realista e licença
- Aba **3D realista**: luz, sombras, reflexos, madeira texturizada; portas de abrir giram na dobradiça, portas de correr deslizam, gavetas saem. Clique numa peça para abrir só ela; gire com o mouse; "Salvar imagem (PNG)".
- Licença: ver `ferramentas/gerador-licencas/LEIA-ME.md`.
