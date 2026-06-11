# VR00.1 — Home Duplicate Header Containment

## Causa raiz

A home ainda possuía dois cabeçalhos concorrentes no DOM:

- `header.topbar.topbar--location.internal-page-topbar.home-index-topbar`, legado da topbar interna;
- `header.app-header.app-header--home.home-side-meta`, autoridade atual da home.

Além disso, `assets/js/core/ipad-safari-early-guard.js` ainda continha regras injetadas em runtime que forçavam a topbar antiga da home a aparecer no iPad portrait e escondiam o `app-header` atual.

## Decisão

Remover a topbar legada do `index.html` e retirar do early guard apenas as regras específicas que promoviam o header antigo da home. A autoridade ativa da home permanece em `.app-header--home.home-side-meta`.

## Arquivos alterados

- `index.html`
- `assets/js/core/ipad-safari-early-guard.js`
- `docs/validation/vr00-1-home-duplicate-header-containment.md`
- `docs/validation/vr00-1-home-duplicate-header-containment-report.json`

## O que não foi feito

- Não houve restauração visual do hero/search/CTA.
- Não houve alteração em shell/sidebar global.
- Não houve criação de CSS novo.
- Não houve `display:none` de emergência para mascarar a duplicidade.

## Resultado

- Markup `.home-index-topbar` no `index.html`: `False`
- Busca global antiga da topbar no `index.html`: `False`
- Early guard ainda força `.home-index-topbar`: `False`
- Early guard ainda esconde `.app-header--home`: `False`
- Links CSS quebrados em HTML ativo: `0`
- Imports CSS quebrados: `0`
- CSS com chaves desbalanceadas: `0`
- Arquivos CSS ativos com `!important`: `0`

## Risco

Risco moderado-baixo. A mudança remove uma estrutura duplicada da home, mas não altera o contrato dos headers internos das outras páginas. O risco residual fica em interações mobile antigas que ainda procuravam elementos da topbar removida; os handlers atuais toleram ausência por `querySelector` opcional ou escopo de evento.

## Próximo passo

`VR01 — Home Hero/Search/CTA Restoration`, agora sem construir o bloco visual em cima de um header duplicado.
