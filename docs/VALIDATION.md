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
assets/css/components/search/search-field.css
assets/css/core/components.css
```

Ele falha quando:

- a busca de ajuda perde `doke-search-field` ou `doke-search-field--hero`;
- o input perde `doke-search-field__input` ou `doke-input`;
- `assets/css/pages/ajuda.css` volta a controlar a anatomia de `.help-center-search` ou descendentes;
- `assets/css/components/search/search-field.css` deixa de definir a variante `doke-search-field--hero` e seus tokens;
- o manifesto de componentes core deixa de carregar a autoridade de busca compartilhada.

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
