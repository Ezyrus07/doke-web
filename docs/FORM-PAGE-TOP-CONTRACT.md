# Form Page Top Contract

## Authority

Shared title/intro rail and form-grid rhythm for form-led pages is owned by:

- `assets/css/components/forms/form-page-top-contract.css`

## Adopted pages

- `orcamento.html`
- `anunciar-servico.html`

## Required classes

Top-level content rail:

```html
<div class="... doke-form-page-rail">
```

Title/context block:

```html
<header class="... doke-form-page-top">
  <p class="doke-form-page-eyebrow">...</p>
  <h1 class="doke-form-page-title">...</h1>
</header>
```

Main form grid:

```html
<div class="... doke-form-page-grid">
```

Pages may style their own field anatomy, but the title block, form card and side card must share one horizontal rail.
