# Stage 13 — Migração canônica de botões, cards, forms e surfaces

## Objetivo

Reduzir dependência da `doke-legacy-bridge.css` adicionando classes canônicas `.doke-*` diretamente no HTML real das páginas principais.

A bridge continua carregada como camada de segurança, mas a direção correta agora é que o markup passe a declarar explicitamente o contrato global do Doke UI System.

## Páginas migradas

- `index.html`
- `resultados.html`
- `pedidos.html`
- `mensagens.html`
- `comunidade.html`
- `comunidade-interna.html`
- `perfil.html`
- `carteira.html`
- `notificacoes.html`
- `configuracoes.html`

## Contratos aplicados

### Botões

Classes antigas de ação continuam existindo para JS e CSS de página, mas recebem também:

- `.doke-btn`
- `.doke-btn--primary`
- `.doke-btn--ghost`
- `.doke-btn--danger`
- `.doke-btn--sm`

Botões de ícone/fechar/toggle recebem:

- `.doke-icon-btn`
- `.doke-icon-btn--flat`
- `.doke-icon-btn--primary` quando aplicável

### Cards e surfaces

Cards legados passam a declarar:

- `.doke-card`

Modais, drawers e popovers passam a declarar:

- `.doke-modal`
- `.doke-drawer`
- `.doke-popover`

### Forms

Campos e controles passam a declarar:

- `.doke-field`
- `.doke-label`
- `.doke-input`
- `.doke-select`
- `.doke-textarea`

### Elementos auxiliares

- `.doke-avatar`
- `.doke-badge`
- `.doke-chip`

## Regra daqui para frente

Novo HTML não deve nascer apenas com classe local, como:

```html
<button class="order-card__button">Ver detalhes</button>
```

O padrão correto é:

```html
<button class="order-card__button doke-btn doke-btn--primary">Ver detalhes</button>
```

Classe local pode existir para contexto semântico, mas o contrato visual deve vir de `.doke-*`.

## Observação importante

Essa migração preserva classes antigas para evitar quebra de JS e layout. A próxima etapa é migrar componente por componente para markup mais limpo, removendo classes antigas somente depois de validação visual.
