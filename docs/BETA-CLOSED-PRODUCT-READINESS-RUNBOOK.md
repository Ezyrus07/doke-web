# Doke — Beta Closed Product Readiness Runbook

## Objetivo
Gate final para decidir se o Doke está pronto para endurecimento manual de beta fechado com backend real.

## Comandos
```bash
npm run audit:beta-closed-product-readiness-gate
npm run validate:beta-closed-product:readiness-gate:dry-run
npm run validate:beta-closed-product:readiness-gate
npm run validate:beta-closed-product:readiness-gate:report
```

## Relatórios exigidos
- `backend_real_complete_ready_for_manual_domain_expansion`
- `domain_expansion_local_runtime_validated`
- `product_beta_local_runtime_validated`
- `backend_real_observability_ready_for_manual_staging_validation`

## Status seguro sem relatórios reais
```txt
blocked_until_beta_closed_product_prerequisites
```

## Status aprovado futuro
```txt
beta_closed_product_ready_for_manual_private_beta_hardening
```

## Próximo passo após aprovação
Hardening de beta fechado com dados reais, testes visuais, acessibilidade, performance, observabilidade, suporte e rollback operacional.
