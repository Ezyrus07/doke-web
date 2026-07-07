# Validação frontend Doke

## Validação mínima por patch

```bash
node --check <arquivos-js-alterados>
git diff --check
npm run audit:agent-governance
```

`audit:agent-governance` também executa os contratos de topo e ações dos fluxos (`audit:form-page-top-contract` e `audit:form-button-contract`), o contrato do app header compartilhado (`audit:shared-app-header-contract`) e o contrato de referências de rótulo (`audit:page-label-references`). Esses gates impedem que `orcamento.html`, `tornar-profissional.html`, `anunciar-servico.html` e `pagamento-profissional.html` percam o contrato canônico de topo/rail dos fluxos, voltem a redesenhar anatomia de botões em CSS de página, percam classes canônicas de ação, usem header contextual sem container compartilhado quando houver pílulas de ação ou mantenham `aria-labelledby` apontando para IDs inexistentes.

## Quando rodar validação visual

Obrigatória ao mexer em:

- shell;
- header;
- rail/largura;
- scroll;
- roteador;
- CSS global;
- links CSS em vários HTMLs.

Viewports mínimos:

```txt
Desktop: 1366x768
Tablet: 820x1180
Mobile: 390x844
```

Páginas mínimas:

```txt
index.html
perfil.html
pedidos.html
mensagens.html
notificacoes.html
comunidade.html
resultados.html
detalhe-anuncio.html
ajuda.html
```

## Checks obrigatórios

```js
document.documentElement.scrollWidth <= document.documentElement.clientWidth
```

Para navegação:

```js
window.__reloadProbe = Math.random();
window.__loadCount = 1;
addEventListener('load', () => window.__loadCount++);

DokeNavigate('/perfil.html');
DokeNavigate('/pedidos.html');
DokeNavigate('/mensagens.html');
DokeNavigate('/resultados.html');
DokeNavigate('/index.html');

window.__loadCount === 1;
document.body.dataset.page;
window.scrollTo(0, 500);
window.scrollY > 0;
```

## Se Playwright não rodar

Declarar explicitamente:

- motivo;
- comandos alternativos executados;
- páginas/viewports que precisam de validação manual.

## Reforma responsiva — gate obrigatório

O contrato automatizado `npm run test:responsive-contract` deve usar o mesmo conjunto mínimo solicitado para mudanças de shell, header, rail/largura, scroll, CSS global ou links CSS em vários HTMLs:

```txt
1366x768
1280x802
820x1180
608x926
390x844
```

Páginas de validação obrigatória:

```txt
index.html
pedidos.html
perfil.html
detalhe-anuncio.html
resultados.html
mensagens.html
notificacoes.html
comunidade.html
ajuda.html
```

A primeira etapa da reforma responsiva não deve alterar visual global antes de o gate de validação refletir esses viewports e páginas.

## Global structural reform validation gate — 2026-06-09

Before any whole-site cleanup, CSS consolidation, `!important` removal, header/rail rewrite, card-authority migration or script-loading change, run at minimum:

```bash
npm run audit:agent-governance
npm run audit:global-structural-debt
npm run test:card-loading-parity-contract
npm run test:first-paint-loading-contract
```

If Playwright/browser validation is unavailable, runtime visual files must not be broadly rewritten. Limit work to generated audits, documentation, or one isolated page/component with explicit rollback.

Required manual/visual matrix for runtime reform:

- Viewports: `390x844`, `820x1180`, `1366x768`.
- Pages: `index.html`, `perfil.html`, `pedidos.html`, `mensagens.html`, `notificacoes.html`, `comunidade.html`, `resultados.html`, `detalhe-anuncio.html`, `ajuda.html`.
- Checks: no horizontal overflow, header/content rail alignment, direct URL equals internal navigation, no first-paint/loaded geometry shift, no new `!important`.

## Validação de fechamento — configuracoes.html

Antes de considerar `configuracoes.html` fechado após qualquer alteração futura, validar manualmente ou por browser automation estes viewports:

```txt
430x932
608x926
812x1080
1080x812
1181x768
```

Critérios específicos:

- header mobile com título correto e ações no eixo global;
- lista alinhada ao rail do header;
- até `1180px`, a tela permanece em lista única;
- até `1180px`, clicar em `Perfil`, `Segurança`, `Pagamentos`, `Tornar-se profissional`, `Disponibilidade`, `Notificações` ou `Privacidade` abre uma tela interna, não um painel abaixo da lista;
- detalhe de seção possui botão de voltar e retorna para a lista;
- a partir de `1181px`, o workspace de duas colunas pode aparecer;
- bottom nav não cobre os botões ou campos do detalhe em mobile;
- nenhum novo `!important`, inline style ou gutter local de rail.

## Validação de fechamento — carteira.html

Antes de considerar `carteira.html` fechado após qualquer alteração futura, validar manualmente ou por browser automation estes viewports:

```txt
430x932
480x1040
608x926
812x1080
1080x812
1366x768
```

Critérios específicos:

- desktop exibe resumo operacional compacto, KPIs, movimentações e conta de recebimento sem hero gigante;
- mobile/tablet exibem a mesma estrutura canônica, sem blocos `wallet-mobile-*` legados;
- header mobile mostra `Carteira` e ações alinhadas à direita, sem slot vazio sobrando;
- drawer mobile/tablet contém o item `Carteira` e o estado ativo correto em `carteira.html`;
- `Sacar saldo` abre modal no padrão de cobrança, com superfície visível, botão fechar/cancelar e confirmação;
- `Estatísticas` troca para a view analítica interna com gráficos, não abre modal;
- `Voltar ao extrato` retorna para a visão principal;
- gráficos de estatísticas permanecem legíveis em desktop, tablet e mobile, sem área preta chapada, sem corte de rosca e sem fundo branco gigante externo;
- KPIs e movimentações usam ícones refinados, sem `fill` preto herdado;
- bottom nav não cobre movimentações, modais ou botões de ação em mobile;
- sem overflow horizontal;
- nenhum novo `!important`, inline style, gutter local de rail ou alteração indevida no shell/header/sidebar global.

Comandos mínimos após alteração em carteira:

```bash
node --check assets/js/pages/carteira.js
node --check assets/js/ui/mobile-drawer-standard.js
npm run audit:layout
node tools/audit-css-contract.js
npm run audit:agent-governance
```

Se browser automation não estiver disponível, validar visualmente no Live Server pelo menos em iPhone/Pixel, iPad mini vertical, iPad horizontal e desktop.


## Contrato de ações de conteúdo — ajuda e novidades

`npm run audit:content-action-contract` valida CTAs de páginas de conteúdo que não pertencem aos fluxos de formulário.

O gate cobre inicialmente:

```txt
ajuda.html
novidades.html
assets/css/pages/ajuda.css
assets/css/pages/novidades.css
assets/css/pages/flow-foundation.css
```

Ele falha quando:

- CTAs de suporte ou novidades perdem `doke-btn` e o modificador canônico adequado;
- CTAs de largura total deixam de usar `doke-btn--block`;
- CTAs em formato pílula deixam de usar `doke-btn--pill`;
- CSS de página volta a controlar anatomia de ação, como altura, raio, borda, background, sombra, tipografia, padding ou cursor;
- o manifesto compartilhado de fluxos deixa de carregar `assets/css/components/buttons.css`.

Esse gate roda dentro de `npm run audit:agent-governance`.

## Contrato de superfícies de conteúdo — ajuda e novidades

`npm run audit:content-surface-contract` valida a anatomia raiz das superfícies de conteúdo que não pertencem aos fluxos de formulário.

O gate cobre inicialmente:

```txt
ajuda.html
novidades.html
assets/js/pages/ajuda.js
assets/css/pages/ajuda.css
assets/css/pages/novidades.css
assets/css/components/internal/surface-contract.css
```

Ele falha quando:

- cards/painéis de `ajuda.html` ou `novidades.html` perdem `content-surface`;
- superfícies clicáveis de novidades perdem `content-surface--interactive`;
- o estado vazio dinâmico de ajuda deixa de consumir `content-surface`;
- CSS de página volta a controlar `background`, `border`, `border-radius` ou `box-shadow` da superfície raiz;
- o contrato compartilhado de superfícies deixa de definir `content-surface` ou `content-surface--interactive`.

Esse gate roda dentro de `npm run audit:agent-governance`.

## Contrato de tabs/filtros de conteúdo — ajuda e novidades

`npm run audit:content-tab-contract` valida tabs e filtros compactos de páginas de conteúdo que não pertencem aos fluxos de formulário.

O gate cobre inicialmente:

```txt
ajuda.html
novidades.html
assets/css/pages/ajuda.css
assets/css/pages/novidades.css
assets/css/pages/flow-foundation.css
assets/css/components/tabs/tabs.css
```

Ele falha quando:

- filtros de ajuda ou novidades perdem `doke-tab-pill`;
- `flow-foundation.css` deixa de carregar `assets/css/components/tabs/tabs.css`;
- `assets/css/components/tabs/tabs.css` deixa de definir `doke-tab-pill`, ícones e estados ativos;
- CSS de página volta a controlar anatomia de tabs, como altura, padding, raio, borda, background, sombra, cor, fonte, cursor, ícone ou transição;
- CSS de página usa `help-tab` ou `news-filter` para algo além de encaixe responsivo no trilho.

Esse gate roda dentro de `npm run audit:agent-governance`.

## Contrato de busca de conteúdo — ajuda

`npm run audit:content-search-contract` valida o campo de busca principal de `ajuda.html`.

O gate cobre inicialmente:

```txt
ajuda.html
assets/css/pages/ajuda.css
assets/css/pages/ajuda-foundation.css
assets/css/components/search/search-bar.css
assets/css/core/components.css
```

Ele falha quando:

- a busca de ajuda perde `doke-search-pill` ou `doke-search-pill--toolbar`;
- o input perde `doke-search-pill__input` ou `doke-input`;
- `assets/css/pages/ajuda.css` volta a controlar a anatomia de `.help-center-search` ou descendentes;
- `assets/css/components/search/search-bar.css` deixa de definir a variante `doke-search-pill` e seus tokens;
- `assets/css/pages/ajuda-foundation.css` deixa de carregar a autoridade de busca pill;
- o manifesto de componentes core deixa de carregar a autoridade base de busca compartilhada.

Esse gate roda dentro de `npm run audit:agent-governance`.

## Contrato de disclosure/FAQ de conteúdo — ajuda

`npm run audit:content-disclosure-contract` valida o FAQ em `ajuda.html` como disclosure de conteúdo compartilhado.

O gate cobre inicialmente:

```txt
ajuda.html
assets/css/pages/ajuda.css
assets/css/components/internal/surface-contract.css
assets/css/pages/internal-shell.css
```

Ele falha quando:

- a lista do FAQ perde `content-disclosure`;
- os itens `details` perdem `content-disclosure__item`;
- os `summary` perdem `content-disclosure__summary`;
- os chevrons perdem `content-disclosure__chevron`;
- as respostas perdem `content-disclosure__body`;
- `assets/css/pages/ajuda.css` volta a controlar anatomia de disclosure, como borda, raio, fundo, padding, tipografia, divisor, ícone, hover ou estado aberto;
- `assets/css/components/internal/surface-contract.css` deixa de definir o contrato `content-disclosure`;
- `assets/css/pages/internal-shell.css` deixa de carregar a autoridade de superfície/disclosure compartilhada.

Esse gate roda dentro de `npm run audit:agent-governance`.

## Gate — ícones de superfície de conteúdo

Use:

```bash
npm run audit:content-icon-contract
```

Esse gate valida que `ajuda.html` e `novidades.html` consomem `content-surface-icon` nos ícones internos de cards/painéis, incluindo os ícones de capa `news-card__cover-icon`, e que a anatomia visual está centralizada em `assets/css/components/internal/surface-contract.css`.

O audit falha quando CSS de página volta a controlar tamanho, raio, fundo, sombra, cor, blur/backdrop, SVG, stroke ou fill dos ícones de superfície. Posicionamento contextual, como `right`, `bottom`, `position` ou margem local, continua permitido no CSS de página.

## Contrato de metadados de conteúdo — novidades

`npm run audit:content-meta-contract` valida que os metadados compactos de `novidades.html` usam contratos compartilhados.

Cobertura:

```txt
novidades.html
assets/css/pages/novidades.css
assets/css/components/status/chips-badges.css
assets/css/components/buttons.css
assets/css/core/components.css
assets/css/pages/flow-foundation.css
```

O gate falha se:

- `news-kicker` perder `doke-chip doke-chip--content`;
- kickers sobre capa perderem `doke-chip--on-media`;
- `news-feature__badge` perder `doke-badge doke-badge--success doke-badge--content`;
- pins laterais perderem `doke-icon-btn doke-icon-btn--soft`;
- `novidades.css` voltar a controlar anatomia de chip, badge ou pin;
- os componentes compartilhados deixarem de declarar os modificadores necessários.

## Contrato de listas laterais de conteúdo — novidades

`npm run audit:content-side-list-contract` valida que a lista de cards importantes em `novidades.html` usa a anatomia compartilhada de side list.

Cobertura:

```txt
novidades.html
assets/css/pages/novidades.css
assets/css/components/internal/surface-contract.css
assets/css/pages/internal-shell.css
```

O gate falha se:

- `news-important-list` perder `content-side-list`;
- `news-important-card` perder `content-side-item`;
- o corpo do card perder `content-side-item__body`;
- título, texto ou data deixarem de usar os hooks canônicos de side item;
- `news-sidebar__link` perder `content-side-link`;
- `novidades.css` voltar a controlar grid, gap, padding, ritmo interno, tipografia de título ou anatomia do link;
- `surface-contract.css` deixar de declarar o contrato de side list.

Esse gate roda dentro de `npm run audit:agent-governance`.

## Auditoria de botão de fechar

Use:

```bash
npm run audit:close-button-contract
```

A auditoria varre todos os HTMLs ativos da raiz e falha quando um controle de fechar de superfície perde `doke-close-button`, quando um rótulo textual de fechamento não usa `doke-close-button__label`, ou quando `resultados.html` volta a redesenhar a anatomia de `results-filters__close` em CSS de página.

Ela é parte de `npm run audit:agent-governance`.

## Auditoria de contrato de modais, overlays e painéis

Use:

```bash
npm run audit:overlay-modal-contract
```

A auditoria varre os HTMLs ativos da raiz que possuem modais, dialogs, overlays, lightboxes, feedback states, side panels e mobile action panels. Ela falha quando essas superfícies perdem os hooks estruturais compartilhados:

- `doke-overlay` para raízes de overlay não nativas;
- `doke-native-overlay` para `<dialog>` nativo;
- `doke-overlay__backdrop` para scrim/backdrop;
- `doke-overlay__surface` para painel/card/dialog real;
- `doke-overlay__header`, `doke-overlay__body` e `doke-overlay__actions` para anatomia interna quando existente;
- `doke-overlay-panel` para painéis móveis de ação que não devem virar modal fixo genérico.

O gate também impede que `community-room-panel` consuma `doke-overlay` enquanto esse painel continuar sem contrato de `hidden/display`; nesse caso ele precisa de uma migração própria para evitar regressão visual.

Esse gate roda dentro de `npm run audit:agent-governance`.

## Inventário global de contratos visuais

`npm run audit:global-visual-contract-inventory` gera a matriz estática de todos os HTMLs ativos antes de lotes sistêmicos de padronização visual.

Saídas:

```txt
reports/generated/global-visual-contract-inventory.json
reports/generated/global-visual-contract-inventory.md
```

Use este inventário antes de alterar famílias globais como modais, botões, campos, header/sidebar, rails, cards, chips, badges, tabs e estados. O relatório identifica consumidores, CSS page-owned que ainda controla anatomia de componente e a fila recomendada de lotes. Ele não substitui validação visual/computada no navegador.

## Modal Visual Contract

Comando:

```bash
npm run audit:modal-visual-contract
```

O audit valida que os modais equivalentes carregam `doke-modal-surface`, uma variante visual (`compact`, `form`, `financial`, `detail`, `feedback` ou `media`) e os hooks de header/body/actions quando aplicável. Também verifica se o contrato compartilhado é importado depois do CSS de página nos manifests que possuem modais.

Use junto com:

```bash
npm run audit:overlay-modal-contract
npm run audit:close-button-contract
```

Validação visual obrigatória quando possível: abrir cada modal em `390x844`, `820x1180` e `1366x768`, conferindo largura, radius, footer, botão de fechar, foco de campo, scroll interno e ausência de overflow horizontal.

## Lote P — contrato global de controles de formulário

Comando:

```bash
npm run audit:form-control-contract
```

Valida os 21 HTMLs ativos da raiz e os 3 HTMLs de `auth/` para impedir controles visíveis sem classe canônica. O audit ignora apenas `input[type="hidden"]` e `input[type="file"]`, porque eles pertencem a contratos de estado/upload e não à anatomia visual de campo.

Regras cobertas:

- `input` textual/search/e-mail/password/numeric precisa expor `doke-input` ou hook equivalente compartilhado (`doke-search-field__input`, `doke-chat-composer__input`);
- `select` precisa expor `doke-select`;
- `textarea` precisa expor `doke-textarea` ou `doke-chat-composer__input` quando for composer de chat;
- `checkbox` precisa expor `doke-checkbox` ou `doke-switch__input` quando estiver dentro do contrato de switch;
- `radio` precisa expor `doke-radio`;
- `assets/css/components/forms/form-controls.css` não pode usar `!important`.

O comando também integra `npm run audit:agent-governance`.

## Lote Q — contrato sistêmico de botões e ações

Comando:

```bash
npm run audit:button-system-contract
```

Valida os 21 HTMLs ativos da raiz e os 3 HTMLs de `auth/` para impedir ações visíveis sem owner canônico. O gate aceita como owners de botão:

- `doke-btn`, `doke-button`, `doke-icon-btn`, `doke-action-button` e `doke-close-button`;
- contratos especializados que visualmente funcionam como ação, como `doke-tab-pill`, `doke-filter-pill`, `doke-chip`, `doke-segment-button`, `doke-choice-button`, `doke-rating-star`, `doke-search-field__button`, `doke-search-pill__button`, `doke-search-cta` e hooks do composer de chat;
- owners explícitos de header/sidebar/chat/lista que serão tratados nos lotes próprios de header, sidebar, cards e chat.

O audit também verifica que `assets/css/components/buttons.css` declara os modificadores base (`primary`, `secondary`, `ghost`, `soft`, `danger`, `success`, `block`, `icon`, `flat`, `segment` e `choice`), que o contrato não usa `!important` e que o CSS é carregado por `core/components.css` e `auth-foundation.css`.

Use junto com:

```bash
npm run audit:global-visual-contract-inventory
```

O inventário deve continuar reportando `buttons without canonical class: 0` depois de alterações em HTML, renderers ou novos componentes de ação.

## Lote R — Header Sidebar Parity Contract

Comando:

```bash
npm run audit:header-sidebar-parity-contract
```

Valida os 21 HTMLs ativos da raiz para impedir que header, shell e sidebar voltem a divergir estruturalmente. O gate exige:

- `body` com `doke-app-shell-page`, `app-shell-page`, `internal-shell-page` e `has-global-header`;
- um único `.app-shell` com `data-shell-contract="app-shell"`;
- uma única `.sidebar` com `data-shell-sidebar` e `data-sidebar-contract="global-sidebar"`;
- um único `header[data-app-header]` com `data-header-contract="app-header"`, `data-header-variant` e `data-header-family` convergentes;
- slots canônicos `primary` e `actions`;
- controles básicos do header presentes: menu tablet, busca e perfil;
- salvaguardas runtime em `assets/js/core/app.js` para reaplicar contratos após navegação interna e criar o scrim de sidebar quando o HTML da página não o trouxer estaticamente.

O audit está incluído em `npm run audit:agent-governance`. Ele não substitui validação visual: ao alterar `layout/header.css`, sidebar, shell ou roteador, validar `index.html`, `perfil.html`, `pedidos.html`, `mensagens.html`, `notificacoes.html`, `comunidade.html`, `resultados.html`, `detalhe-anuncio.html` e `ajuda.html` em `390x844`, `820x1180` e `1366x768`.

## Sprint 14 — MVP controlado e hardening de fluxo

Antes de considerar a base pronta para teste real controlado, executar:

```bash
npm run audit:mvp-controlled-readiness
npm run audit:security-permission-contract
npm run audit:wallet-api-contract
npm run audit:orders-api-contract
npm run audit:messages-api-contract
npm run audit:notifications-api-contract
npm run audit:data-provider-flags
```

Critérios manuais obrigatórios quando houver navegador disponível:

```txt
Cliente: criar pedido → receber aceite/proposta → pagar → abrir comprovante → contestar.
Profissional: aceitar pedido → enviar cobrança → responder contestação → solicitar saque.
Suporte/Admin: resolver contestação com repasse → resolver contestação com reembolso → aprovar saque → recusar saque com motivo.
Negação: cliente/profissional não veem Admin e não executam ações de suporte.
Auditoria: cada negação e cada ação admin gera evento auditável.
```

Viewports mínimos para a rodada visual do MVP controlado:

```txt
390x844
820x1180
1366x768
```

Páginas mínimas:

```txt
index.html
orcamento.html
pedidos.html
mensagens.html
carteira.html
notificacoes.html
admin.html
```

Se Playwright não estiver disponível, o handoff deve declarar que a Sprint 14 passou apenas por validação estática e que o roteiro acima precisa ser executado no Live Server.

## Sprint 15 — Supabase/backend readiness

Antes de habilitar qualquer tráfego real de API em staging, executar:

```bash
npm run audit:supabase-backend-readiness
npm run audit:mvp-controlled-readiness
npm run audit:security-permission-contract
npm run audit:wallet-api-contract
npm run audit:orders-api-contract
npm run audit:messages-api-contract
npm run audit:notifications-api-contract
npm run audit:data-provider-flags
```

Validação manual de staging obrigatória:

```txt
1. Aplicar migrations em Supabase local/staging.
2. Aplicar seed controlado.
3. Entrar como cliente, profissional, suporte e admin.
4. Verificar RLS: cliente não lê recursos de outro cliente; profissional não lê pedido/carteira fora de escopo.
5. Repetir action financeira com mesmo idempotency key e confirmar que não duplica saldo/recibo/auditoria.
6. Confirmar que suporte/admin resolvem contestação e saque com `admin_audit_events` persistente.
7. Confirmar que recibos são lidos pelo dono ou suporte/admin, nunca por terceiro.
```

A Sprint 15 não altera visual e não ativa backend real no frontend; ela cria o contrato para validar Supabase/API com segurança.

## Sprint 16 — API endpoint and Supabase local/staging validation

Antes de implementar runtime real de backend, executar:

```bash
npm run audit:api-endpoint-readiness
npm run audit:supabase-backend-readiness
npm run audit:mvp-controlled-readiness
npm run audit:security-permission-contract
```

Validação local/staging recomendada:

```bash
supabase start
supabase db reset
psql "$SUPABASE_DB_URL" -f supabase/tests/001_rls_matrix_validation.sql
psql "$SUPABASE_DB_URL" -f supabase/tests/002_idempotency_and_audit_validation.sql
psql "$SUPABASE_DB_URL" -f supabase/tests/003_policy_negative_cases.sql
```

Critérios de aprovação:

- todos os endpoints críticos aparecem em `backend/shared/http/route-registry.js`;
- actions de `backend/shared/contracts/api-actions.json` batem com método, path, role, escopo, idempotência e auditoria do registry;
- handlers ainda não implementados retornam erro controlado, não executam mutação parcial;
- browser não recebe service-role key;
- SQL local/staging confirma RLS, idempotência e negações por role.

## Sprint 17 validation

Run the staging runtime static gate before any Supabase runtime deployment:

```bash
npm run audit:staging-runtime-readiness
npm run audit:api-endpoint-readiness
npm run audit:supabase-backend-readiness
```

Then validate `POST /auth/login`, `GET /auth/session`, `GET /users/me` and `GET /profiles/me` against Supabase local/staging with seeded users.

## Sprint 18 validation

Run the orders runtime static gate before enabling order API traffic in staging:

```bash
npm run audit:staging-orders-runtime
npm run audit:staging-runtime-readiness
npm run audit:api-endpoint-readiness
npm run audit:supabase-backend-readiness
```

Manual staging validation after applying migrations/seeds:

```txt
1. Client token: GET /orders returns only client-owned orders.
2. Professional token: GET /orders returns only professional-assigned orders.
3. Professional token: POST /orders/:id/accept with x-idempotency-key succeeds for assigned order.
4. Client token: POST /orders/:id/accept is denied.
5. Support token: POST /orders/:id/status with x-idempotency-key succeeds.
6. Mutating order route without x-idempotency-key returns DOKE_IDEMPOTENCY_REQUIRED.
```

## Sprint 19 — Staging messaging runtime validation

Run after implementing or touching staging messaging runtime:

```bash
npm run audit:staging-messaging-runtime
npm run audit:staging-orders-runtime
npm run audit:staging-runtime-readiness
npm run audit:api-endpoint-readiness
```

Supabase local/staging still needs real SQL execution before enabling frontend `dataProvider=api` for messaging.

## Sprint 20 — Staging notifications runtime validation

Run after implementing or touching staging notifications runtime:

```bash
npm run audit:staging-notifications-runtime
npm run audit:staging-messaging-runtime
npm run audit:staging-orders-runtime
npm run audit:staging-runtime-readiness
npm run audit:api-endpoint-readiness
```

Manual Supabase local/staging validation after applying migrations/seeds:

```txt
1. Professional token: GET /notifications returns only notifications where user_id is the professional.
2. Professional token: POST /notifications/:id/read succeeds for own notification.
3. Professional token: POST /notifications/:id/dismiss succeeds for own notification and stores dismissed metadata in data.
4. Another client/professional token cannot read or dismiss that notification.
5. Support token with service-role enabled can POST /notifications with x-idempotency-key.
6. Support token with service-role enabled can PATCH /notifications/:id with x-idempotency-key.
7. Create/update without x-idempotency-key returns DOKE_IDEMPOTENCY_REQUIRED.
```

Supabase local/staging still needs real SQL execution before enabling frontend `dataProvider=api` for notifications.

## Sprint 21 wallet runtime validation

- Runtime: `backend/modules/wallet/wallet-service.js` and `backend/modules/wallet/route-handlers.js`.
- Admin finance routes: `backend/modules/admin/route-handlers.js`.
- Gate: `npm run audit:staging-wallet-runtime`.
- Scope: wallet, transactions, dashboard, receivables, bank accounts, withdrawals, disputes, receipts and admin audit events.

## Validação Supabase staging E2E — Sprint 22

Antes de ativar qualquer provider API no frontend, executar em ambiente local/staging:

```bash
npm run audit:staging-e2e-validation
npm run validate:staging-e2e:dry-run
DOKE_STAGING_API_URL="https://staging-api.example.local" \
DOKE_STAGING_E2E_ALLOW_MUTATIONS=1 \
npm run validate:staging-e2e
psql "$SUPABASE_DB_URL" -f supabase/tests/004_runtime_e2e_postconditions.sql
```

Critérios de aceite:

- client/professional/support/admin autenticam com tokens reais;
- pedidos, conversas, notificações e carteira respondem pelo runtime staging;
- ações sensíveis recusam chamada sem `x-idempotency-key`;
- negações por role retornam erro controlado;
- `api_idempotency_keys` e `admin_audit_events` têm sinais persistentes quando aplicável;
- nenhum segredo service-role aparece em browser/frontend.

## Sprint 23 validation — persistent idempotency and audit

Run before any API canary:

```bash
npm run audit:runtime-idempotency-audit
npm run audit:staging-e2e-validation
npm run validate:staging-e2e:dry-run
```

Real local/staging validation also requires:

```bash
npm run validate:staging-e2e
psql "$SUPABASE_DB_URL" -f supabase/tests/005_runtime_idempotency_audit_replay_validation.sql
```

Expected critical outcomes:

- repeated same `x-idempotency-key` with identical payload replays the stored response;
- same key with different payload returns `DOKE_IDEMPOTENCY_CONFLICT`;
- `api_idempotency_keys.response_body` is stored for succeeded mutations;
- `admin_audit_events` exists for audited support/admin and financial actions.

## Supabase local/staging execution — Sprint 24

Before any API canary, run:

```bash
npm run audit:supabase-local-staging-execution
npm run validate:supabase-local-staging:dry-run
```

Then, only in local/staging with mutation consent:

```bash
SUPABASE_DB_URL="postgresql://..." \
DOKE_STAGING_API_URL="https://staging-api.example.local" \
DOKE_SUPABASE_VALIDATION_ALLOW_MUTATIONS=1 \
DOKE_STAGING_E2E_ALLOW_MUTATIONS=1 \
npm run validate:supabase-local-staging
```

This wraps SQL tests 001-005 and the HTTP E2E smoke. Do not treat the dry-run as proof of real Supabase validation.

## Supabase staging validation runbook — Sprint 24

Use this gate before any frontend canary API activation:

```bash
npm run audit:supabase-staging-validation-runbook
npm run validate:supabase-staging:dry-run
npm run validate:supabase-staging:plan
```

Real local/staging execution requires explicit env and mutation flags:

```bash
DOKE_ENVIRONMENT=local \
DOKE_SUPABASE_DB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
DOKE_STAGING_API_URL="http://127.0.0.1:54321/functions/v1/doke-api" \
DOKE_SUPABASE_VALIDATION_ALLOW_MUTATIONS=1 \
DOKE_SUPABASE_SQL_TESTS_ALLOW_MUTATIONS=1 \
DOKE_STAGING_E2E_ALLOW_MUTATIONS=1 \
npm run validate:supabase-staging -- --local-reset --write-report
```

The wrapper executes SQL tests 001–005 around `npm run validate:staging-e2e`. Dry-run and plan commands do not prove real Supabase readiness. Keep frontend providers on mock until the real report passes.

## Sprint 25 — validação de auth/identity canary

A validação do auth/identity canary protege a primeira ativação real de API no frontend. O contrato aceito é `authProvider=api`, `dataProvider=mock` e `enableNetworkRequests=true`.

Comandos obrigatórios sem rede:

```bash
npm run audit:auth-identity-canary-contract
npm run validate:auth-identity-canary:dry-run
npm run audit:auth-real-contract
npm run audit:identity-profile-contract
npm run audit:data-provider-flags
```

Smoke real, apenas em local/staging:

```bash
DOKE_ENVIRONMENT=staging \
DOKE_AUTH_IDENTITY_CANARY_API_URL=https://staging-api.doke.example \
DOKE_AUTH_IDENTITY_CANARY_ALLOW_NETWORK=1 \
npm run validate:auth-identity-canary
```

Esse smoke chama somente `/auth/login`, `/auth/session`, `/users/me` e `/profiles/me`. Qualquer validação de pedidos, mensagens, notificações ou carteira deve continuar usando os gates específicos de staging, sem trocar o frontend para `dataProvider=api`.

## Sprint 26 — Gate de runtime do canary Auth/Identity

Antes de testar o canary de autenticação/identidade em navegador real ou staging, execute:

```bash
npm run audit:auth-identity-canary-contract
npm run validate:auth-identity-canary:browser-runtime
npm run validate:auth-identity-canary:dry-run
```

Esse gate não faz chamadas reais de rede. Ele simula o navegador, valida `localStorage`, `runtime-config`, sessão, bloqueio de alvo com aparência de produção, ativação segura e rollback. O comando real `npm run validate:auth-identity-canary` continua exigindo staging/local com variáveis explícitas e consentimento de rede.

## Sprint 27 — Gate local de rede para canary Auth/Identity

Antes de usar credenciais reais ou URL externa, execute o canary Auth/Identity contra o servidor local controlado:

```bash
npm run audit:auth-identity-canary-local-runtime
npm run validate:auth-identity-canary:local-runtime
```

Esse gate sobe um servidor HTTP em `127.0.0.1`, executa o mesmo `scripts/validate-auth-identity-canary.js` usado no staging real e valida somente a fronteira:

- `POST /auth/login`
- `GET /auth/session`
- `GET /users/me`
- `GET /profiles/me`

O contrato permanece `authProvider=api`, `dataProvider=mock` e `enableNetworkRequests=true`. Qualquer chamada para pedidos, mensagens, notificações, carteira, disputas, recibos ou admin deve falhar o gate. O relatório opcional é gerado por:

```bash
npm run validate:auth-identity-canary:local-runtime:report
```

## Sprint 28 — Gate de promoção do canary Auth/Identity

Antes de declarar o canary Auth/Identity pronto para uso manual em staging/local real, execute:

```bash
npm run audit:auth-identity-canary-promotion-gate
npm run validate:auth-identity-canary:promotion-gate:dry-run
npm run validate:auth-identity-canary:promotion-gate
```

Esse gate roda os contratos locais e não faz chamadas externas por conta própria. Sem relatório real, ele deve informar `blocked_until_real_auth_identity_canary_report`, mas não deve quebrar o desenvolvimento local.

Para exigir relatório real:

```bash
DOKE_AUTH_IDENTITY_CANARY_REQUIRE_REAL_REPORT=1 \
DOKE_AUTH_IDENTITY_CANARY_REAL_REPORT_PATH=reports/generated/auth-identity-canary-report.json \
npm run validate:auth-identity-canary:promotion-gate
```

O relatório real deve ser gerado por:

```bash
DOKE_ENVIRONMENT=staging \
DOKE_AUTH_IDENTITY_CANARY_API_URL="https://staging-api.doke.example" \
DOKE_AUTH_IDENTITY_CANARY_ALLOW_NETWORK=1 \
npm run validate:auth-identity-canary -- --write-report
```

Enquanto esse gate não estiver verde com `DOKE_AUTH_IDENTITY_CANARY_REQUIRE_REAL_REPORT=1`, o frontend continua em mock para pedidos, mensagens, notificações, carteira, disputas, recibos e admin.

## Sprint 29 — Orders read-only canary

A Sprint 29 adiciona o gate de leitura de pedidos, bloqueado pela promoção real de Auth/Identity.

Comandos seguros sem staging externo:

```bash
npm run audit:orders-readonly-canary-contract
npm run validate:orders-readonly-canary:dry-run
npm run validate:orders-readonly-canary:local-runtime
```

Execução real local/staging exige que o relatório de Auth/Identity tenha status:

```txt
auth_identity_canary_ready_for_manual_staging_rollout
```

Depois disso, usar:

```bash
DOKE_ENVIRONMENT=staging \
DOKE_ORDERS_READONLY_CANARY_API_URL=https://staging-api.exemplo \
DOKE_ORDERS_READONLY_CANARY_ALLOW_NETWORK=1 \
DOKE_ORDERS_READONLY_CANARY_MARKER=staging \
npm run validate:orders-readonly-canary:report
```

O canary só pode chamar auth/identity e `GET /orders`/`GET /orders/:id`. Escrita em pedidos e domínios como mensagens, notificações, carteira, disputas, recibos e admin permanecem bloqueados.

## Sprint 30 — Orders read-only promotion gate

A Sprint 30 cria o gate de promoção para o canary read-only de pedidos. Ela mantém `dataProvider=mock`, não ativa escrita de pedidos e bloqueia avanço enquanto não houver relatório real de leitura.

Comandos adicionados:

```bash
npm run audit:orders-readonly-canary-promotion-gate
npm run validate:orders-readonly-canary:promotion-gate:dry-run
npm run validate:orders-readonly-canary:promotion-gate
npm run validate:orders-readonly-canary:promotion-gate:report
```

Sem relatório real, o resultado seguro é:

```txt
blocked_until_real_orders_readonly_canary_report
```

Com relatório real válido em `reports/generated/orders-readonly-canary-report.json`, o status aprovado deve ser:

```txt
orders_readonly_canary_ready_for_manual_write_canary_planning
```

Para tornar a ausência de relatório uma falha de CI:

```bash
DOKE_ORDERS_READONLY_CANARY_REQUIRE_REAL_REPORT=1 npm run validate:orders-readonly-canary:promotion-gate
```

O gate roda antes:

```bash
npm run audit:auth-identity-canary-promotion-gate
npm run validate:auth-identity-canary:promotion-gate:dry-run
npm run audit:orders-readonly-canary-contract
npm run validate:orders-readonly-canary:dry-run
npm run validate:orders-readonly-canary:local-runtime
```

Critério de aceite: nenhum endpoint de escrita de pedidos ou domínio fora de pedidos pode aparecer no relatório real.


## Sprint 31 — Orders write canary planning gate

Validação adicionada para impedir escrita de pedidos antes de read-only real aprovado.

```bash
npm run audit:orders-write-canary-planning-gate
npm run validate:orders-write-canary:planning-gate:dry-run
npm run validate:orders-write-canary:planning-gate
npm run validate:orders-write-canary:planning-gate:report
```

Sem relatório real de read-only promotion, o status esperado é:

```txt
blocked_until_real_orders_readonly_promotion_report
```

Com relatório real válido, o status aprovado é:

```txt
orders_write_canary_ready_for_manual_contract_design
```

O gate valida que `dataProvider=mock`, `ordersProvider=api-write-canary-planning`, `writeActivation=false` e que o próximo contrato deve incluir `idempotency_key_required_for_every_mutation`.

## Sprint 32 — Orders write local harness

A Sprint 32 adiciona validação local para escrita de pedidos, sem ativar escrita real no frontend.

```bash
npm run audit:orders-write-canary-local-runtime
npm run validate:orders-write-canary:local-runtime
npm run validate:orders-write-canary:local-runtime:report
```

Status aprovado:

```txt
orders_write_canary_local_runtime_validated
```

O harness valida `writeActivation=false`, `dataProvider=mock`, idempotência obrigatória, replay de mesma chave/payload e `DOKE_IDEMPOTENCY_CONFLICT` para payload diferente. Ele também bloqueia domínios fora de `/orders`.

## Sprint 33 — Orders write staging preflight gate

A Sprint 33 adiciona o gate de preflight para uma futura execução real de escrita de pedidos em local/staging. O escopo continua sem alteração visual e sem ativação de escrita no frontend.

Contrato operacional:

```txt
writeActivation=false
dataProvider=mock
ordersProvider=api-write-canary-staging-preflight
performsNetworkRequest=false
performsMutation=false
```

Comandos:

```bash
npm run audit:orders-write-canary-staging-preflight-gate
npm run validate:orders-write-canary:staging-preflight-gate:dry-run
npm run validate:orders-write-canary:staging-preflight-gate:check-env
npm run validate:orders-write-canary:staging-preflight-gate
npm run validate:orders-write-canary:staging-preflight-gate:report
```

Status seguro sem pré-requisitos reais:

```txt
blocked_until_orders_write_staging_preflight_prerequisites
```

Status de alvo inseguro:

```txt
blocked_unsafe_orders_write_staging_target
```

Status aprovado apenas para execução manual futura:

```txt
orders_write_canary_ready_for_manual_staging_execution
```

Variáveis exigidas para aprovação do preflight real:

```bash
DOKE_ENVIRONMENT=staging
DOKE_ORDERS_WRITE_CANARY_STAGING_API_URL=https://staging-api.example
DOKE_ORDERS_WRITE_CANARY_STAGING_ALLOW_NETWORK=1
DOKE_ORDERS_WRITE_CANARY_STAGING_ALLOW_MUTATIONS=1
```

Relatórios reais exigidos:

```txt
auth_identity_canary_ready_for_manual_staging_rollout
orders_readonly_canary_ready_for_manual_write_canary_planning
orders_write_canary_ready_for_manual_contract_design
orders_write_canary_local_runtime_validated
```

A aprovação do preflight não executa mutação. Ela apenas confirma que a próxima sprint pode preparar um executor real de staging com confirmação manual, idempotência obrigatória, relatório e rollback para mock.

## Orders write multi-step gates — Sprint 34-36

Use these commands to validate the bundled orders write progression without activating frontend write by default:

```bash
npm run audit:orders-write-canary-staging-executor
npm run execute:orders-write-canary:staging:dry-run
npm run execute:orders-write-canary:staging:check-env
npm run audit:orders-write-canary-execution-promotion-gate
npm run validate:orders-write-canary:execution-promotion-gate:dry-run
npm run audit:orders-write-frontend-activation-planning-gate
npm run validate:orders-write-frontend-activation:planning-gate:dry-run
```

Real staging mutation execution remains manual and requires `DOKE_ORDERS_WRITE_CANARY_STAGING_EXECUTE=1`, `DOKE_ORDERS_WRITE_CANARY_STAGING_ALLOW_NETWORK=1`, `DOKE_ORDERS_WRITE_CANARY_STAGING_ALLOW_MUTATIONS=1`, and a preflight report with `orders_write_canary_ready_for_manual_staging_execution`.

## Orders write frontend runtime bundle — Sprint 37-39

Este bloco valida a ativação manual de escrita de pedidos no frontend e seu rollback, sem alterar HTML/CSS e sem ligar produção.

Comandos:

```bash
npm run audit:orders-write-frontend-activation-runtime
npm run validate:orders-write-frontend-activation:runtime
npm run audit:orders-write-frontend-rollback-gate
npm run validate:orders-write-frontend-rollback:gate:dry-run
npm run validate:orders-write-frontend-rollback:gate
```

Status aprovados:

```txt
orders_write_frontend_activation_runtime_validated
orders_write_frontend_rollback_gate_validated
```

Contrato de segurança:

```txt
dataProvider=mock
ordersProvider=api-write-canary-frontend-activation
orderWriteActivation=true somente por ativação manual
x-idempotency-key obrigatório
rollback para ordersProvider=mock e orderWriteActivation=false
```

## Sprint 40–48 — Backend real domain canary closure

Added grouped validation for backend real expansion beyond Orders:

```bash
npm run audit:backend-domain-canary-runtime
npm run validate:backend-domain-canary:local-runtime
npm run audit:backend-real-staging-preflight-gate
npm run validate:backend-real:staging-preflight-gate:dry-run
npm run validate:backend-real:staging-preflight-gate:check-env
npm run validate:backend-real:staging-preflight-gate
npm run audit:backend-real-complete-readiness-gate
npm run validate:backend-real:complete-readiness-gate:dry-run
npm run validate:backend-real:complete-readiness-gate
```

The expected status without real credentials/reports remains blocked, not falsely approved:

```txt
blocked_until_backend_real_staging_prerequisites
blocked_until_backend_real_complete_real_reports
```

This block does not alter visual files and keeps `mock` as the default frontend provider.

## Sprint 49–60 — Backend real multi-domain, E2E, observability and expansion gates

New validation commands:

```bash
npm run audit:backend-real-multidomain-staging-executor
npm run execute:backend-real:multidomain-staging:dry-run
npm run execute:backend-real:multidomain-staging:check-env
npm run audit:backend-real-e2e-local-runtime
npm run validate:backend-real:e2e-local-runtime
npm run audit:backend-real-observability-contract
npm run validate:backend-real:observability-gate:dry-run
npm run audit:domain-expansion-readiness-gate
npm run validate:domain-expansion:readiness-gate:dry-run
```

The staging executor remains blocked unless real local/staging reports, safe URLs and explicit network/mutation flags are present. The local E2E harness performs no external network calls.

## Sprint 61–75 — validação domain expansion + beta readiness

```bash
npm run audit:domain-expansion-local-runtime
npm run validate:service-listings-canary:local-runtime
npm run validate:publications-canary:local-runtime
npm run validate:community-canary:local-runtime
npm run validate:domain-expansion:local-runtime
npm run audit:domain-expansion-staging-executor
npm run execute:domain-expansion:staging:dry-run
npm run execute:domain-expansion:staging:check-env
npm run audit:beta-closed-backend-real-readiness-gate
npm run validate:beta-closed-backend-real:readiness-gate:dry-run
npm run validate:beta-closed-backend-real:readiness-gate
```

## Sprint 76–90 — Product beta validation commands

```bash
npm run audit:product-beta-local-runtime
npm run validate:media-uploads-canary:local-runtime
npm run validate:moderation-canary:local-runtime
npm run validate:search-indexing-canary:local-runtime
npm run validate:pricing-canary:local-runtime
npm run validate:product-beta:local-runtime
npm run audit:product-beta-staging-executor
npm run execute:product-beta:staging:dry-run
npm run execute:product-beta:staging:check-env
npm run audit:beta-closed-product-readiness-gate
npm run validate:beta-closed-product:readiness-gate:dry-run
npm run validate:beta-closed-product:readiness-gate
```

## Sprint 91–105 validation commands

```bash
npm run audit:beta-launch-local-runtime
npm run validate:payments-escrow-canary:local-runtime
npm run validate:kyc-canary:local-runtime
npm run validate:support-admin-canary:local-runtime
npm run validate:security-abuse-canary:local-runtime
npm run validate:beta-launch:local-runtime
npm run audit:beta-launch-staging-executor
npm run execute:beta-launch:staging:dry-run
npm run execute:beta-launch:staging:check-env
npm run audit:beta-closed-launch-readiness-gate
npm run validate:beta-closed-launch:readiness-gate:dry-run
npm run validate:beta-closed-launch:readiness-gate
```

## Sprint 106–120 validation commands

```bash
npm run audit:beta-launch-frontend-runtime
npm run validate:beta-launch-frontend:runtime
npm run audit:beta-qa-matrix
npm run validate:beta-qa-matrix:dry-run
npm run validate:beta-qa-matrix
npm run audit:beta-quality-gates
npm run validate:beta-quality-gates:dry-run
npm run validate:beta-quality-gates
npm run audit:beta-visual-hardening-gate
npm run validate:beta-visual-hardening:dry-run
npm run validate:beta-visual-hardening
npm run audit:release-candidate-package-gate
npm run validate:release-candidate-package:dry-run
npm run validate:release-candidate-package
```

The quality, visual and release candidate gates are intentionally blocked until real evidence reports exist. Blocked status is safe; false approval is not accepted.

## Sprint 121–135 — Private Beta RC Evidence Commands

```bash
npm run audit:private-beta-local-evidence
npm run generate:private-beta-local-evidence:dry-run
npm run generate:private-beta-local-evidence:reports
npm run audit:staging-real-preparation-package
npm run validate:staging-real-preparation:dry-run
npm run validate:staging-real-preparation:report
npm run audit:private-beta-release-checklist
npm run validate:private-beta-release-checklist:dry-run
npm run validate:private-beta-release-checklist:report
npm run audit:private-beta-user-entry-plan
npm run validate:private-beta-user-entry-plan:report
npm run audit:release-candidate-assembly-gate
npm run validate:release-candidate-assembly:report
```

These commands do not run production, do not create credentials, and do not claim browser visual or staging approval when those reports are absent.

## Sprint 136–150 validation commands
```bash
npm run audit:playwright-visual-evidence-package
npm run validate:playwright-visual-evidence:dry-run
npm run validate:playwright-visual-evidence:check-env
npm run audit:browser-quality-evidence-package
npm run validate:browser-quality-evidence:dry-run
npm run audit:staging-environment-binder
npm run validate:staging-environment-binder:dry-run
npm run validate:staging-environment-binder:check-env
npm run audit:private-beta-operator-rehearsal
npm run validate:private-beta-operator-rehearsal:dry-run
npm run audit:release-go-no-go-gate
npm run validate:release-go-no-go:dry-run
```

## Sprint 151-165 — Private beta real evidence and GO/NO-GO closure

This sprint adds executable closure gates for the final private beta decision. These commands do not alter visual assets or activate production by default.

### Visual/responsive evidence

```bash
npm run audit:playwright-visual-responsive-evidence
npm run execute:playwright-visual-responsive-evidence:dry-run
npm run execute:playwright-visual-responsive-evidence:check-env
npm run execute:playwright-visual-responsive-evidence:report
```

Real browser execution requires `DOKE_VISUAL_RESPONSIVE_EVIDENCE_EXECUTE=1`.

### Browser quality evidence

```bash
npm run audit:browser-quality-real-evidence
npm run execute:browser-quality-real-evidence:dry-run
npm run execute:browser-quality-real-evidence:check-env
npm run execute:browser-quality-real-evidence:report
```

Real evidence requires explicit browser/Lighthouse/manual review flags.

### Staging seed binder

```bash
npm run audit:staging-seed-binder
npm run bind:staging-seeds:dry-run
npm run bind:staging-seeds:check-env
npm run bind:staging-seeds:report
```

Real mutation requires `DOKE_STAGING_SEED_BINDER_EXECUTE=1` plus SQL mutation flags.

### Private beta rehearsal and GO/NO-GO

```bash
npm run audit:private-beta-real-rehearsal
npm run validate:private-beta-real-rehearsal:dry-run
npm run validate:private-beta-real-rehearsal:report
npm run audit:private-beta-go-live-gate
npm run validate:private-beta-go-live:dry-run
npm run validate:private-beta-go-live:report
```

Default decision remains `NO_GO` until visual, quality, staging binding, rehearsal and manual confirmations are present.

## Sprint 166-180 Private Beta Real GO Attempt

Sprint 166-180 expands the visual manifest to the full private-beta viewport matrix and adds the real GO attempt wrapper:

```bash
npm run audit:private-beta-real-go-attempt
npm run execute:private-beta-real-go-attempt:dry-run
npm run execute:private-beta-real-go-attempt:check-env
npm run execute:private-beta-real-go-attempt:report
```

The expected safe default remains NO-GO until real browser evidence, staging seed binding, rehearsal and manual confirmations pass.


## Sprint 181-195 Evidence Pursuit

- Added Playwright Chromium preparation and system-browser fallback.
- Added capture-only visual evidence spec for real screenshot evidence without rewriting approved baselines.
- Added staging real seed operator and private beta GO pursuit orchestrator.
- GO remains blocked unless real visual, browser quality, staging seeds, rehearsal, and manual confirmation pass.

## Sprint 196-210 Browser Policy and Evidence Loop

Sprint 196-210 separates system-browser policy blockers from Playwright-managed Chromium and adds a private beta evidence loop that preserves NO-GO unless every real evidence phase passes.

```bash
npm run audit:playwright-browser-policy-resolution
npm run resolve:playwright-browser-policy:dry-run
npm run resolve:playwright-browser-policy:check-env
npm run resolve:playwright-browser-policy:report
npm run audit:staging-real-command-pack
npm run prepare:staging-real-command-pack:dry-run
npm run prepare:staging-real-command-pack:check-env
npm run prepare:staging-real-command-pack:report
npm run audit:private-beta-evidence-loop
npm run execute:private-beta-evidence-loop:dry-run
npm run execute:private-beta-evidence-loop:check-env
npm run execute:private-beta-evidence-loop:report
```

Managed Chromium installation is guarded by `DOKE_PLAYWRIGHT_MANAGED_CHROMIUM_INSTALL=1`. Staging mutation remains guarded by the existing staging seed flags.

## Sprint 211-225 Real Workstation Evidence

### Windows Playwright-managed Chromium

```bash
npm run audit:windows-playwright-chromium-workstation
npm run prepare:windows-playwright-chromium:dry-run
npm run prepare:windows-playwright-chromium:check-env
npm run prepare:windows-playwright-chromium:report
```

Real install attempt requires:

```bash
DOKE_PLAYWRIGHT_MANAGED_CHROMIUM_INSTALL=1 npm run prepare:windows-playwright-chromium:report
```

### Visual evidence review package

```bash
npm run audit:visual-evidence-review-package
npm run execute:visual-evidence-review-package:dry-run
npm run execute:visual-evidence-review-package:check-env
npm run execute:visual-evidence-review-package:report
```

Manual approval requires `DOKE_VISUAL_REVIEW_APPROVED=1` and `DOKE_VISUAL_REVIEWER`.

### Lighthouse + accessibility evidence

```bash
npm run audit:lighthouse-a11y-evidence-package
npm run execute:lighthouse-a11y-evidence:dry-run
npm run execute:lighthouse-a11y-evidence:check-env
npm run execute:lighthouse-a11y-evidence:report
```

### Staging seed operator environment

```bash
npm run audit:staging-seed-operator-env
npm run prepare:staging-seed-operator-env:dry-run
npm run prepare:staging-seed-operator-env:check-env
npm run prepare:staging-seed-operator-env:report
```

### Private beta real-entry gate

```bash
npm run audit:private-beta-real-entry-gate
npm run execute:private-beta-real-entry-gate:dry-run
npm run execute:private-beta-real-entry-gate:check-env
npm run execute:private-beta-real-entry-gate:report
```

The gate only returns `GO` with all real evidence reports accepted and `DOKE_PRIVATE_BETA_REAL_ENTRY_CONFIRM=enter-private-beta`.


## Sprint 226–240 — Private beta workstation evidence

Commands added:

```bash
npm run audit:windows-private-beta-evidence-batch
npm run execute:windows-private-beta-evidence-batch:dry-run
npm run execute:windows-private-beta-evidence-batch:check-env
npm run execute:windows-private-beta-evidence-batch:report
npm run audit:visual-screenshot-package
npm run execute:visual-screenshot-package:dry-run
npm run execute:visual-screenshot-package:check-env
npm run execute:visual-screenshot-package:report
npm run audit:lighthouse-a11y-workstation
npm run execute:lighthouse-a11y-workstation:dry-run
npm run execute:lighthouse-a11y-workstation:check-env
npm run execute:lighthouse-a11y-workstation:report
npm run audit:staging-real-env-application
npm run execute:staging-real-env-application:dry-run
npm run execute:staging-real-env-application:check-env
npm run execute:staging-real-env-application:report
npm run audit:private-beta-real-entry-repeat
npm run execute:private-beta-real-entry-repeat:dry-run
npm run execute:private-beta-real-entry-repeat:check-env
npm run execute:private-beta-real-entry-repeat:report
```

The expected default without real workstation screenshots, Lighthouse/a11y and staging credentials is `NO_GO`.

## Sprint 241-255 — Private beta evidence interpretation and adjudication

This block adds the report interpretation layer that sits after the Windows/VS Code evidence batch.

Commands:

```bash
npm run audit:private-beta-report-interpreter
npm run execute:private-beta-report-interpreter:dry-run
npm run execute:private-beta-report-interpreter:check-env
npm run execute:private-beta-report-interpreter:report
npm run audit:visual-findings-triage
npm run execute:visual-findings-triage:dry-run
npm run execute:visual-findings-triage:check-env
npm run execute:visual-findings-triage:report
npm run audit:quality-findings-triage
npm run execute:quality-findings-triage:dry-run
npm run execute:quality-findings-triage:check-env
npm run execute:quality-findings-triage:report
npm run audit:staging-evidence-review
npm run execute:staging-evidence-review:dry-run
npm run execute:staging-evidence-review:check-env
npm run execute:staging-evidence-review:report
npm run audit:private-beta-evidence-adjudicator
npm run execute:private-beta-evidence-adjudicator:dry-run
npm run execute:private-beta-evidence-adjudicator:check-env
npm run execute:private-beta-evidence-adjudicator:report
```

Expected status before real workstation/staging evidence:

```txt
private_beta_evidence_adjudicator_no_go
```

Accepted status:

```txt
private_beta_evidence_adjudicator_go
```

## Sprint 256-270 — Private beta evidence resolution cycle

This block converts generated Windows/VS Code reports into actionable resolution backlogs and repeats GO/NO-GO adjudication without approving missing evidence.

Commands:

```bash
npm run audit:private-beta-workstation-report-ingest
npm run execute:private-beta-workstation-report-ingest:dry-run
npm run execute:private-beta-workstation-report-ingest:check-env
npm run execute:private-beta-workstation-report-ingest:report
npm run audit:visual-resolution-backlog
npm run execute:visual-resolution-backlog:dry-run
npm run execute:visual-resolution-backlog:check-env
npm run execute:visual-resolution-backlog:report
npm run audit:quality-resolution-backlog
npm run execute:quality-resolution-backlog:dry-run
npm run execute:quality-resolution-backlog:check-env
npm run execute:quality-resolution-backlog:report
npm run audit:staging-resolution-backlog
npm run execute:staging-resolution-backlog:dry-run
npm run execute:staging-resolution-backlog:check-env
npm run execute:staging-resolution-backlog:report
npm run audit:private-beta-entry-resolution-cycle
npm run execute:private-beta-entry-resolution-cycle:dry-run
npm run execute:private-beta-entry-resolution-cycle:check-env
npm run execute:private-beta-entry-resolution-cycle:report
```

Expected default without workstation/staging evidence:

```txt
private_beta_entry_resolution_cycle_no_go
```

GO requires real evidence reports, clear visual/quality/staging backlogs, full adjudication and explicit manual confirmation.

## Sprint 271–285 — Private beta one-command evidence and decision matrices

New validation commands:

```bash
npm run audit:windows-private-beta-one-command
npm run execute:windows-private-beta-one-command:dry-run
npm run execute:windows-private-beta-one-command:check-env
npm run execute:windows-private-beta-one-command:report
npm run audit:visual-correction-matrix
npm run execute:visual-correction-matrix:dry-run
npm run execute:visual-correction-matrix:check-env
npm run execute:visual-correction-matrix:report
npm run audit:quality-correction-matrix
npm run execute:quality-correction-matrix:dry-run
npm run execute:quality-correction-matrix:check-env
npm run execute:quality-correction-matrix:report
npm run audit:staging-external-secrets-checklist
npm run execute:staging-external-secrets-checklist:dry-run
npm run execute:staging-external-secrets-checklist:check-env
npm run execute:staging-external-secrets-checklist:report
npm run audit:private-beta-entry-decision-gate
npm run execute:private-beta-entry-decision-gate:dry-run
npm run execute:private-beta-entry-decision-gate:check-env
npm run execute:private-beta-entry-decision-gate:report
```

The expected default decision remains `NO_GO` until real screenshots, Lighthouse/a11y, staging secrets, and manual confirmation are provided.

## Sprint 286-300 — Private beta human RC package

New validation commands:

```bash
npm run audit:private-beta-simplified-local-flow
npm run execute:private-beta-simplified-local-flow:dry-run
npm run execute:private-beta-simplified-local-flow:check-env
npm run execute:private-beta-simplified-local-flow:report
npm run audit:private-beta-one-screen-summary
npm run execute:private-beta-one-screen-summary:dry-run
npm run execute:private-beta-one-screen-summary:check-env
npm run execute:private-beta-one-screen-summary:report
npm run audit:visual-manual-priority-checklist
npm run execute:visual-manual-priority-checklist:dry-run
npm run execute:visual-manual-priority-checklist:check-env
npm run execute:visual-manual-priority-checklist:report
npm run audit:staging-security-manual-checklist
npm run execute:staging-security-manual-checklist:dry-run
npm run execute:staging-security-manual-checklist:check-env
npm run execute:staging-security-manual-checklist:report
npm run audit:human-release-candidate-package
npm run execute:human-release-candidate-package:dry-run
npm run execute:human-release-candidate-package:check-env
npm run execute:human-release-candidate-package:report
```

Expected local status without real evidence: NO-GO with explicit visual, quality, staging, and manual approval blockers.

## Sprint 301–315 — Private Beta Execution Bridge

This block closes the preparation-only track and moves private beta work into real workstation/staging execution.

Commands:

```bash
npm run audit:private-beta-execution-bridge
npm run execute:private-beta-execution-bridge:dry-run
npm run execute:private-beta-execution-bridge:check-env
npm run execute:private-beta-execution-bridge:report

npm run audit:private-beta-operating-dashboard
npm run execute:private-beta-operating-dashboard:dry-run
npm run execute:private-beta-operating-dashboard:check-env
npm run execute:private-beta-operating-dashboard:report

npm run audit:private-beta-short-task-list
npm run execute:private-beta-short-task-list:dry-run
npm run execute:private-beta-short-task-list:check-env
npm run execute:private-beta-short-task-list:report

npm run audit:mock-beta-option-package
npm run execute:mock-beta-option-package:dry-run
npm run execute:mock-beta-option-package:check-env
npm run execute:mock-beta-option-package:report

npm run audit:private-beta-strategy-decision
npm run execute:private-beta-strategy-decision:dry-run
npm run execute:private-beta-strategy-decision:check-env
npm run execute:private-beta-strategy-decision:report
```

Windows operator command:

```powershell
powershell -ExecutionPolicy Bypass -File tools/private-beta-execution-bridge.windows.ps1
```

Expected local status without real evidence: `private_beta_execution_bridge_ready_with_env_blockers`, `private_beta_operating_dashboard_no_go`, and `private_beta_strategy_decision_no_go`.
