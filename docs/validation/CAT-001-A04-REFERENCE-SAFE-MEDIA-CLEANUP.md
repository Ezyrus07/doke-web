# CAT-001 / CAT-A04 — Limpeza reference-safe de mídia

## Status

`CANDIDATE VALIDATED`

Este documento registra o segundo candidato técnico do CAT-A04. A autoridade de limpeza está implantada e validada em staging, mas o encerramento documental do sublote ainda depende das lanes completas de CI e da reconciliação final da matriz.

## Causa raiz

A reserva imutável de upload resolveu o caminho mutável e o `upsert`, porém ainda restavam quatro lacunas:

1. mídias consumidas não acompanhavam automaticamente o estado `superseded` ou `rejected` da versão;
2. intents expirados não possuíam executor canônico de limpeza;
3. não existia prova centralizada de ausência de referências antes da exclusão;
4. não existiam claim concorrente, retry e reconciliação do resultado da Storage API.

Há uma restrição estrutural: uma mídia utilizada por qualquer snapshot imutável de `service_versions` continua referenciada, mesmo quando essa versão está `superseded`. Portanto, `superseded` não significa automaticamente `deletável`.

## Autoridade implementada

### Estados canônicos

O ledger suporta:

- `prepared`;
- `consumed`;
- `superseded`;
- `cleanup_eligible`;
- `cleanup_claimed`;
- `delete_failed`;
- `deleted`.

### Sincronização com versões

O trigger `service_media_item_version_status_sync` acompanha alterações de `review_status` em `public.service_versions`.

Quando uma versão passa para `superseded` ou `rejected`, seus itens `consumed` passam para `superseded`. Isso classifica o ciclo de vida sem autorizar exclusão prematura.

### Prova de ausência de referências

`private.service_media_item_is_referenced` verifica:

- URLs em `public.service_media`;
- `images` e `mediaAssets` de todos os snapshots de `public.service_versions`;
- `images` e `mediaAssets` em `public.services.metadata`;
- referências `retained_url` e `canonical_url` de outros itens não deletados do ledger.

Um item só entra em claim quando nenhuma dessas referências existe.

### Uploads abandonados

Intents expirados são reconciliados, mas objetos de upload somente entram em `cleanup_eligible` após **2 horas e 15 minutos desde a criação do intent**.

Essa janela inclui o período de validade do signed upload token e uma margem operacional, evitando excluir um objeto enquanto o token ainda pode ser utilizado.

Itens `retain` de intents abandonados não representam objetos próprios e são encerrados diretamente como `deleted` no ledger.

### Retenção de versões superseded

Itens de versões superseded aguardam pelo menos **30 dias** e ainda precisam passar pela prova de ausência de referências.

Na prática, mídias preservadas em snapshots históricos permanecem protegidas e não são excluídas.

### Claim, retry e recuperação

- claims usam `FOR UPDATE SKIP LOCKED`;
- claim abandonado é recuperado após 15 minutos;
- falha de Storage entra em `delete_failed`;
- retry ocorre após uma hora;
- máximo de cinco claims por item;
- somente o mesmo operador que fez o claim pode finalizar o resultado correspondente.

### Exclusão física

O PostgreSQL não executa `DELETE` em `storage.objects`.

O fluxo é:

1. admin ou moderador chama `cleanup_media` na Edge Function;
2. PostgreSQL reconcilia estados, prova ausência de referências e faz o claim;
3. `service-moderation-operations` chama `storage.from(bucket).remove([path])`;
4. o resultado volta à RPC de conclusão;
5. sucesso vira `deleted`; falha vira `delete_failed`.

## Arquivos impactados

### Banco

- `supabase/migrations/155_service_media_reference_safe_cleanup_authority.sql`

### Edge Function

- `supabase/functions/service-moderation-operations/index.ts`
- `supabase/functions/service-moderation-operations/operations.mjs`
- `supabase/functions/service-moderation-operations/media-cleanup.mjs`

### Gates

- `scripts/audit-service-media-cleanup-authority.js`
- `scripts/test-service-media-cleanup-authority-runtime.js`
- `supabase/tests/020_service_media_reference_safe_cleanup_validation.sql`
- `scripts/audit-quality-pipeline.js`

## Staging

Projeto: `doke-web-staging`

Project ref: `zwkczgewzbsorbrjuzpb`

Migration:

- versão `20260728011433`;
- nome `service_media_reference_safe_cleanup_authority`.

Edge Function:

- `service-moderation-operations` versão 4;
- estado `ACTIVE`;
- `verify_jwt: true`.

Estado final observado:

- intents no ledger: `0`;
- itens no ledger: `0`;
- objetos no bucket antes/depois: `3 / 3`;
- linhas em `public.service_media` antes/depois: `3 / 3`;
- objetos removidos durante validação: `0`;
- trigger instalado: sim;
- RPCs de limpeza executáveis por `anon` ou `authenticated`: não;
- RPCs internas executáveis por `service_role`: sim.

## Índices de FK

Foram adicionados:

- `idx_service_media_upload_intents_service_id`;
- `idx_service_media_upload_intents_service_version_id`;
- `idx_service_media_upload_items_actor_id`;
- `idx_service_media_upload_items_service_id`;
- `idx_service_media_upload_items_cleanup_claimed_by`.

O advisor de performance não apresenta mais FKs novas sem índice dedicado. Avisos de índices não utilizados são esperados neste momento porque o ledger está vazio.

## Testes executados

- dry-run integral da migration com `BEGIN/ROLLBACK`: sucesso;
- runtime isolado de sucesso e falha da Storage API: sucesso;
- SQL 020 dentro de transação encerrada com `ROLLBACK`: sucesso;
- prova de referências contra catálogo, versões, metadata e ledger: sucesso;
- claim concorrente com `FOR UPDATE SKIP LOCKED`: validado estruturalmente;
- ausência de exclusão direta em `storage.objects`: confirmada;
- privilégios de navegador nas RPCs internas: negados;
- migration 155 aplicada em staging: sucesso;
- Edge Function implantada: versão 4, `ACTIVE`, `verify_jwt: true`;
- advisor de segurança: nenhum achado novo relacionado ao CAT-A04;
- advisor de performance: nenhuma FK nova sem índice.

O primeiro deploy da Edge não publicou nova versão porque o bundle não incluía o import map histórico. O bundle foi recuperado da versão ativa e o deploy completo seguinte foi bem-sucedido.

Ainda não confirmados no head documental final:

- Quality completo;
- E2E bloqueante;
- 105 guards visuais;
- Canary;
- Diagnostic.

## Segurança operacional

- produção não alterada;
- nenhuma conta real modificada;
- nenhum dado de usuário real modificado;
- nenhuma entidade sintética persistente criada;
- nenhum intent ou objeto de teste persistente criado;
- nenhum objeto do bucket removido durante a validação;
- SMS, OAuth e recursos pagos não habilitados;
- nenhum PR mesclado;
- nenhum PR marcado como pronto para revisão.

## Riscos restantes

1. O helper histórico de upload direto ainda existe em `services-repository.js`, embora esteja sem autoridade executável em sessões Supabase.
2. A operação de limpeza é controlada e manual; nenhum schedule automático foi habilitado.
3. Não foi executado um ciclo destrutivo com conta ou entidade persistente de teste.
4. As lanes completas de CI ainda precisam convergir em um mesmo head estável.
5. CAT-A04 ainda precisa de evidência final, diário de engenharia e matriz reconciliada.

## Próximo trabalho controlado

Fechar tecnicamente e documentarmente o CAT-A04:

- remover o helper morto de upload direto sem alterar o fluxo canônico;
- executar os gates completos;
- reconciliar evidência final, diário e matriz;
- somente depois avançar ao CAT-B04.
