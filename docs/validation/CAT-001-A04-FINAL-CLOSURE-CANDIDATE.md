# CAT-001 / CAT-A04 — Candidato final de encerramento

## Status

`TECHNICALLY COMPLETE — CI PENDING`

A autoridade técnica do ciclo de vida de mídia está implementada em staging. O sublote não é declarado concluído enquanto Quality, E2E bloqueante, 105 guards visuais, Canary e Diagnostic não forem observados em um mesmo head estável.

## Causa raiz final

Mesmo após a implantação dos upload intents e da limpeza reference-safe, `services-repository.js` ainda continha uma implementação histórica completa de submissão remota:

- conversão de Data URL em Blob;
- escolha de caminho previsível pelo navegador;
- upload direto com `upsert: true`;
- reconstrução da projeção `public.service_media` pelo navegador;
- submissão remota própria no repository.

As permissões e o dispatcher já falhavam fechado, mas a camada de negócio ainda possuía um desvio para `repository.submitForReview` quando o provider não era classificado como remoto.

## Corte de autoridade aplicado

`assets/js/services/services-service.js` agora separa explicitamente as autoridades:

### Sessão Supabase ou sujeito UUID

Usa exclusivamente:

`service-media-upload-service → prepare_service_media_uploads → uploadToSignedUrl → submit_service_for_review com upload intent`

### Fixture não UUID

Usa exclusivamente:

`repository.save → memória do runtime`

A fixture recebe:

- `syncStatus: fixture-memory`;
- `status: draft`;
- `moderationStatus: pending_review`.

A camada de negócio não contém mais nenhuma chamada a `repository.submitForReview`.

## Gates permanentes

O audit `scripts/audit-service-media-upload-authority.js` agora exige:

- `submitFixtureForReview`;
- `repository.save` para fixtures;
- `fixture-memory` como estado;
- ausência de `repository.submitForReview` no service layer;
- signed upload como única rota remota.

O runtime `scripts/test-service-media-upload-authority-runtime.js` cobre dois cenários:

1. **Supabase:** prepara intent, executa `uploadToSignedUrl`, submete com `p_upload_intent_id` e não chama o repository legado;
2. **Fixture:** salva uma vez em memória e não carrega nem chama a autoridade remota ou o método legado.

Os dois gates já estão registrados no agregador permanente `audit:quality-pipeline`.

## Staging revalidado

Projeto: `doke-web-staging`  
Project ref: `zwkczgewzbsorbrjuzpb`

Estado observado após o corte no frontend:

- upload intents: `0`;
- upload items: `0`;
- objetos no bucket `service-media`: `3`;
- linhas em `public.service_media`: `3`;
- `cleanup_eligible`: `0`;
- `cleanup_claimed`: `0`;
- `delete_failed`: `0`;
- `deleted`: `0`;
- `INSERT`, `UPDATE` e `DELETE` de `authenticated` em `service_media`: negados;
- policies mutáveis do navegador no bucket: nenhuma.

Nenhuma alteração de staging foi necessária nesta etapa. A verificação foi somente leitura.

## Arquivos alterados neste fechamento

- `assets/js/services/services-service.js`
- `scripts/audit-service-media-upload-authority.js`
- `scripts/test-service-media-upload-authority-runtime.js`
- `docs/validation/CAT-001-A04-FINAL-CLOSURE-CANDIDATE.json`
- `docs/validation/CAT-001-A04-FINAL-CLOSURE-CANDIDATE.md`

## Segurança operacional

- produção não alterada;
- nenhuma conta real modificada;
- nenhum dado real modificado;
- nenhuma entidade sintética persistente criada;
- nenhum objeto criado ou removido do Storage;
- SMS, OAuth e recursos pagos não habilitados;
- PR permanece draft, aberto e não mesclado.

## Riscos restantes

1. O código-fonte morto do helper antigo ainda está fisicamente presente em `services-repository.js`, mas não é mais alcançável pela API de negócio; banco, Storage e dispatcher também bloqueiam sua execução remota.
2. As lanes completas do GitHub ainda não estão observáveis no head documental final.
3. O diário de engenharia e a matriz devem ser reconciliados somente após a evidência do CI, evitando registrar um encerramento não comprovado.
4. Nenhum teste destrutivo utilizou conta real ou entidade sintética persistente.

## Critério para encerramento definitivo

CAT-A04 poderá ser marcado como concluído quando, em um único head estável:

- Quality estiver aprovado;
- E2E bloqueante estiver aprovado;
- 105 guards visuais estiverem aprovados;
- Canary estiver aprovado;
- Diagnostic estiver aprovado;
- evidência final, diário e matriz estiverem reconciliados.

Depois disso, a sequência controlada avança para `CAT-B04`, que garante snapshot imutável do serviço em todos os caminhos de criação de pedido.
