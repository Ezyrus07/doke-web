# CSS Cleanup Stage 02 — Tablet/Page Remenda Retirement

## Objetivo

Reduzir competição estrutural de CSS sem tentar corrigir pixels do `index.html` por cima da cascata. Esta etapa prioriza manutenção: menos arquivos de remendo ativos, menos `!important` no repositório e menos autoridade de tablet espalhada em arquivos de página.

## Mudança principal

O `index.html` deixou de carregar o contrato legado:

- `assets/css/pages/home/tablet-responsive-layout.css`

Esse arquivo era uma camada page-level de tablet com alta especificidade, muitos seletores `html.home-index-root body.home-index-shell...` e centenas de `!important`. Ele competia com shell, header, rail, cards e patterns, dificultando identificar quem era a autoridade real no tablet/mobile.

A autoridade de shell/header/rail deve ser consolidada em `layout`/`components`, não em uma página tablet específica.

## Arquivos removidos do projeto

Removidos por estarem sem referência ativa ou por serem remendos tablet/page-level que não devem continuar como autoridade:

```txt
assets/css/pages/home/tablet-responsive-layout.css
assets/css/pages/home/tablet-safari-layout.css
assets/css/pages/home-tablet-v2.css
assets/css/components/shell/ipad-safari-scroll-rescue.css
assets/css/pages/perfil/tablet-portrait-contract.css
assets/css/components/shell/tablet-app-parity.css
assets/css/components/shell/tablet-shell-contract.css
assets/css/components/shell/marketplace-page-contract.css
assets/css/components/shell/header-rail-alignment-contract.css
```

## Arquivo alterado

```txt
assets/css/pages/home.css
```

Alteração: remoção do import de `home/tablet-responsive-layout.css` e atualização do comentário de autoridade. A home não deve mais declarar que sidebar/search/header são propriedade desse arquivo legado.

## Métricas

Comparando com o Stage 01:

```txt
CSS ativos em assets/css: 384 -> 375
!important no repositório CSS: 27.423 -> 23.056
Redução total: 4.367 ocorrências de !important
```

Na cascata ativa do `index.html`:

```txt
CSS transitivos: 156 -> 155
!important ativos: 11.723 -> 11.176
Redução ativa no index: 547 ocorrências de !important
```

## Risco assumido

Alto risco visual em tablet, intencional e aceito nesta fase. Esta etapa troca preservação visual instável por redução de dívida estrutural.

Possíveis efeitos:

- tablet da home pode perder ajustes finos antigos;
- header/rail pode ficar menos polido temporariamente;
- algumas seções podem respirar diferente;
- o bug de loading vs carregado pode não desaparecer imediatamente, mas agora há uma camada concorrente a menos.

## Critério técnico

A etapa é considerada válida se:

- o site continua abrindo;
- o conteúdo principal não some;
- não há erro sintático em CSS;
- a cascata ativa tem menos arquivos concorrendo;
- a próxima etapa fica mais fácil de diagnosticar.

## Próxima etapa recomendada

Consolidar `home-runtime.css`, que ainda é o maior arquivo ativo de home e contém muitas regras de comportamento/visual misturadas. O objetivo deve ser separar nele:

1. regras realmente necessárias de runtime;
2. regras de cards que pertencem a `components/cards`;
3. regras de rail/carrossel que pertencem a `patterns`;
4. regras de página que podem ficar em `pages/home.css`;
5. remendos obsoletos que podem ser removidos.
