# Stage 54 — Orders Foundation Manifest Consolidation

## Objetivo

Consolidar os CSS diretos de `pedidos.html` e `notificacoes.html` por meio de manifestos, preservando a ordem efetiva da cascata e sem remover arquivos físicos.

## Arquivos alterados

- `pedidos.html`
- `notificacoes.html`
- `assets/css/pages/orders-foundation.css`
- `assets/css/pages/pedidos-foundation.css`
- `assets/css/pages/notificacoes-foundation.css`
- `docs/validation/orders-foundation-manifest-report.json`
- `docs/validation/orders-foundation-manifest.md`

## Consolidação aplicada

- `orders-foundation.css` concentra a base compartilhada: `core/index.css` + `pages/internal-foundation.css`.
- `pedidos-foundation.css` preserva a sequência anterior de `pedidos.html` atrás de um único link HTML.
- `notificacoes-foundation.css` preserva a sequência anterior de `notificacoes.html` atrás de um único link HTML.

## Resultado mensurável

- `pedidos.html`: 9 CSS locais diretos → 1 CSS local direto.
- `notificacoes.html`: 3 CSS locais diretos → 1 CSS local direto.
- Links CSS quebrados em HTML ativo: 0.
- Imports CSS quebrados: 0.
- CSS com chaves desbalanceadas: 0.
- `!important` na cascata ativa: 0.
- Arquivos em `assets/css` ainda contendo `!important` dormente: 51.

## Escopo da validação

Foram verificados HTMLs ativos de app, excluindo `archive`, `tools/local-backups`, `docs`, `reports`, `test-results`, `node_modules`, `backend`, `supabase` e `src`. Esses diretórios não representam páginas ativas carregadas pelo app estático.

## Risco

Risco baixo a moderado. A ordem dos CSS foi preservada, mas `pedidos.html` ainda possui arquivos específicos legados, como contratos mobile/order-specific, agora concentrados em manifesto. Eles não foram removidos porque ainda exigem auditoria própria de responsabilidade e uso dinâmico.

## Decisão importante

Nenhum arquivo físico foi deletado. Arquivos potencialmente legados foram apenas preservados no manifesto para manter comportamento atual, sem reativar autoridade antiga fora da ordem já carregada.

## Próximo alvo recomendado

Consolidar uma fundação específica para `perfil.html` e/ou `mensagens.html`, apenas se a auditoria de imports mostrar benefício real. Caso contrário, avançar para a auditoria conservadora de CSS órfão/dormente.
