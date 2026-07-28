# CAT-001 / CAT-A04 — Reserva imutável de upload de mídia

## Status

`CANDIDATE VALIDATED`

Este documento registra o primeiro candidato técnico do CAT-A04. O ciclo completo de limpeza ainda não está encerrado.

## Causa raiz

A mídia de serviços possuía uma autoridade paralela ao fluxo de moderação versionada:

- o navegador escolhia um caminho determinístico no bucket `service-media`;
- o upload usava `upsert: true`;
- o navegador podia inserir, atualizar e excluir registros owner-scoped de `public.service_media`;
- `service_versions.snapshot.images` preservava apenas URLs públicas;
- não existia um vínculo canônico entre intent, objeto, versão e projeção pública.

Assim, uma versão histórica podia manter a mesma URL enquanto os bytes do objeto eram substituídos. Uma falha entre upload e submissão também podia deixar um objeto sem autoridade de consumo ou limpeza.

## Autoridade implementada

### Ledger privado

Foram criadas:

- `private.service_media_upload_intents`;
- `private.service_media_upload_items`.

Os registros controlam intent, ator, serviço externo, expiração, ordenação, caminho, MIME, tamanho, estado e versão consumidora.

### Caminho imutável

O caminho é gerado no PostgreSQL:

`pending/<actor>/<intent>/<ordinal>-<uuid>.<extension>`

O navegador não escolhe o caminho e não usa `upsert`.

### Upload assinado

O fluxo remoto agora é:

1. `prepare_service_media_uploads`;
2. `create_service_media_upload_intent_internal`;
3. `createSignedUploadUrl` na Edge Function;
4. `uploadToSignedUrl` no navegador;
5. `submit_service_for_review` com `p_upload_intent_id`;
6. validação server-side do objeto;
7. consumo atômico do intent com a criação da versão.

### Fail-closed

- `anon` e `authenticated` não possuem `INSERT`, `UPDATE` ou `DELETE` em `public.service_media`;
- as policies de `INSERT`, `UPDATE` e `DELETE` do navegador no bucket foram removidas;
- as RPCs internas são executáveis somente por `service_role`;
- o dispatcher legado rejeita `submit_service_for_review` sem intent com `DOKE_SERVICE_MEDIA_UPLOAD_INTENT_REQUIRED`;
- o consumo exige entre uma e três mídias;
- intents não consumidos não podem possuir `consumed_at`.

## Arquivos impactados

### Frontend

- `assets/js/services/service-media-upload-service.js`
- `assets/js/services/services-service.js`

### Edge Function

- `supabase/functions/self-service-operations/index.ts`
- `supabase/functions/self-service-operations/operations.mjs`

### Banco

- `supabase/migrations/150_service_media_upload_authority.sql`
- `supabase/migrations/151_service_media_legacy_submit_lockdown.sql`
- `supabase/migrations/152_service_media_upload_intent_expiry_consistency_fix.sql`
- `supabase/migrations/153_service_media_upload_items_order_integrity.sql`
- `supabase/migrations/154_service_media_upload_intent_status_index_hardening.sql`

### Gates

- `scripts/audit-service-media-upload-authority.js`
- `scripts/test-service-media-upload-authority-runtime.js`
- `supabase/tests/019_service_media_upload_authority_validation.sql`
- `scripts/audit-quality-pipeline.js`

## Staging

Projeto: `doke-web-staging`

Project ref: `zwkczgewzbsorbrjuzpb`

Migrations aplicadas:

- `20260728004303_service_media_upload_authority`;
- `20260728004424_service_media_legacy_submit_lockdown`;
- `20260728004527_service_media_upload_intent_expiry_consistency_fix`;
- `20260728004615_service_media_upload_items_order_integrity`;
- `20260728004654_service_media_upload_intent_status_index_hardening`.

Edge Function:

- `self-service-operations` versão 8;
- estado `ACTIVE`;
- `verify_jwt: true`.

Estado após validação:

- upload intents persistidos: `0`;
- upload items persistidos: `0`;
- objetos de Storage criados: `0`;
- DML de navegador em `public.service_media`: negado;
- policies mutáveis do navegador no bucket: nenhuma;
- dispatcher legado: bloqueado;
- guard de uma a três mídias: ativo.

## Testes executados

- dry-run completo da migration 150 em `BEGIN/ROLLBACK`: sucesso;
- dry-run completo da migration 151 em `BEGIN/ROLLBACK`: sucesso;
- runtime isolado do fluxo `prepare → uploadToSignedUrl → submit`: sucesso;
- confirmação de ausência de `upsert`: sucesso;
- confirmação de que o repository legado não executa a submissão remota: sucesso;
- SQL 019 final dentro de transação encerrada por `ROLLBACK`: sucesso;
- advisor de segurança: nenhum aviso novo relacionado ao CAT-A04;
- advisor de performance: quatro FKs novas sem índice dedicado.

Ainda não foram confirmados no head documental final:

- Quality completo;
- E2E bloqueante;
- 105 guards visuais;
- Canary;
- Diagnostic.

## Riscos restantes

1. Uploads assinados interrompidos ou expirados ainda não possuem executor de limpeza física.
2. Estados `superseded` e `cleanup_eligible` ainda não são promovidos automaticamente.
3. A exclusão reference-safe pela Storage API ainda não foi implementada.
4. Quatro FKs das tabelas privadas precisam de índices dedicados conforme o advisor de performance.
5. O helper histórico de upload direto ainda existe em `services-repository.js`, mas não possui mais autoridade executável em sessões Supabase: Storage, Edge e dispatcher falham fechado.
6. Não foi executado E2E persistente com conta real, pois isso violaria a fronteira operacional definida.

## Segurança operacional

- produção não alterada;
- nenhuma conta ou dado real modificado;
- nenhuma entidade sintética persistente criada;
- nenhum intent ou objeto de teste persistente criado;
- SMS, OAuth e recursos pagos não habilitados;
- PR não mesclado;
- PR não marcado como pronto para revisão.

## Próximo trabalho controlado

Implementar:

- transição canônica para `superseded`;
- expiração de intents abandonados;
- prova de ausência de referências;
- exclusão física apenas pela Storage API;
- worker ou operação controlada de limpeza;
- quatro índices de FK apontados pelo advisor;
- evidência final e reconciliação do CAT-A04.
