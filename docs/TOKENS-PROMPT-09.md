# Prompt 09 — Consolidação de tokens visuais globais

## Objetivo
Criar uma base única de tokens para cores, sombras, radius, espaçamentos, tipografia, tamanhos de botões/ícones e breakpoints, substituindo valores soltos repetidos sem alterar drasticamente o visual atual.

## Arquivos alterados

```txt
assets/css/core/tokens.css
assets/css/components/ui-surface/tokens.css
assets/css/components/actions/action-button.css
assets/css/components/cards/card-system.css
assets/css/components/navigation/bottom-nav.css
assets/css/components/navigation/header-desktop.css
assets/css/components/navigation/header-mobile.css
assets/css/components/panels/mobile-panel.css
assets/css/components/shell/app-shell.css
assets/css/core/responsive-audit.css
```

## Decisões técnicas

- `assets/css/core/tokens.css` passa a ser a fonte principal para primitivos visuais.
- Tokens legados `--doke-*`, `--doke-ui-*`, `--surface-*`, `--internal-*` foram preservados como aliases para evitar regressão.
- Breakpoints foram documentados como tokens, mas os `@media` continuam usando valores literais porque CSS custom properties não funcionam como condição de media query.
- Componentes novos passaram a consumir tokens globais para reduzir duplicação de cores, sombras, radius e tamanhos.
- Não houve mudança estrutural de HTML nem redesenho visual.

## Tokens consolidados

```txt
cores: --color-*
sombras: --shadow-*
radius: --radius-*
espaçamentos: --space-*, --gutter-*
tipografia: --font-*, --font-size-*, --line-height-*
botões/ícones: --button-*, --icon-button-size, --size-icon-*
layout: --header-height, --mobile-header-height, --bottom-nav-height, --content-max-*
breakpoints documentados: --breakpoint-*
```

## Observação
A próxima limpeza mais segura é migrar CSS de páginas antigas para consumir esses tokens gradualmente. Não recomendo converter todos os arquivos legados de uma vez, porque ainda há estilos antigos carregados que podem depender de especificidade/cascata histórica.
