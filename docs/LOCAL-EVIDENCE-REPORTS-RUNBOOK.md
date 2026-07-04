# Local Evidence Reports Runbook — Sprint 121–123

## Objetivo

Gerar evidências locais honestas para o beta fechado sem fingir staging real, Playwright visual, Lighthouse, Core Web Vitals ou produção.

## Escopo

Este runbook cobre:

- execução dos validadores locais já existentes;
- geração de relatório estático de acessibilidade;
- geração de relatório estático de performance;
- geração de relatório estático de SEO;
- registro explícito das lacunas visuais que ainda exigem navegador.

## Comandos

```bash
npm run audit:private-beta-local-evidence
npm run generate:private-beta-local-evidence:dry-run
npm run generate:private-beta-local-evidence
npm run generate:private-beta-local-evidence:reports
```

## Relatórios gerados

```txt
reports/generated/private-beta-local-evidence-package-report.json
reports/generated/accessibility-audit-report.json
reports/generated/performance-budget-report.json
reports/generated/seo-readiness-report.json
reports/generated/beta-visual-evidence-gap-report.json
```

## Limite explícito

Os relatórios estáticos não substituem:

- teste real de teclado/foco/leitor de tela;
- Lighthouse/Core Web Vitals;
- Playwright visual;
- screenshots de fluxos críticos;
- staging real com Supabase/API.

## Status esperado sem staging real

```txt
private_beta_local_evidence_ready_with_known_external_blockers
```
