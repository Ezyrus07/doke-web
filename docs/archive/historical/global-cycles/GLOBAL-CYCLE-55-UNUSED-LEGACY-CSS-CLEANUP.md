# Ciclo Global 55 — limpeza de CSS legado desconectado

## Objetivo

Remover apenas CSS legado que já está desconectado de HTMLs e manifests principais, sem tocar em visual, shell, sidebar, header, wrappers globais ou páginas provisórias.

## Arquivos-alvo

```txt
assets/css/components/ui/doke-legacy-bridge.css
assets/css/components/surface-contract-final.css
assets/css/pages/comunidade/internal-modal-legacy.css
assets/css/pages/comunidade-interna/internal-modal-legacy.css
```

## Decisão técnica

Esses arquivos foram classificados como candidatos de baixo risco porque não possuem referência ativa em HTMLs/manifests do ZIP auditado. Para preservar segurança operacional em pacote incremental, a remoção é feita por script controlado:

```bash
npm run cleanup:unused-legacy-css
npm run audit:unused-legacy-css-cleanup
```

## O que não foi feito

- Nenhum CSS sensível de `index`, `resultados`, `perfil`, `mensagens`, `pedidos` ou `comunidade-interna` foi removido.
- Nenhum `!important` foi adicionado.
- Nenhum `style=""` foi adicionado.
- Nenhum arquivo `fix`, `hotfix`, `stage`, `final`, `novo` ou `ajuste` foi criado.
- Nenhuma alteração visual intencional foi feita.

## Critérios de aceite

- Os arquivos-alvo são removidos pelo script.
- Não existem referências remanescentes aos arquivos-alvo fora de documentação/scripts do próprio ciclo.
- Auditoria `audit:unused-legacy-css-cleanup` passa.
- A limpeza permanece reversível via controle de versão.
