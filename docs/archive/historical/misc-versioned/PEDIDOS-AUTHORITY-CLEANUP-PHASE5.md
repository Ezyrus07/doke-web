# Pedidos authority cleanup — Phase 5

## Scope

This phase only changes the active naming/ownership of the pedidos mobile layout contract.
It does not redesign `pedidos.html`, change the shell, change the router, or alter the CSS body.

## Cause

`pedidos.html` still loaded `assets/css/pages/pedidos/mobile-longterm-normalization.css` as a production stylesheet.
The file is not a temporary normalizer anymore: it owns the mobile layout contract for the pedidos page.
Keeping the remediation name active made the page look like it still depended on a provisional layer.

## Change

- `assets/css/pages/pedidos/mobile-longterm-normalization.css`
  was replaced by
  `assets/css/pages/pedidos/mobile-layout-contract.css`.
- `pedidos.html` now references the responsibility-based file name.
- The CSS content is preserved; no visual redesign is intended.

## Authority after this phase

- `assets/css/pages/pedidos.css`: base page styling.
- `assets/css/pages/pedidos/mobile-layout-contract.css`: pedidos-specific mobile layout contract.
- Shell/rail/header remain owned by the shared shell contracts, not by pedidos CSS.

## Validation

Executed:

```bash
npm run audit:agent-governance
```

Result:

- active legacy/remediation CSS decreased from 2 to 1.
- the remaining active remediation CSS is `assets/css/pages/mensagens/desktop-redesign.css`.

## Not done

- Did not consolidate `mensagens.html`; it is a separate high-risk phase.
- Did not remove inactive legacy files globally.
- Did not run Playwright visual validation in this environment.
