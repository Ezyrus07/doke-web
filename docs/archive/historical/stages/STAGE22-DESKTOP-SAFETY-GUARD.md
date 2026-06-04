# Stage 22 — Desktop Safety Guard

Contém os contratos canônicos `.doke-*` recentes no mobile (`max-width: 760px`) para impedir regressões no desktop.

Arquivos escopados:
- `assets/css/components/ui/doke-ui-system.css`
- `assets/css/components/domain/doke-domain-cards.css`
- `assets/css/components/layout/doke-layout-system.css`
- `assets/css/components/flows/doke-product-flows.css`

Motivo: o desktop já tem contratos próprios de layout, sidebar, grid e cards. Aplicar `.doke-card`, `.doke-grid`, `.doke-page-shell` e `.doke-flow` globalmente quebrou páginas desktop.

Regra: migração desktop precisa ser feita depois, página por página, com screenshots e Playwright.
