# Ciclo Global 15 — Modal, Dropdown e Tabs Ownership

## Objetivo

Criar contratos globais, de baixa especificidade, para modais, dropdowns/popovers e tabs sem redesenhar páginas existentes.

Esses contratos são base para novas implementações e migração progressiva. Eles não substituem automaticamente modais/tabs específicos já usados em páginas complexas.

## Novos contratos

- `assets/css/components/overlays/modal.css`
- `assets/css/components/dropdowns/dropdown.css`
- `assets/css/components/tabs/tabs.css`

## Classes e hooks principais

### Modal

- `.doke-modal`
- `.doke-modal__scrim`
- `.doke-modal__surface`
- `.doke-modal__header`
- `.doke-modal__body`
- `.doke-modal__footer`
- `.doke-modal__close`
- `[data-modal]`
- `[data-modal-surface]`
- `[data-modal-close]`

### Dropdown

- `.doke-dropdown`
- `.doke-dropdown__trigger`
- `.doke-dropdown__menu`
- `.doke-dropdown__item`
- `[data-dropdown]`
- `[data-dropdown-menu]`
- `[data-dropdown-item]`

### Tabs

- `.doke-tabs`
- `.doke-tabs__list`
- `.doke-tabs__tab`
- `.doke-tabs__panel`
- `[data-tabs]`
- `[data-tabs-list]`
- `[data-tab]`
- `[data-tab-panel]`

## Decisão técnica

Os contratos usam `:where()` para manter baixa especificidade e evitar briga com páginas antigas. Arquivos legados de modal, dropdown e tabs permanecem até migração por página.

## Data-ready/script-ready

Os novos hooks `data-*` permitem conectar comportamento por JS sem acoplar scripts a textos mockados ou seletores visuais frágeis.

## Validação

Comando criado:

```bash
npm run audit:modal-dropdown-tabs-ownership
```

A auditoria valida existência dos contratos, import no manifest global e ausência de `!important` nos arquivos novos.
