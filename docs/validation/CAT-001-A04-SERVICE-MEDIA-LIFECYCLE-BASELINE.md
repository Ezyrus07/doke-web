# CAT-001 / CAT-A04 — Baseline do ciclo de vida de mídia de serviços

## Status

`BASELINE FROZEN`

## Causa raiz

O CAT-A03 encerrou a mutação genérica de `public.services`, mas a mídia continua com duas autoridades executáveis fora da moderação versionada:

1. o navegador autenticado envia arquivos diretamente ao bucket público `service-media`, escolhe um caminho previsível no formato `<ator>/<serviço>/<posição>.<extensão>` e usa `upsert: true`;
2. os papéis do navegador ainda possuem privilégios de tabela e policies de owner para inserir, atualizar e excluir registros de `public.service_media`.

As versões de serviço armazenam somente URLs públicas em `service_versions.snapshot.images`. Na aprovação, `apply_service_version_snapshot` apaga a projeção atual de `public.service_media` e a recria com essas URLs. Não existe uma identidade canônica do objeto, um upload intent consumível ou uma transação que una Storage, versão, projeção pública, substituição e limpeza.

## Autoridade atual congelada

- leitura de objetos: policy de owner para `authenticated`;
- upload: policy para profissional autenticado em pasta própria;
- substituição no Storage: `UPDATE` direto permitido ao owner;
- exclusão no Storage: `DELETE` direto permitido ao owner;
- upload do frontend: `bucket.upload(..., { upsert: true })` em caminho determinístico;
- mutação de `public.service_media`: `INSERT`, `UPDATE` e `DELETE` owner-scoped continuam disponíveis aos papéis do navegador;
- leitura no catálogo: join de `services` com `service_media`;
- referência versionada: URLs públicas dentro do JSON de `service_versions.snapshot`;
- promoção aprovada: exclusão e reinserção da projeção `service_media` a partir das URLs do snapshot;
- signed upload intent: ausente;
- estado `superseded` de objetos: ausente;
- expiração de mídia de rascunho abandonado: ausente;
- prova de ausência de referências antes da exclusão: ausente;
- job ou operação permanente de limpeza: ausente.

## Falha de consistência principal

O upload acontece antes de `submit_service_for_review`. Se o upload for concluído e a chamada server-side falhar, o objeto permanece sem intent consumido e sem autoridade de limpeza. Como o caminho é reutilizado com `upsert`, uma nova tentativa também pode trocar os bytes por trás de uma URL já preservada em uma versão histórica.

Portanto, a imutabilidade de `service_versions.snapshot` é apenas textual: o JSON não muda, mas o conteúdo servido pela URL pode mudar ou desaparecer.

## Observação controlada de staging

Projeto: `doke-web-staging` (`zwkczgewzbsorbrjuzpb`).

Leitura realizada em 27 de julho de 2026, sem mutação:

- 3 objetos no bucket `service-media`;
- 3 registros em `public.service_media`;
- 1 serviço com mídia;
- 0 versões pendentes;
- 1 versão aprovada;
- 1 versão superseded;
- 0 objetos atualmente sem referência no catálogo ou nas versões.

O conjunto atual está coerente por estado de dados, não por garantia arquitetural. Não há schema, operação ou job que preserve essa condição após upload interrompido, substituição ou exclusão direta.

## Riscos congelados

1. `upsert` pode alterar os bytes associados a uma URL histórica sem alterar o snapshot versionado.
2. O navegador pode atualizar ou excluir um objeto sem reconciliar `service_media` e `service_versions`.
3. O navegador pode mutar diretamente a projeção `public.service_media`, paralelamente à aprovação administrativa.
4. Uma falha entre upload e submissão deixa um objeto abandonado sem intent ou prazo canônico.
5. Uma mídia substituída não possui estado, retenção ou elegibilidade de limpeza.
6. Uma limpeza direta pode apagar mídia ainda referenciada por versão aprovada, pendente ou histórica.
7. Excluir metadados diretamente no schema `storage` não é uma estratégia válida: a remoção física deve ocorrer pela Storage API.

## Fronteira exigida para o fechamento

- uploads reservados por operação server-side atrás de Edge Function com JWT validado;
- caminhos únicos, imutáveis e gerados no servidor;
- token assinado de upload, sem caminho escolhido pelo navegador e sem `upsert`;
- consumo do upload intent durante a submissão da versão;
- identidade canônica do ativo persistida separadamente da URL pública;
- remoção de `INSERT`, `UPDATE` e `DELETE` diretos do navegador em `public.service_media`;
- remoção de `UPDATE` e `DELETE` diretos no bucket e aposentadoria do `INSERT` após o cutover para upload assinado;
- estados canônicos `prepared`, `consumed`, `active`, `superseded` e `cleanup_eligible`;
- projeção `public.service_media` derivada apenas de ativos consumidos e aprovados;
- limpeza somente após prova de ausência de referências em `services`, `service_media` e todas as versões;
- exclusão física exclusivamente pela Storage API;
- expiração determinística de uploads abandonados;
- audit estrutural, runtime e teste SQL permanentes;
- aplicação e validação apenas em staging antes do fechamento documental.

## Menor candidato seguro dentro do CAT-A04

### Candidato 1 — reserva imutável de upload

Escopo:

- criar ledger privado de upload intents;
- gerar caminhos únicos no servidor;
- criar tokens assinados por `self-service-operations`;
- consumir e validar o intent em `submit_service_for_review`;
- retirar a mutação direta de `public.service_media` e a substituição/exclusão direta do Storage pelo navegador.

Esse candidato não encerra o CAT-A04. Permanecem no mesmo sublote:

- política de retenção de objetos superseded;
- worker server-side de limpeza pela Storage API;
- agendamento de expiração de intents abandonados;
- evidência final e reconciliação da matriz.

## Arquivos auditados

- `assets/js/repositories/services-repository.js`;
- `assets/js/services/services-service.js`;
- `supabase/migrations/002_marketplace_core.sql`;
- `supabase/migrations/009_service_catalog_shared_runtime.sql`;
- `supabase/migrations/032_service_listing_moderation.sql`;
- `supabase/migrations/117_service_media_storage_authority.sql`;
- `supabase/migrations/149_service_lifecycle_authority.sql`;
- `supabase/functions/self-service-operations/index.ts`;
- `supabase/functions/self-service-operations/operations.mjs`;
- policies, grants, funções, cron jobs e objetos do staging relacionados a `service-media`.

## Segurança operacional

- staging apenas consultado; não alterado;
- produção não alterada;
- nenhuma conta ou dado real modificado;
- nenhuma entidade sintética persistente criada;
- nenhum SMS, OAuth ou recurso pago habilitado;
- nenhum PR mesclado ou marcado como pronto;
- PR #12 permanece aberto e draft.

## Próximo passo controlado

Implementar o candidato reversível de reserva imutável de upload em migration e código de repositório, validar em staging e somente depois introduzir a execução de limpeza.
