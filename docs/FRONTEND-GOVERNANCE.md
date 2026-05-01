# Doke Frontend Governance

## Objetivo

Este documento define a regra de manutenção do frontend do Doke: componentes globais devem ter uma única fonte da verdade. Página não deve redesenhar componente compartilhado.

## Regra principal

### Página pode controlar

- conteúdo;
- ordem das seções;
- grid/layout específico da página;
- espaçamento externo entre blocos.

### Página não pode controlar

- altura interna de botão, input, header, bottom nav ou card global;
- border-radius de componente global;
- ícones, padding interno e alinhamento interno de componente global;
- cor, sombra e borda de componente global;
- estado ativo de navegação global fora do App Shell.

## App Shell mobile

A fonte oficial de header, search e bottom nav mobile é:

```txt
assets/js/components/mobile-app-shell.js
assets/css/components/shell/mobile-app-shell.css
```

Páginas migradas devem carregar somente o App Shell para chrome mobile. CSS antigo de header/nav não deve ser carregado nessas páginas.

## Fluxo correto para alteração visual

1. Identificar se o elemento é global ou específico de página.
2. Se for global, alterar o contrato do componente.
3. Se for local, alterar apenas o CSS da página.
4. Rodar a auditoria:
   ```bash
   node scripts/audit-frontend-contracts.js
   ```
5. Validar em mobile e desktop.

## Critério de aceite para novo componente global

Um componente só entra como oficial se tiver:

- classe canônica;
- CSS em `assets/css/components/`;
- exemplo no `docs/ui-kit.html`;
- nenhuma dependência de uma página específica;
- tokens globais em vez de valores soltos sempre que possível.

## Proibições

Evite:

- criar `*-fix.css`, `*-lock.css`, `stage-*`, `hotfix-*` como solução permanente;
- usar `!important` fora de arquivo de transição/legado;
- duplicar o mesmo componente em vários HTMLs;
- corrigir alinhamento global em CSS de página;
- criar variação visual só porque uma página “precisa ficar parecida”.

## Stage 10 — UI System obrigatório

A partir desta etapa, todas as páginas principais migradas devem carregar:

```html
<link rel="stylesheet" href="assets/css/components/ui/doke-ui-system.css?v=20260501-ui-contract-v1">
```

Esse arquivo é a fonte oficial para:

- `.doke-btn` e variantes;
- `.doke-icon-btn`;
- `.doke-input`, `.doke-select`, `.doke-textarea`;
- `.doke-card`, `.doke-surface`;
- `.doke-modal`, `.doke-drawer`, `.doke-popover`;
- `.doke-badge`, `.doke-chip`, `.doke-avatar`.

Arquivos de página podem controlar layout externo, mas não podem redefinir anatomia visual de componentes globais.

## Stage 12 — Bridge de componentes legados

Classes antigas podem existir apenas como compatibilidade semântica ou para JS legado. A aparência deve vir dos contratos canônicos `.doke-*`, principalmente `assets/css/components/ui/doke-ui-system.css`.

A bridge não é lugar para novo design. Ela é uma camada de transição para manter consistência visual até a migração completa para classes `.doke-*`.

Nova regra:

- Página pode organizar layout externo.
- Página não pode redefinir anatomia de botão, input, modal, card, chip, avatar ou surface.
- Se um padrão precisar mudar, a alteração deve acontecer primeiro no `doke-ui-system.css`.
