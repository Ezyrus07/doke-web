# CAT-001 / CAT-A02 — Retirada da autoridade persistente de serviços

## Status

`IMPLEMENTED — VALIDATION PENDING`

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

## Comportamento implementado

### Sessões Supabase e sujeitos UUID

- nenhuma leitura ou gravação de `localStorage`;
- nenhuma cópia pendente devolvida quando a autoridade remota falha;
- nenhuma sincronização posterior de rascunho persistido;
- leituras remotas falham fechado em vez de misturar fixture local;
- gravações remotas rejeitam com `DOKE_SERVICE_AUTHORITY_UNAVAILABLE` quando não há autoridade canônica disponível.

### Fixtures não UUID

- anúncios podem existir em memória durante o runtime atual;
- outro runtime não recupera o anúncio anterior;
- fixtures não são promovidas automaticamente ao Supabase;
- fixture não pode mascarar uma leitura remota configurada.

## Implementação aplicada

- removidos `localStorage` e a chave `doke.services.local.v1` do repositório executável;
- fixtures não UUID passaram para memória volátil;
- sessões Supabase e sujeitos UUID passaram a falhar fechado;
- removida a promoção posterior de rascunhos pendentes;
- submissão para análise devolve o snapshot canônico sem persistência no navegador;
- contratos de repositório e detalhe foram reconciliados;
- audits CAT-A01 e CAT-A02 foram preparados como gates cumulativos;
- Quality canônico recebeu audit e runtime CAT-A02;
- CAT-A03 permanece separado para operações explícitas de ciclo de vida.

## Validação preparada

- `scripts/audit-service-catalog-authority-retirement.js`;
- `scripts/test-service-catalog-authority-retirement-runtime.js`;
- `scripts/test-services-supabase-repository-contract.js`;
- `scripts/test-detail-ad-canonical-route-contract.js`;
- audit cumulativo CAT-A01;
- Quality canônico;
- matriz determinística após a primeira validação funcional completa.

## Segurança operacional

- nenhuma migration aplicada;
- nenhum deploy de Edge Function realizado;
- staging não alterado;
- produção não alterada;
- nenhuma conta real modificada;
- nenhum SMS, OAuth ou recurso pago habilitado;
- nenhuma autoridade local aposentada foi reaberta.
