# Gerador de licenças — Projeta Móveis (uso do vendedor)

Precisa do [Node.js](https://nodejs.org) instalado no **seu** computador. Não distribua esta pasta.

## 1. Criar suas chaves (uma única vez)
```
node gerador.cjs chaves
```
- `chave-privada.pem` (nesta pasta): é o que assina as licenças. **Faça backup e nunca envie a ninguém.** Se perder, não dá para emitir novas licenças compatíveis com o programa já vendido.
- `app/electron/chave-publica.pem`: vai dentro do programa. Faça *commit* desse arquivo e gere o instalador novamente (GitHub Actions). Enquanto ele não existir, o programa roda **sem exigir licença** (modo desenvolvimento).

## 2. Emitir licenças
Dê dois cliques em `gerador-de-licencas.bat` (abre uma janela no navegador) ou use a linha de comando:
```
node gerador.cjs emitir --cliente "Maria Silva" --email maria@x.com --tipo anual
node gerador.cjs emitir --cliente "João" --tipo vitalicia --maquina 1A2B-3C4D-5E6F-7A8B
```
Tipos: `vitalicia`, `anual`, `mensal`, `teste` (ou `--dias N`). `--maquina` prende a licença a um computador (o cliente vê o ID na tela de ativação). Tudo fica registrado em `licencas-emitidas.csv`.

## Como funciona no programa
Sem licença o Projeta Móveis funciona por 15 dias de teste e depois exige a chave (botão **Ativar**). A conferência é offline (assinatura Ed25519). É uma proteção contra cópia casual — não substitui um sistema com servidor, que seria necessário para revogar licenças ou limitar o uso por conta.
