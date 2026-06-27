# Contrato de superfícies

Superfície é qualquer bloco visual reutilizável: card, modal, painel, lista, toolbar, caixa de busca, item de chat, overlay ou container de estado.

## Responsabilidade

Componentes controlam anatomia interna. Páginas controlam contexto, ordem e densidade.

## Cards

Cards devem manter:

- borda consistente;
- raio coerente;
- respiro interno previsível;
- hierarquia entre título, descrição, metadados e ações;
- comportamento responsivo sem overflow horizontal.

## Modais e overlays

Devem manter:

- foco visível;
- fechamento previsível;
- camada visual coerente;
- sem conflito com shell/header/sidebar.

## Listas e estados

Listas devem estar preparadas para:

```txt
loading
empty
error
ready
```

Não acoplar CSS a quantidade fixa de itens mockados.

## Regra para CSS de superfície

Não criar variação visual duplicada se o mesmo resultado pode ser obtido com tokens, modifiers ou composição existente.

## CTAs dentro de superfícies de conteúdo

Quando uma superfície de conteúdo contém uma ação reutilizável — por exemplo suporte, carregar mais, ver detalhes ou preferência — a anatomia do botão pertence a `assets/css/components/buttons.css`.

A página pode decidir se a ação fica centralizada, ocupa largura total ou tem margem contextual. A página não deve redesenhar o botão com altura, raio, background, sombra ou tipografia próprios.

Classes canônicas usadas neste contrato:

```html
<button class="doke-btn doke-btn--primary">Ação principal</button>
<button class="doke-btn doke-btn--soft doke-btn--block">Ação secundária em card lateral</button>
<button class="doke-btn doke-btn--ghost doke-btn--pill">Ação neutra</button>
```

## Superfícies de conteúdo — ajuda e novidades

A anatomia raiz de cards/painéis de conteúdo pertence a `assets/css/components/internal/surface-contract.css` por meio das classes:

```html
<article class="content-surface">...</article>
<article class="content-surface content-surface--interactive">...</article>
```

Consumidores iniciais:

- `ajuda.html`: `help-topic-card`, `help-faq`, `help-support-card`, `help-status-card` e estado vazio gerado por `assets/js/pages/ajuda.js`;
- `novidades.html`: `news-feature`, `news-card`, `news-sidebar` e `news-important-card`.

Fronteira:

- CSS de página pode controlar grid, padding contextual, mídia interna, ícones, variações de capa, sticky e composição.
- CSS de página não deve controlar `background`, `border`, `border-radius` ou `box-shadow` da superfície raiz dessas famílias.
- Hover/focus de superfícies clicáveis pertence ao modificador `content-surface--interactive`.

Validação: `npm run audit:content-surface-contract`.

## Tabs dentro de superfícies/páginas de conteúdo

Filtros compactos usados para trocar a lista visível de conteúdo devem consumir a classe compartilhada `doke-tab-pill`.

Exemplo canônico:

```html
<button class="help-tab doke-tab-pill" type="button" aria-pressed="false">Categoria</button>
<button class="news-filter doke-tab-pill is-active" type="button" aria-pressed="true">Todos</button>
```

A anatomia visual pertence a `assets/css/components/tabs/tabs.css`. Páginas podem controlar apenas o trilho, quebra de linha, overflow e encaixe responsivo.

Validação: `npm run audit:content-tab-contract`.

## Campo de busca de conteúdo — ajuda

Campos de busca grandes usados como superfície de conteúdo devem consumir `doke-search-field` com um modificador compartilhado de densidade.

Exemplo canônico:

```html
<form class="help-center-search doke-search-field doke-search-field--hero" role="search">
  <svg class="doke-search-field__icon" aria-hidden="true"></svg>
  <input class="doke-search-field__input doke-input" type="search">
</form>
```

A anatomia visual pertence a `assets/css/components/search/search-field.css`. A página pode posicionar o campo dentro do fluxo, mas não deve redesenhar altura, padding, raio, borda, fundo, sombra, cor, tipografia, ícone ou placeholder do campo.

Validação: `npm run audit:content-search-contract`.


## Disclosure/FAQ de conteúdo — ajuda

FAQs baseados em `details`/`summary` devem consumir o contrato `content-disclosure` quando forem superfícies de conteúdo reutilizáveis.

Exemplo canônico:

```html
<div class="help-faq__list content-disclosure">
  <details class="help-faq__item content-disclosure__item" data-help-faq>
    <summary class="content-disclosure__summary">
      Pergunta
      <span class="help-faq__chevron content-disclosure__chevron" aria-hidden="true"></span>
    </summary>
    <p class="content-disclosure__body">Resposta.</p>
  </details>
</div>
```

A anatomia visual pertence a `assets/css/components/internal/surface-contract.css`. A página pode posicionar o bloco, controlar o padding da superfície externa e espaçamento entre título e lista, mas não deve redesenhar divisores, borda, raio, fundo, trigger, corpo, chevron, hover ou estado aberto.

Validação: `npm run audit:content-disclosure-contract`.

## Ícones de superfície — ajuda e novidades

Autoridade escolhida: `assets/css/components/internal/surface-contract.css`, por meio de `content-surface-icon` e seus modificadores.

Consumidores iniciais:

- `ajuda.html`: `help-topic-card__icon` e `help-support-card__icon`;
- `novidades.html`: `news-feature__floating-icon`, `news-important-card__icon` e `news-card__cover-icon`.

Fronteira:

- CSS de página pode posicionar o ícone dentro da composição, como `position`, `right`, `bottom` ou margem contextual.
- CSS de página não deve controlar tamanho, raio, fundo, sombra, cor, blur/backdrop, SVG, stroke ou fill desses ícones.
- Variações visuais devem usar modificadores compartilhados, como `content-surface-icon--topic`, `content-surface-icon--support`, `content-surface-icon--compact`, `content-surface-icon--floating`, `content-surface-icon--cover`, `content-surface-icon--cover-primary`, `content-surface-icon--cover-community`, `content-surface-icon--cover-success`, `content-surface-icon--cover-announcement`, `content-surface-icon--success` e `content-surface-icon--success-alt`.

Validação: `npm run audit:content-icon-contract`.

## Metadados compactos de conteúdo

Kickers, badges e pins de cards de conteúdo devem consumir contratos compartilhados, não anatomia local de página.

Consumidores iniciais em `novidades.html`:

- `news-kicker doke-chip doke-chip--content` para labels de categoria;
- `doke-chip--on-media` para labels sobre capas/imagens;
- `news-feature__badge doke-badge doke-badge--success doke-badge--content` para badge do destaque;
- `news-sidebar__pin doke-icon-btn doke-icon-btn--soft` e `news-important-card__pin doke-icon-btn doke-icon-btn--soft` para ações compactas.

CSS de página pode posicionar esses elementos dentro da composição, mas não deve redefinir altura, padding, borda, raio, fundo, sombra, cor, tipografia, SVG ou cursor.

Validação: `npm run audit:content-meta-contract`.

## Listas laterais de conteúdo — novidades

Cards compactos dentro de painéis laterais de conteúdo devem consumir o contrato `content-side-list` / `content-side-item` quando a anatomia for lista compacta com ícone, corpo e ação.

Exemplo canônico:

```html
<div class="news-important-list content-side-list">
  <article class="news-important-card content-surface content-surface--interactive content-side-item">
    <span class="content-surface-icon content-surface-icon--compact"></span>
    <div class="news-important-card__body content-side-item__body">
      <h3 class="content-side-item__title">Título</h3>
      <p class="content-side-item__text">Descrição curta.</p>
      <time class="content-side-item__meta">Data</time>
    </div>
    <button class="doke-icon-btn doke-icon-btn--soft"></button>
  </article>
</div>
<a class="news-sidebar__link content-side-link">Ver todas</a>
```

A anatomia visual pertence a `assets/css/components/internal/surface-contract.css`. CSS de página pode controlar o painel pai, sticky, `justify-self` do link e layout externo, mas não deve redefinir grid interno, gap, padding, ritmo do corpo, tipografia do título ou anatomia do link.

Validação: `npm run audit:content-side-list-contract`.

## Overlays e superfícies modais

Superfícies modais devem consumir os hooks estruturais compartilhados quando possuírem raiz, backdrop, painel, header, corpo e ações.

Classes canônicas:

- `doke-overlay` para overlay não nativo;
- `doke-native-overlay` para `<dialog>`;
- `doke-overlay__backdrop` para backdrop/scrim;
- `doke-overlay__surface` para o painel/card/dialog;
- `doke-overlay__header` para cabeçalho;
- `doke-overlay__body` para corpo rolável/conteúdo principal;
- `doke-overlay__actions` para rodapé/ações;
- `doke-overlay-panel` para painéis móveis contextuais.

A página pode manter classes locais como `news-detail-modal__panel` ou `payment-finish-modal__card`, mas essas classes não devem ser a única anatomia estrutural do modal.

Validação: `npm run audit:overlay-modal-contract`.
