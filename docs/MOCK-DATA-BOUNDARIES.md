# Mock data boundaries — Doke

Este documento define a separação entre dados de exemplo, renderização e visual do Doke.

## Objetivo

Preparar o site para trocar conteúdo estático por dados reais sem refazer HTML/CSS dos componentes.

## Contrato

- `assets/data/mocks/marketplace/*` contém fixtures temporárias de marketplace.
- `assets/js/services/mock-data-boundary.js` é a camada de leitura dos mocks.
- Renderers recebem objetos prontos e montam UI; renderers não fazem `fetch`, Supabase, Firebase ou `localStorage`.
- CSS não pode depender de texto, posição fixa de card ou quantidade fixa de itens.

## Coleções iniciais

- `services.json`: anúncios/serviços.
- `workers.json`: vídeos curtos Workers.
- `publications.json`: publicações relacionadas.
- `reviews.json`: avaliações.

## Migração futura

Quando Supabase/Firebase/backend entrar, substituir a origem da camada de dados, mantendo a assinatura dos objetos consumidos pelos renderers.

Fluxo esperado:

```txt
mock JSON hoje -> mock-data-boundary.js -> renderer -> DOM
backend amanhã -> repository/adapter -> renderer -> DOM
```

## Regra para novas páginas

Ao criar nova lista/card/galeria:

1. Definir campos mínimos do dado.
2. Adicionar `data-*` hooks previsíveis no HTML/renderers.
3. Prever estados de loading, empty e error.
4. Não acoplar CSS ao conteúdo mockado.
