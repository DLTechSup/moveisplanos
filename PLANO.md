# Projeta Móveis – Plano do Software

Programa para Windows que gera **projetos executivos de marcenaria** (desenho técnico cotado, plano de corte, materiais e orçamento) a partir das medidas digitadas, com preview ao vivo.

> **Para o Claude Code:** este arquivo é a especificação do projeto. Implemente fase por fase (seção 14), uma de cada vez. Ao terminar cada fase, rode os testes, mostre um print do resultado e pare para eu revisar. Toda a comunicação, textos da interface e comentários em **português do Brasil**.

---

## 1. Objetivo

1. O usuário escolhe um tipo de móvel (cômoda, gaveteiro, criado-mudo, balcão, armário…).
2. Digita as medidas externas e escolhe divisões, materiais, cores, puxadores e corrediças.
3. O programa **calcula todas as peças, vãos e folgas automaticamente** e desenha as vistas em tempo real.
4. O usuário pode **sobrescrever qualquer folga ou medida calculada**.
5. No final, exporta a prancha técnica (PDF/PNG) para o cliente e para o marceneiro, e salva o projeto para editar depois.

**Regra de ouro:** o desenho é gerado a partir dos números calculados, nunca o contrário. Nenhuma medida é digitada direto no desenho. Assim cota e peça sempre batem.

---

## 2. Tecnologia

| Item | Escolha |
|---|---|
| Linguagem | Python 3.11+ |
| Interface | PySide6 (Qt) |
| Desenho | `QPainter` (mesmo código desenha na tela, no PDF e no PNG) |
| PDF | `QPdfWriter` (A3 paisagem) |
| Dados | JSON (catálogo e projetos) |
| Testes | pytest |
| Distribuição | `iniciar.bat` (instala o que faltar e abre) + `gerar_exe.bat` (PyInstaller → `.exe`) |

O `iniciar.bat` deve funcionar num Windows 10/11 limpo: verifica Python, instala se faltar (winget), cria venv e instala `requirements.txt`.

---

## 3. Estrutura de pastas

```
projeta-moveis/
├── iniciar.bat
├── gerar_exe.bat
├── requirements.txt
├── PLANO.md
├── app/
│   ├── main.py              # ponto de entrada
│   ├── modelos.py           # dataclasses: Projeto, Peca, Folgas, Resultado
│   ├── catalogo.py          # catálogo padrão + carregar/salvar
│   ├── folgas.py            # cálculo automático das folgas
│   ├── motores/
│   │   ├── base.py          # estrutura comum (laterais, tampo, base, fundo, rodapé)
│   │   ├── gavetas.py       # cômoda, gaveteiro, criado-mudo, balcão de gavetas
│   │   └── portas.py        # armário, balcão de portas
│   ├── tipos.py             # presets de cada tipo de móvel
│   ├── otimizador.py        # encaixe das peças nas chapas
│   ├── materiais.py         # lista de materiais, ferragens e orçamento
│   ├── desenho/
│   │   ├── vista.py         # classe Vista (escala, cotas, retângulos, veio)
│   │   ├── frontal.py
│   │   ├── lateral.py
│   │   ├── interna.py       # com e sem gavetas
│   │   ├── caixa.py         # caixa da gaveta frontal e lateral
│   │   ├── perspectiva.py   # 3D
│   │   ├── explodida.py
│   │   └── prancha.py       # monta as páginas A3
│   ├── exportar.py          # PDF e PNG
│   └── interface/
│       ├── janela.py        # janela principal
│       ├── formulario.py    # painel de medidas (esquerda)
│       ├── preview.py       # abas de preview (direita)
│       ├── folgas_painel.py # folgas automáticas com cadeado
│       └── catalogo_dialogo.py
└── testes/
    ├── test_comoda.py
    ├── test_folgas.py
    └── test_otimizador.py
```

---

## 4. Unidades e convenções

- **Internamente tudo em milímetros (float).** Na interface, medidas externas em **cm** e folgas em **mm**.
- Exibição em cm com até 2 casas, vírgula decimal, sem zeros inúteis: `140`, `78,5`, `67,75`.
- Eixos: X = largura (0 na esquerda), Y = altura (0 no chão), Z = profundidade (0 na traseira).
- Cada `Peca` tem: `nome`, `qtd`, `comp` (no sentido do veio), `larg`, `esp`, `material`, `padrao` (cor), `fita` (quais bordas), `veio` (bool), `obs`.

---

## 5. Catálogo (editável pelo usuário)

Salvo em `%APPDATA%\ProjetaMoveis\catalogo.json`. Na primeira execução, cria com os valores padrão abaixo. Tela de edição com abas, tabela, adicionar/remover linha, seletor de cor.

**Chapas (material + espessuras + tamanho + preço)**

| Material | Espessuras (mm) | Chapa (mm) |
|---|---|---|
| MDF | 3, 6, 9, 12, 15, 18, 25 | 2750 × 1850 |
| MDP | 15, 18, 25 | 2750 × 1850 |
| HDF | 3, 6 | 2750 × 1830 |
| Compensado | 6, 10, 15, 18 | 2200 × 1600 |
| Madeira maciça | 20, 25, 30 | por m² |

Preço por chapa em branco (usuário preenche).

**Padrões / cores:** nome, tipo (amadeirado ou unicolor), cor hex para o desenho, tem veio (sim/não). Começar com uns 15: Carvalho claro, Carvalho escuro, Freijó, Nogueira, Cumaru, Teca, Louro, Cinamomo, Branco, Preto, Cinza grafite, Areia, Off-white, Verde sálvia, Azul petróleo.

**Puxadores:** nome, tipo (`barra`, `cava_usinada`, `perfil_cava`, `botao`, `concha`, `toque`), comprimento, entre-furos, cor, preço. Ex.: Barra 96, 128, 160, 192, 320 mm; Cava usinada; Perfil cava alumínio; Botão; Concha 96; Sem puxador (toque).

**Corrediças:** nome, tipo (`telescopica`, `oculta`, `roldana`), comprimentos disponíveis (250 a 550 de 50 em 50), **folga lateral por lado (mm)**, altura mínima da caixa, amortecimento (sim/não), preço do par.

| Tipo | Folga por lado | Observação |
|---|---|---|
| Telescópica | 12,7 mm | padrão |
| Roldana | 12,5 mm | mais barata |
| Oculta | 21 mm (total 42) | caixa apoia por baixo |

**Fitas de borda:** nome, largura (22, 35, 45 mm), espessura (0,45 / 1 / 2 mm), preço por metro.

**Dobradiças:** nome, tipo (reta, curva, supercurva), amortecimento, preço.

---

## 6. Folgas automáticas (editáveis)

Arquivo `folgas.py`. Cada folga é calculada automaticamente a partir do móvel, mas pode ser **travada** pelo usuário com outro valor.

| Folga | Regra automática | Faixa permitida |
|---|---|---|
| Entre frentes | 3 mm | 1–6 |
| Frente embutida (contorno) | 2 mm | 1–5 |
| Lateral da corrediça | do catálogo (12,7 por lado na telescópica) | 0–30 |
| Topo da caixa no vão | 25 mm (vãos ≥ 150 mm) ou 15 mm (menores) | 10–60 |
| Fundo da caixa no vão | 15 mm | 5–40 |
| Traseira da corrediça | 10 mm além do comprimento | 5–50 |
| Rasgo do fundo (profundidade) | 8 mm | 5–12 |
| Rasgo do fundo (distância da traseira) | 10 mm | 5–30 |
| Encaixe do fundo no rasgo (sobra) | 1 mm a menos de cada lado | 0–3 |
| Prateleira solta (largura) | 2 mm a menos | 0–5 |
| Prateleira (recuo frontal) | 20 mm | 0–80 |
| Recuo do rodapé | 30 mm | 0–100 |
| Serra (kerf) no otimizador | 4 mm | 2–6 |
| Refilo da chapa | 10 mm por borda | 0–20 |

**Interface:** painel "Folgas" com uma linha por folga mostrando valor, ícone de **cadeado**, e um botão "Restaurar automático". Cadeado aberto → valor recalcula sozinho quando as medidas mudam. Cadeado fechado → valor do usuário fica fixo. Valores fora da faixa ficam em vermelho, com aviso.

---

## 7. Motor de cálculo

Entrada: `Projeto` (todos os parâmetros) + `Folgas`. Saída: `Resultado` com:
- `pecas` (lista para o plano de corte),
- `geometria` (posições de cada elemento, usadas pelos desenhos),
- `ferragens` (corrediças, puxadores, dobradiças, pés…),
- `avisos` (problemas encontrados).

### 7.1 Parâmetros do projeto

- **Medidas:** largura L, altura H, profundidade P (cm).
- **Divisão:** colunas, gavetas por coluna, distribuição (`iguais` ou `crescente`, com as maiores embaixo), alturas personalizadas por gaveta (opcional), nicho aberto superior (cm, 0 = sem). Para armário: número de portas e prateleiras por vão.
- **Estrutura:** material, espessura e (padrão 15 mm), cor; tampo (`sobreposto` ou `entre_laterais`); base (`rodape`, `pes`, `rodizios`, `nenhuma`) e altura; fundo (`rasgo` ou `pregado`), espessura do fundo.
- **Frentes:** `sobrepostas` ou `embutidas`, cor, puxador e posição.
- **Gavetas:** modelo de corrediça, comprimento (`auto` ou escolhido), espessura e cor da caixa, espessura do fundo da caixa.
- **Fita:** modelo, aplicar em bordas visíveis.
- **Projeto:** nome, cliente, telefone, data, observações.
- **Orçamento:** mão de obra (R$) e margem (%).

### 7.2 Estrutura (comum a todos os tipos)

Sendo `e` a espessura da estrutura, `f` a do fundo, `y0` a altura dos pés (0 se rodapé ou nenhuma) e `rod` a altura do rodapé:

- **Topo das laterais:** H − e (tampo sobreposto) ou H (tampo entre laterais).
- **Laterais (2):** altura = topo − y0; profundidade `Dlat` =
  - P − e (frentes sobrepostas), ou P (embutidas),
  - menos f se o fundo for pregado atrás.
- **Tampo:** sobreposto = L × P; entre laterais = (L − 2e) × Dlat.
- **Base:** (L − 2e) × Dlat, com a face inferior em y0 + rod.
- **Rodapé:** (L − 2e) × rod, recuado.
- **Altura interna** Hi = (topo das laterais ou H − e) − (y0 + rod + e).
- **Largura útil** = L − 2e − (colunas − 1)·e; **vão** = largura útil ÷ colunas.
- **Fundo em rasgo:** (L − 2e + 2·(rasgo − sobra)) × (Hi + 2·(rasgo − sobra)).
- **Fundo pregado:** (L − 2) × (altura das laterais − 2).
- **Divisórias (colunas − 1):** Hi × (Dlat − dist_rasgo − f) com rasgo, ou Hi × Dlat se pregado.
- **Profundidade útil** `Dint` = Dlat − (dist_rasgo + f se rasgo) − (e se frentes embutidas).

### 7.3 Motor de gavetas

- **Nicho superior (se houver):** prateleira fixa (L − 2e) × (Dlat − recuo do fundo). As gavetas ocupam Hi − nicho − e.
- **Distribuição:** pesos `iguais` = 1,1,1… ou `crescente` = 1; 1,15; 1,3… de cima para baixo. Os mesmos pesos dividem o vão interno e a zona das frentes.
- **Frentes sobrepostas:** cobrem de y0 + rod até o topo das laterais (ou até o topo da prateleira do nicho).
  - Largura = (L − (colunas − 1)·folga) ÷ colunas.
  - Alturas = (zona − (n − 1)·folga) × peso ÷ soma dos pesos.
- **Frentes embutidas:** dentro de cada vão, com a folga de contorno.
- **Caixa da gaveta:**
  - Largura = vão − 2 × folga da corrediça, **arredondada para baixo ao milímetro inteiro**.
  - Comprimento da corrediça = maior comprimento do catálogo ≤ Dint − folga traseira. Profundidade da caixa = esse comprimento.
  - Altura = min(vão da gaveta − folga topo − folga fundo; frente − 30 mm).
  - Peças: 2 laterais (prof × alt), frente e traseira internas ((larg − 2·ec) × alt), fundo em rasgo ((larg − 2·ec + 2·(rasgo − sobra)) × (prof − 2·ec + 2·(rasgo − sobra))).

### 7.4 Motor de portas

- Vãos = ⌈portas ÷ 2⌉; divisórias = vãos − 1.
- Portas sobrepostas: largura = (L − (portas − 1)·folga) ÷ portas; altura = zona das frentes.
- Prateleiras por vão, distribuídas igualmente: (vão − folga) × (Dint − recuo frontal).
- Dobradiças por porta: 2 até 90 cm, 3 até 160 cm, 4 acima.

### 7.5 Fita de borda por peça

| Peça | Bordas com fita |
|---|---|
| Tampo | frente + 2 laterais |
| Laterais | frente |
| Divisória, base, prateleira | frente |
| Rodapé | frente (comprimento) |
| Frentes e portas | 4 lados |
| Laterais e frente/traseira da caixa | topo |
| Fundos | nenhuma |

Metros de fita = soma das bordas × 1,10 (10% de sobra).

### 7.6 Avisos obrigatórios

- Vão da gaveta < 200 mm de largura.
- Caixa com altura < 60 mm.
- Profundidade insuficiente para a menor corrediça do catálogo.
- Frente com altura < 80 mm.
- Peça maior que a chapa.
- Qualquer folga fora da faixa permitida.

### 7.7 Caso de teste de referência (tem que bater exatamente)

Cômoda 140 × 80 × 52 cm, 2 colunas × 3 gavetas iguais, MDF 15, tampo sobreposto, rodapé de 5 cm recuado 3 cm, fundo HDF 6 em rasgo (8 mm, a 10 mm da traseira), frentes sobrepostas com folga de 3 mm, corrediça telescópica de 45 cm, caixa de 15 mm, altura da caixa 200 mm:

| Peça | Qtd | Medida (cm) |
|---|---|---|
| Tampo | 1 | 140 × 52 |
| Laterais | 2 | 78,5 × 50,5 |
| Divisória | 1 | 72 × 48,9 |
| Base | 1 | 137 × 50,5 |
| Rodapé | 1 | 137 × 5 |
| Frentes | 6 | 69,85 × 24,3 |
| Laterais da gaveta | 12 | 45 × 20 |
| Frente/traseira interna | 12 | 62,2 × 20 |
| Fundo da gaveta (MDF 6) | 6 | 63,6 × 43,4 |
| Fundo do móvel (HDF 6) | 1 | 138,4 × 73,4 |

Conferências: rodapé 5 + base 1,5 + vão 72 + tampo 1,5 = **80**; 3 × 1,5 + 2 × 67,75 = **140**; caixa 65,2 + 2 × 1,27 = 67,74 ≤ 67,75.

Este caso vira um teste automático em `testes/test_comoda.py`.

---

## 8. Desenhos

Todos usam a classe `Vista` (escala automática para caber na área, cotas, retângulos com veio). O mesmo código desenha no preview, no PDF e no PNG.

| Vista | O que mostra | Cotas |
|---|---|---|
| Frontal | tampo, laterais, frentes, puxadores, rodapé ou pés, nicho | largura total, altura total, altura de cada frente, largura das frentes, rodapé |
| Lateral | lateral, tampo, perfil das frentes, fundo (tracejado), pés | profundidade total, altura, profundidade da lateral |
| Interna sem gavetas | estrutura sem frentes, divisórias, base, corrediças em cada vão, prateleiras | vãos livres, altura interna, altura de cada vão |
| Interna com gavetas | igual à anterior, mais as caixas posicionadas nos vãos | largura e altura das caixas |
| Caixa da gaveta | vista frontal e lateral da caixa, fundo em rasgo, corrediça | largura externa e interna, altura, profundidade, comprimento da corrediça |
| Perspectiva 3D | móvel fechado em projeção oblíqua, com sombra nas faces | — |
| Vista explodida | peças afastadas e numeradas | número da peça |
| Porta (armário) | porta com posição das dobradiças | largura, altura, posição das dobradiças |

**Estilo:**
- Cor da peça = cor do padrão escolhido. Amadeirado com linhas suaves de veio no sentido certo.
- Cotas em azul-marinho, com traço de extremidade.
- Puxadores desenhados conforme o tipo: barra, cava, perfil, botão, concha.

---

## 9. Prancha (exportação)

A3 paisagem, PDF com várias páginas e PNG (uma imagem por página).

- **Página 1 – Desenho técnico:** cabeçalho (nome do projeto, cliente, data, L × A × P), vista frontal grande, lateral, 3D, interna sem gavetas, interna com gavetas e caixa da gaveta. No rodapé da página, faixa com material, cores, puxador, corrediça e fita.
- **Página 2 – Plano de corte e materiais:** tabela (peça, qtd, medidas, chapa, cor, fita, veio, observação), lista de ferragens e materiais, definições de montagem, avisos.
- **Página 3+ – Plano de chapas:** desenho de cada chapa com as peças encaixadas e numeradas, mostrando o aproveitamento (%).
- **Página do cliente (opcional):** só 3D e frontal, cores, medidas externas e orçamento, sem detalhes técnicos.

---

## 10. Otimizador de chapas

- Agrupa as peças por material + espessura + cor.
- Algoritmo guilhotina em faixas (*shelf first-fit decreasing*), considerando kerf e refilo.
- Peça com veio não gira; peça sem veio pode girar 90°.
- Saída: número de chapas, posição de cada peça e aproveitamento (%).

## 11. Materiais e orçamento

- Chapas por grupo (otimizador) × preço.
- Fita em metros × preço.
- Corrediças: pares × preço.
- Puxadores ou usinagem de cava.
- Dobradiças.
- Pés ou rodízios: 4 (6 se L > 120 cm).
- Parafusos (estimativa), cavilhas, cola.
- **Total de materiais + mão de obra + margem = preço para o cliente.**

---

## 12. Interface

- **Esquerda – formulário** (rolável, por seções): Projeto, Tipo, Medidas, Divisão, Estrutura, Frentes, Gavetas/Portas, Fita, Folgas, Orçamento. Ao trocar o tipo, carrega o preset.
- **Direita – preview em abas:** Prancha (pág. 1), Corte e materiais (pág. 2), Chapas, Frontal, Lateral, Interna, Interna com gavetas, Gaveta, 3D, Explodida. Atualiza a cada mudança (atraso de 150 ms). Zoom com Ctrl + roda do mouse.
- **Barra de avisos** embaixo, em vermelho ou amarelo.
- **Barra superior:** Novo, Abrir, Salvar, Salvar como, Exportar PDF, Exportar imagem, Catálogo.
- Combos de cor mostram a amostra da cor.
- Projeto salvo como `.pmv` (JSON).
- Atalhos: Ctrl+S, Ctrl+O, Ctrl+E (exportar PDF).

## 13. Tipos de móvel (presets)

| Tipo | L × A × P (cm) | Divisão | Base |
|---|---|---|---|
| Cômoda 2 a 8 gavetas | 140 × 80 × 52 | 2 col × 3 | rodapé 5 |
| Gaveteiro volante | 40 × 60 × 50 | 1 × 3 | rodízios 5 |
| Criado-mudo | 50 × 55 × 40 | 1 × 2 + nicho 15 | pés 10 |
| Balcão de gavetas | 80 × 85 × 55 | 1 × 4 | rodapé 10 |
| Sapateira | 80 × 100 × 35 | portas basculantes (fase futura) | rodapé |
| Armário 2 portas | 80 × 180 × 55 | 2 portas, 4 prateleiras | rodapé 5 |
| Balcão de portas | 80 × 85 × 55 | 2 portas, 1 prateleira | rodapé 10 |

---

## 14. Fases de desenvolvimento

| Fase | Entrega | Pronto quando |
|---|---|---|
| 1 | Estrutura do projeto, `modelos.py`, `folgas.py`, motor de gavetas (cômoda) e testes | o caso de referência (7.7) passa no pytest |
| 2 | Catálogo padrão + carregar/salvar JSON | catálogo é criado na 1ª execução e lido de volta |
| 3 | Classe `Vista` + vistas frontal, lateral, interna sem e com gavetas e caixa | exporta PNG de cada vista da cômoda de referência |
| 4 | Interface: formulário + preview ao vivo + painel de folgas com cadeado | mudar a largura atualiza desenho e peças na hora |
| 5 | Otimizador de chapas + materiais + orçamento | 2 chapas de MDF 15 para a cômoda de referência |
| 6 | Prancha A3 + exportação PDF e PNG + salvar/abrir projeto | PDF de 3 páginas abre corretamente |
| 7 | Perspectiva 3D + vista explodida | 3D aparece na prancha |
| 8 | Motor de portas + todos os presets | armário 2 portas gera prancha completa |
| 9 | Tela de edição do catálogo | adicionar uma cor nova e ela aparecer no combo |
| 10 | `iniciar.bat`, `gerar_exe.bat`, ícone, testes finais | `.exe` abre num Windows limpo |

**Regras para cada fase:**
- Não avançar com teste falhando.
- Todo número exibido no desenho vem do `Resultado`, nunca é recalculado no desenho.
- Funções pequenas, nomes em português, sem dependências além de PySide6 e pytest.

---

## 15. Futuro (fora do escopo inicial)

- Gavetas e portas no mesmo móvel (balcão misto).
- Portas basculantes e de correr.
- Exportar lista de corte em CSV ou Excel para a loja de MDF.
- Exportar DXF para CNC.
- Biblioteca de projetos prontos.
- Logo e dados da empresa na prancha.
