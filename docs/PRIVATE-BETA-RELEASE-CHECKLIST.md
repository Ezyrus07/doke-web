# Private Beta Release Checklist — Sprint 130–132

## Objetivo

Consolidar a decisão de beta fechado sem tratar evidência local como aprovação real de release.

## Checklist mínimo

1. Evidência local gerada.
2. QA Matrix por persona validada.
3. Runtime frontend beta-launch validado localmente.
4. Pacote de preparação de staging real pronto.
5. Release candidate package aprovado ou explicitamente bloqueado.
6. Plano de rollback para mock documentado.
7. Entrada de usuários reais planejada por coorte pequena.

## Comandos

```bash
npm run audit:private-beta-release-checklist
npm run validate:private-beta-release-checklist:dry-run
npm run validate:private-beta-release-checklist
npm run validate:private-beta-release-checklist:report
```

## Status seguro sem release candidate real

```txt
private_beta_checklist_ready_with_release_blockers
```

## Status aprovado futuro

```txt
private_beta_release_checklist_ready_for_manual_go_no_go
```

## Regra de decisão

Se `DOKE_PRIVATE_BETA_REQUIRE_REAL_REPORTS=1`, relatórios locais não podem liberar release.
