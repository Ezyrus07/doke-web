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

Busca grande em página de conteúdo que deve acompanhar home/resultados deve usar `doke-search-pill doke-search-pill--toolbar` e deixar a anatomia em `assets/css/components/search/search-bar.css`.

Classes locais, como `help-center-search`, podem preservar semântica de domínio e hooks, mas não devem redefinir altura, padding, raio, borda, sombra, background, tipografia, placeholder, botão interno ou ícone do campo.


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

## Modal Visual Contract

Use `doke-modal-surface` em toda superfície de modal equivalente. Adicione uma variante funcional:

```html
<section class="doke-overlay__surface doke-modal-surface doke-modal-surface--form">
  <header class="doke-overlay__header doke-modal-header">
    <span class="doke-modal-eyebrow">Nova ação</span>
    <h2 class="doke-modal-title">Título do modal</h2>
    <p class="doke-modal-description">Descrição curta.</p>
  </header>
  <div class="doke-overlay__body doke-modal-body">...</div>
  <footer class="doke-overlay__actions doke-modal-actions">...</footer>
</section>
```

Variantes atuais:

- `doke-modal-surface--compact`: ações curtas, cobrança, CEP, código;
- `doke-modal-surface--form`: formulários longos, endereço, comunidade e conta bancária;
- `doke-modal-surface--financial`: modais financeiros;
- `doke-modal-surface--detail`: detalhe de conteúdo ou pedido;
- `doke-modal-surface--feedback`: sucesso, loading, confirmação;
- `doke-modal-surface--media`: lightbox/worker/media preview.

Não crie visual local para close, footer, título, radius, sombra ou ação primária/secundária em CSS de página.

### Elevação sem borda em modais

- Superfícies, campos, opções internas, close e rodapés não usam borda visível no estado normal.
- O estado normal usa sombra de elevação sem anel permanente de `1px`.
- O halo externo é reservado ao `:focus-visible` por acessibilidade.
- Divisores estruturais devem ser substituídos por espaçamento, mudança sutil de fundo ou sombra direcional do rodapé.
- Checkbox e radio preservam sua anatomia de estado; esta regra não autoriza ocultar o indicador de seleção.

## Controles básicos de formulário

Use sempre classes canônicas em controles visíveis:

```html
<label class="doke-field">
  <span class="doke-label">Nome</span>
  <input class="doke-input" type="text" placeholder="Ex.: Maria" />
</label>

<select class="doke-select"></select>
<textarea class="doke-textarea"></textarea>
<input class="doke-checkbox" type="checkbox" />
<input class="doke-radio" type="radio" />
<label class="doke-switch"><input class="doke-switch__input" type="checkbox" /><span></span></label>
```

A classe local pode continuar existindo para semântica de domínio, JS ou layout, mas não deve ser a autoridade visual do controle. Campos em modais devem combinar `doke-modal-field` com os mesmos controles canônicos.

## Contrato de botões e ações

Use `doke-btn` para ações textuais e escolha o modificador semântico mínimo:

```html
<button class="doke-btn doke-btn--primary">Salvar</button>
<button class="doke-btn doke-btn--secondary">Cancelar</button>
<button class="doke-btn doke-btn--ghost">Voltar</button>
<button class="doke-btn doke-btn--danger">Excluir</button>
```

Use `doke-icon-btn` para ações icon-only que não são fechamento de superfície. Para fechamento de modal/painel/drawer/lightbox, use `doke-close-button` junto com a classe local necessária para JS.

Use contracts especializados quando a ação não for um botão comum:

- `doke-filter-pill` para filtros/tabs de escopo;
- `doke-segment-button` para opções segmentadas;
- `doke-choice-button` para choices visuais;
- `doke-rating-star` para estrelas de avaliação.

Não use CSS de página para redesenhar a anatomia do botão. A página pode apenas posicionar, agrupar ou controlar responsividade contextual.

## Contrato Doke Clean para controles canônicos

- Botões secundários, inputs, selects, tabs, chips e badges não usam borda visível no estado normal.
- A separação visual vem de fundo e elevação curta (`--shadow-control-soft`), sem anel de `1px` externo ou inset.
- Hover usa `--shadow-control-hover`; foco mantém halo acessível por `--shadow-focus`.
- Bordas continuam permitidas apenas quando carregam semântica indispensável, como divisores estruturais, mídia recortada ou estados de erro que não possam depender apenas de cor.
- CSS de página não deve recolocar `border: 1px` nesses componentes. Exceções precisam ser documentadas na autoridade do componente.

## Política de consolidação de botões e remoção de `!important`

A evolução visual do Doke deve reduzir famílias concorrentes, não criar novos aliases.

### Marcação nova

- Ação textual comum: `doke-btn` + exatamente um modificador semântico (`--primary`, `--secondary`, `--ghost`, `--success` ou `--danger`).
- Tamanho diferente só quando necessário: `--sm` ou `--lg`.
- Largura total só quando necessária: `--block`.
- A classe local pode permanecer como hook de domínio/JS ou para layout do grupo, mas não pode definir altura, padding, raio, borda, fundo, tipografia, sombra ou estados do botão.
- `doke-button` permanece apenas como alias de compatibilidade; não deve ser usado em marcação nova.
- Botões contextuais especializados (`doke-filter-pill`, `doke-segment-button`, `doke-choice-button`, `doke-icon-btn`, `doke-close-button`) não devem acumular `doke-btn` quando o contrato especializado já possui anatomia completa.

### Migração progressiva

Ao tocar uma página:

1. inventariar classes locais de botão;
2. substituir anatomia local por classes canônicas;
3. remover regras locais equivalentes;
4. preservar somente classes de domínio necessárias para JS ou posicionamento;
5. executar `npm run audit:button-system-contract` e `npm run audit:content-action-contract`.

### Política de `!important`

- Nenhum `!important` novo é permitido.
- Arquivos alterados devem terminar com contagem igual ou menor que a inicial.
- A remoção deve ser incremental e baseada na regra vencedora real; não fazer remoção em massa sem validar a cascata.
- Quando um `!important` for encontrado na autoridade tocada, consolidar origem, ordem de importação ou especificidade natural antes de removê-lo.
- O objetivo de longo prazo é zero `!important` em CSS de produção, sem regressões visuais ou funcionais.

## Escopo de elevação dos controles brancos

A sombra de controle branco é uma propriedade de **controles standalone**, não de qualquer elemento branco.

Recebem `--doke-white-control-shadow` no estado normal:

- inputs, selects e textareas que constituem a própria superfície do campo;
- botões `doke-btn--ghost` usados como ação secundária independente;
- shell externo de busca ou campo composto;
- triggers de select e dropdown que constituem um campo independente;
- botões de ícone somente quando declaram explicitamente `doke-icon-btn--elevated`.

Permanecem planos (`box-shadow: none`) no estado normal e no hover:

- ícones internos de inputs e buscas;
- botões de fechar;
- tabs, chips, badges e filtros de seleção;
- itens de menu ou navegação;
- ações posicionadas sobre capa, imagem ou mídia;
- controles internos de um grupo composto;
- ações ghost/secondary dentro de `doke-form-actions` ou `doke-modal-actions`.

O foco acessível continua usando `--doke-white-control-shadow-focus`, inclusive nos controles planos. O elemento composto deve possuir apenas **uma superfície elevada**: o shell externo ou o controle standalone, nunca os dois simultaneamente.

Auditoria obrigatória:

```bash
npm run audit:control-elevation-scope
```
