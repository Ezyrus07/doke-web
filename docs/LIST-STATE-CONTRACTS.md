# Doke — Contratos de estado de listas

Este contrato prepara listas dinâmicas para integração futura com mocks, scripts e backend sem refatorar HTML/CSS.

## Estrutura recomendada

```html
<section class="doke-list-region" data-list-region data-state="idle">
  <div class="doke-list" data-list></div>

  <div class="doke-list-loading" data-list-loading hidden>
    <div class="doke-list-skeleton"></div>
  </div>

  <div class="doke-list-state" data-list-empty hidden>
    <h3 class="doke-list-state__title">Nada encontrado</h3>
    <p class="doke-list-state__description" data-list-empty-message>Altere os filtros e tente novamente.</p>
  </div>

  <div class="doke-list-state" data-list-error hidden>
    <h3 class="doke-list-state__title">Não foi possível carregar</h3>
    <p class="doke-list-state__description" data-list-error-message>Tente novamente em instantes.</p>
  </div>
</section>
```

## Estados aceitos

- `idle`
- `loading`
- `empty`
- `error`
- `ready`

## Regras

1. O CSS de estado não deve ser específico de página.
2. Renderers podem popular listas, mas não devem buscar dados diretamente.
3. Repositories/adapters decidem de onde vem o dado: mock, Supabase, Firebase ou API.
4. HTML deve usar `data-list`, `data-list-loading`, `data-list-empty` e `data-list-error` quando a seção for dinâmica.
5. Não usar `style=""` nem `!important` para controlar estado.
