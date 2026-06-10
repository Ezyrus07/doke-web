# CSS Cleanup Stage 20–22

## Objetivo

Reduzir três autoridades globais/tardias que ainda estavam competindo com layout, components, patterns e pages.

## Stage 20 — page rail

- `assets/css/components/shell/shared-page-width-contract.css` virou shim de compatibilidade.
- A autoridade real de largura/rail fica em `assets/css/layout/page-rail.css`.
- `assets/css/core/layout/index.css` agora importa `layout/page-rail.css` diretamente.

## Stage 21 — marketplace parity contract

- `assets/css/components/layout/marketplace-index-layout-contract.css` foi aposentado como camada visual ativa.
- Ele mantém apenas tokens legados.
- Removidas regras amplas que forçavam resultados/perfil/detalhe/comunidade a herdar anatomia visual do index por prioridade.

## Stage 22 — modal alignment

- `assets/css/components/ui-surface/modal-alignment.css` foi simplificado para guarda estrutural pequena.
- Removidos overrides finais de modal com prioridade.

## Métricas após o stage

- CSS total em `assets/css`: 371 arquivos.
- `!important` total em `assets/css`: 18046.
- CSS com chaves desbalanceadas: 0.

## Risco

Alto risco visual em resultados/perfil/detalhe/comunidade e modais. Risco aceito porque a meta atual é reduzir competição e deixar a base previsível antes do refinamento visual.
