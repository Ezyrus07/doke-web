# Form Page Top Contract

## Authority

Shared title/intro rail and form-grid rhythm for form-led pages is owned by:

- `assets/css/components/forms/form-page-top-contract.css`

## Adopted pages

- `orcamento.html`
- `anunciar-servico.html`
- `tornar-profissional.html`

## Required classes

Top-level content rail:

```html
<div class="... doke-form-page-rail">
```

Title/context block:

```html
<header class="... doke-form-page-top">
  <h1 class="doke-form-page-title">...</h1>
  <p class="doke-form-page-description">...</p>
</header>
```

Main form grid:

```html
<div class="... doke-form-page-grid">
```

Pages may style their own field anatomy, but the title block, form card and side card must share one horizontal rail.


## Content rhythm

To reduce top-level noise on form-led pages, follow this shared structure:

- title: uppercase, compact primary action of the flow;
- description: one concise sentence;
- no eyebrow;
- no chips/meta in the top block.


## Authority lock

The top block visual anatomy is owned only by `assets/css/components/forms/form-page-top-contract.css`.

The following page CSS files must not style the form-page title/description/top meta directly:

- `assets/css/pages/orcamento.css`
- `assets/css/pages/anunciar-servico.css`
- `assets/css/pages/tornar-profissional.css`

Allowed page CSS responsibility: internal form layout, card layout and page-specific field composition. Not allowed: `h1`, top description, eyebrow, chips/meta or page-specific title scale/color.
