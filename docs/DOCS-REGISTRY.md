# Registro de Documentação do Doke

Este arquivo é um índice operacional. Ele organiza a leitura da documentação com contratos ativos, apoio operacional, evidências e históricos migrados. A fonte primária para regras atuais é [`docs/ACTIVE-CONTRACTS-INDEX.md`](ACTIVE-CONTRACTS-INDEX.md); use este registro como apoio para navegação, classificação e rastreabilidade.

## Totais

- Markdown em `docs/`: **258**
- Contratos ativos espelhados do índice primário: **29**
- Apoio operacional em revisão: **8**
- Candidatos históricos migrados: **15**
- Evidências de validação classificadas: **11**
- Ciclos globais recentes: **43**
- Relatórios de auditoria/limpeza: **68**
- Histórico/legado a revisar: **59**
- Segunda triagem histórica classificada: **59**
- Outros documentos: **38**

## Como usar este registro

- Para regras atuais, começar por [`ACTIVE-CONTRACTS-INDEX.md`](ACTIVE-CONTRACTS-INDEX.md) e seguir apenas os contratos ativos apontados ali.
- Para navegação ampla, usar este registro como índice operacional dos documentos existentes.
- Para entender decisões antigas, consultar histórico/legado.
- Para limpar documentação, criar um ciclo próprio antes de mover ou remover arquivos.
- Documentos em `docs/validation/` são evidências de auditoria, não contratos permanentes.


## Governança do registry — Ciclo Global 64

`docs/ACTIVE-CONTRACTS-INDEX.md` é a fonte primária de contratos ativos. Este registry permanece como índice operacional e pode listar documentos de apoio, candidatos a revisão ou evidências históricas em seções que ainda usam nomes amplos como “Contratos ativos / base técnica”.

A consistência entre o índice primário e este registry é verificada por:

```bash
npm run audit:docs-registry-governance
```

A auditoria gera `docs/validation/global-cycle-64-docs-registry-governance-report.json` e classifica divergências sem mover documentos automaticamente. Documentos listados aqui, mas ausentes de `ACTIVE-CONTRACTS-INDEX.md`, devem ser tratados como candidatos de revisão, não como contrato ativo definitivo.


## Reestruturação do registry — Ciclo Global 66

O Ciclo Global 66 consolidou a reconciliação anterior em grupos explícitos, sem mover arquivos e sem promover documentos automaticamente. O objetivo é impedir que evidências, stages antigos ou documentos de apoio sejam confundidos com contratos ativos.

Validação:

```bash
npm run audit:docs-registry-structure
```

A auditoria gera `docs/validation/global-cycle-66-docs-registry-structure-report.json` e verifica se a seção abaixo está separada em quatro grupos:

- contratos ativos espelhados do índice primário;
- apoio operacional;
- candidatos históricos;
- evidências de validação.

A classificação detalhada do Ciclo Global 65 continua registrada em `docs/validation/global-cycle-65-docs-registry-reconciliation-report.json`.


## Migração histórica executada — Ciclo Global 68

O Ciclo Global 68 executou a primeira migração física dos documentos classificados como candidatos históricos para `docs/archive/historical/`, seguindo o plano auditável em [`docs/DOCS-HISTORICAL-MIGRATION-PLAN.md`](DOCS-HISTORICAL-MIGRATION-PLAN.md).

Validação:

```bash
npm run audit:docs-historical-migration-executed
```

A auditoria gera `docs/validation/global-cycle-68-docs-historical-migration-executed-report.json` e garante que:

- todos os candidatos históricos migrados existem no destino atual;
- nenhuma origem anterior permanece duplicada fora de `docs/archive/historical/`;
- nenhum candidato histórico migrado aparece em `docs/ACTIVE-CONTRACTS-INDEX.md`;
- todos os destinos atuais ficam dentro de `docs/archive/historical/`;
- não há duplicidade de origem ou destino no registro de migração.


## Segunda triagem documental — Ciclo Global 69

O Ciclo Global 69 classificou os documentos restantes da seção “Histórico/legado a revisar” sem mover arquivos. O objetivo é preparar a próxima migração física com menor risco, mantendo `docs/ACTIVE-CONTRACTS-INDEX.md` como fonte primária.

Documento de triagem:

- [`docs/DOCS-SECOND-HISTORICAL-TRIAGE.md`](DOCS-SECOND-HISTORICAL-TRIAGE.md)

Validação:

```bash
npm run audit:docs-second-historical-triage
```

A auditoria gera `docs/validation/global-cycle-69-docs-second-historical-triage-report.json` e garante que os 59 itens ainda em histórico/legado foram classificados como candidato histórico, apoio operacional, revisão manual ou evidência de validação. Nenhum arquivo é movido neste ciclo.

## Contratos ativos / base técnica

> Fonte primária: [`docs/ACTIVE-CONTRACTS-INDEX.md`](ACTIVE-CONTRACTS-INDEX.md). A subseção “Contratos ativos espelhados do índice primário” deve ser o único espelho de contratos ativos neste registry. As demais subseções são apoio, histórico ou evidência.

### Contratos ativos espelhados do índice primário

Esses documentos estão ativos porque aparecem em `docs/ACTIVE-CONTRACTS-INDEX.md`.

- `docs/ACTIVE-FILES.md`
- `docs/API-CONTRACTS.md`
- `docs/COMMUNICATION-DATA-READINESS-MAP.md`
- `docs/CSS-RESPONSIVE-SYSTEM.md`
- `docs/DATA-BACKEND-CONTRACTS.md`
- `docs/DATA-MODEL-DRAFT.md`
- `docs/DATA-READY-CONTRACTS.md`
- `docs/DELIVERY-CHECKLIST.md`
- `docs/DEPRECATED-CSS.md`
- `docs/DESIGN-SYSTEM-GUIDE.md`
- `docs/DOCS-ACTIVE-REVIEW-DECISION-MAP.md`
- `docs/FILES-ORGANIZATION.md`
- `docs/FRONTEND-CHANGE-CHECKLIST.md`
- `docs/FRONTEND-GOVERNANCE.md`
- `docs/FRONTEND_COMPONENT_CONTRACTS.md`
- `docs/GLOBAL-COMPONENTS-BASE-CONTRACT.md`
- `docs/GLOBAL-LAYOUT-CONTRACT.md`
- `docs/GLOBAL-ORGANIZATION-PLAN.md`
- `docs/GLOBAL-PAGE-ASSET-INVENTORY.md`
- `docs/LIST-STATE-CONTRACTS.md`
- `docs/MOCK-DATA-BOUNDARIES.md`
- `docs/PAGE-DATA-ORCHESTRATION-MAP.md`
- `docs/PAGE-ROUTE-MAP.md`
- `docs/PAGES-MAP.md`
- `docs/PERFIL-DATA-READINESS-MAP.md`
- `docs/PERFORMANCE-SEO-CHECKLIST.md`
- `docs/SECURITY-CHECKLIST.md`
- `docs/SURFACE-CONTRACT.md`
- `docs/UI-COMPONENT-CONTRACTS.md`

### Apoio operacional

Documentos úteis para contexto técnico, mas que não são fonte primária enquanto não forem promovidos no índice ativo.

- `docs/ARCHITECTURE-DECISIONS.md` — Apoio arquitetural. Não é fonte primária enquanto não for promovido no índice ativo.
- `docs/CSS-ARCHITECTURE-AUDIT.md` — Auditoria técnica útil para contexto, mas não contrato ativo.
- `docs/CSS-ARCHITECTURE-REFORM-2026-04-22.md` — Plano/reforma de CSS útil como contexto; não governa mudanças atuais sozinho.
- `docs/css-architecture-status.md` — Status operacional de CSS. Usar como apoio, não como contrato principal.
- `docs/HOME-ISOLATION-ARCHITECTURE.md` — Apoio para isolamento da home. Não promover sem baseline visual da home.
- `docs/MOBILE-ARCHITECTURE-STABILIZATION-2026-05-01.md` — Apoio para estabilidade mobile. Não usar para redesenho sem contrato ativo/baseline.
- `docs/MOBILE-RESULTS-HEADER-SEARCH-CONTRACT-2026-05-01.md` — Apoio específico de resultados mobile. Não contrato global.
- `docs/REPOSITORY-BOUNDARY.md` — Referência potencialmente útil; precisa comparação com data/repository contracts antes de promoção.

### Candidatos históricos migrados

Stages, relatórios ou contratos antigos movidos para `docs/archive/historical/`. Permanecem disponíveis para rastreabilidade, mas não são contratos ativos.

- `docs/archive/historical/CARD-GRID-CONTRACT-STAGE3.md` — Contrato de stage antigo. Revisar antes de qualquer promoção; provável histórico.
- `docs/archive/historical/FORM-ACTION-CONTRACT-STAGE10.md` — Contrato de stage antigo; revisar contra componentes/forms ativos antes de reaproveitar.
- `docs/archive/historical/GLOBAL-CYCLE-12-DATA-READY-CONTRACTS.md` — Relatório de ciclo. Conteúdo supersedido pelo contrato ativo de data-ready.
- `docs/archive/historical/GLOBAL-CYCLE-29-LIST-STATE-CONTRACTS.md` — Relatório de ciclo. Conteúdo deve ser comparado com `LIST-STATE-CONTRACTS.md`.
- `docs/archive/historical/GLOBAL-CYCLE-30-REPOSITORY-BOUNDARY.md` — Relatório de ciclo. Conteúdo deve ser comparado com contrato/referência de repository boundary.
- `docs/archive/historical/OVERLAY-CONTRACT-STAGE9.md` — Contrato de stage antigo; revisar contra contratos ativos de modal/dropdown/overlay.
- `docs/archive/historical/reports/frontend-stage2-tokens-and-contracts.md` — Relatório de stage; provável evidência histórica.
- `docs/archive/historical/reports/frontend-stage3-search-filter-contract.md` — Relatório de stage; revisar contra contratos atuais de busca/filtro.
- `docs/archive/historical/reports/frontend-stage6-chat-contract-important-reduction.md` — Relatório de redução técnica; não contrato ativo.
- `docs/archive/historical/STAGE17-DOMAIN-CARD-CONTRACTS.md` — Stage antigo; revisar contra contratos ativos de cards/componentes.
- `docs/archive/historical/STAGE18-LAYOUT-LISTS-STATES.md` — Stage antigo; revisar contra `GLOBAL-LAYOUT-CONTRACT.md` e `LIST-STATE-CONTRACTS.md`.
- `docs/archive/historical/STAGE19-PRODUCT-FLOW-CONTRACTS.md` — Stage antigo; revisar antes de qualquer promoção.
- `docs/archive/historical/STAGE21-BACKEND-DATA-CONTRACTS.md` — Stage antigo; comparar com `DATA-BACKEND-CONTRACTS.md`.
- `docs/archive/historical/STAGE26-MOBILE-DESKTOP-BOUNDARY-GUARD.md` — Stage antigo; revisar contra contratos responsivos ativos.
- `docs/archive/historical/STAGE27-DESKTOP-SHELL-CONTRACTS.md` — Stage antigo; revisar contra contrato ativo de layout/shell.

### Evidências de validação

Relatórios de auditoria usados como evidência de execução. Não são contratos permanentes.

- `docs/validation/architecture-audit-report.md` — Evidência de auditoria. Não é contrato.
- `docs/validation/auth-session-contract-audit-report.md` — Evidência de auditoria. Não é contrato.
- `docs/validation/desktop-shell-contract-audit-report.md` — Evidência de auditoria. Não é contrato.
- `docs/validation/domain-card-contract-audit-report.md` — Evidência de auditoria. Não é contrato.
- `docs/validation/frontend-contract-audit-report.md` — Evidência de auditoria. Não é contrato.
- `docs/validation/global-cycle-3-components-base-report.md` — Evidência de auditoria. Não é contrato.
- `docs/validation/js-foundation-contract-audit-report.md` — Evidência de auditoria. Não é contrato.
- `docs/validation/layout-contract-audit-report.md` — Evidência de auditoria. Não é contrato.
- `docs/validation/product-flow-contract-audit-report.md` — Evidência de auditoria. Não é contrato.
- `docs/validation/stage34-responsive-boundary-report.md` — Evidência de auditoria. Não é contrato.
- `docs/validation/surface-contract-report.md` — Evidência de auditoria. Não é contrato.

## Ciclos globais recentes

- `docs/GLOBAL-CYCLE-10-SERVICE-CARD-OWNERSHIP.md`
- `docs/GLOBAL-CYCLE-11-ACTION-FAVORITE-OWNERSHIP.md`
- `docs/GLOBAL-CYCLE-13-SEARCH-INPUT-SECTION-OWNERSHIP.md`
- `docs/GLOBAL-CYCLE-14-CHIP-BADGE-RATING-AVATAR-OWNERSHIP.md`
- `docs/GLOBAL-CYCLE-15-MODAL-DROPDOWN-TABS-OWNERSHIP.md`
- `docs/GLOBAL-CYCLE-16-SHELL-CONTAINER-TOPBAR-PARITY.md`
- `docs/GLOBAL-CYCLE-17-SAFE-DUPLICATE-IMPORTS.md`
- `docs/GLOBAL-CYCLE-18-IMPORTANT-REDUCTION.md`
- `docs/GLOBAL-CYCLE-19-IMPORTANT-REDUCTION.md`
- `docs/GLOBAL-CYCLE-20-SERVICE-CARD-IMPORTANT-MAP.md`
- `docs/GLOBAL-CYCLE-21-SERVICE-CARD-AVATAR-OWNERSHIP.md`
- `docs/GLOBAL-CYCLE-22-SERVICE-CARD-OVERFLOW-OWNERSHIP.md`
- `docs/GLOBAL-CYCLE-23-SERVICE-CARD-RHYTHM-OWNERSHIP.md`
- `docs/GLOBAL-CYCLE-24-SERVICE-CARD-IMPORTANT-RISK.md`
- `docs/GLOBAL-CYCLE-25-SERVICE-CARD-BASELINE.md`
- `docs/GLOBAL-CYCLE-26-SERVICE-CARD-DATA-HOOKS.md`
- `docs/GLOBAL-CYCLE-27-MEDIA-REVIEW-DATA-HOOKS.md`
- `docs/GLOBAL-CYCLE-28-MOCK-DATA-BOUNDARIES.md`
- `docs/GLOBAL-CYCLE-31-PAGE-DATA-ORCHESTRATION.md`
- `docs/GLOBAL-CYCLE-32-DETAIL-AD-DATA-CONTROLLER.md`
- `docs/GLOBAL-CYCLE-33-RESULTADOS-DATA-CONTROLLER.md`
- `docs/GLOBAL-CYCLE-34-INDEX-DATA-CONTROLLER.md`
- `docs/GLOBAL-CYCLE-35-PERFIL-DATA-READINESS.md`
- `docs/GLOBAL-CYCLE-36-PERFIL-DATA-HOOKS.md`
- `docs/GLOBAL-CYCLE-37-PEDIDOS-DATA-CONTROLLER.md`
- `docs/GLOBAL-CYCLE-39-COMMUNICATION-DATA-READINESS.md`
- `docs/GLOBAL-CYCLE-40-COMUNIDADE-DATA-CONTROLLER.md`
- `docs/GLOBAL-CYCLE-41-COMUNIDADE-INTERNA-DATA-HOOKS.md`
- `docs/GLOBAL-CYCLE-42-SCRIPT-ORDER.md`
- `docs/GLOBAL-CYCLE-43-JS-PAGE-USAGE.md`
- `docs/GLOBAL-CYCLE-44-JS-DUPLICATES-SAFETY.md`
- `docs/GLOBAL-CYCLE-45-SHELL-BASELINE-SAFETY.md`
- `docs/GLOBAL-CYCLE-46-LEGACY-CSS-MAP.md`
- `docs/GLOBAL-CYCLE-47-LEGACY-CSS-CLASSIFICATION.md`
- `docs/GLOBAL-CYCLE-48-LOW-RISK-CSS-CLEANUP.md`
- `docs/GLOBAL-CYCLE-49-COMMUNITY-PATTERN-MIGRATION.md`
- `docs/GLOBAL-CYCLE-50-COMMUNITY-LEGACY-REMOVAL.md`
- `docs/GLOBAL-CYCLE-51-LEGACY-BASELINE.md`
- `docs/GLOBAL-CYCLE-7-HOME-MEDIA-CARDS.md`
- `docs/GLOBAL-CYCLE-8-HOME-CSS-OVERRIDES.md`
- `docs/GLOBAL-CYCLE-9-MEDIA-CARD-OWNERSHIP.md`
- `docs/validation/global-cycle-7-home-media-cards-report.md`
- `docs/validation/global-cycle-9-media-card-ownership-report.md`

## Relatórios de auditoria/limpeza

- `docs/COMMUNICATION-DATA-READINESS-MAP.md`
- `docs/CSS-CLEANUP-PROMPT-08.md`
- `docs/CSS-CLEANUP-STAGE1.md`
- `docs/CSS-LEGACY-INVENTORY-STAGE12.md`
- `docs/CSS-SURFACE-AUDIT-2026-04-26.md`
- `docs/GLOBAL-CLEANUP-QUEUE.md`
- `docs/GLOBAL-PAGE-ASSET-INVENTORY.md`
- `docs/HOME-CSS-OVERRIDE-MAP.md`
- `docs/HOME-MOBILE-CLEANUP.md`
- `docs/INDEX-CLEANUP-CYCLE-1.md`
- `docs/INDEX-CLEANUP-MAP.md`
- `docs/LEGACY-CSS-CLEANUP-PLAN.md`
- `docs/MOBILE-LOCK-V2-REPORT.md`
- `docs/MOBILE-LOCK-V3-REPORT.md`
- `docs/MOBILE-LOCK-V4-REPORT.md`
- `docs/MOBILE-LOCK-V6-REPORT.md`
- `docs/PAGE-DATA-ORCHESTRATION-MAP.md`
- `docs/PAGE-ROUTE-MAP.md`
- `docs/PAGES-MAP.md`
- `docs/PERFIL-DATA-READINESS-MAP.md`
- `docs/REFORM-ROADMAP.md`
- `docs/ROADMAP-OPERACIONAL.md`
- `docs/SITE-ORGANIZATION-ACTIONABLE-AUDIT.md`
- `docs/SITE-ORGANIZATION-AUDIT.md`
- `docs/STAGE-CLEANUP-MAP.md`
- `docs/STAGE11-LEGACY-CHROME-CLEANUP.md`
- `docs/STAGE20-BASELINE-MOCKS-TESTS.md`
- `docs/STAGE28-VISUAL-QA-BASELINE.md`
- `docs/STAGE33-RESPONSIVE-VISUAL-INVENTORY.md`
- `docs/css-cleanup-report-v10.md`
- `docs/css-cleanup-report-v11.md`
- `docs/css-cleanup-report-v12.md`
- `docs/css-cleanup-report-v13.md`
- `docs/css-cleanup-report-v14.md`
- `docs/css-cleanup-report-v15.md`
- `docs/css-cleanup-report-v16.md`
- `docs/css-cleanup-report-v17.md`
- `docs/css-cleanup-report-v18.md`
- `docs/css-cleanup-report-v19.md`
- `docs/css-cleanup-report-v20.md`
- `docs/css-cleanup-report-v21.md`
- `docs/css-cleanup-report-v22.md`
- `docs/css-cleanup-report-v23.md`
- `docs/css-cleanup-report-v24.md`
- `docs/css-cleanup-report-v25.md`
- `docs/css-cleanup-report-v26.md`
- `docs/css-cleanup-report-v27-reconstructed.md`
- `docs/css-cleanup-report-v7.md`
- `docs/css-cleanup-report-v8.md`
- `docs/css-cleanup-report-v9.md`
- `docs/css-cleanup-report.md`
- `docs/css-maintenance-map.md`
- `docs/reports/frontend-stage1-cleanup-and-overflow.md`
- `docs/reports/frontend-stage4-responsive-page-audit.md`
- `docs/validation/css-stage12-inventory.md`
- `docs/validation/domain-services-audit-report.md`
- `docs/validation/legacy-bridge-scope-audit-report.md`
- `docs/validation/mobile-app-shell-static-report.md`
- `docs/validation/runtime-flags-audit-report.md`
- `docs/validation/stage19-audit-summary.md`
- `docs/validation/stage20-audit-summary.md`
- `docs/validation/stage21-backend-data-audit-report.md`
- `docs/validation/stage28-visual-qa-baseline-report.md`
- `docs/validation/stage30-controller-mock-wiring-report.md`
- `docs/validation/stage33-responsive-inventory-report.md`
- `docs/validation/stage35-desktop-base-stability-report.md`
- `docs/validation/stage36-mobile-base-stability-report.md`
- `docs/validation/ui-canonical-classes-audit-report.md`

## Histórico/legado a revisar

- `docs/AVATAR-STANDARDIZATION-FIX.md`
- `docs/BORDER-SYSTEM-TECHNICAL-REFERENCE.md`
- `docs/BOTTOM-NAV-REBUILD-AVATAR-FIX.md`
- `docs/BOTTOM-NAV-REMOVAL-AVATAR-HARDENING-FIX.md`
- `docs/COMMUNITY-MESSAGES-AVATAR-FIX.md`
- `docs/COMMUNITY-MOBILE-STAGE7.md`
- `docs/GLOBAL-HEADER-FILTER-SELECT-FIX.md`
- `docs/HEADER-CLEAN-AVATAR-CIRCLE-FIX.md`
- `docs/HOME-RESULTS-STAGE4.md`
- `docs/INDEX-MOBILE-DRAWER-STAGE18.md`
- `docs/INDEX-MOBILE-DRAWER-STAGE19.md`
- `docs/INDEX-MOBILE-STAGE15.md`
- `docs/INDEX-MOBILE-STAGE16.md`
- `docs/INDEX-MOBILE-STAGE17.md`
- `docs/INDEX-MOBILE-STAGE20.md`
- `docs/INTERNAL-PAGES-STAGE6.md`
- `docs/MOBILE-CHROME-CANONICAL-V8-2026-05-01.md`
- `docs/MOBILE-CHROME-CANONICAL-V9-2026-05-01.md`
- `docs/MOBILE-HEADER-SEARCH-CANONICAL-V7-2026-05-01.md`
- `docs/MOBILE-INPUT-ALIGNMENT-FOCUS-FIX-2026-05-01.md`
- `docs/MOBILE-RECOVERY-V10.md`
- `docs/PROFILE-MESSAGES-STABILITY-FIX.md`
- `docs/PROFILE-MOBILE-STAGE5.md`
- `docs/REMAINING-PAGES-STAGE8.md`
- `docs/RESPONSIVE-FINE-TUNING-STAGE14.md`
- `docs/RESPONSIVE-FOUNDATION-STAGE1.md`
- `docs/RESPONSIVE-INTERACTION-STAGE11.md`
- `docs/RESPONSIVE-QA-STAGE13.md`
- `docs/STAGE12-COMPONENT-SYSTEM-BRIDGE.md`
- `docs/STAGE13-CANONICAL-COMPONENT-MIGRATION.md`
- `docs/STAGE14-REDUCE-BRIDGE-BUTTONS-CARDS.md`
- `docs/STAGE15-REDUCE-BRIDGE-FORMS-OVERLAYS.md`
- `docs/STAGE16-REMOVE-LEGACY-BRIDGE.md`
- `docs/STAGE22-DESKTOP-SAFETY-GUARD.md`
- `docs/STAGE23-AUTH-SESSION-PERMISSIONS.md`
- `docs/STAGE25-JS-FOUNDATION-RENDERERS.md`
- `docs/STAGE29-CI-QUALITY-GATES.md`
- `docs/STAGE30-MOCK-CONTROLLER-WIRING.md`
- `docs/STAGE31-DOMAIN-SERVICE-LAYER.md`
- `docs/STAGE32-RUNTIME-FLAGS-ROLLBACK.md`
- `docs/STAGE34-RESPONSIVE-BOUNDARIES.md`
- `docs/STAGE35-DESKTOP-BASE-STABILITY.md`
- `docs/STAGE36-MOBILE-BASE-STABILITY.md`
- `docs/TOPBAR-STANDARD-STAGE2.md`
- `docs/mobile-header-v28.md`
- `docs/profile-mobile-v2-v29.md`
- `docs/reports/frontend-stage5-css-debt-controlled.md`
- `docs/reports/frontend-stage7-messages-regression-fix.md`
- `docs/reports/relatorio-header-agenda-nav-v11.md`
- `docs/reports/relatorio-header-nav-v10.md`
- `docs/reports/relatorio-header-scroll-v4.md`
- `docs/reports/relatorio-header-scroll-v5.md`
- `docs/reports/relatorio-largura-header-v2.md`
- `docs/reports/relatorio-largura-header-v3.md`
- `docs/reports/relatorio-sidebar-collapsed-v12.md`
- `docs/v30-assets-patch.md`
- `docs/v32-assets-only-imports.md`
- `docs/validation/responsive-stage13-checklist.md`
- `docs/validation/responsive-stage13-result.md`

## Outros documentos

- `docs/ACTIVE-FILES.md`
- `docs/BORDER-STANDARDIZATION-COMPLETE.md`
- `docs/BORDER-STANDARDIZATION-EXECUTIVE-SUMMARY.md`
- `docs/BORDER-TESTING-GUIDE.md`
- `docs/BOTTOM-NAV-ACTION-BUTTONS-PROMPT-04.md`
- `docs/CARD-SYSTEM-PROMPT-06.md`
- `docs/CSS-RESPONSIVE-SYSTEM.md`
- `docs/DATA-MODEL-DRAFT.md`
- `docs/DELIVERY-CHECKLIST.md`
- `docs/DEPRECATED-CSS.md`
- `docs/DESIGN-SYSTEM-GUIDE.md`
- `docs/FILES-ORGANIZATION.md`
- `docs/FRONTEND-CHANGE-CHECKLIST.md`
- `docs/FRONTEND-REFACTOR-PLAN.md`
- `docs/GLOBAL-ORGANIZATION-PLAN.md`
- `docs/HOME-CSS-OWNERSHIP.md`
- `docs/HOME-JS-OWNERSHIP.md`
- `docs/MOBILE-APP-SHELL-REFORM-2026-05-01.md`
- `docs/MOBILE-HEADER-OVERFLOW-STABILITY-2026-05-01.md`
- `docs/MOBILE-PANELS-PROMPT-05.md`
- `docs/MOBILE-STANDARDIZATION-2026-04-26.md`
- `docs/MOBILE-SYSTEM.md`
- `docs/MOCK-DATA-BOUNDARIES.md`
- `docs/OBSERVABILITY.md`
- `docs/PERFORMANCE-SEO-CHECKLIST.md`
- `docs/PRODUCT-MODULES.md`
- `docs/PROFILE-SYSTEM.md`
- `docs/PROJECT-STRUCTURE.md`
- `docs/QUALITY-GATES.md`
- `docs/RESPONSIVE-CONSOLIDATED-DELIVERY.md`
- `docs/RESPONSIVE-QA-PROMPT-07.md`
- `docs/SECURITY-CHECKLIST.md`
- `docs/STABILIZATION-PASS-2026-04-12.md`
- `docs/TESTING-STRATEGY.md`
- `docs/TOKENS-PROMPT-09.md`
- `docs/UI-KIT-GUIDE.md`
- `docs/UI-SURFACE-SYSTEM-2026-04-26.md`
- `docs/reports/relatorio-largura-header.md`

## Próxima limpeza recomendada

1. Separar documentos ativos de relatórios históricos.
2. Mover documentos claramente antigos para `docs/archive/` em ciclo próprio.
3. Manter `docs/validation/` apenas para saídas geradas por auditorias.
4. Evitar novos arquivos com `stage`, `final`, `hotfix` ou `fix` no nome.
