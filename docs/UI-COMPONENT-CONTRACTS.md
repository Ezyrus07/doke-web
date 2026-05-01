# Contratos globais de UI — Doke

Este documento define a camada de componentes visuais reutilizáveis do Doke.

## Fonte oficial

- `assets/css/components/ui/doke-ui-system.css`
- `docs/ui-kit.html`
- `scripts/audit-frontend-contracts.js`

## Regra principal

Página não deve redesenhar componente global. Página só pode controlar layout externo, grid e espaçamento entre seções.

## Componentes oficiais

### Botões

Use:

```html
<button class="doke-btn doke-btn--primary">Continuar</button>
<button class="doke-btn doke-btn--secondary">Ver detalhes</button>
<button class="doke-icon-btn" aria-label="Fechar">...</button>
```

Não criar novos botões com `height`, `border-radius`, `box-shadow` e `font-weight` locais.

### Campos

Use:

```html
<label class="doke-field">
  <span class="doke-label">Título</span>
  <input class="doke-input" placeholder="Exemplo">
</label>
```

### Cards e surfaces

Use:

```html
<article class="doke-card doke-card--interactive">
  <h3 class="doke-card__title">Título</h3>
  <p class="doke-card__text">Descrição</p>
</article>
```

### Modais e drawers

Use:

```html
<div class="doke-overlay">
  <section class="doke-modal" role="dialog" aria-modal="true">
    <header class="doke-modal__header">
      <h2 class="doke-modal__title">Título</h2>
      <button class="doke-icon-btn doke-icon-btn--flat" aria-label="Fechar">×</button>
    </header>
    <div class="doke-modal__body">Conteúdo</div>
    <footer class="doke-modal__actions">
      <button class="doke-btn doke-btn--ghost">Cancelar</button>
      <button class="doke-btn doke-btn--primary">Salvar</button>
    </footer>
  </section>
</div>
```

## Depreciação progressiva

Classes antigas podem permanecer temporariamente, mas devem ser migradas para `doke-*` quando a página for tocada.

Prioridade de migração:

1. Botões de ação crítica.
2. Inputs e formulários.
3. Cards repetidos.
4. Modais/drawers/popovers.
5. Badges/chips/avatares.

## Proibição técnica

Evitar em CSS de página:

- `!important`
- `border-radius` de componente compartilhado
- `box-shadow` de componente compartilhado
- `height` de botão/input global
- modais ou drawers com padrão local

Se uma exceção for realmente necessária, documente em `docs/ARCHITECTURE-DECISIONS.md`.

## Stage 14 — Botões e cards fora da bridge

Botões e cards agora são responsabilidade direta do UI System. A legacy bridge não deve conter seletores base de `.button`, `.service-card`, `.order-card`, `.community-card` ou equivalentes. Componentes antigos devem receber classes canônicas no HTML durante a migração.

## Forms e overlays — Stage 15

Forms e overlays devem usar contratos canônicos:

- `.doke-field`
- `.doke-label`
- `.doke-input`
- `.doke-select`
- `.doke-textarea`
- `.doke-form-grid`
- `.doke-fieldset`
- `.doke-filter-panel`
- `.doke-overlay`
- `.doke-modal`
- `.doke-drawer`
- `.doke-popover`

Classes antigas podem continuar como ganchos de JS ou contexto de domínio, mas não devem ser a fonte visual principal.

## Menu/dropdown canônico

Menus e dropdowns devem usar o contrato canônico:

```html
<div class="doke-menu" hidden>
  <div class="doke-menu__header">Conta</div>
  <div class="doke-menu__body">
    <a class="doke-menu__item" href="perfil.html">Perfil</a>
  </div>
</div>
```

Classes antigas, como `profile-dropdown`, podem permanecer apenas como compatibilidade semântica ou para JS legado. A aparência deve vir de `.doke-menu` e do `doke-ui-system.css`.

## Stage 17 — Domain cards

Cards de dominio devem usar `.doke-card` + uma classe semantica `.doke-*-card`.

Exemplos obrigatorios:

```html
<article class="doke-card doke-service-card"></article>
<article class="doke-card doke-order-card"></article>
<article class="doke-card doke-community-card"></article>
<article class="doke-card doke-wallet-card"></article>
```

A pagina nao deve criar visual proprio para card de servico, pedido, mensagem, carteira ou comunidade. A pagina so pode controlar layout externo, como grid, gaps e posicao.

## Stage 18 — Layout primitives

Contratos globais de layout agora ficam em:

```txt
assets/css/components/layout/doke-layout-system.css
```

Use estes contratos antes de criar variações locais:

```txt
.doke-page
.doke-page-shell
.doke-page-stack
.doke-page-section
.doke-grid
.doke-list
.doke-scroll-rail
.doke-empty-state
.doke-loading-state
.doke-error-state
```

Página pode ajustar conteúdo e ordem, mas não deve redefinir largura máxima, padding estrutural, gap padrão de seção, grid/lista global ou estados vazios/carregando/erro.
