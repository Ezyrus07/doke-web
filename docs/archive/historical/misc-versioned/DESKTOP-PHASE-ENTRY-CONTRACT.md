# Desktop Phase Entry Contract

Status: active entry contract after Global Cycles closure.

## Scope

The next phase is desktop-first HTML/CSS reform. It is not a responsive pass yet.

## Entry conditions

Before editing a page visually:

- Confirm the page is selected for desktop reform.
- Confirm whether its current HTML/CSS is provisional or approved baseline.
- Preserve data boundaries and controllers created during Global Cycles.
- Keep shell/sidebar/header/body/global wrappers out of page-specific fixes.
- Do not introduce inline styles or new `!important` rules.
- Do not duplicate reusable CSS/JS already owned by `components` or `patterns`.

## Page groups

### Marketplace

- `index.html`
- `resultados.html`
- `perfil.html`
- `detalhe-anuncio.html`

### Operational

- `pedidos.html`
- `carteira.html`
- `pagamento.html`
- `finalizar-pedido.html`
- `configuracoes.html`
- `notificacoes.html`
- `avaliacao.html`
- `adicionar-cartao.html`

### Communication

- `mensagens.html`
- `comunidade.html`
- `comunidade-interna.html`

## Recommended order

1. `index.html`
2. `resultados.html`
3. `perfil.html`
4. `detalhe-anuncio.html`
5. operational flows
6. communication/community flows

## Responsive rule

Responsive implementation starts only after the desktop version of the target page is approved.
