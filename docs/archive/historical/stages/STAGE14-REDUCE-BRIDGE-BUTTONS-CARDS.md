# Stage 14 — Redução da dependência da Legacy Bridge para botões e cards

## Objetivo

A Stage 13 adicionou classes canônicas `.doke-*` nos HTMLs principais. A Stage 14 começa a colher esse ganho: botões e cards deixam de ser governados pela `doke-legacy-bridge.css`.

## Mudanças principais

- `doke-legacy-bridge.css` foi reduzido para atuar apenas como ponte de transição em:
  - forms antigos;
  - filtros;
  - overlays/modais/drawers antigos;
  - avatares antigos;
  - menus/dropdowns antigos;
  - badges/chips residuais.
- Botões e cards agora devem depender dos contratos canônicos:
  - `.doke-btn`
  - `.doke-icon-btn`
  - `.doke-card`
  - `.doke-surface`
- `doke-ui-system.css` recebeu suporte extra para anatomia de cards e variações de botões:
  - `.doke-btn--compact`
  - `.doke-btn--link`
  - `.doke-card--flush`
  - `.doke-card--media`
  - `.doke-card__media`
  - `.doke-card__body`
  - `.doke-card__footer`
- Criada auditoria específica para impedir regressão:
  - `scripts/audit-legacy-bridge-scope.js`

## Regra nova

A bridge não pode mais receber estilos base para botão ou card. Se um botão/card ficar errado, a correção correta é:

1. adicionar/ajustar classes `.doke-*` no HTML; ou
2. melhorar `doke-ui-system.css`.

Nunca recriar padrão em CSS de página ou na bridge.

## Validação

Executado:

```bash
npm run audit:all
```

Resultado:

- Frontend strict: 0 críticos / 0 avisos
- UI canonical classes: 0 violações
- Bridge scope: 0 violações
- Architecture audit: passed
