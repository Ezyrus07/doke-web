# Ciclo Global 45 — Shell baseline safety

## Objetivo

Corrigir problemas de base que impediam auditorias globais confiáveis, sem alterar visual, CSS de página ou estrutura de shell.

## Alterações

- Normalizados imports quebrados em `auth/login.html`, `auth/cadastro.html` e `auth/esqueci-senha.html`.
- Atualizado `scripts/lib/css-assets.js` para reconhecer `<link rel="stylesheet">` independentemente da ordem dos atributos.
- Criado `scripts/audit-desktop-shell-contracts.js` como wrapper de compatibilidade para o contrato canônico `audit-desktop-base-stability.js`.

## Decisões

- Não foi criado nenhum arquivo visual `fix`, `hotfix`, `stage` ou `final`.
- Não houve alteração de shell, sidebar, header, body ou wrappers globais.
- O problema de `comunidade.html` era de auditoria/parsing: a página já carregava `responsive-boundary.css` e `desktop-base-stability.css`, mas o parser antigo só reconhecia links quando `rel` vinha antes de `href`.

## Critérios de aceite

- `npm run audit:desktop-base` passa.
- `npm run audit:desktop-shell` passa.
- `npm run audit:responsive-boundaries` passa.
- Auth não referencia mais assets `stage10/stage11` inexistentes.
