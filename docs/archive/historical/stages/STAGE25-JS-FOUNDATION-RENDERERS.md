# Stage 25 — JS Foundation, Renderers e Controllers não invasivos

## Objetivo

Preparar a próxima fase de lógica real sem alterar visualmente as páginas. Esta etapa cria a base de JavaScript para renderizar dados, controlar estados de tela e iniciar controllers por página de forma segura.

## Arquivos criados

```txt
assets/js/core/dom.js
assets/js/core/events.js
assets/js/core/view-state.js
assets/js/controllers/page-controller-registry.js
assets/js/controllers/controller-bootstrap.js
assets/js/controllers/index-controller.js
assets/js/controllers/resultados-controller.js
assets/js/controllers/pedidos-controller.js
assets/js/controllers/mensagens-controller.js
assets/js/controllers/comunidade-controller.js
assets/js/controllers/comunidade-interna-controller.js
assets/js/controllers/perfil-controller.js
assets/js/controllers/wallet-controller.js
assets/js/controllers/notificacoes-controller.js
assets/js/controllers/configuracoes-controller.js
assets/js/renderers/service-card-renderer.js
assets/js/renderers/order-card-renderer.js
assets/js/renderers/community-card-renderer.js
assets/js/renderers/notification-renderer.js
scripts/audit-js-foundation-contracts.js
```

## Regra de segurança

Os controllers desta etapa são deliberadamente não invasivos. Eles não removem HTML existente, não redesenham cards existentes e não alteram CSS. O objetivo é preparar o ponto de entrada para migração progressiva.

## Contrato

- `assets/js/core/*` fornece utilitários compartilhados.
- `assets/js/renderers/*` cria elementos usando classes canônicas `.doke-*`.
- `assets/js/controllers/*` será o local correto para lógica de página.
- Página não deve acessar Supabase/Firebase diretamente quando a camada de services estiver pronta.

## Próxima etapa sugerida

Conectar uma página de baixo risco aos mocks usando renderers, preferencialmente `notificacoes.html` ou `comunidade.html`, porque são fluxos mais isolados que home/resultados.
