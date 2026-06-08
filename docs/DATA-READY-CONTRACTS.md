# Data-ready contracts

This is the single active data-readiness contract for Doke. It consolidates API, backend, fallback and state boundaries.


## Base contract

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
- `data-render-state`
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


## Api Contracts

# Contratos de API — rascunho

## Auth
- POST /auth/login
- POST /auth/logout
- POST /auth/register
- POST /auth/recover

## Services
- GET /services
- GET /services/:id
- POST /services
- PATCH /services/:id

## Orders
- GET /orders
- POST /orders
- GET /orders/:id
- POST /orders/:id/budgets
- PATCH /orders/:id/status

## Messaging
- GET /conversations
- GET /conversations/:id/messages
- POST /conversations/:id/messages

## Payments
- POST /checkout
- GET /wallet
- POST /payouts

Observação: isto é contrato-alvo. A implementação real pode começar com Supabase client e evoluir para API/Edge Functions.



## Data Backend Contracts

# Contratos de dados e backend

## Entidades principais

- User
- UserProfile
- ProfessionalProfile
- Service
- ServiceCategory
- ServiceMedia
- Order
- Budget
- Conversation
- Message
- Review
- Wallet
- Transaction
- Community
- Notification
- Report
- AuditLog

## Regras

1. Toda entidade privada deve ter RLS antes de ir para produção.
2. Toda ação sensível deve gerar `audit_logs`.
3. Nenhuma página HTML/JS deve acessar tabelas diretamente.
4. Toda lista pública precisa de paginação.
5. Toda busca precisa ter limite e rate limiting no backend.
6. Pagamentos, saques e reembolsos nunca devem depender só do cliente.
7. Mensagens e anexos precisam validar participante da conversa.
8. Reviews só devem existir para pedidos concluídos.

## Papéis

- `guest`: leitura pública limitada.
- `client`: cria pedidos, conversa em pedidos, avalia pedidos concluídos.
- `professional`: cria serviços, envia orçamentos, gerencia agenda e saques.
- `moderator`: revisa denúncias, verificações e conteúdo.
- `admin`: opera plataforma, finanças e configurações críticas.



## Data Fallback Strategy

# Data fallback strategy — Doke

Este documento define a estratégia mínima para transição de mocks para backend sem acoplar UI ao formato provisório do HTML atual.

## Ordem de fonte de dados

1. Backend/repository real, quando disponível e autorizado.
2. Repository boundary da página/domínio.
3. Mock data service controlado.
4. Fallback vazio com estado `empty`.
5. Erro normalizado com estado `error`.

## Regra de responsabilidade

- `services` buscam ou normalizam dados.
- `repositories` escondem origem real/mock.
- `controllers` orquestram estado da página.
- `renderers` transformam dados em DOM.
- HTML provisório não deve ser fonte definitiva de verdade.

## Estados obrigatórios de fallback

- Sucesso com itens: `ready`.
- Sucesso sem itens: `empty`.
- Falha de request/parse/permissão: `error`.
- Request em andamento: `loading`.

## Restrições

- Não usar dados sensíveis em estado global.
- Não depender de texto mockado como ID definitivo.
- Não usar `style=""` para fallback visual.
- Não criar controller que escreva direto em muitos seletores sem boundary.



## State Contracts

# State contracts — Doke

Este contrato define a base mínima para estados de UI em páginas que ainda podem mudar visualmente. Ele não consolida layout, não define responsivo e não substitui a reforma desktop futura.

## Objetivo

Preparar páginas, controllers e renderers para dados reais sem acoplar backend ao HTML mockado atual.

## Estados obrigatórios de listas e regiões dinâmicas

Toda região que renderiza dados externos, mocks ou repositórios deve conseguir representar:

- `idle`: estado inicial antes da busca/renderização.
- `loading`: operação em andamento.
- `empty`: resposta válida sem itens.
- `error`: falha de carregamento ou renderização.
- `ready`: dados carregados e renderizados.

## Contrato de atributos recomendado

Use estes hooks quando uma área for dinâmica:

```html
<section data-list-region data-state="idle" aria-busy="false">
  <div data-list></div>
  <div data-list-loading hidden aria-live="polite"></div>
  <div data-list-empty hidden></div>
  <div data-list-error hidden role="alert"></div>
</section>
```

Para regiões que não são listas, use:

```html
<section data-view-state="idle" aria-busy="false">
  <p data-view-state-message aria-live="polite"></p>
</section>
```

## Regras

- Não usar `style=""` para alternar estados.
- Não usar `!important` novo para esconder/mostrar estados.
- Não acoplar mensagens de erro ao backend definitivo.
- Não tratar HTML/CSS provisório como contrato visual final.
- Manter a semântica acessível: `aria-busy`, `aria-live` e `role="alert"` quando fizer sentido.
- Controllers devem acionar estado; renderers devem renderizar conteúdo; services/repositories devem retornar dados/erro.

## First Paint & Loading Contract

Dynamic lists and future backend-rendered cards must preserve the final component shell during loading. A loading state may replace text with placeholders or add a non-geometric shimmer overlay, but it must not replace a reusable card with a separate `.skeleton-card` layout when the final UI is a `doke-ad-card`, `publication-card`, `service-card`, `video-card`, `worker-card` or professional card.

Required rules:

- Component anatomy stays in `assets/css/components/**`.
- Page and pattern CSS may control rails, gaps, scroll behavior and section spacing only.
- Loading, ready, hydrated and skeleton states must not change card width, height, padding, display, grid/flex structure, aspect ratio or overflow.
- If a list needs to show loading while preserving existing cards, use `data-loading-contract="preserve-layout"` with `renderLoadingState(..., { preserveLayout: true })`.
- If a card needs a skeleton, keep the final card class and add `is-skeleton` or `data-card-state="loading"`; do not render a different card shell.
- Images/media inside cards must reserve their final slot through component media dimensions before the image finishes loading.

Validation:

```bash
npm run test:first-paint-loading-contract
```
