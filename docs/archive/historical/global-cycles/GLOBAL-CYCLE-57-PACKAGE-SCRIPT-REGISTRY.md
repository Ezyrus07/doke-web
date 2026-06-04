# Ciclo Global 57 — Package script registry

## Objetivo

Revisar os comandos do `package.json` e proteger a base contra scripts quebrados ou comandos de auditoria que apontem para arquivos inexistentes.

Este ciclo não altera visual, HTML de página, CSS de tela, shell, sidebar ou header.

## O que foi criado

- `scripts/audit-package-script-registry.js`
- comando `npm run audit:package-script-registry`
- `docs/validation/global-cycle-57-package-script-registry-report.json`

## O que a auditoria valida

- todo comando `node scripts/...` referenciado no `package.json` aponta para arquivo existente;
- todo `npm run ...` interno aponta para script existente;
- comandos duplicados são reportados como warning, não como falha;
- comandos `cleanup:*` são mapeados para evitar limpeza sem auditoria correspondente;
- `audit:all` mantém os guardrails principais de desktop/shell/responsividade.

## Decisão técnica

Nem todos os comandos especializados criados nos ciclos globais devem entrar em `audit:all`. Muitos são auditorias de migração, baseline ou limpeza pontual. Colocar todos no pipeline padrão deixaria a execução pesada e poderia bloquear trabalho futuro por verificações que são contextuais.

O contrato adotado é:

- `audit:all` protege o núcleo estável;
- auditorias especializadas são executadas por ciclo quando mexemos naquela área;
- cleanup scripts precisam de auditoria explícita ou de uma auditoria abrangente que valide a remoção.

## Resultado esperado

- 0 scripts npm apontando para arquivos inexistentes;
- 0 alvos `npm run` inexistentes;
- registro audível do estado dos scripts;
- base mais segura para continuar a limpeza global sem ressuscitar comandos antigos.
