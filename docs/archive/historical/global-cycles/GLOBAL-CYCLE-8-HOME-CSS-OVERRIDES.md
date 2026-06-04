# Ciclo Global 8 — Home CSS Overrides

## Objetivo

Mapear o peso real do manifesto `assets/css/pages/home.css` e reduzir duplicidade segura no `index.html`, sem redesenhar a home e sem apagar regras visuais sensíveis.

## Alterações executadas

- Removidos do `index.html` imports diretos que já são ownership do manifesto `home.css`:
  - `assets/css/components/layout/doke-layout-system.css`
  - `assets/css/components/ui/doke-ui-system.css`
  - `assets/css/components/domain/doke-domain-cards.css`
- Criada auditoria `scripts/audit-home-css-overrides.js`.
- Adicionado comando `npm run audit:home-css-overrides`.
- Gerados relatórios:
  - `docs/HOME-CSS-OVERRIDE-MAP.md`
  - `docs/validation/home-css-overrides-audit.json`

## O que não foi feito

- Não foram removidos blocos de `home.css`.
- Não houve alteração de shell, sidebar, header, body ou wrappers globais.
- Não foi criado arquivo visual de `fix`, `hotfix`, `stage` ou `final`.
- Não foi adicionado `!important`.

## Próximo ciclo recomendado

Consolidar ownership de `service-card`, `worker-card` e `publication-card`, separando o que é componente do que é rail/grid específico da home.
