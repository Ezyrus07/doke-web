# Ciclo Global 61 — decisão de documentação active-review

Este relatório classifica a documentação atual sem mover nem apagar arquivos. O objetivo é decidir o que deve virar contrato ativo, o que continua em revisão e o que pode ir para arquivo histórico em ciclo posterior.

## Resumo

| Grupo | Quantidade | Ação recomendada |
|---|---:|---|
| Promover para contrato ativo | 10 | Manter em `docs/` e consolidar no índice ativo |
| Manter em revisão | 163 | Revisar antes de mover; pode conter contexto útil de páginas ainda em evolução |
| Candidato a arquivo histórico | 11 | Mover em lote controlado para `docs/archive/` depois de validação |
| Relatórios/índices gerados | 1 | Manter como evidência ou mover para `docs/reports/` futuramente |

## Contratos ativos recomendados

- `docs/ARCHITECTURE-DECISIONS.md`
- `docs/ARCHITECTURE.md`
- `docs/BETA-QUALITY-GATES-RUNBOOK.md`
- `docs/DATA-BACKEND-CONTRACTS.md`
- `docs/DATA-READY-CONTRACTS.md`
- `docs/DATA_READY_FRONTEND_ARCHITECTURE.md`
- `docs/DESIGN-SYSTEM-GUIDE.md`
- `docs/FRONTEND-GOVERNANCE.md`
- `docs/GLOBAL-LAYOUT-CONTRACT.md`
- `docs/PAGE-ROUTE-MAP.md`

## Documentos que continuam em revisão

- `docs/ACTIVE-CONTRACTS-INDEX.md`
- `docs/API-ADAPTER-CONTRACT.md`
- `docs/API-ENDPOINT-READINESS.md`
- `docs/AUTH-IDENTITY-CANARY-RUNBOOK.md`
- `docs/AUTH-INTEGRATION-CONTRACT.md`
- `docs/BACKEND-INTEGRATION-PLAN.md`
- `docs/BACKEND-REAL-COMPLETE-READINESS-RUNBOOK.md`
- `docs/BACKEND-REAL-E2E-RUNBOOK.md`
- `docs/BACKEND-REAL-MULTIDOMAIN-STAGING-RUNBOOK.md`
- `docs/BACKEND-REAL-OBSERVABILITY-RUNBOOK.md`
- `docs/BACKEND-REAL-STAGING-PREFLIGHT-RUNBOOK.md`
- `docs/BASELINE-VISUAL-APPROVED.md`
- `docs/BETA-BROWSER-QUALITY-EVIDENCE-RUNBOOK.md`
- `docs/BETA-CLOSED-BACKEND-REAL-READINESS-RUNBOOK.md`
- `docs/BETA-CLOSED-LAUNCH-READINESS-RUNBOOK.md`
- `docs/BETA-CLOSED-PRODUCT-READINESS-RUNBOOK.md`
- `docs/BETA-LAUNCH-E2E-RUNBOOK.md`
- `docs/BETA-LAUNCH-FRONTEND-RUNTIME-RUNBOOK.md`
- `docs/BETA-LAUNCH-STAGING-RUNBOOK.md`
- `docs/BETA-QA-MATRIX-RUNBOOK.md`
- `docs/BETA-VISUAL-HARDENING-RUNBOOK.md`
- `docs/BROWSER-QUALITY-A11Y-EVIDENCE-RUNBOOK.md`
- `docs/BROWSER-QUALITY-REAL-EVIDENCE-RUNBOOK.md`
- `docs/CODEX-VISUAL-EXECUTION-GUIDE.md`
- `docs/CODEX-VISUAL-VALIDATION-HANDOFF.md`
- `docs/COMMUNITY-CANARY-RUNBOOK.md`
- `docs/CSS-PAGE-MANIFESTS.md`
- `docs/CSS_AUTHORITY_MAP.md`
- `docs/DATA-FALLBACK-STRATEGY.md`
- `docs/DATA-MODEL-DRAFT.md`
- `docs/DATA-MODEL.md`
- `docs/DEPRECATED-CSS.md`
- `docs/DESKTOP-PHASE-ENTRY-CONTRACT.md`
- `docs/DOKE-PLANO-MESTRE-CONCLUSAO-PLATAFORMA.md`
- `docs/DOKE-UI-STANDARD-v1.md`
- `docs/DOKE-UI-STANDARD-v2.md`
- `docs/DOKE-UI-STANDARD-v3.md`
- `docs/DOKE_AGENT_CONSTITUTION.md`
- `docs/DOMAIN-COMPLETION-MATRIX.md`
- `docs/DOMAIN-EXPANSION-E2E-RUNBOOK.md`

## Candidatos a arquivo histórico

- `docs/CODEX-PROMPT-PASS18.md`
- `docs/COMMUNITY-LOGIC-FINAL-READINESS.md`
- `docs/DATA_CONTRACTS_STAGE61B.md`
- `docs/DOKE_UI_CONSISTENCY_PROMPT.md`
- `docs/DOM_READINESS_STAGE61C.md`
- `docs/FINAL-HANDOFF-P0-P22.md`
- `docs/FINAL-LIVE-SERVER-QA-CHECKLIST.md`
- `docs/GLOBAL-PHASE-FINAL-HANDOFF.md`
- `docs/NAVIGATION-LIFECYCLE-AUDIT-STAGE-01.md`
- `docs/STABILIZATION_STAGE_02_ENTRYPOINT_REDUCTION.md`
- `docs/STABILIZATION_STAGE_03_RAIL_HEADER_CONTRACT.md`

## Decisão técnica

Não mover documentação neste ciclo. A próxima etapa segura é consolidar um índice de contratos ativos e só depois arquivar os candidatos históricos por lote.

## Critérios de aceite

- Nenhum arquivo de produto alterado.
- Nenhum documento removido.
- Contratos ativos identificados antes da migração para arquivo.
- Documentos ambíguos permanecem em revisão.
