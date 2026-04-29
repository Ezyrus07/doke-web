# Doke — Design System Guide

Este guia define as regras de organização visual e estrutural do frontend do Doke. Ele existe para impedir que o projeto volte a acumular CSS duplicado, arquivos temporários e correções locais sem padrão.

## 1. Princípio central

Nenhuma página deve redesenhar componentes globais.

Página pode controlar:

- layout específico;
- ordem dos blocos;
- espaçamento contextual;
- variações exclusivas daquela tela.

Página não deve recriar:

- botão;
- card;
- modal;
- painel mobile;
- header;
- bottom nav;
- input;
- popover;
- drawer;
- close button;
- estado ativo;
- tokens visuais.

## 2. Camadas oficiais de CSS

A arquitetura deve seguir esta separação:

```txt
assets/css/
  core/
  components/
  patterns/
  pages/
```

### core/

Contém fundações globais.

Use para:

- tokens;
- reset/base;
- tipografia global;
- layout global;
- responsividade base;
- utilidades genéricas.

Não use para componentes específicos.

Arquivos principais:

```txt
assets/css/core/tokens.css
assets/css/core/responsive-audit.css
```

### components/

Contém componentes reutilizáveis.

Use para:

- header;
- bottom nav;
- botões;
- cards;
- painéis mobile;
- modais;
- drawers;
- inputs;
- tabs;
- chips.

Arquivos criados/consolidados recentemente:

```txt
assets/css/components/navigation/header-desktop.css
assets/css/components/navigation/header-mobile.css
assets/css/components/navigation/bottom-nav.css
assets/css/components/actions/action-button.css
assets/css/components/panels/mobile-panel.css
assets/css/components/cards/card-system.css
assets/css/components/shell/app-shell.css
```

### patterns/

Contém composições reutilizáveis que não são componentes isolados.

Exemplos:

- fluxo de orçamento;
- fluxo de endereço;
- resumo de pedido;
- thread de mensagens;
- blocos de resultado de busca.

### pages/

Contém apenas layout específico de página.

Permitido:

- grid próprio da página;
- espaçamento entre seções;
- ajustes de composição exclusivos;
- ordem de blocos.

Proibido:

- redefinir `.doke-card`;
- redefinir `.doke-action-button`;
- redefinir header;
- redefinir bottom nav;
- recriar modal/painel;
- corrigir componente global com seletor local.

## 3. Tokens visuais

Todo valor visual repetido deve vir de `assets/css/core/tokens.css`.

Use tokens para:

- cores;
- sombras;
- radius;
- spacing;
- tipografia;
- tamanhos de botões;
- tamanhos de ícones;
- largura máxima;
- gutters;
- breakpoints documentados.

Evite valores soltos como:

```css
#2563eb
#ffffff
999px
24px
0 18px 45px rgba(...)
```

Prefira:

```css
var(--color-primary-bright)
var(--color-surface)
var(--radius-pill)
var(--space-6)
var(--shadow-card)
```

## 4. Botões

O padrão oficial é:

```txt
assets/css/components/actions/action-button.css
```

Use o componente para:

- busca;
- filtro;
- selecionar;
- agenda;
- ações rápidas;
- botões com ícone;
- botões ícone + texto.

Estados obrigatórios:

```html
aria-expanded="true|false"
aria-pressed="true|false"
aria-disabled="true"
disabled
```

Regra: não criar botão novo em CSS de página se ele tiver função já coberta por `action-button.css`.

## 5. Cards

O padrão oficial é:

```txt
assets/css/components/cards/card-system.css
```

Classes principais:

```txt
.doke-card
.doke-card--service
.doke-card--order
.doke-card--message
.doke-card--profile
```

Diferença de conteúdo é permitida. Diferença arbitrária de borda, radius, sombra, padding e tipografia não é.

## 6. Header

O padrão oficial é:

```txt
assets/css/components/navigation/header-desktop.css
assets/css/components/navigation/header-mobile.css
```

Toda página deve seguir o visual do `index.html` como referência. Páginas internas podem ter conteúdo diferente no header, mas não devem recriar estrutura visual própria.

## 7. Bottom nav

O padrão oficial é:

```txt
assets/css/components/navigation/bottom-nav.css
```

Estado ativo deve ser sempre por:

```html
aria-current="page"
```

Cada página com bottom nav deve ter exatamente um item ativo, salvo decisão explícita documentada.

## 8. Painéis mobile

O padrão oficial é:

```txt
assets/css/components/panels/mobile-panel.css
```

Use para:

- filtros;
- seleção;
- busca expandida;
- menus;
- ações contextuais.

Todo painel deve respeitar viewport, safe-area, scroll interno e não criar container duplicado.

## 9. Responsividade

Breakpoints de referência:

```txt
320px  mínimo crítico
360px  Android comum
390px  iPhone moderno
414px  telas mobile grandes
768px  tablet
1024px tablet horizontal/notebook pequeno
1366px desktop base
```

Toda mudança visual relevante deve ser checada em pelo menos:

```txt
390px
768px
1366px
```

## 10. Arquivos proibidos daqui para frente

Não criar novos arquivos com nomes temporários:

```txt
fix.css
stage.css
rescue.css
final.css
polish.css
cleanup.css
v2.css
v3.css
v4.css
```

Se a mudança é definitiva, o nome do arquivo também deve ser definitivo.

## 11. Ordem recomendada de importação CSS

```txt
1. fontes externas
2. core/tokens.css
3. core/base/layout/responsive base
4. shell
5. componentes compartilhados
6. patterns
7. CSS específico da página
8. camada final de auditoria responsiva, quando necessário
```

## 12. Regra de ouro

Antes de criar qualquer CSS novo, pergunte:

> Isto é componente reutilizável, pattern ou ajuste exclusivo de página?

Se a resposta for componente reutilizável, ele não pertence a `pages/`.
