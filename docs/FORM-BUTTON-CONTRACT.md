# Form/Button Contract

## Authority

Shared action-button geometry for form and modal footers is owned by:

- `assets/css/components/ui/doke-ui-system.css`

Page CSS may position form surfaces, but must not redefine the anatomy of primary/secondary action buttons.

## Required action layout

Desktop/tablet:

```text
[Secondary] [Primary]
```

Mobile:

```text
[Primary]
[Secondary]
```

## Canonical classes

Use `doke-form-actions` on form/modal action containers.

Primary actions:

```html
<button class="doke-btn doke-btn--primary">Continuar</button>
```

Secondary actions:

```html
<button class="doke-btn doke-btn--ghost">Cancelar</button>
```

Success actions are reserved for final confirmations. Navigation such as `Ver pedido` uses the primary blue action.
