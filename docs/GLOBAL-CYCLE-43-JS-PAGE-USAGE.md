# Ciclo Global 43 — Mapa de JS por página

Este ciclo é somente diagnóstico. Ele não altera visual, HTML ou CSS.

## Sumário

- HTMLs auditados: 21
- Referências de script em HTML: 393
- Scripts únicos carregados por HTML: 93
- Páginas com achados: 12
- Páginas com imports duplicados exatos: 1
- Páginas com scripts ausentes: 3

## Páginas mais pesadas

- `index.html`: 45 scripts
- `pedidos.html`: 47 scripts
- `perfil.html`: 38 scripts
- `resultados.html`: 37 scripts

## Scripts mais carregados

- `assets/js/core/app.js` — 15 páginas
- `assets/js/ui/mobile-drawer-standard.js` — 15 páginas
- `assets/js/ui/responsive-interaction-guard.js` — 14 páginas
- `assets/js/controllers/controller-bootstrap.js` — 10 páginas
- `assets/js/controllers/controller-data.js` — 10 páginas
- `assets/js/controllers/page-controller-registry.js` — 10 páginas
- `assets/js/core/app-state.js` — 10 páginas
- `assets/js/core/dom.js` — 10 páginas
- `assets/js/core/events.js` — 10 páginas
- `assets/js/core/feature-flags.js` — 10 páginas
- `assets/js/core/page-bootstrap.js` — 10 páginas
- `assets/js/core/permissions.js` — 10 páginas
- `assets/js/core/rollout-guard.js` — 10 páginas
- `assets/js/core/runtime-config.js` — 10 páginas
- `assets/js/core/session.js` — 10 páginas
- `assets/js/core/view-state.js` — 10 páginas
- `assets/js/services/auth-service.js` — 10 páginas
- `assets/js/services/community-service.js` — 10 páginas
- `assets/js/services/domain-data-service.js` — 10 páginas
- `assets/js/services/message-service.js` — 10 páginas

## Fila de limpeza sugerida

### `pedidos.html`

- Status: operational
- Scripts: 47
- Prioridade: alta
- Ações:
- remover imports duplicados exatos
- avaliar scripts de página cruzados
- mapear scripts não usados antes de remover

### `index.html`

- Status: stable-reference
- Scripts: 45
- Prioridade: média
- Ações:
- avaliar scripts de página cruzados
- mapear scripts não usados antes de remover

### `perfil.html`

- Status: critical-stable-baseline
- Scripts: 38
- Prioridade: média
- Ações:
- avaliar scripts de página cruzados
- mapear scripts não usados antes de remover

### `resultados.html`

- Status: marketplace-evolving
- Scripts: 37
- Prioridade: média
- Ações:
- avaliar scripts de página cruzados
- mapear scripts não usados antes de remover

### `configuracoes.html`

- Status: evolving-operational
- Scripts: 33
- Prioridade: baixa
- Ações:
- avaliar scripts de página cruzados

### `mensagens.html`

- Status: critical-communication
- Scripts: 33
- Prioridade: baixa
- Ações:
- avaliar scripts de página cruzados

### `comunidade.html`

- Status: community
- Scripts: 32
- Prioridade: baixa
- Ações:
- avaliar scripts de página cruzados

### `notificacoes.html`

- Status: operational
- Scripts: 32
- Prioridade: baixa
- Ações:
- avaliar scripts de página cruzados

### `comunidade-interna.html`

- Status: critical-community-room
- Scripts: 31
- Prioridade: baixa
- Ações:
- avaliar scripts de página cruzados

### `auth/cadastro.html`

- Status: unclassified
- Scripts: 5
- Prioridade: alta
- Ações:
- corrigir scripts inexistentes
- avaliar scripts de página cruzados

### `auth/esqueci-senha.html`

- Status: unclassified
- Scripts: 5
- Prioridade: alta
- Ações:
- corrigir scripts inexistentes
- avaliar scripts de página cruzados

### `auth/login.html`

- Status: unclassified
- Scripts: 5
- Prioridade: alta
- Ações:
- corrigir scripts inexistentes
- avaliar scripts de página cruzados

## Critérios para próximos ciclos

1. Não remover scripts sem validar comportamento.
2. Começar por duplicações exatas e scripts ausentes, se houver.
3. Em páginas pesadas, mapear ownership antes de cortar.
4. Manter controllers por página e utilitários em `core/services/components`.
5. Não consolidar visual provisório enquanto limpamos scripts.

