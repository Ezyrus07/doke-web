# Classificação de documentação ativa x histórica — Doke

Este relatório classifica a documentação existente sem mover ou apagar arquivos. Ele serve como base para uma migração controlada futura para `docs/archive/`, `docs/reports/`, `docs/validation/` e `docs/removals/`.

## Resumo

- Arquivos analisados: **306**
- active-contract: **19**
- active-review: **13**
- archive-candidate: **139**
- needs-review: **41**
- validation: **79**
- report: **15**
- removal-log: **0**
- archived: **0**

## Regra de decisão

- **active-contract**: fonte atual de arquitetura, contratos, governança ou data-readiness.
- **active-review**: parece ativo, mas precisa revisão humana antes de virar fonte oficial.
- **archive-candidate**: documento histórico/ciclo/fix/stage/final/prompt/audit que não deve guiar decisões novas.
- **needs-review**: documento ambíguo. Não mover automaticamente.
- **validation/report/removal-log/archived**: arquivos já classificados por pasta.

## active-contract (19)

- `docs/ACTIVE-FILES.md` — Documento ativo conhecido: contrato, mapa ou governança atual.
- `docs/API-CONTRACTS.md` — Documento ativo conhecido: contrato, mapa ou governança atual.
- `docs/ARCHITECTURE-DECISIONS.md` — Documento ativo conhecido: contrato, mapa ou governança atual.
- `docs/COMMUNICATION-DATA-READINESS-MAP.md` — Documento ativo conhecido: contrato, mapa ou governança atual.
- `docs/DATA-BACKEND-CONTRACTS.md` — Documento ativo conhecido: contrato, mapa ou governança atual.
- `docs/DATA-MODEL-DRAFT.md` — Documento ativo conhecido: contrato, mapa ou governança atual.
- `docs/DATA-READY-CONTRACTS.md` — Documento ativo conhecido: contrato, mapa ou governança atual.
- `docs/DESIGN-SYSTEM-GUIDE.md` — Documento ativo conhecido: contrato, mapa ou governança atual.
- `docs/FILES-ORGANIZATION.md` — Documento ativo conhecido: contrato, mapa ou governança atual.
- `docs/FRONTEND_COMPONENT_CONTRACTS.md` — Documento ativo conhecido: contrato, mapa ou governança atual.
- `docs/FRONTEND-CHANGE-CHECKLIST.md` — Documento ativo conhecido: contrato, mapa ou governança atual.
- `docs/FRONTEND-GOVERNANCE.md` — Documento ativo conhecido: contrato, mapa ou governança atual.
- `docs/GLOBAL-COMPONENTS-BASE-CONTRACT.md` — Documento ativo conhecido: contrato, mapa ou governança atual.
- `docs/GLOBAL-LAYOUT-CONTRACT.md` — Documento ativo conhecido: contrato, mapa ou governança atual.
- `docs/GLOBAL-ORGANIZATION-PLAN.md` — Documento ativo conhecido: contrato, mapa ou governança atual.
- `docs/MOCK-DATA-BOUNDARIES.md` — Documento ativo conhecido: contrato, mapa ou governança atual.
- `docs/PAGE-DATA-ORCHESTRATION-MAP.md` — Documento ativo conhecido: contrato, mapa ou governança atual.
- `docs/PERFIL-DATA-READINESS-MAP.md` — Documento ativo conhecido: contrato, mapa ou governança atual.
- `docs/visual-baseline/README.md` — Documento ativo conhecido: contrato, mapa ou governança atual.

## active-review (13)

- `docs/BORDER-TESTING-GUIDE.md` — Parece contrato/guia ativo, mas precisa revisão humana antes de virar fonte oficial.
- `docs/CSS-ARCHITECTURE-REFORM-2026-04-22.md` — Parece contrato/guia ativo, mas precisa revisão humana antes de virar fonte oficial.
- `docs/css-architecture-status.md` — Parece contrato/guia ativo, mas precisa revisão humana antes de virar fonte oficial.
- `docs/DELIVERY-CHECKLIST.md` — Parece contrato/guia ativo, mas precisa revisão humana antes de virar fonte oficial.
- `docs/FRONTEND-REFACTOR-PLAN.md` — Parece contrato/guia ativo, mas precisa revisão humana antes de virar fonte oficial.
- `docs/HOME-ISOLATION-ARCHITECTURE.md` — Parece contrato/guia ativo, mas precisa revisão humana antes de virar fonte oficial.
- `docs/LIST-STATE-CONTRACTS.md` — Parece contrato/guia ativo, mas precisa revisão humana antes de virar fonte oficial.
- `docs/MOBILE-ARCHITECTURE-STABILIZATION-2026-05-01.md` — Parece contrato/guia ativo, mas precisa revisão humana antes de virar fonte oficial.
- `docs/PERFORMANCE-SEO-CHECKLIST.md` — Parece contrato/guia ativo, mas precisa revisão humana antes de virar fonte oficial.
- `docs/SECURITY-CHECKLIST.md` — Parece contrato/guia ativo, mas precisa revisão humana antes de virar fonte oficial.
- `docs/SURFACE-CONTRACT.md` — Parece contrato/guia ativo, mas precisa revisão humana antes de virar fonte oficial.
- `docs/UI-COMPONENT-CONTRACTS.md` — Parece contrato/guia ativo, mas precisa revisão humana antes de virar fonte oficial.
- `docs/UI-KIT-GUIDE.md` — Parece contrato/guia ativo, mas precisa revisão humana antes de virar fonte oficial.

## archive-candidate (139)

- `docs/AVATAR-STANDARDIZATION-FIX.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/BORDER-STANDARDIZATION-COMPLETE.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/BORDER-STANDARDIZATION-EXECUTIVE-SUMMARY.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/BOTTOM-NAV-ACTION-BUTTONS-PROMPT-04.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/BOTTOM-NAV-REBUILD-AVATAR-FIX.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/BOTTOM-NAV-REMOVAL-AVATAR-HARDENING-FIX.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/CARD-GRID-CONTRACT-STAGE3.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/CARD-SYSTEM-PROMPT-06.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/COMMUNITY-MESSAGES-AVATAR-FIX.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/COMMUNITY-MOBILE-STAGE7.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/CSS-ARCHITECTURE-AUDIT.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/CSS-CLEANUP-PROMPT-08.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/css-cleanup-report-v10.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/css-cleanup-report-v11.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/css-cleanup-report-v12.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/css-cleanup-report-v13.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/css-cleanup-report-v14.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/css-cleanup-report-v15.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/css-cleanup-report-v16.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/css-cleanup-report-v17.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/css-cleanup-report-v18.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/css-cleanup-report-v19.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/css-cleanup-report-v20.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/css-cleanup-report-v21.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/css-cleanup-report-v22.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/css-cleanup-report-v23.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/css-cleanup-report-v24.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/css-cleanup-report-v25.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/css-cleanup-report-v26.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/css-cleanup-report-v27-reconstructed.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/css-cleanup-report-v7.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/css-cleanup-report-v8.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/css-cleanup-report-v9.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/css-cleanup-report.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/CSS-CLEANUP-STAGE1.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/CSS-LEGACY-INVENTORY-STAGE12.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/CSS-SURFACE-AUDIT-2026-04-26.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/FORM-ACTION-CONTRACT-STAGE10.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/GLOBAL-CYCLE-10-SERVICE-CARD-OWNERSHIP.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/GLOBAL-CYCLE-11-ACTION-FAVORITE-OWNERSHIP.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/GLOBAL-CYCLE-12-DATA-READY-CONTRACTS.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/GLOBAL-CYCLE-13-SEARCH-INPUT-SECTION-OWNERSHIP.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/GLOBAL-CYCLE-14-CHIP-BADGE-RATING-AVATAR-OWNERSHIP.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/GLOBAL-CYCLE-15-MODAL-DROPDOWN-TABS-OWNERSHIP.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/GLOBAL-CYCLE-16-SHELL-CONTAINER-TOPBAR-PARITY.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/GLOBAL-CYCLE-17-SAFE-DUPLICATE-IMPORTS.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/GLOBAL-CYCLE-18-IMPORTANT-REDUCTION.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/GLOBAL-CYCLE-19-IMPORTANT-REDUCTION.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/GLOBAL-CYCLE-20-SERVICE-CARD-IMPORTANT-MAP.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/GLOBAL-CYCLE-21-SERVICE-CARD-AVATAR-OWNERSHIP.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/GLOBAL-CYCLE-22-SERVICE-CARD-OVERFLOW-OWNERSHIP.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/GLOBAL-CYCLE-23-SERVICE-CARD-RHYTHM-OWNERSHIP.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/GLOBAL-CYCLE-24-SERVICE-CARD-IMPORTANT-RISK.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/GLOBAL-CYCLE-25-SERVICE-CARD-BASELINE.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/GLOBAL-CYCLE-26-SERVICE-CARD-DATA-HOOKS.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/GLOBAL-CYCLE-27-MEDIA-REVIEW-DATA-HOOKS.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/GLOBAL-CYCLE-28-MOCK-DATA-BOUNDARIES.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/GLOBAL-CYCLE-29-LIST-STATE-CONTRACTS.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/GLOBAL-CYCLE-30-REPOSITORY-BOUNDARY.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/GLOBAL-CYCLE-31-PAGE-DATA-ORCHESTRATION.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/GLOBAL-CYCLE-32-DETAIL-AD-DATA-CONTROLLER.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/GLOBAL-CYCLE-33-RESULTADOS-DATA-CONTROLLER.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/GLOBAL-CYCLE-34-INDEX-DATA-CONTROLLER.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/GLOBAL-CYCLE-35-PERFIL-DATA-READINESS.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/GLOBAL-CYCLE-36-PERFIL-DATA-HOOKS.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/GLOBAL-CYCLE-37-PEDIDOS-DATA-CONTROLLER.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/GLOBAL-CYCLE-39-COMMUNICATION-DATA-READINESS.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/GLOBAL-CYCLE-40-COMUNIDADE-DATA-CONTROLLER.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/GLOBAL-CYCLE-41-COMUNIDADE-INTERNA-DATA-HOOKS.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/GLOBAL-CYCLE-42-SCRIPT-ORDER.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/GLOBAL-CYCLE-43-JS-PAGE-USAGE.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/GLOBAL-CYCLE-44-JS-DUPLICATES-SAFETY.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/GLOBAL-CYCLE-45-SHELL-BASELINE-SAFETY.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/GLOBAL-CYCLE-46-LEGACY-CSS-MAP.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/GLOBAL-CYCLE-47-LEGACY-CSS-CLASSIFICATION.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/GLOBAL-CYCLE-48-LOW-RISK-CSS-CLEANUP.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/GLOBAL-CYCLE-49-COMMUNITY-PATTERN-MIGRATION.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/GLOBAL-CYCLE-50-COMMUNITY-LEGACY-REMOVAL.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/GLOBAL-CYCLE-51-LEGACY-BASELINE.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- `docs/GLOBAL-CYCLE-59-DOCS-CLASSIFICATION.md` — Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.
- ... mais 59 arquivo(s). Veja JSON de validação para lista completa.

## needs-review (41)

- `docs/BORDER-SYSTEM-TECHNICAL-REFERENCE.md` — Documento sem sinal claro de ativo ou histórico. Revisar antes de mover.
- `docs/css-maintenance-map.md` — Documento sem sinal claro de ativo ou histórico. Revisar antes de mover.
- `docs/CSS-RESPONSIVE-SYSTEM.md` — Documento sem sinal claro de ativo ou histórico. Revisar antes de mover.
- `docs/DEPRECATED-CSS.md` — Documento sem sinal claro de ativo ou histórico. Revisar antes de mover.
- `docs/DOCS-ACTIVE-HISTORICAL-CLASSIFICATION.md` — Documento sem sinal claro de ativo ou histórico. Revisar antes de mover.
- `docs/GLOBAL-CLEANUP-QUEUE.md` — Documento sem sinal claro de ativo ou histórico. Revisar antes de mover.
- `docs/GLOBAL-PAGE-ASSET-INVENTORY.md` — Documento sem sinal claro de ativo ou histórico. Revisar antes de mover.
- `docs/HOME-CSS-OVERRIDE-MAP.md` — Documento sem sinal claro de ativo ou histórico. Revisar antes de mover.
- `docs/HOME-CSS-OWNERSHIP.md` — Documento sem sinal claro de ativo ou histórico. Revisar antes de mover.
- `docs/HOME-JS-OWNERSHIP.md` — Documento sem sinal claro de ativo ou histórico. Revisar antes de mover.
- `docs/HOME-MOBILE-CLEANUP.md` — Documento sem sinal claro de ativo ou histórico. Revisar antes de mover.
- `docs/INDEX-CLEANUP-CYCLE-1.md` — Documento sem sinal claro de ativo ou histórico. Revisar antes de mover.
- `docs/INDEX-CLEANUP-MAP.md` — Documento sem sinal claro de ativo ou histórico. Revisar antes de mover.
- `docs/MOBILE-APP-SHELL-REFORM-2026-05-01.md` — Documento sem sinal claro de ativo ou histórico. Revisar antes de mover.
- `docs/MOBILE-CHROME-CANONICAL-V8-2026-05-01.md` — Documento sem sinal claro de ativo ou histórico. Revisar antes de mover.
- `docs/MOBILE-CHROME-CANONICAL-V9-2026-05-01.md` — Documento sem sinal claro de ativo ou histórico. Revisar antes de mover.
- `docs/MOBILE-HEADER-OVERFLOW-STABILITY-2026-05-01.md` — Documento sem sinal claro de ativo ou histórico. Revisar antes de mover.
- `docs/MOBILE-HEADER-SEARCH-CANONICAL-V7-2026-05-01.md` — Documento sem sinal claro de ativo ou histórico. Revisar antes de mover.
- `docs/mobile-header-v28.md` — Documento sem sinal claro de ativo ou histórico. Revisar antes de mover.
- `docs/MOBILE-RECOVERY-V10.md` — Documento sem sinal claro de ativo ou histórico. Revisar antes de mover.
- `docs/MOBILE-RESULTS-HEADER-SEARCH-CONTRACT-2026-05-01.md` — Documento sem sinal claro de ativo ou histórico. Revisar antes de mover.
- `docs/MOBILE-STANDARDIZATION-2026-04-26.md` — Documento sem sinal claro de ativo ou histórico. Revisar antes de mover.
- `docs/MOBILE-SYSTEM.md` — Documento sem sinal claro de ativo ou histórico. Revisar antes de mover.
- `docs/OBSERVABILITY.md` — Documento sem sinal claro de ativo ou histórico. Revisar antes de mover.
- `docs/PAGE-ROUTE-MAP.md` — Documento sem sinal claro de ativo ou histórico. Revisar antes de mover.
- `docs/PAGES-MAP.md` — Documento sem sinal claro de ativo ou histórico. Revisar antes de mover.
- `docs/PRODUCT-MODULES.md` — Documento sem sinal claro de ativo ou histórico. Revisar antes de mover.
- `docs/profile-mobile-v2-v29.md` — Documento sem sinal claro de ativo ou histórico. Revisar antes de mover.
- `docs/PROFILE-SYSTEM.md` — Documento sem sinal claro de ativo ou histórico. Revisar antes de mover.
- `docs/PROJECT-STRUCTURE.md` — Documento sem sinal claro de ativo ou histórico. Revisar antes de mover.
- `docs/QUALITY-GATES.md` — Documento sem sinal claro de ativo ou histórico. Revisar antes de mover.
- `docs/REFORM-ROADMAP.md` — Documento sem sinal claro de ativo ou histórico. Revisar antes de mover.
- `docs/REPOSITORY-BOUNDARY.md` — Documento sem sinal claro de ativo ou histórico. Revisar antes de mover.
- `docs/RESPONSIVE-CONSOLIDATED-DELIVERY.md` — Documento sem sinal claro de ativo ou histórico. Revisar antes de mover.
- `docs/ROADMAP-OPERACIONAL.md` — Documento sem sinal claro de ativo ou histórico. Revisar antes de mover.
- `docs/STABILIZATION-PASS-2026-04-12.md` — Documento sem sinal claro de ativo ou histórico. Revisar antes de mover.
- `docs/TESTING-STRATEGY.md` — Documento sem sinal claro de ativo ou histórico. Revisar antes de mover.
- `docs/UI-SURFACE-SYSTEM-2026-04-26.md` — Documento sem sinal claro de ativo ou histórico. Revisar antes de mover.
- `docs/v30-assets-patch.md` — Documento sem sinal claro de ativo ou histórico. Revisar antes de mover.
- `docs/v32-assets-only-imports.md` — Documento sem sinal claro de ativo ou histórico. Revisar antes de mover.
- `docs/visual-baseline/visual-qa-manifest.json` — Documento sem sinal claro de ativo ou histórico. Revisar antes de mover.

## validation (79)

- `docs/validation/architecture-audit-report.md` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/auth-session-contract-audit-report.md` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/css-contract-static-report.json` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/css-stage12-inventory.json` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/css-stage12-inventory.md` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/desktop-shell-contract-audit-report.md` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/domain-card-contract-audit-report.md` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/domain-services-audit-report.md` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/frontend-contract-audit-report.md` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/global-cycle-10-service-card-ownership-report.json` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/global-cycle-11-action-favorite-ownership-report.json` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/global-cycle-12-data-ready-report.json` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/global-cycle-13-search-input-section-report.json` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/global-cycle-14-chip-badge-rating-avatar-report.json` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/global-cycle-15-modal-dropdown-tabs-report.json` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/global-cycle-16-shell-container-topbar-parity-report.json` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/global-cycle-17-safe-duplicate-imports-report.json` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/global-cycle-18-important-reduction-report.json` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/global-cycle-19-important-reduction-report.json` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/global-cycle-20-service-card-important-map.json` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/global-cycle-21-service-card-avatar-ownership-report.json` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/global-cycle-22-service-card-overflow-ownership-report.json` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/global-cycle-23-service-card-rhythm-ownership-report.json` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/global-cycle-24-service-card-important-risk-report.json` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/global-cycle-25-service-card-baseline-report.json` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/global-cycle-26-service-card-data-hooks-report.json` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/global-cycle-27-media-review-data-hooks-report.json` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/global-cycle-28-mock-data-boundaries-report.json` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/global-cycle-29-list-state-contracts-report.json` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/global-cycle-3-components-base-report.md` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/global-cycle-30-repository-boundary-report.json` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/global-cycle-31-page-data-orchestration-report.json` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/global-cycle-32-detail-ad-data-controller-report.json` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/global-cycle-33-resultados-data-controller-report.json` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/global-cycle-34-index-data-controller-report.json` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/global-cycle-35-perfil-data-readiness-report.json` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/global-cycle-36-perfil-data-hooks-report.json` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/global-cycle-37-pedidos-data-controller-report.json` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/global-cycle-39-communication-data-readiness-report.json` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/global-cycle-4-page-css-inventory.json` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/global-cycle-40-comunidade-data-controller-report.json` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/global-cycle-41-comunidade-interna-data-hooks-report.json` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/global-cycle-42-script-order-report.json` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/global-cycle-43-js-page-usage-report.json` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/global-cycle-44-js-duplicates-safety-report.json` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/global-cycle-45-shell-baseline-safety-report.json` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/global-cycle-46-legacy-css-map.json` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/global-cycle-47-legacy-css-classification.json` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/global-cycle-48-low-risk-css-cleanup-report.json` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/global-cycle-49-community-pattern-migration-report.json` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/global-cycle-5-index-cleanup-map.json` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/global-cycle-50-community-legacy-removal-report.json` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/global-cycle-51-legacy-baseline-report.json` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/global-cycle-59-docs-classification.json` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/global-cycle-7-home-media-cards-report.md` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/global-cycle-9-media-card-ownership-report.md` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/home-css-overrides-audit.json` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/index-assets-audit.json` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/js-foundation-contract-audit-report.md` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/layout-contract-audit-report.md` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/legacy-bridge-scope-audit-report.md` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/mobile-app-shell-static-report.md` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/product-flow-contract-audit-report.md` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/responsive-stage13-checklist.md` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/responsive-stage13-matrix.json` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/responsive-stage13-result.md` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/runtime-flags-audit-report.md` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/stage19-audit-summary.md` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/stage20-audit-summary.md` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/stage21-backend-data-audit-report.md` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/stage28-visual-qa-baseline-report.md` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/stage30-controller-mock-wiring-report.md` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/stage33-responsive-inventory-report.md` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/stage33-responsive-inventory.json` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/stage34-responsive-boundary-report.md` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/stage35-desktop-base-stability-report.md` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/stage36-mobile-base-stability-report.md` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/surface-contract-report.md` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.
- `docs/validation/ui-canonical-classes-audit-report.md` — Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.

## report (15)

- `docs/reports/frontend-stage1-cleanup-and-overflow.md` — Relatório gerado. Deve permanecer em docs/reports ou ser arquivado por retenção.
- `docs/reports/frontend-stage2-tokens-and-contracts.md` — Relatório gerado. Deve permanecer em docs/reports ou ser arquivado por retenção.
- `docs/reports/frontend-stage3-search-filter-contract.md` — Relatório gerado. Deve permanecer em docs/reports ou ser arquivado por retenção.
- `docs/reports/frontend-stage4-responsive-page-audit.md` — Relatório gerado. Deve permanecer em docs/reports ou ser arquivado por retenção.
- `docs/reports/frontend-stage5-css-debt-controlled.md` — Relatório gerado. Deve permanecer em docs/reports ou ser arquivado por retenção.
- `docs/reports/frontend-stage6-chat-contract-important-reduction.md` — Relatório gerado. Deve permanecer em docs/reports ou ser arquivado por retenção.
- `docs/reports/frontend-stage7-messages-regression-fix.md` — Relatório gerado. Deve permanecer em docs/reports ou ser arquivado por retenção.
- `docs/reports/relatorio-header-agenda-nav-v11.md` — Relatório gerado. Deve permanecer em docs/reports ou ser arquivado por retenção.
- `docs/reports/relatorio-header-nav-v10.md` — Relatório gerado. Deve permanecer em docs/reports ou ser arquivado por retenção.
- `docs/reports/relatorio-header-scroll-v4.md` — Relatório gerado. Deve permanecer em docs/reports ou ser arquivado por retenção.
- `docs/reports/relatorio-header-scroll-v5.md` — Relatório gerado. Deve permanecer em docs/reports ou ser arquivado por retenção.
- `docs/reports/relatorio-largura-header-v2.md` — Relatório gerado. Deve permanecer em docs/reports ou ser arquivado por retenção.
- `docs/reports/relatorio-largura-header-v3.md` — Relatório gerado. Deve permanecer em docs/reports ou ser arquivado por retenção.
- `docs/reports/relatorio-largura-header.md` — Relatório gerado. Deve permanecer em docs/reports ou ser arquivado por retenção.
- `docs/reports/relatorio-sidebar-collapsed-v12.md` — Relatório gerado. Deve permanecer em docs/reports ou ser arquivado por retenção.

## removal-log (0)

_Nenhum arquivo._

## archived (0)

_Nenhum arquivo._

## Próxima ação recomendada

1. Revisar manualmente os itens `active-review`.
2. Mover somente os `archive-candidate` óbvios para `docs/archive/` em ciclo separado, com script de cleanup e auditoria.
3. Não mover documentos `needs-review` sem confirmar se ainda são usados como referência.
4. Manter `docs/validation/` e `docs/removals/` como histórico de auditorias e remoções controladas.
