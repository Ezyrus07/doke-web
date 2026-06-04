# Stage 62B — Page remnants important reduction

## Objetivo

Reduzir remanescentes CSS de pagina com alto volume de `!important`, aceitando uma etapa mais agressiva, mas ainda com trava contra referencia runtime direta.

## Arquivos adicionados

- `DELETE_STAGE62B_PAGE_REMNANTS.txt`
- `scripts/stage62b-delete-page-remnants.js`
- `RODAR_STAGE62B_PAGE_REMNANTS_IMPORTANT.cmd`
- `__PATCH_MANIFEST_STAGE62B.md`

## Alvos

- `assets/css/pages/perfil-mobile-reference-hotfix.css`
- `assets/css/pages/perfil-header-rail-parity.css`
- `assets/css/pages/perfil-budget-modal/final-polish-success.css`
- `assets/css/pages/perfil-budget-modal/visual-deck.css`
- `assets/css/pages/perfil/mobile-owner-media-polish.css`
- `assets/css/pages/home-desktop-rail-parity.css`
- `assets/css/pages/home-overlays/workers-feed-polish.css`
- `assets/css/pages/home/tablet-final-authority.css`
- `assets/css/pages/mensagens/community-parity.css`
- `assets/css/pages/mensagens/desktop-visual-repair.css`
- `assets/css/pages/mensagens/final-standardization.css`
- `assets/css/pages/mensagens/header-parity.css`
- `assets/css/pages/detalhe-anuncio-rail-parity.css`
- `assets/css/pages/detalhe-anuncio-responsive-contract.css`

## Segurança

O script bloqueia qualquer alvo que tenha referencia direta runtime em `.html`, `.css` ou `.js`, excluindo apenas `scripts/`, `docs/`, `reports/`, `archive/`, `node_modules/` e `.git/`.

## Impacto esperado

- Remocao maxima estimada: 14 arquivos.
- Reducao maxima estimada: aproximadamente 6.204 ocorrencias de `!important`.
- Esta etapa pode alterar visual em `perfil`, `mensagens`, `detalhe-anuncio` e `home`, porque e intencionalmente mais agressiva que as etapas anteriores.

## Validacao obrigatoria

Depois de rodar:

```bat
npm.cmd run audit:frontend
npm.cmd run audit:important-reduction-plan
npm.cmd run audit:duplicate-assets
npm.cmd run audit:unused-asset-candidates
npm.cmd run audit:docs-report-hygiene
```

Conferencia visual minima:

- `perfil.html`
- `mensagens.html`
- `detalhe-anuncio.html`
- `index.html`

Viewports recomendados:

- 1366x768
- 820x1180
- 390x844
