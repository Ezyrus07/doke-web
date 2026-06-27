# Guia de design system Doke

Este guia preserva consistência visual enquanto o frontend evolui para lógica real.

## Princípios

- Superfícies limpas, bordas consistentes e sombra controlada.
- Cards reutilizáveis com anatomia previsível.
- Botões com hierarquia clara: primário, secundário, ghost e ações compactas.
- Espaçamentos consistentes entre header, seções, cards e rails.
- Mobile não deve parecer outro produto; deve ser adaptação do mesmo sistema.

## Cores e botões

Botões que antes usavam gradiente azul-verde devem seguir o mesmo azul/estilo do botão `Entrar` de `auth/login.html`, salvo exceção explícita.

## Cards

Cards devem separar:

- mídia;
- título;
- descrição/resumo;
- metadados;
- ações;
- estados futuros.

Cards de anúncio, worker, publicação, pedido, avaliação e profissional devem reaproveitar contratos existentes antes de criar variações.

## Estados visuais

Estados recomendados:

```txt
loading
empty
ready
error
selected
expanded
disabled
owner
visitor
```

Use classes ou `data-state` previsíveis quando preparar renderização futura.

## Regra contra fragmentação

Não criar arquivo novo de estilo apenas para pequenos ajustes visuais. Primeiro procurar autoridade em:

1. `core`
2. `components`
3. `patterns`
4. `pages`

Se um arquivo novo for inevitável, seu nome deve descrever responsabilidade estável, não bug ou etapa.

## Tabs e filtros compactos

Tabs/filtros em formato pílula devem consumir `doke-tab-pill` antes de qualquer classe local. A classe local pode nomear o domínio (`help-tab`, `news-filter`, `wallet-tab`), mas não deve redesenhar altura, raio, borda, sombra, background, tipografia, ícone ou estado ativo.

A autoridade visual do contrato `doke-tab-pill` é `assets/css/components/tabs/tabs.css`. CSS de página deve ficar restrito ao trilho, ao fluxo responsivo e à densidade contextual.

## Busca de conteúdo

Busca grande em página de conteúdo deve usar `doke-search-field doke-search-field--hero` e deixar a anatomia em `assets/css/components/search/search-field.css`.

Classes locais, como `help-center-search`, podem preservar semântica de domínio e hooks, mas não devem redefinir altura, padding, raio, borda, sombra, background, tipografia, placeholder ou ícone do campo.


## Disclosure e FAQ

FAQs em superfícies de conteúdo devem usar `content-disclosure` e seus elementos (`content-disclosure__item`, `content-disclosure__summary`, `content-disclosure__chevron`, `content-disclosure__body`).

Classes locais, como `help-faq__item`, podem preservar semântica de domínio e hooks para JS, mas não devem redefinir divisores, borda, raio, fundo, padding do trigger, tipografia, corpo, chevron, hover ou estado aberto.

## Ícones de superfície

Use `content-surface-icon` para ícones internos de cards e painéis de conteúdo.

Exemplo:

```html
<span class="content-surface-icon content-surface-icon--topic" aria-hidden="true">
  <svg viewBox="0 0 24 24"><path d="..."></path></svg>
</span>
```

Modificadores disponíveis neste ciclo:

- `content-surface-icon--topic` para cards de tópico;
- `content-surface-icon--support` para cards de suporte;
- `content-surface-icon--compact` para listas/cards compactos;
- `content-surface-icon--floating` para ícone destacado dentro de composição visual;
- `content-surface-icon--cover` para ícone sobre capa/mídia;
- `content-surface-icon--cover-primary`, `content-surface-icon--cover-community`, `content-surface-icon--cover-success` e `content-surface-icon--cover-announcement` para variações de capa;
- `content-surface-icon--success` e `content-surface-icon--success-alt` para variações semânticas verdes.

CSS de página pode posicionar o bloco e a capa onde ele aparece, mas a anatomia visual do ícone pertence ao contrato compartilhado.

## Chips, badges e pins de conteúdo

Use `doke-chip doke-chip--content` para labels compactos em cards de conteúdo.

Exemplo:

```html
<span class="news-kicker doke-chip doke-chip--content" aria-hidden="true">Atualizações</span>
<span class="news-kicker doke-chip doke-chip--content doke-chip--on-media" aria-hidden="true">Comunidade</span>
```

Use `doke-badge doke-badge--success doke-badge--content` para badges compactos de destaque.

Use `doke-icon-btn doke-icon-btn--soft` para ações compactas de ícone em superfícies internas.

## Side list de conteúdo

Use `content-side-list` e `content-side-item` para listas compactas dentro de painéis laterais quando o item tiver ícone, corpo textual e ação curta.

```html
<article class="content-surface content-surface--interactive content-side-item">
  <span class="content-surface-icon content-surface-icon--compact"></span>
  <div class="content-side-item__body">
    <h3 class="content-side-item__title">Título</h3>
    <p class="content-side-item__text">Descrição.</p>
    <time class="content-side-item__meta">Data</time>
  </div>
  <button class="doke-icon-btn doke-icon-btn--soft"></button>
</article>
```

O CSS de página pode posicionar a lista no painel, mas não deve redesenhar o grid interno, padding, gap, tipografia do título ou link auxiliar. Use `content-side-link` para links textuais no rodapé do painel.

## Botões de fechar de superfícies

Use `doke-close-button` em botões icon-only que fecham modais, painéis, drawers, lightboxes, popovers e filtros. Mantenha a classe de domínio da página para JS e contexto, mas não use essa classe como autoridade visual.

Exemplo correto:

```html
<button class="news-detail-modal__close doke-close-button doke-icon-btn doke-icon-btn--flat" type="button" aria-label="Fechar">
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12"></path><path d="M18 6 6 18"></path></svg>
</button>
```

Quando houver texto visível apenas para leitura/acessibilidade dentro do botão, use `doke-close-button__label`.

Fechamentos inline dentro de campos de busca ou barras de seleção não usam `doke-close-button`; eles pertencem ao contrato do campo ou da barra em que estão embutidos.

## Modais, overlays e painéis

Modais e overlays devem expor uma anatomia estrutural compartilhada, mantendo as classes de domínio para JS e semântica local.

Exemplo de overlay não nativo:

```html
<div class="news-detail-modal doke-overlay doke-overlay--modal" hidden>
  <button class="news-detail-modal__backdrop doke-overlay__backdrop" type="button"></button>
  <article class="news-detail-modal__panel doke-overlay__surface" role="dialog" aria-modal="true">
    <header class="news-detail-modal__header doke-overlay__header"></header>
    <div class="news-detail-modal__body doke-overlay__body"></div>
    <div class="news-detail-modal__actions doke-overlay__actions"></div>
  </article>
</div>
```

Exemplo de `<dialog>` nativo:

```html
<dialog class="address-modal doke-native-overlay">
  <form class="address-modal__dialog doke-overlay__surface" method="dialog">
    <header class="address-modal__head doke-overlay__header"></header>
    <div class="address-modal__actions doke-overlay__actions"></div>
  </form>
</dialog>
```

Use `doke-overlay-panel` para painéis de ação móveis que são superfícies contextuais, mas não devem receber comportamento de overlay fixo genérico.
