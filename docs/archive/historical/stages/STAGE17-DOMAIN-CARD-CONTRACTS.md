# Stage 17 — Contratos canonicos de cards de dominio

## Objetivo

Depois da remocao da `doke-legacy-bridge.css`, o projeto ainda precisava de uma camada acima do UI System generico. `.doke-card` define a superficie base, mas cards de produto precisam de semantica de dominio para evitar que cada pagina volte a criar um padrao proprio.

Esta stage cria contratos para os principais cards operacionais do Doke:

- `.doke-service-card`
- `.doke-worker-card`
- `.doke-order-card`
- `.doke-message-card`
- `.doke-community-card`
- `.doke-wallet-card`
- `.doke-notification-card`
- `.doke-profile-card`
- `.doke-media-card`
- `.doke-stat-card`

## Arquivo criado

```txt
assets/css/components/domain/doke-domain-cards.css
```

Este arquivo deve ser carregado depois de:

```txt
assets/css/components/ui/doke-ui-system.css
```

## Regra arquitetural

- `.doke-card` governa a surface base: borda, raio, fundo, sombra e padding.
- `.doke-*-card` governa o ritmo de dominio: midia, corpo, titulo, meta, acoes e variacoes especificas.
- Pagina pode posicionar cards em grid/lista, mas nao deve redesenhar a anatomia interna.

## Auditoria

Foi criado:

```txt
scripts/audit-domain-card-contracts.js
```

O script valida:

1. se as paginas principais carregam `doke-domain-cards.css`;
2. se superficies antigas de dominio possuem classe `.doke-*-card`;
3. cobertura por tipo de card.

Comando:

```bash
npm run audit:domain
```

Tambem foi incluido em:

```bash
npm run audit:all
```

## Resultado esperado

A partir desta stage, qualquer novo card de dominio deve nascer com duas classes:

```html
<article class="doke-card doke-service-card">
  ...
</article>
```

ou, para uma variacao financeira:

```html
<article class="doke-card doke-wallet-card">
  ...
</article>
```

## Proxima etapa recomendada

Criar contratos canonicos de listas e paginas:

- `.doke-page-shell`
- `.doke-page-section`
- `.doke-list`
- `.doke-grid`
- `.doke-empty-state`
- `.doke-loading-state`
- `.doke-error-state`

Isso reduz mais uma classe de divergencia: espacamento e estados de pagina.
