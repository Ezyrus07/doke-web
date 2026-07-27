
---

# 2026-07-27 — CAT-A01 / baseline de autoridade do catálogo

**Status:** `DONE`

**Branch:** `cat/cat-001-baseline-audit`

**Pull Request:** `#12`

## Problema

A publicação pública e a moderação de serviços já utilizavam autoridades server-side, mas `services-repository.js` continuava mantendo uma segunda autoridade persistente em `doke.services.local.v1`.

O repositório gravava localmente antes da mutação remota, devolvia uma cópia pendente quando o Supabase falhava, mesclava local e remoto nas leituras e tentava sincronizar posteriormente. Edição, pausa, reativação e arquivamento herdavam essa fronteira híbrida.

## Decisão

- congelar o estado executável antes de retirar a autoridade local;
- preservar catálogo público e moderação já canônicos;
- não alterar comportamento durante o baseline;
- impedir que CAT-B03 seja executado sem audit, evidência e sequência controlada;
- manter fixtures e compatibilidades explícitas, sem confundi-las com produção.

## Autoridades congeladas

- catálogo público aprovado: `services` e `service_media` remotos;
- submissão para análise: `self-service-operations/submit_service_for_review`;
- versionamento: `service_versions`, `approved_version_id` e `pending_version_id`;
- decisão administrativa: `service-moderation-operations`;
- rascunhos e ciclo de vida do owner: híbridos entre navegador e remoto;
- chave local controlada: `doke.services.local.v1`;
- blockers ativos: `CAT-B03` e `CAT-B04`.

## Implementação

- criadas evidências JSON e Markdown CAT-A01;
- criado audit estrutural permanente do baseline;
- audit integrado ao Quality canônico;
- branch `cat/**` adicionada ao lane de push do Quality;
- matriz determinística reconciliada para registrar os novos artefatos;
- reconciliador temporário da matriz removido no próprio commit;
- nenhum comportamento funcional do catálogo alterado.

## Validação

**Head validado:** `043e3862414fd06e5b24aa3d96a8e6bd72c223f4`

- audit CAT-A01: sucesso;
- audits cumulativos AUTH e PROF: sucesso;
- matriz determinística: sucesso;
- governança, assets, partição E2E e `git diff --check`: sucesso;
- Doke Quality Gates #879: sucesso;
- E2E bloqueante: sucesso;
- 105 guards visuais: sucesso;
- Doke Staging Edge HTTP Canary #646: sucesso;
- Doke Diagnostic E2E #666: sucesso.

## Segurança operacional

- nenhuma migration aplicada;
- nenhuma Edge Function implantada;
- staging não alterado;
- produção não alterada;
- nenhuma conta real modificada;
- nenhuma conta sintética persistente criada;
- nenhum SMS, OAuth ou recurso pago habilitado;
- nenhum fallback aposentado foi reaberto;
- nenhuma ferramenta temporária permanece após o commit documental;
- PR permanece draft, aberto e não mesclado.

## Próximo sublote

`CAT-A02`: retirar a autoridade persistente de `doke.services.local.v1` para sessões Supabase e sujeitos UUID, preservando fixtures não UUID somente em memória e mantendo a moderação versionada canônica.
