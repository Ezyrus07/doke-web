# Stage 20 — Baseline cumulativo, mapa de rotas, mocks e testes iniciais

Esta stage consolida o trabalho estrutural anterior em uma base mais fácil de evoluir antes de iniciar lógica real.

## Adicionado

- `docs/PAGE-ROUTE-MAP.md`
- `assets/data/mock-users.json`
- `assets/data/mock-services.json`
- `assets/data/mock-orders.json`
- `assets/data/mock-messages.json`
- `assets/data/mock-communities.json`
- `assets/data/mock-notifications.json`
- `assets/data/mock-wallet.json`
- `assets/data/README.md`
- `scripts/audit-page-route-map.js`
- `scripts/audit-mock-data-contracts.js`
- `playwright.config.js`
- `tests/e2e/mobile-shell.spec.js`
- `tests/e2e/search-flow.spec.js`
- `tests/visual/header-search-bottomnav.spec.js`

## Objetivo

Criar uma base operacional para as próximas fases:

1. Validar que as páginas principais continuam presas aos contratos globais.
2. Ter dados falsos consistentes para evoluir telas sem depender ainda de backend.
3. Preparar testes Playwright para impedir regressão visual do App Shell.
4. Criar um baseline cumulativo único para evitar confusão entre stages.

## O que ainda não foi feito

- Não conectei Supabase/Firebase.
- Não implementei busca real.
- Não implementei autenticação real.
- Não alterei regra de negócio.

Isso foi proposital: esta stage é fundação, não lógica de produto.
