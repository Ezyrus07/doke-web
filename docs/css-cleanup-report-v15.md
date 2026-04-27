# CSS Cleanup v15 — Components / UI Surface

## Alvo
`assets/css/components/ui-surface-system.css`

## Mudança
O arquivo monolítico de superfície foi convertido em um manifesto que importa módulos menores dentro de `assets/css/components/ui-surface/`.

## Resultado
- `ui-surface-system.css` deixou de concentrar tokens, overlay, superfícies, botões, formulários, cards e responsividade no mesmo arquivo.
- A ordem da cascata foi preservada por imports explícitos.
- O original foi preservado em `archive/css-legacy/components-v15/ui-surface-system.css`.

## Módulos criados
- `tokens.css`
- `overlay-root.css`
- `surface-contract.css`
- `dropdowns-menus.css`
- `buttons-close.css`
- `forms-controls.css`
- `cards-media.css`
- `responsive.css`
- `README.md`

## Risco
Baixo-médio. A mudança é estrutural, mas mexe em um contrato global sensível. O visual esperado é o mesmo.
