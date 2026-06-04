# Stage 62F — detalhe-anuncio remnants important reduction

## Objetivo

Reduzir remanescentes de CSS antigo/contratual em `detalhe-anuncio` sem tocar em Home, shell, router, sidebar, navigation ou header global.

## Arquivos adicionados

- `scripts/stage62f-remove-detail-remnants.js`
- `RODAR_STAGE62F_DETALHE_REMNANTS.cmd`
- `__PATCH_MANIFEST_STAGE62F.md`

## Arquivos removidos pelo runner

- `assets/css/pages/detalhe-anuncio/detail-layout-contract.css`
- `assets/css/pages/detalhe-anuncio/detail-legacy.css`
- `assets/css/pages/detalhe-anuncio/mobile-rail-contract.css`

## Segurança

O runner remove links `<link rel="stylesheet">` diretos desses arquivos em HTMLs conhecidos antes de deletar os CSS.

## Não mexe em

- `index.html` / Home
- shell/router/header/sidebar/navigation
- `assets/css/pages/detalhe-anuncio.css`
- `assets/css/pages/detalhe-anuncio/detail-page-contract.css`

## Validação esperada

Rodar após aplicação:

```bat
npm.cmd run audit:frontend
npm.cmd run audit:important-reduction-plan
npm.cmd run audit:duplicate-assets
npm.cmd run audit:unused-asset-candidates
npm.cmd run audit:docs-report-hygiene
```

Conferência visual mínima: `detalhe-anuncio.html` em desktop e mobile.
