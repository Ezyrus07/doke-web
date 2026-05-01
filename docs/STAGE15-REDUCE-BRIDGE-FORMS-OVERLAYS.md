# Stage 15 — Redução da bridge para forms e overlays

## Objetivo

Remover da `doke-legacy-bridge.css` a responsabilidade por forms, filtros, modais, drawers, popovers e surfaces principais.

A bridge agora deve ser apenas uma camada residual para:

- avatares antigos;
- chips/badges antigos;
- menus/dropdowns antigos.

## Mudanças aplicadas

- `assets/css/components/ui/doke-ui-system.css` evoluiu para v3.
- Foram adicionados contratos canônicos para:
  - `.doke-form-grid`;
  - `.doke-fieldset`;
  - `.doke-control-row`;
  - `.doke-filter-panel`;
  - variações de `.doke-overlay`, `.doke-modal`, `.doke-drawer` e `.doke-popover`.
- `assets/css/components/ui/doke-legacy-bridge.css` foi reduzido para escopo residual.
- `scripts/audit-legacy-bridge-scope.js` agora bloqueia forms/overlays na bridge.

## Regra técnica

Se um form, filtro, modal, drawer ou popover quebrar visualmente, a correção deve ser feita por uma das opções abaixo:

1. adicionar classe canônica `.doke-*` no HTML;
2. melhorar o contrato em `doke-ui-system.css`;
3. ajustar layout específico em `assets/css/pages/*` sem redesenhar anatomia do componente.

Não voltar a colocar essas regras na bridge.
