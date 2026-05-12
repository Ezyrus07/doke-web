# Data-ready Contracts — Doke

## Objetivo

Preparar o Doke para trocar conteúdo estático/mockado por dados reais sem refazer HTML, CSS ou componentes.

## Regra principal

Cards, listas, galerias, avaliações, pedidos, carteira, notificações e configurações devem expor hooks previsíveis quando forem preparados para dados dinâmicos.

## Hooks recomendados

- `data-list-region`
- `data-list`
- `data-list-loading`
- `data-list-empty`
- `data-list-error`
- `data-service-card`
- `data-worker-card`
- `data-publication-card`
- `data-review-card`
- `data-card-kind`
- `data-rating-value`
- `data-rating-count`

## Separação de responsabilidade

- `assets/js/services/repository-boundary.js`: fronteira de dados.
- `assets/js/services/page-data-orchestrator.js`: plano de dados por página.
- `assets/js/renderers/*`: montagem de componentes.
- `assets/js/pages/*` e `assets/js/controllers/*`: orquestração da página.

## Proibições

- Renderer não busca dados.
- Componente visual não acessa backend diretamente.
- Página não deve depender de conteúdo mockado rígido.
- CSS não deve depender da posição exata de um card ou texto específico.

## Estratégia

Enquanto o backend não estiver finalizado, dados podem vir de mocks ou providers internos. Quando Supabase/Firebase/API entrarem, a troca deve ocorrer no provider/repository, não no markup dos componentes.
