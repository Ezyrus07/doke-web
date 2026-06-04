# Stage 16 — Remoção da legacy bridge residual

## Objetivo

Remover a dependência da camada `doke-legacy-bridge.css` do fluxo principal do site.

Até a Stage 15, a bridge ainda segurava resíduos de:

- avatares antigos;
- chips/badges antigos;
- menus/dropdowns antigos.

Nesta etapa, esses resíduos passaram a ser absorvidos pelo contrato canônico `doke-ui-system.css`.

## Alterações realizadas

- Removido o carregamento de `assets/css/components/ui/doke-legacy-bridge.css` das 10 páginas principais.
- Removido o arquivo `assets/css/components/ui/doke-legacy-bridge.css` do pacote.
- Promovidos badges residuais para classes canônicas `.doke-badge` / `.doke-chip` onde necessário.
- Promovidos menus/dropdowns para `.doke-menu` sem quebrar compatibilidade com classes antigas de JS.
- Adicionado contrato global de menu ao `doke-ui-system.css`:
  - `.doke-menu`
  - `.doke-menu__header`
  - `.doke-menu__body`
  - `.doke-menu__footer`
  - `.doke-menu__item`
  - `.doke-menu__icon`

## Decisão técnica

Classes antigas podem continuar no HTML quando forem necessárias para JS legado ou escopo semântico da página, mas elas não devem mais depender de CSS bridge para parecerem parte do sistema visual.

A fonte de verdade agora é:

```txt
assets/css/components/ui/doke-ui-system.css
```

## Validação

Auditorias executadas separadamente:

```bash
node scripts/audit-frontend-contracts.js --strict
node scripts/audit-ui-canonical-classes.js
node scripts/audit-legacy-bridge-scope.js
node scripts/audit-project-architecture.js
```

Resultado:

```txt
Frontend strict: 0 críticos / 0 avisos
UI canonical classes: 0 violações
Legacy bridge removal: 0 violações
Architecture audit: passed
```

## Próxima frente

A próxima etapa recomendada é migrar componentes de domínio para contratos mais explícitos:

- `.doke-service-card`
- `.doke-order-card`
- `.doke-message-card`
- `.doke-community-card`
- `.doke-wallet-card`

Isso reduz a dependência de nomes antigos como `service-card`, `order-card` e `community-card` como fonte visual.
