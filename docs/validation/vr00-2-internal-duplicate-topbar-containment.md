# VR00.2 — Internal Duplicate Topbar Containment

## Objetivo

Conter a duplicidade de cabeçalho que ainda aparecia em páginas internas após o containment da home. O problema não era polimento visual: era concorrência estrutural entre o `header.topbar` legado e o `header.app-header` atual.

## Causa raiz

O VR00.1 removeu a topbar duplicada do `index.html`, mas várias páginas internas ainda mantinham dois headers no mesmo fluxo:

- `header.topbar.topbar--location.internal-page-topbar` — legado;
- `header.app-header.*.home-side-meta` — header atual.

Essa duplicidade gerava a faixa branca superior com busca/progresso/avatar, enquanto o header atual também continuava renderizado abaixo, criando exatamente o vazamento visto no print.

## Arquivos de produção alterados

- `ajuda.html`
- `carteira.html`
- `comunidade.html`
- `notificacoes.html`
- `novidades.html`
- `pedidos.html`
- `perfil.html`

## O que foi feito

Removido o bloco `header.topbar.topbar--location.internal-page-topbar` das páginas que também já tinham `app-header` próprio.

Não foi usado CSS de força bruta. Não foi aplicado `display:none`. Não houve alteração em shell/sidebar/header global.

## O que não foi mexido

`avaliacao.html` ainda mantém um `header.topbar` legado porque, nesta base, ela não tem `app-header` concorrente. Remover esse header agora deixaria a página sem substituto estrutural. Essa página deve ser tratada depois em recuperação/migração específica, não dentro do containment de duplicidade.

## Resultado mensurável

- Páginas com topbar legada + app-header atual: `7 → 0`.
- Links CSS quebrados em HTML ativo: `0`.
- Imports CSS quebrados: `0`.
- CSS com chaves desbalanceadas: `0`.
- `!important` ativo: `0`.
- CSS ativo alcançável: `272` arquivos.
- Entry points CSS únicos: `21`.

## Risco

Risco moderado-baixo.

A remoção afeta apenas markup duplicado em páginas que já tinham header atual. O risco residual está em algum handler antigo procurar elementos da topbar removida, mas os seletores principais são opcionais e as validações de sintaxe passaram.

## Testes executados

- `npm run audit:css-import-map` — passed.
- `npm run audit:essential-asset-imports` — passed-with-follow-up.
- `npm run test:desktop-zoomout-contract` — Desktop zoom-out contract OK.
- `node --check assets/js/core/app.js` — passed.
- `node --check assets/js/core/ipad-safari-early-guard.js` — passed.

## Próximo alvo

VR01 — Home Hero/Search/CTA Restoration.

Agora o bloqueador de header duplicado foi removido das páginas com header concorrente. O próximo patch pode começar a recuperar o bloco visual da home sem construir por cima de uma estrutura errada.
