# Form Page Top Contract

## Authority

Shared title/intro rail, screen width, form-grid rhythm and base form card surfaces for form-led pages are owned by:

- `assets/css/components/forms/form-page-top-contract.css`

## Adopted pages

- `orcamento.html`
- `anunciar-servico.html`
- `tornar-profissional.html`
- `pagamento-profissional.html`

## Required classes

Top-level form screen:

```html
<section class="... doke-form-page-screen">
```

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

Main form card:

```html
<section class="... doke-form-page-card">
```

Side card / aside:

```html
<aside class="... doke-form-page-side-card">
```

Pages may style their own field anatomy and content-specific inner blocks, but the screen, title block, main card and side card must share one horizontal rail and one surface contract.


## Content rhythm

To reduce top-level noise on form-led pages, follow this shared structure:

- title: uppercase, compact primary action of the flow;
- description: one concise sentence;
- no eyebrow;
- no chips/meta in the top block.


## Authority lock

The top block visual anatomy, form screen width and base card surface geometry are owned only by `assets/css/components/forms/form-page-top-contract.css`.

The following page CSS files must not style the form-page title/description/top meta directly:

- `assets/css/pages/orcamento.css`
- `assets/css/pages/anunciar-servico.css`
- `assets/css/pages/tornar-profissional.css`
- `assets/css/pages/pagamento-profissional.css`

Allowed page CSS responsibility: internal form layout, step content, modal content and page-specific field composition. Not allowed: `h1`, top description, eyebrow, chips/meta, page-specific title scale/color, base form card width, base card radius, base card padding or base card shadow.
