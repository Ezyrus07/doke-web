# CAT-001 / CAT-A01 — Baseline de autoridade do catálogo

## Status

`BASELINE FROZEN — VALIDATION PENDING`

## Objetivo

Congelar a divisão executável de autoridade do catálogo antes de retirar rascunhos persistentes e mutações de ciclo de vida controladas pelo navegador.

Este sublote não altera comportamento. Ele registra o estado real, cria um gate permanente e impede que a retirada posterior seja feita por remendo ou sem evidência.

## Estado canônico já existente

### Catálogo público

- `services` e `service_media` são as fontes remotas de leitura;
- versões não aprovadas não entram no catálogo público;
- conteúdo anteriormente aprovado pode permanecer público enquanto alterações relevantes aguardam análise;
- `service_categories` expõe somente categorias elegíveis;
- IDs externos permanecem estáveis para rotas públicas.

### Submissão e versionamento

- o formulário envia por `submit_service_for_review` através de `self-service-operations`;
- cada submissão materializa uma versão em `service_versions`;
- `approved_version_id` e `pending_version_id` separam conteúdo público de conteúdo em análise;
- publicação direta pelo navegador está bloqueada pelas migrations e grants existentes.

### Moderação administrativa

- fila, detalhe, auditoria, aprovação, solicitação de ajustes e rejeição passam por `service-moderation-operations`;
- a Edge Function autentica o JWT e confirma role ativa `admin` ou `moderator` em `public.users`;
- decisões privilegiadas chamam RPCs internas com o cliente de serviço;
- o browser não executa diretamente as funções administrativas.

## Autoridade híbrida ainda ativa

`assets/js/repositories/services-repository.js` continua responsável pela chave:

`doke.services.local.v1`

O comportamento congelado é:

1. `save` grava primeiro no `localStorage` com `syncStatus: pending`;
2. depois tenta executar `saveRemote`;
3. se o Supabase falhar, retorna a cópia local como resultado utilizável;
4. `load` mescla serviços locais e remotos;
5. `synchronizePending` tenta promover mutações locais posteriormente;
6. `getById` pode devolver um serviço local legível pelo owner;
7. editar, pausar, reativar e arquivar passam por `repository.update` e herdam essa autoridade híbrida.

Esse desenho é adequado apenas como compatibilidade histórica. Para sujeitos Supabase ou UUID, ele mantém uma segunda verdade persistente no navegador e não pode ser considerado produção-ready.

## Distinção importante

A chave de sessão `doke.service-metrics.visitor.v1` identifica visitantes anônimos para deduplicação de métricas. Ela não contém rascunho, versão, moderação ou autoridade de serviço e não faz parte da retirada CAT-B03.

## Superfícies carregando o repositório

- `anunciar-servico.html`
- `detalhe-anuncio.html`
- `index.html`
- `orcamento.html`
- `perfil-profissional.html`
- `perfil.html`
- `resultados.html`

## Blockers congelados

### CAT-B03 — autoridade dividida

Rascunhos locais e versões remotas coexistem sem contrato final de promoção. A retirada deve preservar fixture controlada sem permitir fallback local para sessões reais.

### CAT-B04 — snapshot histórico

Todos os caminhos que criam pedidos precisam guardar uma fotografia imutável do anúncio contratado. Alterações futuras no catálogo não podem reescrever o contexto de pedidos anteriores.

## Sequência controlada proposta

1. **CAT-A02:** retirar a persistência local de serviços para sessões Supabase e sujeitos UUID;
2. **CAT-A03:** tornar edição, pausa, reativação e arquivamento operações server-side explícitas;
3. **CAT-A04:** fechar o ciclo de mídia, limpeza de uploads e rascunhos abandonados;
4. **CAT-B04:** garantir snapshots imutáveis em todos os caminhos de criação de pedido;
5. **CAT-A05:** reconciliar matriz, documentação e encerramento do domínio.

## Segurança operacional

- nenhuma migration aplicada;
- nenhuma Edge Function implantada;
- staging não alterado;
- produção não alterada;
- nenhuma conta real modificada;
- nenhuma conta sintética persistente criada;
- nenhum SMS, OAuth ou recurso pago habilitado;
- PR #11 permanece separado, aberto, draft e não mesclado.

## Próximo trabalho

Implementar CAT-A02 em sublote separado, mantendo a moderação versionada já canônica e fazendo sujeitos reais falharem fechado quando a autoridade remota estiver indisponível.
