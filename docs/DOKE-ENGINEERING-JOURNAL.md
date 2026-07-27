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
