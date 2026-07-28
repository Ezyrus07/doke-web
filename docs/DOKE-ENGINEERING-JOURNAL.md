# Doke Engineering Journal

## Purpose

This is the cumulative technical journal for Doke. It records what was changed, why it was changed, what was validated, what remains pending, and which items are blocked by cost, access, product decisions, or external dependencies.

This document is intentionally append-only in spirit: old entries should not be rewritten to make the past look cleaner. Corrections must be recorded as new entries that explain what changed.

## Operating rules

- Record the date, scope, branch or PR, decisions, implementation, validation, risks, pending work, and next step.
- Distinguish clearly between code completed, staging changes applied, production changes applied, and work only planned.
- Never mark an item complete only because the code exists; include the evidence that closed it.
- Keep paid-plan requirements in the dedicated backlog below so they are not forgotten near launch.
- Do not mix unrelated product or security changes in the same closure entry.

## Status legend

- `DONE`: implemented and validated with sufficient evidence.
- `IN PROGRESS`: implementation or validation is still underway.
- `BLOCKED`: cannot proceed without cost, access, decision, data, or external dependency.
- `PLANNED`: accepted work that has not started.
- `DEFERRED`: intentionally postponed with a recorded reason.

---

# Paid-plan and external-cost backlog

## PAID-001 — Supabase leaked-password protection

**Status:** `BLOCKED`

**Reason:** Supabase dashboard confirmed that **Prevent use of leaked passwords** is available only on the Pro plan and above. The current project plan rejected the configuration change.

**Required near launch:**

1. Upgrade the Supabase project to a plan that supports leaked-password protection.
2. Enable **Authentication → Providers → Email → Prevent use of leaked passwords**.
3. Re-run Security Advisor and confirm that `auth_leaked_password_protection` is absent.
4. Validate that a known compromised password is rejected.

---

# 2026-07-26 — AUTH-A12C / fechamento do AUTH-A12

**Status:** `DONE`

**Branch:** `auth/auth-001-baseline-audit`

**Pull Request:** `#9`

## Problema

O runtime ainda possuía autoridade local residual para identidade profissional:

- `updateProfessionalFixtureUser` alterava role e rotas de fixtures;
- leituras do repositório podiam promover usuários para profissional;
- acesso profissional podia inferir role pelo estado dos documentos;
- revisão administrativa podia aprovar ou rejeitar por repositórios locais;
- fluxos profissionais podiam reescrever manualmente a sessão pública.

## Decisão

- `public.users.role` é a única fonte de role profissional;
- `professional-verification-operations` é a única superfície administrativa no navegador;
- `decide_professional_identity_verification_internal` é a autoridade transacional de decisão e promoção;
- fixtures locais preservadas são somente leitura;
- nenhuma falha remota pode ativar fallback local.

## Implementação

- retirados `updateProfessionalFixtureUser` e `reconcileProfessionalUser`;
- inventário de mutações locais do repositório reduzido a `[]`;
- acesso profissional passou a consultar `public.users.role`;
- documentos verificados não promovem role no browser;
- reviewer passou a usar exclusivamente a Edge Function;
- aprovação exige resposta `verified + professional`;
- retiradas reescritas profissionais de sessão;
- contrato atualizado para `AUTH-A12C`;
- criado runtime permanente de retirada da autoridade profissional;
- gate permanente adicionado ao Quality canônico;
- matriz determinística sincronizada;
- workflows, codemods e diagnósticos temporários removidos.

## Validação da implementação

**Head:** `ab7872c805634b00750cc2bac761686a1cc23f3e`

- Doke Quality Gates #679: sucesso;
- runtime AUTH-A12C: sucesso;
- E2E bloqueante: sucesso;
- 105 guards visuais: sucesso;
- Doke Staging Edge HTTP Canary #453: sucesso;
- Doke Diagnostic E2E #474: sucesso.

## Segurança operacional

- nenhuma migration criada ou aplicada;
- nenhum deploy de Edge Function;
- nenhuma alteração de staging ou produção;
- nenhuma conta real ou sintética persistente modificada;
- nenhum SMS, OAuth ou recurso pago habilitado;
- PR permanece draft, aberto e não mesclado.

## Pendências preservadas

- AUTH-A07 / MAIL-001;
- mudança de telefone sem provider SMS;
- PAID-001 / SEC-B05.

---

# 2026-07-26 — AUTH-A13 / reconciliação de encerramento do AUTH-001

**Status:** `VALIDATION PENDING`

**Branch:** `auth/auth-001-baseline-audit`

**Pull Request:** `#9`

## Problema

A matriz machine-readable ainda classificava autenticação como mock/híbrida e mantinha blockers históricos já encerrados, embora o runtime ativo estivesse Supabase-only.

## Decisão

- classificar o núcleo AUTH como `core_done_external_blocked`;
- atualizar a matriz para autoridade remota/canônica e staging operacional;
- separar dependências externas de e-mail, SMS e plano pago;
- impedir regressão da matriz ou dos runtime flags para provider mock;
- permitir handoff técnico a PROF-001 sem declarar AUTH production-ready.

## Implementação planejada neste lote

- reconciliar `runtime-flags.js`;
- atualizar `config/domain-completion-matrix.json`;
- criar evidência AUTH-A13;
- criar audit permanente do fechamento do domínio;
- regenerar a matriz determinística;
- manter produção, staging, contas e providers inalterados.

## Blockers externos preservados

- `AUTH-EXT-MAIL-001`;
- `AUTH-EXT-SMS-001`;
- `AUTH-EXT-PAID-001`.

---

# 2026-07-27 — PROF-A02 / retirada da persistência local do perfil profissional

**Status:** `DONE`

**Branch:** `prof/prof-001-baseline-audit`

**Pull Request:** `#11`

## Problema

O setup profissional já possuía autoridade Supabase, mas `professional-profiles-repository.js` continuava gravando rascunhos, conclusão, edição ativa e transições no navegador. Páginas Supabase ativas podiam observar ou produzir um perfil diferente do estado canônico do servidor.

## Decisão

- `public.professional_profiles` é a autoridade de leitura para sujeitos Supabase;
- `save_professional_profile_setup` é a autoridade de rascunho e conclusão;
- fixtures não UUID permanecem somente em memória;
- edição ativa e transições sem operação server-side falham fechado;
- nenhuma funcionalidade local insegura é mantida apenas para preservar aparência de funcionamento.

## Implementação

- removidas as chaves `doke.professionalProfiles.v1` e `doke.professionalApplications.v1` do repositório ativo;
- removidos acessos a `localStorage`, `sessionStorage` e IndexedDB da autoridade de perfil profissional;
- leituras remotas passam por `professional_profiles`;
- rascunho e conclusão passam por `save_professional_profile_setup`;
- sujeito da mutação deve coincidir com a sessão atual;
- edição ativa retorna `DOKE_PROFESSIONAL_PROFILE_EDIT_AUTHORITY_UNAVAILABLE`;
- transições retornam `DOKE_PROFESSIONAL_PROFILE_SERVER_TRANSITION_REQUIRED`;
- criado runtime permanente PROF-A02;
- criados audit e evidências permanentes;
- adicionados gates PROF-A02 ao Quality canônico;
- matriz determinística sincronizada.

## Regressão visual encontrada

O harness visual ainda dependia das chaves profissionais aposentadas. Após remover o seed local, `anunciar-servico.html` foi redirecionado primeiro para onboarding e depois para login porque o prepaint guard remove corretamente sessões com IDs demo.

A correção permaneceu restrita ao teste:

- nenhuma chave de perfil ou verificação profissional voltou ao storage;
- o harness preserva temporariamente apenas a sessão fixture durante o prepaint;
- `Storage.prototype.removeItem` é restaurado no `DOMContentLoaded`;
- o audit falha se o teste reintroduzir as chaves aposentadas ou deixar de restaurar o comportamento nativo.

## Validação

**Head validado:** `35d8773e0f4c8b60949de64e0883299acba12704`

- Doke Quality Gates #754: sucesso;
- audit PROF-A01 cumulativo: sucesso;
- audit PROF-A02: sucesso;
- runtime PROF-A02: sucesso;
- matriz determinística: sucesso;
- governança, assets, partição E2E e `git diff --check`: sucesso;
- E2E bloqueante: sucesso;
- 105 guards visuais: sucesso;
- Doke Staging Edge HTTP Canary #527: sucesso;
- Doke Diagnostic E2E #547: sucesso.

## Segurança operacional

- nenhuma migration aplicada;
- nenhuma Edge Function implantada;
- nenhuma alteração de staging ou produção;
- nenhuma conta real ou sintética persistente modificada;
- nenhum SMS, OAuth ou recurso pago habilitado;
- nenhum workflow ou codemod temporário permanece;
- PR permanece draft, aberto e não mesclado.

## Pendências preservadas

- `PROF-A03`: operação server-side reconciliada para edição ativa;
- rascunho KYC ainda local em `professional-identity-verifications-repository.js`;
- evidências binárias ainda no IndexedDB;
- `PROF-B04`: política legal e retenção;
- `PROF-B05`: políticas legadas administradas pelo Supabase Storage.

---

# 2026-07-27 — PROF-A03 / reconciliação atômica do perfil profissional ativo

**Status:** `DONE`

**Branch:** `prof/prof-001-baseline-audit`

**Pull Request:** `#11`

## Problema

O editor profissional ainda coordenava duas mutações separadas no navegador: primeiro o payload profissional, depois o perfil-base. Se a segunda falhasse, o browser tentava reverter a primeira. Esse desenho não era atomicamente confiável e mantinha o cliente como coordenador de consistência.

## Decisão

- uma única operação `update_professional_profile_reconciled` deve possuir toda a edição ativa;
- identidade pública e payload profissional devem ser atualizados na mesma transação PostgreSQL;
- o ator deve vir do JWT verificado pela Edge Function;
- `anon` e `authenticated` não recebem grant direto para a função privilegiada;
- status, role, verificação, documento e métricas permanecem fora do payload editável;
- nenhum fallback local é permitido.

## Implementação

- adicionada a action ao allowlist de `self-service-operations`;
- criada migration `148_professional_profile_reconciliation_authority.sql`;
- criada `public.update_professional_profile_reconciled`;
- evoluído o dispatcher `public.execute_self_service_operation_internal` sem romper operações anteriores;
- `public.update_account_profile` e `public.professional_profiles` passam a ser atualizados na mesma transação;
- resposta devolve snapshots canônicos dos dois perfis;
- `professional-profile-service.js` passou a executar uma única mutação e reconciliar o cache-base;
- removidas do editor as chamadas a `professionalProfiles.updateActiveProfile`, `profile.updateCurrentProfile` e o rollback local;
- adicionados audit estrutural, runtime Node e teste SQL transacional permanentes;
- gates PROF-A03 adicionados ao Quality canônico;
- evidência PROF-A02 final reconciliada;
- matriz determinística sincronizada.

## Validação do código

**Head:** `45b0daa1ffdb4c199c1b896b67b7c1d32c861767`

- Doke Quality Gates #785: sucesso;
- audit PROF-A03: sucesso;
- runtime PROF-A03: sucesso;
- E2E bloqueante: sucesso;
- 105 guards visuais: sucesso;
- Doke Staging Edge HTTP Canary #558: sucesso;
- Doke Diagnostic E2E #578: sucesso.

## Staging

Projeto `doke-web-staging` (`zwkczgewzbsorbrjuzpb`):

- migration `professional_profile_reconciliation_authority` aplicada;
- versão registrada `20260727110417`;
- teste SQL 017 executado com sucesso dentro de transação e encerrado com `ROLLBACK`;
- função privilegiada presente;
- `service_role` com execução permitida;
- `anon` e `authenticated` sem execução direta;
- zero usuários sintéticos remanescentes após o teste;
- Edge Function `self-service-operations` implantada como versão 6;
- função `ACTIVE` e `verify_jwt: true`;
- action PROF-A03 confirmada no bundle implantado.

## Validação pós-deployment

**Head:** `87ecbcb4d7f0f030c96c50b246f4820dbd764354`

- Doke Quality Gates #793: sucesso;
- E2E bloqueante: sucesso;
- 105 guards visuais: sucesso;
- Doke Staging Edge HTTP Canary #566: sucesso;
- Doke Diagnostic E2E #586: sucesso.

## Segurança operacional

- staging alterado de forma controlada;
- produção não alterada;
- nenhuma conta real modificada;
- nenhuma conta sintética persistente criada;
- nenhum SMS, OAuth ou recurso pago habilitado;
- nenhum workflow ou codemod temporário permanece;
- PR permanece draft, aberto e não mesclado.

## Pendências preservadas

- `PROF-A04`: retirar o rascunho KYC de `localStorage/sessionStorage`;
- retirar evidências binárias KYC do IndexedDB em sublote separado;
- `PROF-B04`: política legal e retenção;
- `PROF-B05`: políticas legadas administradas pelo Supabase Storage.

---

# 2026-07-27 — PROF-A04 / retirada da autoridade local de registros e rascunhos KYC

**Status:** `DONE`

**Branch:** `prof/prof-001-baseline-audit`

**Pull Request:** `#11`

## Problema

O serviço de verificação profissional já utilizava o Supabase para leitura, rascunho e submissão de sujeitos reais, mas `professional-identity-verifications-repository.js` ainda persistia registros em `localStorage` e rascunhos em `sessionStorage`. Essa segunda autoridade podia divergir do estado canônico do servidor.

## Decisão

- `public.professional_identity_verifications` permanece a autoridade de leitura para sessões Supabase;
- `save_professional_verification_draft` permanece a autoridade de rascunho;
- `professional-verification-operations/submit` permanece a autoridade de submissão;
- sujeitos Supabase ou UUID falham fechado no repositório fixture;
- fixtures não UUID preservam somente estado volátil em memória;
- a retirada das evidências binárias IndexedDB permanece separada em `PROF-B03-KYC-EVIDENCE`.

## Implementação

- aposentadas as chaves `doke.professionalIdentityVerifications.v1` e `doke.professionalIdentityVerificationDrafts.v1`;
- removidos acessos do repositório a `localStorage`, `sessionStorage` e IndexedDB;
- registros, rascunhos e locks de fixture passaram para `Map` em memória;
- criado runtime permanente PROF-A04;
- criado audit estrutural PROF-A04;
- adicionados gates PROF-A04 ao Quality canônico;
- criadas evidências JSON e Markdown;
- audit cumulativo PROF-A01 evoluído para reconhecer a retirada controlada sem apagar o baseline histórico;
- matriz determinística sincronizada pelo workflow canônico;
- criado gate que impede evidência `done` com qualquer validação pendente.

## Validação

**Head validado:** `41b0a57fab27720bc82aaa28b50ee0eecfe1748e`

- audit cumulativo PROF-A01: sucesso;
- audit PROF-A02 e runtime PROF-A02: sucesso;
- audit PROF-A03 e runtime PROF-A03: sucesso;
- audit PROF-A04 e runtime PROF-A04: sucesso;
- matriz determinística: sucesso;
- Doke Quality Gates #823: sucesso;
- E2E bloqueante: sucesso;
- 105 guards visuais: sucesso;
- Doke Staging Edge HTTP Canary #596: sucesso;
- Doke Diagnostic E2E #616: sucesso.

## Supabase

- nenhuma migration necessária ou aplicada;
- nenhuma Edge Function implantada;
- staging não alterado;
- produção não alterada.

## Segurança operacional

- nenhuma conta real modificada;
- nenhuma conta sintética persistente criada;
- nenhum SMS, OAuth ou recurso pago habilitado;
- nenhum fallback local reaberto;
- nenhuma ferramenta temporária permaneceu;
- PR permanece draft, aberto e não mesclado.

## Pendências preservadas

- `PROF-B03-KYC-EVIDENCE`: retirar a autoridade IndexedDB de evidências binárias;
- `PROF-B04`: política legal, retenção, recurso e provedor KYC;
- `PROF-B05`: aposentadoria das políticas legadas administradas pelo Supabase Storage.

---

# 2026-07-27 — PROF-B03-KYC-EVIDENCE / retirada da autoridade IndexedDB

**Status:** `DONE`

**Branch:** `prof/prof-001-baseline-audit`

**Pull Request:** `#11`

## Problema

O fluxo real já enviava evidências KYC para o bucket privado `professional-verification-media` por intents assinados, mas `professional-verification-evidence-repository.js` ainda persistia blobs em IndexedDB no banco `doke-professional-verification-evidence-v1`. Essa persistência sobrevivia entre sessões e mantinha uma autoridade binária paralela no navegador.

## Decisão

- Supabase Storage permanece a única autoridade real de evidências binárias;
- `prepare_uploads`, `uploadToSignedUrl` e `submit_professional_identity_verification_internal` preservam a fronteira canônica;
- sessões Supabase e sujeitos UUID falham fechado no repositório fixture;
- fixtures não UUID preservam blobs somente em memória durante o runtime atual;
- nenhuma cópia, recuperação ou máscara local é permitida para evidência real.

## Implementação

- removidos IndexedDB, object store e o banco `doke-professional-verification-evidence-v1`;
- criado `Map` volátil para compatibilidade fixture;
- preservadas as superfícies `save`, `getByVerificationId` e `remove`;
- criado erro `DOKE_PROFESSIONAL_VERIFICATION_EVIDENCE_AUTHORITY_UNAVAILABLE`;
- criado runtime permanente PROF-B03;
- criado audit estrutural PROF-B03;
- adicionados gates PROF-B03 ao Quality canônico;
- audits cumulativos PROF-A01 e PROF-A02 foram reconciliados;
- matriz determinística passou a classificar PROF-001 como `remote/canonical`;
- blocker `PROF-B03` foi retirado de PROF-001 e FLOW-03;
- o reconciliador temporário da matriz se removeu no próprio commit.

## Validação

**Head validado:** `5098b8f689086143ecaae0a2d807e04d13357ca3`

- audit cumulativo PROF-A01: sucesso;
- audit e runtime PROF-A02: sucesso;
- audit e runtime PROF-A03: sucesso;
- audit e runtime PROF-A04: sucesso;
- audit e runtime PROF-B03: sucesso;
- matriz determinística: sucesso;
- Doke Quality Gates #855: sucesso;
- E2E bloqueante: sucesso;
- 105 guards visuais: sucesso;
- Doke Staging Edge HTTP Canary #628: sucesso;
- Doke Diagnostic E2E #648: sucesso.

## Supabase

- nenhuma migration necessária ou aplicada;
- nenhuma Edge Function implantada;
- staging não alterado;
- produção não alterada;
- autoridade remota já existente foi preservada sem mudança operacional.

## Segurança operacional

- nenhuma conta real modificada;
- nenhuma conta sintética persistente criada;
- nenhum SMS, OAuth ou recurso pago habilitado;
- nenhuma autoridade local aposentada foi reaberta;
- nenhuma ferramenta temporária permanece após o commit documental;
- PR permanece draft, aberto e não mesclado.

## Pendências preservadas

- `PROF-B04`: definir política legal KYC, retenção, rejeição, recurso e provedor;
- `PROF-B05`: retirar políticas legadas owner-prefix pelo mecanismo gerenciado do Supabase Storage;
- produção permanece bloqueada.

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

---

# 2026-07-27 — CAT-A02 / retirada da autoridade persistente de serviços

**Status:** `DONE`

**Branch:** `cat/cat-001-baseline-audit`

**Pull Request:** `#12`

## Problema

O catálogo público e a moderação versionada já possuíam autoridade remota, mas `services-repository.js` ainda mantinha uma segunda autoridade persistente em `doke.services.local.v1`. O browser gravava antes da mutação remota, devolvia cópias pendentes após falhas e tentava sincronizá-las posteriormente. Edição, pausa, reativação e arquivamento herdavam essa fronteira híbrida.

## Decisão

- `services`, `service_media` e `service_versions` permanecem as autoridades reais do catálogo;
- sessões Supabase e sujeitos UUID devem falhar fechado quando a autoridade remota estiver indisponível;
- fixtures não UUID podem existir somente em memória durante o runtime atual;
- nenhuma fixture pode mascarar uma leitura remota configurada;
- CAT-A03 permanece separado para operações explícitas de edição e ciclo de vida.

## Implementação

- removidos `localStorage`, `doke.services.local.v1` e a sincronização posterior de pendências;
- criada autoridade `supabase-or-fixture-memory`;
- fixtures não UUID passaram para memória volátil;
- criado erro `DOKE_SERVICE_AUTHORITY_UNAVAILABLE`;
- leituras e gravações reais passaram a falhar fechado;
- submissão para análise devolve o snapshot canônico sem persistência no navegador;
- contratos do repositório e da rota de detalhe foram reconciliados;
- criados audit e runtime permanentes CAT-A02;
- CAT-A01 passou a funcionar como gate cumulativo;
- matriz determinística 1.3.6 reconciliada sem remover CAT-B03 ou CAT-B04;
- Quality canônico passou a executar audit e runtime CAT-A02;
- workflows, codemods e relatórios temporários foram removidos.

## Validação

**Head validado:** `0bf9c9971ebd70336cd7b5b3f05fe57ccec8b92f`

- audit CAT-A01 cumulativo: sucesso;
- audit CAT-A02 e runtime CAT-A02: sucesso;
- contratos de repositório e detalhe: sucesso;
- matriz determinística: sucesso;
- Doke Quality Gates #938: sucesso;
- E2E bloqueante: sucesso;
- 105 guards visuais: sucesso;
- Doke Staging Edge HTTP Canary #676: sucesso;
- Doke Diagnostic E2E #696: sucesso.

## Segurança operacional

- nenhuma migration aplicada;
- nenhuma Edge Function implantada;
- staging não alterado;
- produção não alterada;
- nenhuma conta real ou sintética persistente modificada;
- nenhum SMS, OAuth ou recurso pago habilitado;
- nenhuma autoridade local aposentada foi reaberta;
- nenhuma ferramenta temporária permanece;
- PR permanece draft, aberto e não mesclado.

## Pendências preservadas

- `CAT-A03`: operações server-side explícitas para edição, pausa, reativação e arquivamento;
- `CAT-A04`: ciclo de limpeza de mídia e rascunhos abandonados;
- `CAT-B04`: snapshots imutáveis de serviço em todos os caminhos de criação de pedidos;
- produção permanece bloqueada.

---

# 2026-07-27 — CAT-A03 / autoridade server-side de edição e ciclo de vida

**Status:** `DONE`

**Branch:** `cat/cat-001-baseline-audit`

**Pull Request:** `#12`

## Resultado

- conteúdo aprovado passou a mudar somente por nova versão submetida;
- pausa, reativação e arquivamento passaram para `transition_owned_service_lifecycle`;
- migration 149 e Edge Function v7 foram aplicadas em staging;
- SQL 018, Quality #992, E2E bloqueante, 105 guards, Canary #714 e Diagnostic #736 passaram;
- matriz 1.3.8 reconciliada e `CAT-B03` encerrado.

## Segurança operacional

Produção, contas reais, SMS, OAuth e configurações pagas não foram alterados. O PR permanece draft e não mesclado.

## Próximo sublote

`CAT-A04`: fechar substituição e limpeza de mídia, objetos superseded e rascunhos abandonados.

# 2026-07-28 — CAT-A04 / fechamento do ciclo de mídia

Immutable signed upload reservations, one-time consumption and reference-safe server cleanup were finalized.

- validated head: `09e77e5236d2bc0c820d73768f0161f326adeefe`;
- Quality #1237 / run `30357055694`: success;
- blocking E2E job `90267805123`: success;
- 105 visual structural guards job `90267805237`: success;
- Canary #806 / run `30357055735`: success;
- Diagnostic #901 / run `30357055726`: success;
- production unchanged; PR #12 and parent PR #11 remain draft, open and unmerged.

# 2026-07-28 — CAT-B04 / snapshot imutável de serviço em pedidos

Order creation now freezes the approved service version, canonical professional identity and historical snapshot across remote insertion paths.

- validated head: `09e77e5236d2bc0c820d73768f0161f326adeefe`;
- Quality #1237 / run `30357055694`: success;
- blocking E2E job `90267805123`: success;
- 105 visual structural guards job `90267805237`: success;
- Canary #806 / run `30357055735`: success;
- Diagnostic #901 / run `30357055726`: success;
- production unchanged; PR #12 and parent PR #11 remain draft, open and unmerged.

# 2026-07-28 — CAT-A05 / reconciliação final do CAT-001

CAT-001 was reconciled at maturity 4. Only CAT-B04 was removed; security remains partial and production remains blocked. SEARCH-001 is the next mandatory domain.

- validated head: `09e77e5236d2bc0c820d73768f0161f326adeefe`;
- Quality #1237 / run `30357055694`: success;
- blocking E2E job `90267805123`: success;
- 105 visual structural guards job `90267805237`: success;
- Canary #806 / run `30357055735`: success;
- Diagnostic #901 / run `30357055726`: success;
- production unchanged; PR #12 and parent PR #11 remain draft, open and unmerged.
