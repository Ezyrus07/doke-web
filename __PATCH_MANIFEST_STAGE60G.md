# Stage 60G — Auth login-controller unused removal

## Objetivo

Remover apenas o candidato `assets/js/controllers/login-controller.js`, classificado como `no-runtime-evidence` no domínio `auth`, com trava contra referência direta runtime.

## Arquivos adicionados

- `scripts/stage60g-delete-auth-login-controller.js`
- `RODAR_STAGE60G_DELETE_AUTH_LOGIN_CONTROLLER.cmd`
- `__PATCH_MANIFEST_STAGE60G.md`

## Arquivo que pode ser removido pelo script

- `assets/js/controllers/login-controller.js`

## Regras de segurança

O script bloqueia a remoção se encontrar referência direta a `login-controller.js` ou ao caminho completo em arquivos `.html`, `.css` ou `.js` de runtime.

Ignora para evitar falso positivo:

- `scripts/`
- `docs/`
- `reports/`
- `archive/`
- `node_modules/`

## Pós-validação obrigatória

```bat
npm.cmd run audit:unused-asset-candidates
npm.cmd run audit:frontend
npm.cmd run audit:duplicate-assets
npm.cmd run audit:important-reduction-plan
npm.cmd run audit:docs-report-hygiene
```

## Não mexe em

- shell
- navigation
- header
- sidebar
- router
- home
- mensagens
- detalhe-anuncio
- perfil
- JS core
