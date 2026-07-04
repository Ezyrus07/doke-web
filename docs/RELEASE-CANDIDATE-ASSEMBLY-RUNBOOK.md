# Release Candidate Assembly Runbook — Sprint 133–135

## Objetivo

Montar o pacote de evidências do release candidate sem fingir que o produto está liberado quando ainda faltam relatórios reais.

## Comandos

```bash
npm run audit:release-candidate-assembly-gate
npm run validate:release-candidate-assembly:dry-run
npm run validate:release-candidate-assembly
npm run validate:release-candidate-assembly:report
```

## Entradas esperadas

```txt
reports/generated/private-beta-local-evidence-package-report.json
reports/generated/staging-real-preparation-package-report.json
reports/generated/private-beta-release-checklist-report.json
reports/generated/private-beta-user-entry-plan-report.json
reports/generated/release-candidate-package-report.json
```

## Status seguro com evidência parcial

```txt
release_candidate_assembly_ready_with_real_evidence_blockers
```

## Status aprovado futuro

```txt
release_candidate_assembly_ready_for_manual_private_beta_release
```

## Regra

Um pacote local de RC pode ficar organizado, mas só vira release candidate real quando os relatórios reais de staging, qualidade, visual e go/no-go existirem.
