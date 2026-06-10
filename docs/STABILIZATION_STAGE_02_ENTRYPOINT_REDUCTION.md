# Stage 02 — Redução de entrypoints CSS/JS

## Objetivo

Reduzir a quantidade de CSS/JS concorrente por página sem alterar visual por tentativa. Esta etapa existe porque o projeto tem muitos arquivos ativos/importados e várias páginas carregam contratos repetidos que podem funcionar como overrides tardios acidentais.

## Regra de segurança

Não remover assets runtime apenas porque parecem duplicados. Antes de remover, provar:

1. o asset já é carregado por uma autoridade anterior;
2. sua reaplicação tardia não está sendo usada para vencer uma cascata antiga;
3. a página direta e a navegação interna continuam equivalentes;
4. mobile, tablet e desktop permanecem visualmente estáveis.

## Ordem recomendada

1. Rodar `npm run audit:stage02-entrypoint-candidates`.
2. Escolher **uma página por patch**.
3. Remover no máximo um grupo coeso de CSS direto redundante.
4. Validar screenshots antes/depois.
5. Se houver mudança visual não planejada, reverter e consolidar a autoridade correta em `core`, `components` ou `patterns`.

## Páginas alvo desta etapa

1. `resultados.html`
2. `pedidos.html`
3. `perfil.html`
4. `mensagens.html`
5. `index.html`

## O que pode ser removido nesta etapa

Pode ser candidato:

- link direto de CSS já importado por `assets/css/core/components.css` ou outro manifest carregado antes;
- script duplicado ou carregado em página sem DOM relacionado;
- CSS de componente carregado duas vezes com query string diferente;
- CSS de page que virou manifest antigo e não controla mais a página.

Ainda assim, tudo exige validação visual.

## O que não pode ser feito

- Não criar arquivo `fix`, `hotfix`, `final`, `stage`, `adjustment`, `rescue`, `cleanup` ou similar.
- Não mover regras para CSS novo só para reduzir contagem.
- Não trocar problemas de CSS por JS.
- Não remover `!important` em massa nesta etapa.
- Não misturar redução de entrypoint com redesign visual.
- Não alterar anatomia de cards, header, sidebar ou shell dentro desta etapa.

## Critérios de aceite

Uma página só passa nesta etapa quando:

- a contagem direta de CSS/JS diminui;
- o CSS carregado total diminui ou a cascata fica comprovadamente mais simples;
- nenhum novo `!important` é introduzido;
- não há mudança visual não intencional;
- URL direta e navegação interna continuam equivalentes;
- relatório final documenta arquivos removidos/consolidados, riscos e testes.

## Próximo patch runtime recomendado

Se houver ambiente com Playwright/Safari/Chrome para validar, começar por uma página crítica e pequena em comportamento:

- `resultados.html`: bom candidato para reduzir duplicidades de cards/rails, mas exige comparação com `index.html`.
- `pedidos.html`: candidato importante por ter header/transição sensível, mas exige validação de navegação interna.

Sem validação visual, manter esta etapa como diagnóstico e não remover runtime.
