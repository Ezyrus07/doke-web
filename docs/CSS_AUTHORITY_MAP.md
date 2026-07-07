# CSS Authority Map — Doke

Este mapa define autoridade antes de novas correções visuais. Ele deve ser usado para evitar cascata, duplicação e remendos.

## Autoridades

| Área | Dono permitido | Proibido em |
|---|---|---|
| Tokens, reset, tipografia base | `assets/css/core` | `pages` |
| Rail/largura global | `core/layout` ou contrato global existente | CSS de página sem escopo |
| Header compartilhado | `assets/css/layout/header.css` | páginas isoladas, `components/shell` e patterns criando anatomia concorrente |
| Shell, sidebar, bottom-nav | `components/shell` / `patterns/navigation` | páginas isoladas |
| Cards de anúncio | `components/cards/ad-card.css` e contrato card compartilhado | `pages/*` alterando anatomia |
| Workers/vídeos | `components/cards/worker-card.css` ou pattern canônico | `pages/home` alterando anatomia |
| Publicações | `components/cards/publication-card.css` | `pages/*` alterando mídia/body/footer |
| Botões | `components/buttons` | CSS por página duplicando estilo |
| Inputs/busca | `components/forms`/`components/search` | CSS local duplicado |
| Modais | `components/modals` | CSS local por modal |
| Layout específico da página | `pages/<page>` | componentes internos |

## Regra de fronteira

CSS de página pode controlar: `display`, `grid-template-columns`, `gap`, `overflow`, `margin-block`, `rail`, `max-width` da composição local.

CSS de página não pode controlar: `height`/`min-height` de mídia interna, `padding` interno, `border-radius`, `box-shadow`, tipografia interna, CTA, tags, badges, footer e avatar de componentes compartilhados.

## Processo obrigatório

1. Encontrar regra vencedora no DevTools/Computed.
2. Classificar a regra como componente, pattern, core ou page.
3. Remover/consolidar conflito antes de adicionar regra nova.
4. Validar primeiro paint, `DOMContentLoaded` e `load`.
5. Registrar riscos e arquivos alterados.


## Mobile app shell location authority

O botão de localização do header mobile injetado por `assets/js/components/mobile-app-shell.js` tem autoridade visual única em `assets/css/components/shell/mobile-app-shell.css`.

Regras de fronteira:

- CSS de página não pode estilizar `.doke-mobile-shell__location`, `.doke-mobile-shell__location-dot` ou `.doke-mobile-shell__location-label`.
- Altura do location pill deve consumir `--doke-mobile-shell-action-height`, ligado a `--doke-mobile-shell-topbar-height`, nunca o token genérico `--control-height-xs`.
- O contrato é validado por `npm run audit:mobile-shell-location-contract`.

## Mobile/tablet drawer authority

O menu lateral usado em viewports touch/tablet tem autoridade visual única em `assets/css/components/navigation/mobile-drawer-standard.css`.

Regras de fronteira:

- CSS de página não pode estilizar `.home-mobile-drawer`, `.home-mobile-drawer__panel`, `.home-mobile-drawer__item`, `.home-mobile-drawer__header`, `.home-mobile-drawer__content` ou atributos `data-mobile-drawer*`.
- Arquivos antigos relacionados ao drawer da home devem permanecer sem seletores de runtime quando existirem apenas como ponte histórica.
- Largura, posição, raio, sombra, backdrop, scroll interno, ícones, item ativo e badges do drawer pertencem ao componente global.

- Largura canônica atual: `clamp(236px, 66vw, 264px)`, mantendo o drawer estreito para preservar vista do site ao fundo.
- O contrato é validado por `npm run audit:mobile-drawer-visual-authority`.

## Contratos visuais desktop em fechamento

Esta seção registra a auditoria entre `index.html`, `resultados.html`, `detalhe-anuncio.html` e `perfil.html`. O relatório completo está em `reports/generated/desktop-visual-authority-audit.md`.

| Componente/padrão | Autoridade correta | Páginas consumidoras | Status | Regra de fronteira |
|---|---|---|---|---|
| Header global | `assets/css/layout/header.css` | todas | compartilhado | páginas não devem redesenhar altura, rail ou ações globais do header |
| Rail/largura desktop | `assets/css/layout/page-rail-authority.css` | todas | compartilhado | páginas só podem definir composição interna após o rail |
| Input grande de busca | `assets/css/components/search/search-bar.css` | `index.html`, `resultados.html` | parcialmente compartilhado | page CSS pode posicionar/medir o slot, mas não reinventar borda, raio, botão ou sombra |
| CTAs da busca | `assets/css/components/search/search-bar.css` | `index.html` | compartilhado inicial | não misturar `doke-search-cta` e `doke-btn` no mesmo elemento |
| Abas/chips de escopo | `assets/css/components/search/search-scope.css` e `assets/css/components/ui/doke-ui-system.css` | `resultados.html` e páginas futuras | compartilhado inicial | tabs locais devem consumir classes compartilhadas antes de criar classes de página |
| Botões genéricos | `assets/css/components/ui/doke-ui-system.css` e `assets/css/components/buttons.css` | múltiplas páginas | parcial | CSS de página não deve redefinir cor, borda, altura, radius, sombra ou tipografia do botão |
| Cards de anúncio/resultado | `assets/css/components/cards/ad-card.css` e `assets/css/components/cards/marketplace-card-contract.css` | `index.html`, `resultados.html`, `detalhe-anuncio.html` | parcial | page CSS controla grid/rail; anatomia do card fica em components |
| Hero e cards do perfil | `assets/css/pages/perfil.css` e módulos `pages/perfil/*` | `perfil.html` | page-owned temporário | fechar visualmente antes de extrair para componentes compartilhados |

### Ordem segura para fechar visual

1. Não fazer novo polish solto em `index.html`; home é régua visual.
2. Fechar `resultados.html` consumindo contratos compartilhados já existentes.
3. Fechar `detalhe-anuncio.html` migrando CTAs, reviews e cards relacionados por família.
4. Fechar `perfil.html` antes de extrair hero/tabs/actions para `components` ou `patterns`.
5. Só depois limpar colisões antigas de cards/rails apontadas pelos auditores.

## Home CSS structure gate

`npm run audit:index-css-structure` maps the active CSS reachable from `index.html` before any home CSS consolidation. Use it with `docs/HOME-AUTHORITY-CLASSIFICATION.md` and `reports/generated/index-css-structure-audit.md`.

Current reading from the 2026-06-13 audit:

- `index.html` correctly has a single direct page CSS entry.
- The reachable cascade is still large: 146 CSS files and 4159 parsed rules.
- Home still has significant page-owned visual pressure over shared component families.
- The next cleanup must be family-by-family, not a broad import deletion.

Boundary rule: home page CSS may keep page-specific composition, responsive slot sizing and section order. It must not remain the final visual authority for reusable search, button, card, rail, avatar, overlay, shell or header anatomy.

## Passo estrutural — search/input/actions

Data: 2026-06-13.

Escopo aplicado sem polish visual solto no `index.html`:

- `doke-search-pill--toolbar` agora é o modificador compartilhado para o input grande compacto da home e do topo de `resultados.html` em desktop/tablet.
- `doke-search-cta--compact` mantém a densidade aprovada dos CTAs da busca dentro da autoridade `components/search/search-bar.css`.
- `doke-filter-pill` passou a ser a autoridade visual do botão de filtros ao lado das abas de escopo; `pages/search-results/filter-toggle-density.css` ficou restrito a encaixe e densidade do grid.

Regra de fronteira reforçada: `pages/home-search-chrome.css` e `pages/search-results/index-rail-alignment.css` podem posicionar, medir o slot e organizar o grid, mas não devem redefinir borda, sombra, raio, botão interno ou tipografia do search pill.

Leitura pós-passo via `npm run audit:index-css-structure`:

- CSS alcançáveis pela home: 146.
- `!important` alcançáveis: 1683.
- pressão visual page-owned sobre componentes compartilhados: 1581, reduzida de 1595.

Próxima família recomendada: cards/CTAs de cards, sem alterar novamente o visual congelado da home.

## Passo estrutural — cards/CTAs de cards

Data: 2026-06-13.

Escopo aplicado sem reabrir o polish visual do `index.html`:

- CTAs de `doke-ad-card` agora carregam a mesma semântica compartilhada de botão do baseline: `doke-ad-card__cta doke-btn doke-btn--success`.
- CTAs de `professional-showcase-card` renderizados em resultados agora carregam `professional-showcase-card__cta doke-btn doke-btn--primary`, alinhando a saída dinâmica ao HTML estático aprovado da home.
- `assets/js/pages/search-results.js`, `assets/js/pages/results/index.js`, `assets/js/pages/perfil.js` e os cards relacionados de `detalhe-anuncio.html` passaram a consumir o mesmo contrato de CTA usado pelo `index.html`.
- O novo guard `npm run test:card-cta-contract` bloqueia novas renderizações de card CTA sem as classes compartilhadas.

Regra de fronteira reforçada: cards continuam pertencendo a `assets/css/components/cards/*`; páginas podem organizar grid, rail e quantidade visível, mas não devem criar CTA paralelo para anúncios ou profissionais.

## Passo estrutural — resultados/cards de anúncio desktop

Data: 2026-06-13.

Escopo aplicado sem mexer no visual congelado do `index.html`:

- Os anúncios renderizados por `assets/js/pages/search-results.js` agora entram com o modificador `doke-ad-card--results`.
- A anatomia desktop específica dos cards de anúncio em resultados deixou de ser definida por seletores de página em `assets/css/pages/search-results/filter-toggle-density.css`.
- `assets/css/components/cards/ad-card.css` passou a consumir os tokens `--doke-ad-results-*` para mídia, padding do corpo, gap do footer e largura mínima do CTA.
- `filter-toggle-density.css` continua podendo controlar colunas, gaps e densidade do grid, mas agora só expõe tokens de composição para o componente.
- O novo guard `npm run test:results-card-density-contract` bloqueia regressões em que CSS de página volte a mirar `.doke-ad-card__media`, `.doke-ad-card__body`, `.doke-ad-card__footer` ou `.doke-ad-card__cta`.

Regra de fronteira reforçada: `resultados.html` pode decidir quantas colunas e quanta densidade a listagem precisa ter; a anatomia visual do anúncio continua pertencendo a `components/cards/ad-card.css`.



## Contrato de topo e rail em fluxos

A anatomia do bloco de topo dos fluxos (`doke-form-page-top`), o rail principal (`doke-form-page-rail`) e a primeira grade operacional (`doke-form-page-grid`) pertencem a `assets/css/components/forms/form-page-top-contract.css`. CSS de página pode controlar composição específica do conteúdo interno, mas não pode redefinir margem do hero, tipografia do título/descrição ou tokens locais de título para vencer o contrato compartilhado.

Consumidores atuais do gate automatizado: `orcamento.html`, `tornar-profissional.html`, `anunciar-servico.html` e `pagamento-profissional.html`. O comando `npm run audit:form-page-top-contract` falha quando uma dessas páginas perde rail/top/grid canônicos ou quando CSS de página tenta retomar a anatomia do topo do fluxo.

## Contrato de ações em fluxos

A anatomia de botões de formulários e pagamentos pertence a `assets/css/components/ui/doke-ui-system.css` e `assets/css/components/buttons.css`. CSS de página pode controlar apenas o grid, a ordem contextual, `gap`, `margin-top`, `width` ou estado `hidden` dos containers de ação.

Consumidores atuais do gate automatizado: `orcamento.html`, `tornar-profissional.html`, `anunciar-servico.html` e `pagamento-profissional.html`. O comando `npm run audit:form-button-contract` falha quando uma dessas páginas perde `doke-form-actions` no container canônico ou quando CSS de página tenta redefinir altura, raio, borda, background, sombra ou tipografia dos botões do fluxo.

## Ações de conteúdo — ajuda e novidades

Autoridade escolhida: `assets/css/components/buttons.css` para anatomia de CTAs reutilizáveis em páginas de conteúdo.

Consumidores iniciais:

- `ajuda.html`: `Abrir chamado` e `Ver meus chamados`;
- `novidades.html`: `Ver detalhes`, `Carregar mais`, `Entendi` e `Preferências de aviso`.

Fronteira:

- `assets/css/pages/ajuda.css` e `assets/css/pages/novidades.css` podem controlar contexto, grid, sticky, margem local e posicionamento.
- Esses CSS de página não devem controlar altura, raio, borda, background, sombra, fonte, padding, cor ou cursor desses CTAs.

Validação: `npm run audit:content-action-contract`.

## Superfícies de conteúdo — ajuda e novidades

Autoridade escolhida: `assets/css/components/internal/surface-contract.css` para a anatomia raiz de cards e painéis de conteúdo por meio de `content-surface` e `content-surface--interactive`.

Consumidores iniciais:

- `ajuda.html`: cards de tópico, FAQ, suporte, status e estado vazio dinâmico;
- `novidades.html`: destaque principal, cards de novidades, sidebar e cards importantes.

Fronteira:

- `assets/css/pages/ajuda.css` e `assets/css/pages/novidades.css` podem controlar layout, grid, padding contextual, mídia interna, ícones, variações de capa e sticky.
- Esses CSS de página não devem controlar `background`, `border`, `border-radius` ou `box-shadow` da superfície raiz dessas famílias.

Validação: `npm run audit:content-surface-contract`.

## Tabs/filtros de conteúdo — ajuda e novidades

Autoridade escolhida: `assets/css/components/tabs/tabs.css` para a anatomia de `doke-tab-pill` em páginas de conteúdo.

Consumidores iniciais:

- `ajuda.html`: filtros de categoria `help-tab doke-tab-pill`;
- `novidades.html`: filtros de categoria `news-filter doke-tab-pill`.

Fronteira:

- `assets/css/pages/ajuda.css` e `assets/css/pages/novidades.css` podem controlar o trilho (`display`, `gap`, `wrap`, overflow horizontal e `flex: 0 0 auto` em mobile).
- Esses CSS de página não devem controlar a anatomia dos botões: altura, padding, raio, borda, background, sombra, cor, fonte, cursor, ícones, hover ou estado ativo.
- O manifesto `assets/css/pages/flow-foundation.css` deve carregar `assets/css/components/tabs/tabs.css` antes dos CSS de página que consomem `doke-tab-pill`.

Validação: `npm run audit:content-tab-contract`.

## Campo de busca de conteúdo — ajuda

Autoridade escolhida: `assets/css/components/search/search-bar.css` para a anatomia de `doke-search-pill` e `doke-search-pill--toolbar`.

Consumidor inicial: `ajuda.html`, por meio de `help-center-search doke-search-panel__form doke-search-pill doke-search-pill--toolbar`, alinhado ao contrato visual de home/resultados.

Fronteira:

- `assets/css/pages/ajuda.css` pode controlar apenas o posicionamento contextual da página.
- O CSS de página não deve controlar altura, padding, raio, borda, fundo, sombra, cor, tipografia, placeholder, botão interno ou ícone da busca.
- `assets/css/pages/ajuda-foundation.css` deve carregar `assets/css/components/search/search-bar.css` antes do CSS de página que consome a busca.
- `assets/css/core/components.css` preserva `assets/css/components/search/search-field.css` como contrato base para buscas inline antigas até migração controlada.

Validação: `npm run audit:content-search-contract`.


## Disclosure/FAQ de conteúdo — ajuda

Autoridade escolhida: `assets/css/components/internal/surface-contract.css` para a anatomia de disclosure/accordion baseada em `details`/`summary`, por meio de:

```html
<div class="content-disclosure">
  <details class="content-disclosure__item">
    <summary class="content-disclosure__summary">
      Pergunta
      <span class="content-disclosure__chevron" aria-hidden="true"></span>
    </summary>
    <p class="content-disclosure__body">Resposta.</p>
  </details>
</div>
```

Consumidor inicial: FAQ de `ajuda.html`.

Fronteira:

- `assets/css/pages/ajuda.css` pode controlar a posição do FAQ na página, padding do card externo e margem entre título e lista.
- O CSS de página não deve controlar anatomia interna do disclosure: divisores, borda, raio, fundo, trigger, padding, tipografia, corpo, chevron, hover ou estado aberto.
- O comportamento de exclusividade entre itens abertos continua em `assets/js/pages/ajuda.js`; JS não deve controlar visual de CSS.

Validação: `npm run audit:content-disclosure-contract`.

## Ícones de superfície de conteúdo

A anatomia dos ícones internos de cards e painéis de conteúdo pertence a `assets/css/components/internal/surface-contract.css`.

Consumidores atuais:

- `ajuda.html`: ícones de tópico e suporte;
- `novidades.html`: ícone flutuante do destaque, ícones dos cards importantes e `news-card__cover-icon` nos cards de novidades.

`assets/css/pages/ajuda.css` e `assets/css/pages/novidades.css` podem posicionar o ícone no layout, mas não devem redefinir tamanho, raio, cor, fundo, sombra, backdrop/blur ou SVG. O gate `npm run audit:content-icon-contract` protege esse contrato.

## Metadados de conteúdo — novidades

Autoridade escolhida:

- `assets/css/components/status/chips-badges.css` para kickers/chips e badges de conteúdo;
- `assets/css/components/buttons.css` para botões de ícone suaves usados como ações compactas.

Consumidores atuais:

- `novidades.html`: `news-kicker`, `news-feature__badge`, `news-sidebar__pin` e `news-important-card__pin`.

Fronteira:

- `assets/css/pages/novidades.css` pode posicionar chips/badges dentro de capas, cards e modais (`position`, `z-index`, `top`, `right`).
- `assets/css/pages/novidades.css` não deve controlar altura, padding, raio, fundo, borda, sombra, cor, tipografia, SVG ou cursor desses metadados.
- Kicker sobre mídia deve usar o modificador compartilhado `doke-chip--on-media` em vez de override local de background/blur.
- Pins devem consumir `doke-icon-btn doke-icon-btn--soft`.

Validação: `npm run audit:content-meta-contract`.


### Ícones de capa de novidades

`news-card__cover-icon` consome o mesmo contrato `content-surface-icon`, com `content-surface-icon--cover` e variações semânticas (`--cover-primary`, `--cover-community`, `--cover-success`, `--cover-announcement`). `assets/css/pages/novidades.css` pode manter o background da capa (`news-card__cover`) e a composição decorativa, mas não deve redefinir tamanho, raio, cor, fundo, sombra, blur ou SVG do ícone. O gate `npm run audit:content-icon-contract` cobre essa família.

## Listas laterais de conteúdo — novidades

Autoridade escolhida: `assets/css/components/internal/surface-contract.css` para a anatomia de listas compactas dentro de painéis laterais, por meio de:

- `content-side-list`;
- `content-side-item`;
- `content-side-item__body`;
- `content-side-item__title`;
- `content-side-link`.

Consumidor atual:

- `novidades.html`: lista `news-important-list`, cards `news-important-card` e link `news-sidebar__link` dentro do painel `news-sidebar`.

Fronteira:

- `assets/css/pages/novidades.css` pode controlar sticky, padding e grid do painel `news-sidebar`, além de posicionamento contextual como `justify-self` do link.
- `assets/css/pages/novidades.css` não deve controlar display/grid/padding/gap dos itens da lista, ritmo interno do corpo, tipografia do título ou anatomia visual do link.

Validação: `npm run audit:content-side-list-contract`.

## Contrato sistêmico de botões de fechar

Autoridade escolhida: `assets/css/components/overlays/modal.css` para o contrato explícito `doke-close-button` em HTMLs que não carregam o pacote `ui-surface`, e `assets/css/components/ui-surface/buttons-close.css` como camada de compatibilidade para superfícies internas que já usam o sistema de UI surface.

Consumidores atuais: controles de fechar de modais, painéis, lightboxes, drawers e filtros nos HTMLs ativos da raiz. Fechamentos inline de campos de busca, barras de seleção e previews de resposta continuam fora do contrato porque têm anatomia de ação embutida no campo, não de botão de fechar de superfície.

Fronteira: CSS de página pode posicionar um botão de fechar dentro do painel ou modal. CSS de página não deve redefinir tamanho, raio, borda, background, sombra, padding ou SVG desses controles quando eles forem `doke-close-button`.

Validação: `npm run audit:close-button-contract`.

## Contrato sistêmico de modais, overlays e painéis

Autoridade escolhida:

- `assets/css/components/overlays/modal.css` para os hooks estruturais globais `doke-overlay`, `doke-native-overlay`, `doke-overlay__backdrop`, `doke-overlay__surface`, `doke-overlay__header`, `doke-overlay__body` e `doke-overlay__actions` em páginas que carregam apenas o core/components;
- `assets/css/components/overlays/overlay-contract.css` para a camada de overlay/root/scrim/surface usada por páginas internas, home, resultados e comunidade.

Consumidores atuais incluem modais de localização, endereço, orçamento, pagamento, carteira, cobrança, comunidade, novidades, avaliação, feedback de pedido, previews de mídia, filtros/seleção mobile e side panels.

Fronteira:

- CSS de página pode controlar conteúdo específico, grids internos, textos, ícones de domínio e posicionamento contextual aprovado.
- CSS de página não deve criar uma nova raiz/scrim/surface/header/body/actions para modais equivalentes sem consumir os hooks compartilhados.
- Painéis que não usam `hidden` como contrato de exibição não devem receber `doke-overlay` até serem migrados para uma família própria.

Validação: `npm run audit:overlay-modal-contract`.

## Modal Visual Contract

Autoridade: `assets/css/components/overlays/modal-visual-contract.css`.

Responsabilidade: anatomia visual final de modais/overlays equivalentes: largura, raio, sombra, padding, close, eyebrow, título, descrição, corpo, campos, footer, botões, scroll e responsividade mobile.

Consumidores atuais:

- `mensagens.html`: cobrança (`charge-modal`);
- `carteira.html`: saque e conta bancária;
- `comunidade.html`: entrar por código e criar comunidade;
- `orcamento.html`: endereço e sucesso;
- `resultados.html`: modal de UI e media previews;
- `novidades.html`: detalhe de novidade;
- `pagamento-profissional.html`: estados de pagamento/finalização;
- `avaliacao-profissional.html`: sucesso da avaliação;
- `anunciar-servico.html` e `tornar-profissional.html`: estados de envio;
- `pedidos.html`: painel de detalhe/chat.

Fronteira: CSS de página pode controlar conteúdo específico do modal, grid semântico, mensagens e estado de abertura. CSS de página não deve reassumir largura, radius, sombra, título, footer, botão de fechar, altura de ações ou shell visual dos campos quando o modal consome `doke-modal-surface`.

Validação: `npm run audit:modal-visual-contract`.

## Lote P — controles básicos de formulário

Autoridade escolhida: `assets/css/components/forms/form-controls.css`.

A anatomia de `doke-input`, `doke-select`, `doke-textarea`, `doke-checkbox`, `doke-radio`, `doke-switch`, `doke-field` e campos visíveis dentro de `doke-modal-field` pertence ao contrato de formulário compartilhado. CSS de página pode controlar grade, coluna, largura contextual, margem e ordem local, mas não deve redesenhar altura, raio, borda, fundo, sombra, tipografia, placeholder, foco ou marcação interna desses controles.

Consumidores cobertos neste lote: todos os 21 HTMLs ativos da raiz e os 3 HTMLs de `auth/`. `input[type="hidden"]` e `input[type="file"]` ficam fora deste gate porque não são controles visuais equivalentes; uploads devem entrar em contrato próprio posterior.

Validação: `npm run audit:form-control-contract`.

## Contrato sistêmico de botões e ações

Autoridade principal: `assets/css/components/buttons.css`.

Responsabilidade: anatomia dos botões e ações reutilizáveis do produto — `doke-btn`, `doke-button`, `doke-icon-btn`, `doke-action-button`, `doke-close-button`, além de owners especializados como `doke-segment-button`, `doke-choice-button` e `doke-rating-star`.

Fronteira: CSS de página pode posicionar uma ação, controlar grid/gap contextual, largura de container ou estado `hidden`. CSS de página não deve reassumir altura, padding, raio, borda, background, sombra, cor, SVG, hover ou disabled de ações que já possuem owner canônico.

Consumidores atuais: todos os 21 HTMLs ativos da raiz e os 3 HTMLs de `auth/`. `auth-foundation.css` importa `buttons.css` explicitamente porque as páginas de autenticação não passam pelo manifest global `core/index.css`.

Validação: `npm run audit:button-system-contract`, incluído em `npm run audit:agent-governance`. O inventário global também deve reportar `buttons without canonical class: 0`.

## Header/sidebar global — Lote R

Autoridades escolhidas:

- `assets/css/layout/header.css` para a anatomia visual e geometria do `app-header`;
- `assets/css/pages/sidebar-unified.css` e `assets/css/pages/internal-shell.css` para a sidebar compartilhada e encaixe no shell atual;
- `assets/js/core/app.js` para renderizar o markup único da sidebar, reaplicar atributos de contrato após navegação interna e garantir o scrim de drawer quando necessário.

Consumidores: todos os 21 HTMLs ativos da raiz.

Contrato estrutural obrigatório:

```html
<div class="app-shell" data-shell-contract="app-shell">
  <aside class="sidebar" data-shell-sidebar data-sidebar-contract="global-sidebar"></aside>
  <div class="page">
    <header class="app-header home-side-meta" data-app-header data-header-contract="app-header" data-header-variant="standard|contextual" data-header-family="standard|contextual">
      ...
    </header>
  </div>
</div>
```

Fronteira:

- páginas podem escolher a variante do header, texto, ações contextuais e conteúdo do slot;
- páginas não devem criar outro shell, outra sidebar ou outro topbar concorrente para corrigir uma diferença local;
- alterações visuais em controles do header devem ir para `layout/header.css` ou para o componente correto de botão/avatar/busca;
- diferenças no menu lateral devem ser resolvidas no markup único de `assets/js/core/app.js` ou na autoridade compartilhada da sidebar, não no CSS de uma página.

Validação: `npm run audit:header-sidebar-parity-contract`, incluído em `npm run audit:agent-governance`.
