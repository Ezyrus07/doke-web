# Doke — Contrato Global de Componentes-Base

## Objetivo

Criar uma fundação estável para os componentes mais recorrentes do site sem congelar o visual das páginas que ainda estão em evolução.

## Componentes-base adicionados

Manifest global:

```txt
assets/css/components/base/index.css
```

Arquivos:

```txt
assets/css/components/base/buttons.css
assets/css/components/base/chips-badges.css
assets/css/components/base/forms.css
assets/css/components/base/rating.css
assets/css/components/base/sections.css
assets/css/components/base/modals.css
```

## Classes canônicas

### Botões

```txt
.doke-btn
.doke-button
.doke-btn--primary
.doke-btn--secondary
.doke-btn--ghost
.doke-btn--soft
.doke-btn--danger
.doke-btn--sm
.doke-btn--lg
.doke-btn--block
.doke-icon-btn
.doke-action-button
```

### Chips e badges

```txt
.doke-chip
.doke-chip--primary
.doke-chip--success
.doke-chip--muted
.doke-badge
.doke-badge--primary
.doke-badge--success
.doke-badge--warning
.doke-badge--danger
```

### Formulários

```txt
.doke-input
.doke-select
.doke-textarea
.doke-searchbox
```

### Rating

```txt
.doke-rating
.doke-rating__icon
.doke-rating__value
.doke-rating__meta
```

### Headers de seção

```txt
.doke-section-header
.doke-section-header__content
.doke-section-title
.doke-section-description
.doke-section-header__action
```

### Modal

```txt
.doke-modal
.doke-modal__header
.doke-modal__title
.doke-modal__body
.doke-modal__footer
.doke-modal--sm
.doke-modal--lg
```

## Decisão técnica

Os seletores usam `:where(...)` para manter especificidade baixa. Isso evita que o contrato global brigue com CSS de página já existente, mas garante uma base visual quando o componente for usado em páginas novas ou em páginas que ainda serão reorganizadas.

## Regras de uso

- Páginas podem posicionar componentes, mas não devem redesenhar sua anatomia.
- Variações de domínio devem ficar em `components` ou `patterns`, não em `pages`.
- O visual das páginas provisórias ainda pode mudar, mas deve mudar consumindo esses contratos.
