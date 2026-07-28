# CAT-001 / CAT-B04 — Snapshot imutável do anúncio no pedido

## Status

`CANDIDATE VALIDATED — CI PENDING`

O banco de staging agora congela a versão aprovada do anúncio e seu snapshot canônico em todo pedido real. O blocker não será removido da matriz até Quality, E2E bloqueante, 105 guards visuais, Canary e Diagnostic convergirem em um único head estável.

## Causa raiz

O formulário de orçamento montava `serviceSnapshot` no navegador. Porém, o backend de criação de pedido persistia apenas IDs, título, descrição, localização e status.

Isso deixava três riscos:

1. o cliente podia enviar um `professionalId` diferente do dono real do anúncio;
2. o navegador podia enviar um snapshot incompleto ou forjado;
3. um pedido histórico podia ser reconstruído usando uma versão posterior do anúncio, alterando título, preço, fotos ou escopo original.

## Autoridade aplicada

As migrations 156 e 157 adicionam a `public.orders`:

- `service_version_id uuid`;
- `service_snapshot jsonb`;
- FK para `public.service_versions` com `ON DELETE RESTRICT`;
- constraints de formato, obrigatoriedade e igualdade com a projeção de compatibilidade em `metadata`;
- índice por versão e data de criação;
- trigger `trg_orders_service_snapshot_authority`.

A função privada `private.canonicalize_order_service_snapshot()` executa antes de qualquer `INSERT` remoto e:

- resolve o serviço canônico;
- exige anúncio publicado, elegível e com versão aprovada;
- substitui o profissional enviado pelo chamador pelo dono real do anúncio;
- bloqueia pedido do próprio serviço;
- copia `service_versions.snapshot` da versão aprovada;
- acrescenta IDs, número da versão, profissional, momento de captura e marcador de autoridade;
- grava a mesma estrutura em `orders.service_snapshot` e `metadata.serviceSnapshot`;
- impede alteração posterior da versão, do snapshot, do profissional ou da projeção histórica.

Como o controle está em `BEFORE INSERT`, ele cobre API, repository Supabase, SQL e futuras Edge Functions que escrevam em `orders`.

## Correção detectada pela validação

A migration 156 foi aplicada inicialmente com `pg_catalog.coalesce(...)` na função do trigger.

`COALESCE` é sintaxe SQL e não pode ser qualificada por schema. O primeiro teste SQL encontrou o erro antes da criação de qualquer pedido persistente.

A migration 157 substituiu a função pela definição correta e o audit permanente agora falha se `pg_catalog.coalesce` reaparecer.

## Backend canônico

`backend/modules/orders/orders-service.js` agora:

- aceita referência de serviço por UUID ou `external_id`;
- lê somente anúncio publicado e moderado de forma elegível;
- exige `approved_version_id`;
- ignora `professionalId` e `providerId` enviados pelo cliente;
- remove `serviceSnapshot`, `serviceVersionId` e `serviceSnapshotAuthority` da metadata recebida;
- insere o profissional e o serviço resolvidos no servidor;
- devolve `serviceVersionId` e `serviceSnapshot` canônicos no DTO do pedido.

## SQL 021

O arquivo `supabase/tests/021_order_service_snapshot_authority_validation.sql` passou integralmente dentro de `BEGIN/ROLLBACK`.

Ele comprovou:

- profissional forjado substituído pelo dono real;
- versão aprovada congelada no primeiro pedido;
- snapshot forjado substituído pelo snapshot aprovado;
- igualdade entre coluna dedicada e projeção de compatibilidade;
- primeiro pedido preservando a versão 1 após aprovação da versão 2;
- adulteração de `service_snapshot` bloqueada;
- adulteração de `metadata.serviceSnapshot` bloqueada;
- novo pedido usando a versão 2;
- pedido do próprio serviço bloqueado.

## Staging após o teste

Projeto: `doke-web-staging`  
Project ref: `zwkczgewzbsorbrjuzpb`

Estado verificado:

- migrations aplicadas: `20260728021551` e `20260728022158`;
- colunas canônicas encontradas: `2`;
- trigger canônico encontrado: `1`;
- `anon` pode executar a função privada: `false`;
- `authenticated` pode executar a função privada: `false`;
- `pg_catalog.coalesce` ainda presente: `false`;
- total de pedidos reais ou sintéticos persistidos: `0`;
- usuários Auth sintéticos persistidos: `0`;
- usuários públicos sintéticos persistidos: `0`;
- serviços sintéticos persistidos: `0`;
- versões sintéticas persistidas: `0`;
- pedidos sintéticos persistidos: `0`.

## Arquivos desta etapa

- `backend/modules/orders/orders-service.js`
- `supabase/migrations/156_order_service_snapshot_authority.sql`
- `supabase/migrations/157_order_service_snapshot_coalesce_fix.sql`
- `supabase/tests/021_order_service_snapshot_authority_validation.sql`
- `scripts/audit-order-service-snapshot-authority.js`
- `scripts/test-order-service-snapshot-authority-runtime.js`
- `scripts/audit-quality-pipeline.js`
- `docs/validation/CAT-001-B04-ORDER-SERVICE-SNAPSHOT-AUTHORITY.json`
- `docs/validation/CAT-001-B04-ORDER-SERVICE-SNAPSHOT-AUTHORITY.md`

## Segurança operacional

- produção não alterada;
- nenhuma conta real modificada;
- nenhum pedido real criado ou alterado;
- nenhuma entidade sintética persistente permaneceu;
- nenhuma configuração paga, SMS ou OAuth foi habilitada;
- PR #12 permanece aberto, draft e não mesclado;
- PR #11 permanece aberto, draft e não mesclado.

## Pendências para encerramento

1. observar Quality no head documental final;
2. observar E2E bloqueante;
3. observar os 105 guards visuais;
4. observar Canary;
5. observar Diagnostic;
6. reconciliar diário de engenharia e matriz;
7. somente então remover `CAT-B04` dos blockers.
