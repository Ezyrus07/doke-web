# CAT-001 / CAT-A02 — Retirada da autoridade persistente de serviços

## Status

`IMPLEMENTATION PENDING`

## Objetivo

Retirar `doke.services.local.v1` como autoridade persistente de anúncios para sessões Supabase e sujeitos UUID, mantendo fixtures não UUID somente em memória durante o runtime atual.

## Fronteira preservada

CAT-A02 não redesenha o catálogo nem cria novas operações administrativas.

Permanecem canônicos:

- `services` e `service_media` para leitura remota;
- `service_versions` para snapshots submetidos à moderação;
- `self-service-operations/submit_service_for_review` para submissão;
- `service-moderation-operations` para decisões administrativas;
- RLS e grants existentes para mutações remotas permitidas.

CAT-A03 continuará responsável por transformar edição, pausa, reativação e arquivamento em operações server-side explícitas.

## Comportamento-alvo

### Sessões Supabase e sujeitos UUID

- nenhuma leitura ou gravação de `localStorage`;
- nenhuma cópia pendente devolvida quando a autoridade remota falha;
- nenhuma sincronização posterior de rascunho persistido;
- leituras remotas falham fechado em vez de misturar fixture local;
- gravações remotas rejeitam quando não há sessão canônica disponível.

### Fixtures não UUID

- anúncios podem existir em memória durante o runtime atual;
- outro runtime não recupera o anúncio anterior;
- fixtures não são promovidas automaticamente ao Supabase;
- fixture não pode mascarar uma leitura remota configurada.

## Contratos que serão reconciliados

- `scripts/test-services-supabase-repository-contract.js`;
- `scripts/test-detail-ad-canonical-route-contract.js`;
- audit cumulativo CAT-A01;
- Quality canônico;
- matriz determinística após validação funcional.

## Segurança operacional

- nenhuma migration prevista;
- nenhum deploy de Edge Function previsto;
- staging não deve ser alterado;
- produção não deve ser alterada;
- nenhuma conta real deve ser modificada;
- nenhum SMS, OAuth ou recurso pago deve ser habilitado;
- nenhuma autoridade local aposentada pode ser reaberta.
