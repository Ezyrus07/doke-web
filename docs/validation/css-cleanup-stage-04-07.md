# CSS Cleanup Stage 04-07

Objetivo: continuar a limpeza estrutural da home, reduzindo CSS ativo concorrente, removendo camadas responsivas antigas e iniciando a separação `layout/` sem tentar preservar pixel visual.

## Mudanças estruturais

1. Criado `assets/css/layout/page-rail.css` como contrato pequeno de rail/largura para substituir, na home, o import tardio do legado `components/shell/doke-shell-contract.css`.
2. `assets/css/pages/home-runtime.css` foi mantido como manifesto, mas perdeu imports globais duplicados de shell, cards, desktop/mobile shell e fragmentos móveis antigos.
3. `assets/css/pages/home.css` virou manifesto real: foram removidos 1.900+ linhas de overrides finais de página.
4. Foram retirados do manifesto da home imports de paridade/contrato responsivo tablet/header que competiam tarde na cascata.
5. Foram removidos arquivos antigos da home que não eram mais referenciados por CSS ativo.

## Arquivos removidos

```txt
assets/css/pages/home/mobile-feed-rails.css
assets/css/pages/home/tablet-shell-rail.css
assets/css/pages/home/mobile-layout.css
assets/css/pages/home/mobile-interactions.css
assets/css/pages/home/mobile-composition.css
assets/css/pages/home/mobile-alignment.css
assets/css/pages/home/mobile-hero-feed.css
```

## Resultado mensurável

Comparação contra o Stage 03 reportado anteriormente:

```txt
CSS total em assets/css: 375 -> 369
!important total em assets/css: 22.135 -> 21162

CSS ativo transitivo do index/home: 120 -> 84
!important ativo no index/home: 8.781 -> 3378
```

Observação: antes do Stage 04, o Stage 03 ainda tinha import ativo de `doke-shell-contract.css`, que sozinho adicionava 2.545 `!important` à cascata da home.

## Risco assumido

Alto risco visual na home, principalmente tablet/mobile. Isso é esperado nesta fase. O objetivo foi remover autoridade concorrente, não preservar acabamento visual.

Critérios mínimos para aceitar temporariamente:

- a página abre;
- conteúdo principal não some;
- scroll não trava;
- navegação básica não quebra;
- não há tela branca.

## Próximo alvo recomendado

`assets/css/components/shell/app-header.css` ainda é o maior arquivo ativo da home por `!important` após esta etapa. Ele deve ser dividido futuramente entre `layout/header-layout.css` e componentes de header, mas isso deve ser feito com cuidado porque afeta muitos HTMLs.
