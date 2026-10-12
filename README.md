# Projeta Móveis

Programa para Windows que gera **projetos executivos de marcenaria** (desenho técnico cotado, plano de corte,
plano de chapas, lista de materiais e orçamento) a partir das medidas digitadas, com preview ao vivo.
A especificação completa está em [`PLANO.md`](PLANO.md).

## Como usar (Windows 10/11)

1. Dê dois cliques em **`iniciar.bat`**. Na primeira vez ele instala o Python (via winget), cria o ambiente e
   instala o PySide6. Depois é só abrir.
2. Escolha o **tipo de móvel**, digite as medidas, escolha **materiais, cores, puxadores e corrediças**.
3. O desenho e as peças atualizam na hora. Qualquer folga pode ser **travada com o cadeado** e editada.
4. **Exportar PDF** (A3 paisagem, várias páginas), **Exportar imagem** (um PNG por página) ou
   **PDF para o cliente** (somente a apresentação: 3D, frontal, cores, medidas e valor).
5. **Salvar** grava o projeto em `.pmv` para editar depois. **Catálogo** edita chapas, cores/madeiras,
   puxadores, corrediças, fitas, dobradiças e preços.

Atalhos: Ctrl+N novo · Ctrl+O abrir · Ctrl+S salvar · Ctrl+E exportar PDF · Ctrl+K catálogo ·
Ctrl + roda do mouse = zoom no preview (duplo clique volta ao tamanho original).

Para gerar um **`.exe`** único: rode `iniciar.bat` uma vez e depois **`gerar_exe.bat`** (resultado em `dist\`).

O catálogo fica em `%APPDATA%\ProjetaMoveis\catalogo.json` (criado na primeira execução com os valores padrão;
os **preços vêm em branco** para você preencher).

## Desenvolvimento

```
pip install -r requirements.txt
python -m app.main          # abre o programa
python -m pytest testes     # testes (inclui o caso de referência da seção 7.7 do plano)
```

- `app/motores/` calcula peças, vãos e folgas; `app/desenho/` só desenha os números do `Resultado`.
- Os desenhos usam `QPainter` e o mesmo código serve para a tela, o PDF e o PNG.
