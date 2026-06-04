# Ciclo Global 26 — Service-card data hooks

## Objetivo

Preparar o `service-card` para renderização futura por scripts/backend sem refatorar o HTML/CSS do componente.

Este ciclo não altera visual. Ele apenas cria hooks previsíveis para que dados mockados hoje possam virar dados reais amanhã.

## Arquivo alterado

- `assets/js/renderers/service-card-renderer.js`

## Hooks adicionados/normalizados

- `data-service-card`
- `data-card-kind="service"`
- `data-service-id`
- `data-service-link`
- `data-service-image`
- `data-service-badge`
- `data-favorite-action`
- `data-service-category`
- `data-service-title`
- `data-service-rating`
- `data-rating-value`
- `data-rating-count`
- `data-service-tags`
- `data-service-tag`
- `data-service-avatar`
- `data-service-location`
- `data-service-price`
- `data-service-cta`

## Responsabilidade preservada

O renderer continua apenas renderizando componente. Ele não busca dados diretamente, não acessa Supabase/Firebase, não lê `localStorage` e não decide regras de negócio.

Dados devem vir de services/repositories/controllers e serem passados para o renderer.

## Auditoria

Comando criado:

```bash
npm run audit:service-card-data-hooks
```

Valida que os hooks existem e que o renderer não assumiu responsabilidade de busca de dados.

## Próximo passo recomendado

Criar hooks equivalentes para `worker-card`, `publication-card` e `review-card`, mantendo a mesma separação:

- renderer monta componente;
- service/repository fornece dados;
- page/controller decide quais dados renderizar.
