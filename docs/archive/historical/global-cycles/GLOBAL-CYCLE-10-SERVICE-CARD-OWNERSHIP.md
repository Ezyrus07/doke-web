# Ciclo Global 10 — Service card ownership

## Objetivo
Separar o contrato visual do `service-card` do layout que organiza listas/grades de serviços.

## Mudança principal

- `assets/css/components/cards/service-card.css` fica responsável pelo card e seus elementos internos.
- `assets/css/patterns/service-card-grid.css` passa a ser responsável por `.service-cards-grid`, `.service-grid` e `.service-grid--compact`.

## Por que isso importa
O mesmo card de serviço aparece na home, resultados e perfil. O grid/rail de cada página não deve viver dentro do componente, porque isso força todas as páginas a herdarem uma composição que talvez não seja delas.

## Arquivos impactados

- `assets/css/components/cards/service-card.css`
- `assets/css/patterns/service-card-grid.css`
- `assets/css/pages/home.css`
- `assets/css/pages/search-results.css`
- `assets/css/pages/perfil.css`
- `assets/css/pages/results/index.css`
- `assets/css/pages/home-sections.css`
- `assets/css/pages/home/sections.css`
- `scripts/audit-service-card-ownership.js`
- `package.json`

## Critérios de aceite

- Nenhum `!important` novo.
- Nenhum `style=""` novo.
- Nenhum arquivo visual `fix`, `hotfix`, `stage` ou `final` criado.
- `service-card.css` sem ownership de grid.
- `service-card-grid.css` com ownership de grid.
- Auditoria `npm run audit:service-card-ownership` passando.

## Observação
Não houve redesign. A mudança é de arquitetura e ownership para facilitar ajustes futuros em `index`, `resultados`, `perfil` e `detalhe-anuncio`.
