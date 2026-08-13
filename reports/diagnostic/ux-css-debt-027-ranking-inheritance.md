# UX-CSS-DEBT-027 — residual ranking inheritance checkpoint

Certified parent: `820896977bfbba4f499b67f1707298f5bd7339be` (UX-CSS-DEBT-026 / PR #192).

## Why inheritance is exact

The certified 026 permanent delta changed exactly one file: `assets/css/pages/pedidos/tablet-rail-contract.css` (`+0/-5`). The post-026 canonical residual is `48 files / 1286 superseded declarations / 0 high-risk residual`.

The 026 ranking run `31700082371`, job `94446854663`, ordered the old TOP0 as `tablet-rail-contract.css` and old TOP1 as `assets/css/pages/pagamento-profissional.css`. Removing only TOP0 leaves the relative order of all remaining candidates unchanged.

`assets/css/pages/pagamento-profissional.css` has blob SHA `4411ec3c8fe73a925963b59602b2fefad2e5a264` both at `330fce87f3db885402cfd14d70af8a4b177b9c62` and at `820896977bfbba4f499b67f1707298f5bd7339be`, proving no intervening mutation.

## New TOP0

- file: `assets/css/pages/pagamento-profissional.css`
- declarations: `716`
- superseded declarations: `6`
- selectors: `1`
- consumer pages: `1` (`pagamento-profissional.html`)
- `!important`: `0`
- bytes: `34560`
- owner selector: `.payment-finish-check`
- identical winners: `0`
- changed winners: `6`

Superseded global properties under `.payment-finish-check`:
- `align-items: flex-start` -> `center`
- `gap: 11px` -> `12px`
- `padding: 14px` -> `12px 14px`
- `border-radius: var(--form-control-surface-radius, var(--radius-sm))` -> `var(--radius-base)`
- `background: #f8fbfe` -> `rgba(248, 252, 255, 0.88)`
- `font-size: 0.8rem` -> `0.9rem`

No product file is changed in this diagnostic checkpoint. Next gate is reach/runtime proof on `pagamento-profissional.html`; no deletion candidate is authorized yet.
