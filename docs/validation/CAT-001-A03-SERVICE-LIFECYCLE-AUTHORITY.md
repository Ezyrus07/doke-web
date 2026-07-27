# CAT-001 / CAT-A03 — Autoridade server-side de edição e ciclo de vida

## Status

`IMPLEMENTED — VALIDATION PENDING`

## Problema

A retirada do armazenamento persistente do CAT-A02 eliminou a cópia local, mas o domínio ainda validava propriedade e transições no navegador e terminava em uma mutação genérica de `services`. Esse caminho podia atualizar conteúdo aprovado sem produzir uma nova `service_version` e permitia que pausa, reativação e arquivamento dependessem de um `upsert` amplo do cliente.

## Decisão

- edição de conteúdo real usa exclusivamente `submit_service_for_review`;
- pausa, reativação e arquivamento usam `transition_owned_service_lifecycle`;
- a Edge Function deriva o ator do JWT e o dispatcher service-role recompõe o contexto autenticado;
- funções privilegiadas não recebem grant direto para `anon` ou `authenticated`;
- `authenticated` perde `INSERT`, `UPDATE` e `DELETE` diretos em `public.services`;
- fixtures não UUID continuam somente em memória;
- arquivamento cancela versão pendente sem apagar versões aprovadas nem pedidos históricos.

## Implementação

- migration `149_service_lifecycle_authority.sql`;
- action adicionada ao allowlist de `self-service-operations`;
- serviço de domínio separa edição de conteúdo e transição de status;
- repositório rejeita gravação remota genérica com `DOKE_SERVICE_DIRECT_MUTATION_FORBIDDEN`;
- runtime permanente CAT-A03;
- teste SQL transacional de ACL e dispatcher;
- audit estrutural permanente;
- gates adicionados ao Quality canônico.

## Segurança operacional

- produção não alterada;
- staging ainda não alterado nesta evidência inicial;
- nenhuma conta real modificada;
- nenhum SMS, OAuth ou recurso pago habilitado;
- PR permanece draft e não mesclado.

## Próxima validação

Executar Quality, reconciliar a matriz determinística, aplicar migration e Edge Function somente em staging e executar o teste SQL com `ROLLBACK`.
