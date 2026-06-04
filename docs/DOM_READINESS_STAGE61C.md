# Stage 61C — DOM Readiness Audit

## Objetivo

Mapear a prontidao das paginas do Doke para futura renderizacao dinamica sem alterar visual, CSS, HTML ou imports runtime.

Esta stage nao conecta services, repositories, controllers ou renderers ao DOM atual. Ela cria apenas um audit de leitura e uma documentacao de decisao para orientar a futura integracao backend.

## Por que esta etapa existe

Antes de conectar Supabase, Firebase ou API propria, o frontend precisa saber quais superficies do DOM podem receber dados dinamicos com baixo risco. Sem esse mapa, a integracao tende a espalhar `fetch`, montagem de HTML e tratamento de estado diretamente nas paginas.

A regra arquitetural continua:

```txt
service / adapter -> repository -> normalizer -> controller -> renderer -> DOM
```

A Stage 61C observa o lado final desse fluxo: o DOM.

## O que o audit verifica

O script `scripts/audit-dom-readiness.js` verifica, sem modificar arquivos:

- existencia das paginas principais;
- presenca de `data-page` no `body`;
- presenca de `main` ou estrutura principal equivalente;
- quantidade aproximada de superficies candidatas para listas/cards/secoes;
- presenca de atributos `data-*` que podem virar hooks estaveis;
- uso de inline style no HTML, apenas como aviso;
- imports de scripts sensiveis de shell/router, apenas como informacao;
- classificacao de prontidao por pagina.

## Classificacao

O audit classifica cada pagina em uma destas faixas:

- `ready-candidate`: estrutura parece segura para um primeiro controller futuro, desde que validada visualmente.
- `needs-dom-hooks`: pagina existe, mas precisa de hooks mais explicitos antes de renderizacao dinamica.
- `sensitive-page`: pagina deve ser tratada com cuidado por impacto visual, fluxo critico ou shell especial.
- `missing`: pagina esperada nao foi encontrada.

## Ordem recomendada para futura integracao

A ordem mais segura para começar backend depois da estabilizacao visual/responsiva e:

1. `notificacoes.html`
2. `pedidos.html`
3. `carteira.html`
4. `comunidade.html`
5. `resultados.html`
6. `anunciar-servico.html`
7. `detalhe-anuncio.html`
8. `perfil.html`
9. `mensagens.html`
10. `index.html`

Motivo: `index`, `perfil`, `detalhe-anuncio` e `mensagens` sao telas visualmente sensiveis ou com comportamento especial. Elas nao devem ser a primeira integracao real de backend.

## Regras para quando a logica for conectada

- Dados crus de backend nao entram direto em renderer.
- Todo payload deve passar por repository e normalizer.
- Controller recebe dependencias por parametro.
- Renderer recebe `root`, `data` e `state`; nao busca dados.
- Estados `loading`, `empty` e `error` precisam existir antes do primeiro fetch real.
- Hooks de DOM devem ser estaveis e sem estilo inline.
- CSS de pagina nao deve ser usado para corrigir falha de dados.
- Nenhum controller novo deve depender de variaveis globais se a dependencia puder ser injetada.

## O que esta stage nao faz

- Nao altera HTML.
- Nao altera CSS.
- Nao adiciona script nos HTMLs.
- Nao conecta backend real.
- Nao altera shell, router, header, sidebar ou core JS sensivel.
- Nao migra mocks estaticos para renderizacao dinamica.

## Proxima decisao recomendada

Depois desta stage, a recomendacao e pausar a trilha de backend e voltar para responsivo/CSS. Quando o visual estiver mais estavel, a proxima etapa tecnica pode ser uma integracao piloto em uma pagina de menor risco, preferencialmente `notificacoes.html` ou `pedidos.html`.
