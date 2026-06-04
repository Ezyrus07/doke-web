# Stage 62G — Detalhe Anuncio contract important reduction

## Objetivo

Remover de forma controlada o contrato legado `detail-page-contract.css`, que ainda concentra muitos `!important` no dominio `detalhe-anuncio`.

## Arquivos adicionados

- `scripts/stage62g-remove-detalhe-contract.js`
- `RODAR_STAGE62G_DETALHE_CONTRACT.cmd`
- `__PATCH_MANIFEST_STAGE62G.md`

## Arquivo alvo removido pelo runner

- `assets/css/pages/detalhe-anuncio/detail-page-contract.css`

## Seguranca

- Remove links diretos do CSS alvo em HTML antes da delecao.
- Bloqueia se restarem referencias runtime diretas em `.html`, `.css` ou `.js`.
- Ignora apenas diretorios nao-runtime: `.git`, `node_modules`, `archive`, `reports`, `docs`.
- Nao toca em shell, router, sidebar, header global, home, mensagens ou perfil.

## Validacao esperada

Depois de rodar:

```bat
npm.cmd run audit:frontend
npm.cmd run audit:important-reduction-plan
npm.cmd run audit:duplicate-assets
npm.cmd run audit:unused-asset-candidates
npm.cmd run audit:docs-report-hygiene
```

Esperado:

- `audit:frontend`: 0 criticos
- `duplicate-assets`: 0
- `important-reduction-plan`: passed
- reducao aproximada de 684 usos de `!important`
