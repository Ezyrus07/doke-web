# VR02.1 — Global App Header Contract Standardization

## Objetivo
Padronizar o header global do Doke antes de avançar para cards/destaques, evitando correções por página e impedindo que cada HTML mantenha uma anatomia visual própria.

## Causa raiz
Os prints mostraram que o header ainda tinha variações concorrentes entre home e páginas internas:

- largura visual do header não suficientemente vinculada ao rail da página;
- superfície/sombra dos botões do topo mais pesada do que o necessário;
- profile pill com comportamento diferente entre páginas;
- avatar `DK` sem contrato global forte para permanecer circular;
- overrides internos importados depois de `layout/header.css`, principalmente em páginas de lista.

## Decisão de arquitetura
A autoridade final do header deve ficar em `assets/css/layout/header.css`.

Páginas podem escolher quais ações aparecem, mas não devem redefinir a anatomia do header, botão, profile pill ou avatar.

## Arquivos alterados

- `assets/css/layout/header.css`
- `assets/css/pages/internal-foundation.css`
- `assets/css/pages/home.css`
- `docs/validation/vr02-1-global-header-contract-standardization.md`
- `docs/validation/vr02-1-global-header-contract-standardization-report.json`

## O que foi feito

- Criado contrato global tardio em `layout/header.css` para `.app-header`.
- Header e `app-header__inner` passam a seguir `--doke-header-rail / --doke-page-rail` em todas as páginas com `has-global-header`.
- Superfície/sombra dos controles do header foi suavizada.
- Profile pill foi padronizado globalmente.
- Avatar `DK` recebeu contrato forte de círculo: largura, altura, `flex-basis`, `aspect-ratio`, `border-radius` e `overflow`.
- `internal-foundation.css` passou a reimportar `layout/header.css` no final da fundação interna, para que o layout seja a autoridade final depois dos componentes internos.
- `home.css` teve cache-busting atualizado para garantir que o Live Server/browser pegue a versão nova do header.

## O que não foi feito

- Não houve alteração em cards, categorias, workers, publicações ou carrosséis.
- Não houve alteração em sidebar global.
- Não houve `!important`.
- Não houve restauração de topbar antiga.
- Não houve CSS específico por página para corrigir o header.

## Resultado esperado

- Header mais consistente entre home, pedidos, notificações, carteira, perfil, comunidade, novidades e ajuda.
- Avatar `DK` circular em todos os headers que usam `.home-side-meta__profile`.
- Menos sombra/faixa pesada no topo.
- Header e conteúdo principal obedecendo ao mesmo rail visual.

## Validações

- Links CSS quebrados em HTML ativo: 0
- Imports CSS quebrados: 0
- CSS com chaves desbalanceadas: 0
- `!important` ativo: 0
- Páginas com `topbar` antiga concorrendo com `app-header`: 0
- `npm run audit:css-import-map`: passed
- `npm run audit:essential-asset-imports`: passed-with-follow-up
- `npm run test:desktop-zoomout-contract`: passed
- `node --check assets/js/core/app.js`: passed

## Risco
Risco moderado-baixo.

O header é uma área estrutural sensível, mas a alteração foi aplicada no dono correto (`layout/header.css`) e mantida como contrato global. Não houve uso de força bruta, `!important` ou CSS por página.

## Próximo alvo recomendado
VR03 — Home Featured Cards/Destaques Restoration.

Antes de seguir, validar visualmente no Live Server:

- home desktop;
- pedidos desktop;
- notificações desktop;
- perfil/carteira, se possível;
- pelo menos um breakpoint tablet.
