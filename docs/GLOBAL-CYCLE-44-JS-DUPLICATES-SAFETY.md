# Ciclo Global 44 — JS duplicates safety

## Objetivo

Corrigir duplicações objetivas de JS em `pedidos.html` e normalizar novamente os imports de autenticação sem alterar visual, CSS ou comportamento aprovado.

## Alterações

- `pedidos.html`: removidos imports duplicados antigos de `assets/js/core/session.js` e `assets/js/services/auth-service.js`.
- `auth/login.html`, `auth/cadastro.html`, `auth/esqueci-senha.html`: substituídas referências `stage10/stage11` por contratos reais atuais.
- `scripts/audit-desktop-shell-contracts.js`: adicionado wrapper de compatibilidade para o auditor canônico de estabilidade desktop.
- `scripts/audit-js-duplicates-safety.js`: auditoria criada para impedir retorno das duplicações e referências stage quebradas.

## Critérios de aceite

- Nenhuma alteração visual intencional.
- Nenhum CSS novo.
- Nenhum `!important` novo.
- Nenhum `style=""` novo.
- Nenhum arquivo `fix/hotfix/stage/final` visual criado.
- `pedidos.html` sem scripts duplicados por caminho base.
- Auth sem imports `stage10/stage11`.
