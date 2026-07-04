# Release Candidate Package Runbook

## Objetivo

Empacotar o release candidate privado somente depois que backend, produto, qualidade, visual e QA tiverem evidências mínimas.

## Conteúdo do release candidate

- ZIP completo do projeto;
- ZIP apenas com arquivos alterados;
- runbook indexado;
- relatórios de evidência;
- plano de Rollback;
- lista de flags permitidas;
- lista de domínios bloqueados por ausência de ambiente real.

## Rollback

O rollback principal continua sendo voltar para mock:

```js
Doke.services.betaLaunch.rollbackBetaLaunchCanary();
Doke.services.orders.rollbackOrdersWriteCanary();
localStorage.setItem('doke.dataProvider', 'mock');
```

Nenhuma flag de produção deve ser versionada. Nenhum provider API deve ser default no release candidate.

## Validação

```bash
npm run audit:release-candidate-package-gate
npm run validate:release-candidate-package:dry-run
npm run validate:release-candidate-package
npm run validate:release-candidate-package:report
```
