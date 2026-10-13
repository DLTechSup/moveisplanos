# Projeta Móveis — documentação do projeto

Programa para Windows que gera **projetos executivos de marcenaria**: desenho técnico com cotas, lista de peças com folgas calculadas, plano de corte, materiais, orçamento e uma prancha pronta para enviar ao cliente (PDF/PNG/SVG). Feito em **React + TypeScript**, empacotado com **Electron** (instalador `.exe`).

> O `PLANO.md` é o planejamento original (a versão em Python, hoje em `legado-python/`). Este arquivo descreve o que existe **agora**.

---

## 1. O que o programa faz

| Área | Recursos |
|---|---|
| **Modelos** | Dezenas de modelos prontos: guarda-roupas (casal, solteiro, infantil, de abrir, de correr, com espelho), cômodas, armários, estantes, racks, aéreos, mesas, camas e beliche, mais **Montagem livre**. Todos são editáveis. |
| **Cálculo** | Peças com medidas reais (laterais, tampo, divisórias, frentes, caixas de gaveta, fundos), folgas configuráveis com cadeado, fitas de borda, corrediças, dobradiças, puxadores, avisos de projeto. |
| **Editor de montagem** | Layout em árvore: qualquer vão (aberto, gavetas, portas, prateleiras) em qualquer lugar de uma coluna, sem criar coluna nova. Arrastar da paleta até a borda de um vão (centro/esquerda/direita/acima/abaixo), arrastar divisórias, mover, remover, tamanho fixo ou automático. Desfazer/refazer (Ctrl+Z / Ctrl+Y). |
| **Medidas** | Campos de largura, altura e profundidade para o móvel (externas e internas) e para o vão selecionado. |
| **Desenhos** | Folha 1 estilo prancha (vistas, cotas, legenda), folha 2 com materiais e valores, plano de chapas, vistas frontal/lateral/interna/gaveta/porta, perspectiva e vista explodida. Tudo em SVG vetorial, A3. |
| **3D realista** | Visualizador com luz, sombras, reflexos e madeira texturizada (three.js). Portas giram na dobradiça, portas de correr deslizam, gavetas saem; clique abre uma peça. **Modo compatível** (Canvas 2D) quando o computador não tem WebGL. |
| **Exportação** | PDF de 2 folhas para o cliente; "Exportar partes…" e "Salvar esta vista…" salvam cada parte (PDF, PNG ou SVG); `.pmv` salva o projeto. |
| **Materiais e preços** | Catálogo de chapas, padrões/cores, puxadores, corrediças, fitas, dobradiças e insumos, com preço, fonte, data e foto. Estimativas por UF (marcadas como estimativa, não cotação), busca em lojas, importar/exportar CSV. |
| **Licença** | Chave assinada (Ed25519) verificada offline, 15 dias de teste, gerador de licenças para o vendedor. |

---

## 2. Estrutura do repositório

```
moveisplanos/
├─ PLANO.md                 planejamento original
├─ PROJETO.md               este arquivo
├─ README.md                resumo
├─ .github/workflows/build-windows.yml   gera o instalador no GitHub Actions
├─ app/                     programa (React + Electron)
├─ ferramentas/gerador-licencas/         gerador de licenças (uso do vendedor)
└─ legado-python/           primeira versão em Python (não é mais usada)
```

### `app/`

```
app/
├─ electron/
│  ├─ main.cjs         janela, abrir .pmv, links externos, licença (IPC), flags de GPU
│  ├─ preload.cjs      API exposta à interface (window.projeta)
│  ├─ licenca.cjs      assinatura/verificação de licença, período de teste
│  └─ chave-publica.pem  (criada por você; ver seção 7)
├─ src/
│  ├─ core/            regras de negócio (sem interface)
│  ├─ draw/            geração dos desenhos (SVG) e lógica do 3D
│  ├─ ui/              componentes React
│  ├─ App.tsx          tela principal, estado, desfazer/refazer, atalhos
│  ├─ exportar.ts      PDF/PNG/SVG, salvar/abrir .pmv
│  └─ main.tsx         entrada (com proteção contra tela branca)
├─ tests/              testes automatizados (vitest)
└─ build/              ícones do instalador
```

#### `src/core` — o motor
- `tipos.ts` — modelos de dados: `Projeto` (versão 3), `Resultado` (peças, blocos 3D, puxadores, ferragens, avisos, medidas, folgas, cotas), catálogo.
- `layout.ts` — **layout em árvore**: `No = Secao | Divisao{dir, filhos, tam}`. Operações: `resolver`, `encaixar` (docking por zona), `mover`, `remover`, `definirTam`, `repartir`, normalização.
- `modular.ts` — motor dos móveis modulares (guarda-roupas, cômodas, armários, estantes…) a partir da árvore.
- `mesa.ts`, `cama.ts` — motores de mesas e de camas/beliche. `motor.ts` despacha pela família.
- `comum.ts` — peças, blocos, puxadores, caixas de gaveta, corrediças, folgas efetivas, divisão de peças maiores que a chapa (emenda).
- `presets.ts` — modelos prontos (DSL de colunas/seções), categorias, `aplicarPreset`, `projetoDoModelo`.
- `catalogo.ts`, `precos.ts`, `orcamento.ts`, `otimizador.ts` (plano de corte), `folgas.ts`, `calculo.ts` (`calcularProjeto`), `migrar.ts` (versões antigas de `.pmv`), `formato.ts`.

#### `src/draw` — desenhos
- `svg.ts`/`comum.ts` — base de vistas, cotas, painéis. `vistas.ts` — vistas técnicas. `obliqua.ts` — perspectiva e vista explodida.
- `folha.ts` — monta as páginas (prancha do cliente, materiais/valores, plano de chapas) e a seleção de partes a exportar.
- `ilustracoes.ts`, `texturas.ts` — ilustrações de ferragens e texturas procedurais de madeira/laminado.
- `cena3d.ts` — descreve o movimento de cada peça (dobradiça, correr, gaveta) para o 3D, sem depender de WebGL.

#### `src/ui` — interface
`Formulario` (painel esquerdo), `Preview` (abas), `Editor` + `PainelItem` (montagem), `Visualizador3D` (three.js) e `Visualizador2D` (modo compatível), `Galeria` (modelos), `CatalogoDialogo`, `PrecosDialogo`, `Licenca`, `campos`.

---

## 3. Como o cálculo funciona

1. O `Projeto` guarda as medidas, materiais e o `layout` (árvore de colunas/linhas/seções).
2. `calcularProjeto(projeto, catalogo)` chama o motor da família e devolve o `Resultado`.
3. O `Resultado` alimenta tudo: desenhos, 3D, lista de peças, plano de chapas e orçamento. **Qualquer medida alterada reflete em todas as saídas.**
4. Caso de referência (comôda 140×80×52): Tampo 1400×520, Lateral 2×785×505, Divisória 720×489, Frente 698,5×243, caixa de gaveta 652 mm, 2 chapas MDF 15 mm — coberto por teste.

## 4. Desenvolvimento

Requisitos: Node.js 22+.

```bash
cd app
npm install
npm run dev        # interface no navegador (vite)
npm test           # testes (vitest)
npx tsc --noEmit   # checagem de tipos
npm run app        # build + abre no Electron
npm run dist:win   # instalador do Windows (precisa de Windows ou CI)
```

Testes (`app/tests`): cálculo e caso de referência, layout em árvore, desenhos, dados/catálogo/migração, movimento 3D, licença.

## 5. Gerar o instalador

O workflow **Instalador do Windows** roda a cada push em `claude/**`, `main` ou `master` que altere `app/**`, e manualmente (*Run workflow*). Passos: `npm ci` → `npm test` → `npm run dist:win` → publica uma release `instalador-N` com o instalador NSIS (pt-BR) e a versão portátil.

Download: aba **Releases** do repositório.

## 6. Usar o programa

1. **Novo / modelos** → escolha um modelo e ajuste as medidas.
2. Aba **Editor (montar)**: arraste itens da paleta para as bordas dos vãos; arraste divisórias; selecione um vão para editar largura/altura/profundidade (fixa ou automática).
3. Aba **3D realista**: gire, abra portas e gavetas, salve a imagem.
4. **Preços / Catálogo**: informe preços (ou use as estimativas por região, que não são cotação).
5. **PDF para o cliente** (2 folhas) ou **Exportar partes…** para salvar só o que quiser. **Salvar** grava o projeto `.pmv`.

Atalhos: Ctrl+S salvar · Ctrl+O abrir · Ctrl+E exportar · Ctrl+K catálogo · Ctrl+Z / Ctrl+Y desfazer / refazer · Ctrl+roda do mouse: zoom.

## 7. Licença (para vender)

- O programa só contém a **chave pública** (`app/electron/chave-publica.pem`). Enquanto esse arquivo não existir, roda **sem exigir licença**.
- O vendedor cria as chaves uma única vez e emite licenças com o gerador (`ferramentas/gerador-licencas/`, ver o `LEIA-ME.md` da pasta):

```bash
cd ferramentas/gerador-licencas
node gerador.cjs chaves                       # cria chave-privada.pem e a pública
node gerador.cjs emitir --cliente "Maria" --tipo anual
```

- Faça **commit apenas da chave pública** e gere o instalador de novo. A `chave-privada.pem` e o `licencas-emitidas.csv` estão no `.gitignore`: **guarde backup da privada** — sem ela não há como emitir novas licenças.
- No programa: 15 dias de teste, depois exige ativação; tipos vitalícia/anual/mensal/teste, opcionalmente presa ao ID de uma máquina; detecta relógio voltado para trás.
- Limite: é proteção contra cópia casual. Revogar licenças ou limitar por conta exige um servidor.

## 8. Problemas conhecidos / dicas

- **3D sem WebGL:** o programa mostra o modo compatível. Para o 3D realista completo, atualize o driver de vídeo (teste em `https://get.webgl.org`).
- **Preços:** as estimativas por UF são aproximações rotuladas; confirme com a loja.
- **Peças maiores que a chapa** são divididas automaticamente (emenda) e avisadas no rodapé.
- Texturas são geradas por código; cada item do catálogo aceita uma foto real em `imagem`.

## 9. Próximos passos sugeridos

Mover prateleiras direto no preview · fotos reais de materiais · cenário/ambiente e render em alta qualidade · etiquetas de corte · compartilhar o projeto 3D com o cliente por link · atualização automática do programa.
