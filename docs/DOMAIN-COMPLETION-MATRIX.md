# Doke — Matriz de Conclusão dos Domínios

Este é o mapa operacional obrigatório para concluir a lógica da Doke. Ele cruza o código ativo, os contratos/testes existentes e um snapshot do Supabase de staging. Não substitui os contratos de cada domínio; determina **ordem, maturidade, autoridade, bloqueadores e gate de saída**.

## Resumo executivo

- Domínios/programas mapeados: **23**.
- Fluxos críticos mapeados: **15**.
- Maturidade média atual: **2.83/6**.
- Bloqueadores críticos explícitos: **13**.
- Domínios prontos para produção: **0**.
- Runtime padrão: dados **mock**, auth **supabase**, rede **desativada**.

A leitura correta é: a Doke possui fundações e canários avançados, especialmente em pedidos e operação, mas o produto público ainda é **híbrido/mock por padrão** e a superfície de segurança bloqueia promoção para produção.

## Snapshot real do staging

Observado em `2026-07-23T13:29:46.102113+00:00` no projeto `zwkczgewzbsorbrjuzpb`.

| Indicador | Valor |
| --- | ---: |
| Tabelas públicas | 45 |
| Tabelas públicas sem RLS | 0 |
| Tabelas com RLS sem policies | 0 |
| Funções SECURITY DEFINER | 134 |
| SECURITY DEFINER executáveis por anon | 0 |
| SECURITY DEFINER executáveis por authenticated | 7 |
| Tabelas no Realtime | 1 |
| Edge Functions ativas | 8 |
| Crons operacionais ativos | 5 |

### Dívida de RLS que bloqueia produção

.

RLS habilitado, mas sem policy: .

## Escala de maturidade

| Nível | Significado | Quantidade |
| ---: | --- | ---: |
| 0 | not started | 1 |
| 1 | foundation only | 3 |
| 2 | local functional | 4 |
| 3 | staging canary or hybrid | 6 |
| 4 | staging operational | 9 |
| 5 | private beta ready | 0 |
| 6 | production ready | 0 |

## Visão geral dos domínios

| Ordem | ID | Domínio | Maturidade | UI atual | Autoridade server-side | Evidência | Segurança | Produção |
| ---: | --- | --- | ---: | --- | --- | --- | --- | --- |
| 1 | GOV-001 | Governança, arquitetura e comando central | 4/6 | hybrid | canonical | staging operational | partial | candidate |
| 2 | SEC-001 | Segurança, RLS, grants e autoridade dos dados | 4/6 | hybrid | canonical | staging operational | partial | blocked |
| 3 | AUTH-001 | Autenticação, sessão e identidade | 4/6 | remote | canonical | staging operational | partial | blocked |
| 4 | PROF-001 | Perfis, onboarding profissional e KYC | 4/6 | remote | canonical | staging operational | blocked | blocked |
| 5 | CAT-001 | Catálogo, publicação e moderação de serviços | 4/6 | remote | canonical | staging operational | partial | blocked |
| 6 | SEARCH-001 | Busca, descoberta, favoritos e ranking | 4/6 | hybrid | canonical | staging operational | partial | blocked |
| 7 | ORD-001 | Orçamentos, propostas e ciclo de pedidos | 4/6 | hybrid | canonical | staging operational | partial | blocked |
| 8 | SCHED-001 | Agenda, disponibilidade e execução do serviço | 1/6 | local | none | static contract | blocked | blocked |
| 9 | MSG-001 | Mensagens, conversas, presença e anexos | 3/6 | hybrid | partial | staging canary | partial | blocked |
| 10 | NTF-001 | Notificações, e-mail e push | 3/6 | hybrid | partial | staging canary | blocked | blocked |
| 11 | PAY-001 | Pagamentos, cobrança, escrow e webhooks | 2/6 | local | contract only | local e2e | blocked | blocked |
| 12 | WAL-001 | Carteira, recebíveis, saldo e saques | 3/6 | hybrid | partial | staging canary | blocked | blocked |
| 13 | DSP-001 | Cancelamentos, reembolsos, disputas e chargebacks | 2/6 | hybrid | partial | staging canary | blocked | blocked |
| 14 | REP-001 | Avaliações, reputação e recompra | 3/6 | hybrid | partial | staging canary | partial | blocked |
| 15 | COM-001 | Comunidades, membros e moderação social | 3/6 | hybrid | partial | staging canary | partial | blocked |
| 16 | CONTENT-001 | Workers, publicações, mídia e feed social | 2/6 | local | contract only | local e2e | blocked | blocked |
| 17 | ADM-001 | Administração, suporte e moderação | 4/6 | hybrid | canonical | staging operational | partial | blocked |
| 18 | REL-001 | Observabilidade, incidentes, SLOs e proteção de mudanças | 4/6 | remote | canonical | staging operational | passed | candidate |
| 19 | ANA-001 | Analytics, funil e economia do marketplace | 2/6 | hybrid | partial | local e2e | partial | blocked |
| 20 | LEGAL-001 | Jurídico, privacidade, confiança e políticas comerciais | 1/6 | local | none | absent | blocked | blocked |
| 21 | WEB-001 | Fechamento do web, acessibilidade e performance | 3/6 | hybrid | partial | local e2e | partial | blocked |
| 22 | APP-001 | Aplicativos Android e iOS | 0/6 | local | none | absent | blocked | blocked |
| 23 | BETA-001 | Beta fechado, operação regional e lançamento | 1/6 | local | contract only | static contract | blocked | blocked |

## Ordem técnica obrigatória

1. **SEC-001** — Segurança, RLS, grants e autoridade dos dados.
2. **AUTH-001** — Autenticação, sessão e identidade.
3. **PROF-001** — Perfis, onboarding profissional e KYC.
4. **CAT-001** — Catálogo, publicação e moderação de serviços.
5. **SEARCH-001** — Busca, descoberta, favoritos e ranking.
6. **ORD-001** — Orçamentos, propostas e ciclo de pedidos.
7. **MSG-001** — Mensagens, conversas, presença e anexos.
8. **PAY-001** — Pagamentos, cobrança, escrow e webhooks.
9. **WAL-001** — Carteira, recebíveis, saldo e saques.
10. **DSP-001** — Cancelamentos, reembolsos, disputas e chargebacks.
11. **REP-001** — Avaliações, reputação e recompra.
12. **COM-001** — Comunidades, membros e moderação social.
13. **ADM-001** — Administração, suporte e moderação.
14. **ANA-001** — Analytics, funil e economia do marketplace.
15. **WEB-001** — Fechamento do web, acessibilidade e performance.
16. **APP-001** — Aplicativos Android e iOS.
17. **BETA-001** — Beta fechado, operação regional e lançamento.

A ordem pode receber sublotes internos, mas nenhum domínio pode ser promovido ignorando suas dependências ou seu gate de saída.

## Fluxos críticos ponta a ponta

| ID | Fluxo | Estado | Owner | Etapas | Bloqueadores |
| --- | --- | --- | --- | --- | --- |
| FLOW-01 | Descoberta pública | hybrid | SEARCH-001 | home → search → results → service_detail |  |
| FLOW-02 | Cadastro, login e onboarding | staging canary | AUTH-001 | register → verify_contact → session → profile_materialization → onboarding |  |
| FLOW-03 | Tornar-se profissional e KYC | staging operational | PROF-001 | profile_setup → document_upload → submit → admin_review → decision → role_activation | PROF-B04, PROF-B05 |
| FLOW-04 | Publicar serviço | hybrid | CAT-001 | draft → media → quote_template → submit_review → moderation → publish → edit_version |  |
| FLOW-05 | Solicitar orçamento e criar pedido | staging operational | ORD-001 | service_snapshot → questionnaire → request → outbox_event → professional_notification | ORD-B02 |
| FLOW-06 | Aceite, proposta e agenda | hybrid | ORD-001 | accept → proposal → client_approval → schedule_hold → confirmation | SCHED-B02, SCHED-B03, ORD-B04 |
| FLOW-07 | Conversa transacional | hybrid | MSG-001 | conversation → message → attachment → read_state → realtime → notification | MSG-B02, MSG-B03 |
| FLOW-08 | Pagamento, retenção e liberação | blocked | PAY-001 | charge → provider_checkout → signed_webhook → ledger → receivable → release | PAY-B01, PAY-B03, PAY-B04 |
| FLOW-09 | Cancelamento, reembolso e disputa | blocked | DSP-001 | eligibility → cancel → refund → dispute → evidence → decision → appeal | DSP-B01, DSP-B03 |
| FLOW-10 | Carteira e saque | hybrid | WAL-001 | pending_balance → available_balance → bank_account → withdraw_request → approval → provider_transfer → reconciliation | WAL-B02, WAL-B03 |
| FLOW-11 | Avaliação e recompra | local | REP-001 | eligibility → review → moderation → reputation → rehire | REP-B02, REP-B03 |
| FLOW-12 | Comunidade e conteúdo | hybrid | COM-001 | discover → join_or_request → role → post_or_message → report → sanction → appeal | COM-B02, COM-B03, COM-B04 |
| FLOW-13 | Operação administrativa | staging canary | ADM-001 | queue → case → decision → audit → dual_control → notification | ADM-B03 |
| FLOW-14 | Incidente e proteção de mudança | staging operational | REL-001 | health → alert → acknowledge → runbook → recovery → post_incident → error_budget → change_gate | REL-B01, REL-B02 |
| FLOW-15 | Beta fechado e lançamento | blocked | BETA-001 | security_gate → legal_gate → real_e2e → operator_rehearsal → go_no_go → regional_beta → scale_review | BETA-B01, BETA-B02, BETA-B03 |

## Detalhamento por domínio

### GOV-001 — Governança, arquitetura e comando central

**Objetivo:** Manter uma única base oficial, contratos vivos, gates verificáveis e rastreabilidade de mudanças.

**Estado:** maturidade 4/6; UI hybrid; servidor canonical; staging staging operational; segurança partial; produção candidate.

**Evidência estática observada:** 1011 arquivos no escopo; 247 referências a localStorage; 77 a sessionStorage; 557 referências mock; 186 referências de rede/Supabase; 35 marcadores de implementação pendente.

**Evidências:**
- The machine-readable domain completion matrix and generated living document are active and drift-audited.
- Error budgets and change protection are active in staging.
- Cumulative ZIP and changed-only delivery workflow exists.

**Bloqueadores:**
- **GOV-B02 · MEDIUM · quality_gate:** Global governance audit is blocked by the pre-existing noncanonical Home button account-onboarding__change. _(Fase 0)_

**Próximas ações:**
- Keep this matrix synchronized after every domain, migration, grant, realtime, storage or Edge Function change.
- Resolve the Home button governance failure.
- Define release provenance and authorized migration-origin policy.

**Gate de saída:**
- Every active page, critical flow, data table and server action is mapped.
- Matrix audit passes without drift.
- Release and migration origin policy is documented and enforced.

### SEC-001 — Segurança, RLS, grants e autoridade dos dados

**Objetivo:** Close exposed database and RPC surfaces before expanding real writes or onboarding external users.

**Estado:** maturidade 4/6; UI hybrid; servidor canonical; staging staging operational; segurança partial; produção blocked.

**Evidência estática observada:** 211 arquivos no escopo; 0 referências a localStorage; 0 a sessionStorage; 0 referências mock; 5 referências de rede/Supabase; 9 marcadores de implementação pendente.

**Tabelas/autoridades de dados:** `users`, `user_profiles`, `client_profiles`, `audit_logs`, `availability_slots`, `budgets`, `communities`, `community_members`, `community_posts`, `favorites`, `message_attachments`, `reports`, `reviews`, `service_categories`, `verification_events`.

**Edge Functions:** `financial-operations`, `service-moderation-operations`, `self-service-operations`.

**Evidências:**
- Private operational tables are not readable by anon or authenticated.
- users now exposes only the authenticated caller own account row; anon has no table access.
- user_profiles is explicitly public-read and has no browser DML grants.
- Forged user_metadata role claims are ignored, stripped and replaced by app_metadata projected from public.users.
- Identity and KYC RPCs are no longer executable by anon; client attempts against admin verification RPCs return ADMIN_REQUIRED.
- professional_profiles, professional_identity_verifications and verification_events now expose read-only owner/reviewer RLS with no browser DML grants.
- Reviewer queue, detail, claim and decision operations moved behind the JWT-protected professional-verification-operations Edge Function.
- KYC evidence paths are owner-scoped, private and immutable while submitted, under review or verified.
- Professional promotion updates public.users and app_metadata without persisting role claims in user_metadata.
- client_profiles is now a private server-owned metrics authority: authenticated users read only their own row and cannot insert, update or delete directly.
- client_profile_public_summaries exposes only completed order count, aggregate rating, review count and update time; no contact, KYC, risk or administrative fields are present.
- Client metrics are recalculated from completed orders and published reviews through private SECURITY DEFINER functions with pg_catalog search_path and revoked browser execution.
- Fourteen remote persona canaries passed under rollback, including anon denial, cross-account denial, forged metadata resistance, service-role reconciliation, suspension cleanup and deletion consistency.
- Financial authority tables now expose no anon grants; authenticated sessions receive SELECT-only participant projections and service_role receives CRUD without TRUNCATE, REFERENCES or TRIGGER.
- Legacy idempotency, payment materialization, receivable creation/release and direct operator-resolution RPCs are no longer executable by public, anon, authenticated or service_role.
- Four self-service financial RPCs remain explicitly authenticated and revalidate active canonical roles from public.users; forged JWT metadata cannot elevate financial authority.
- Support/admin financial decisions now pass through financial-operations version 1 with verify_jwt enabled and service-role-only internal RPCs that revalidate the canonical actor.
- Twenty-six remote financial persona and mutation canaries passed in one rolled-back transaction, including withdrawal idempotency, dispute lifecycle, direct-DML denial and operator separation.
- All 45 public tables now have RLS enabled; the security advisor reports zero rls_disabled_in_public findings.
- Notifications are authenticated-only with recipient RLS, column-scoped state updates, safe search_path and immutable idempotency context.
- audit_logs, categories, favorites, availability, reviews, budgets, message attachments, reports and community tables now use explicit least-privilege grants and persona RLS.
- service-media no longer exposes a broad storage listing policy; owner operations are folder- and identity-scoped while public object delivery remains bucket-native.
- Community ownership is canonical through communities.owner_id plus an owner-membership trigger; self-elevation and owner-row downgrade/deletion are denied.
- The public client summary RPC now runs as SECURITY INVOKER and remains readable through the RLS-protected public projection.
- Six privileged service-moderation operations moved behind service-moderation-operations v1 with verify_jwt enabled and service-role-only wrappers.
- Foreign-key coverage, RLS initplan and duplicate permissive-policy advisor findings were eliminated without removing low-usage indexes from an empty staging dataset.
- Eighty-one remote persona and mutation assertions passed with rollback across notifications, public data, communities, moderation, catalog ownership, messaging and RLS regression.
- No existing service quote template has a professional_id that diverges from its canonical service owner.
- All fourteen authenticated SECURITY DEFINER self-service RPCs are no longer executable by anon or authenticated; they are server-only and retain pg_catalog search_path.
- The JWT-protected self-service-operations Edge Function derives the actor from auth.getUser and invokes a service-role-only dispatcher; actor identity is never accepted from the request body.
- The dispatcher reconstructs auth.uid for the existing hardened domain implementations and rejects operations outside a fourteen-action allowlist.
- Five new remote dispatcher assertions passed with rollback; the cumulative SEC-001 remote assertion count is 121.
- The Supabase security advisor now reports only leaked-password protection disabled; authenticated SECURITY DEFINER warnings were eliminated.
- Twenty-two focused local validation groups passed with zero new failures; two unrelated failures were reproduced unchanged in the pristine baseline.
- Source files for migrations 110-134, the service-moderation-operations Edge Function, SQL validations and contract tests were recovered byte-for-byte from the prior validated public-data-authority delivery; the published SHA-256 manifest was verified. This recovery is packaged for review but is not Git-authoritative until committed and validated in CI.
- SEC-B08 was closed after the checksum-proven migrations 110-134 and service-moderation sources were committed at d0ae2657, the GitHub quality gates passed on that SHA, and the matching migration names plus service-moderation-operations v2 were observed read-only in staging.
- The platform-default ACL validation passed remotely: 45 public tables, zero without RLS, zero without policies, zero supabase_admin-owned public relations or sequences, and zero browser sequence grants. SEC-B07 is now an operational post-creation control rather than an existing-object exposure.
- The deployed quote-template-ai v6 contained shared.ts and recommendations.ts that were absent from Git; both sources were recovered from the active deployment and audit:edge-function-source-closure now fails on missing or boundary-escaping relative imports.

**Bloqueadores:**
- **SEC-B05 · HIGH · auth:** Leaked password protection is disabled in Supabase Auth. _(Fase 1)_
- **SEC-B09 · HIGH · edge_http_boundary:** Seven Edge Functions still use wildcard CORS; only quote-template-ai has explicit application rate limiting and body-size enforcement, and authenticated HTTP/browser persona evidence is incomplete. _(Fase 1)_

**Próximas ações:**
- Publish the recovered quote-template-ai sources and Edge Function source-closure audit in the reviewed PR, then rerun the deterministic CI gates on the resulting SHA.
- Enable leaked-password protection in Supabase Auth through the dashboard or an authorized Management API.
- Define a canonical Edge Function HTTP boundary with an origin allowlist, preflight contract, payload limits and rate limits per action/persona; do not deploy until local and CI contracts pass.
- Run browser-authenticated HTTP evidence for self-service-operations, service moderation and the signed Storage lifecycle.
- Run supabase/tests/013_platform_default_acl_validation.sql after any migration or platform feature creates a public object.

**Gate de saída:**
- No public table requiring protection remains without RLS and policies.
- No internal SECURITY DEFINER RPC is callable by anon or generic authenticated users.
- Negative tests pass for client, professional, support, moderator and admin.
- Security advisors have no unresolved critical errors attributable to the core surface.

### AUTH-001 — Autenticação, sessão e identidade

**Objetivo:** Provide one Supabase-owned identity and session authority across every page while keeping externally blocked contact and paid security controls explicit.

**Estado:** maturidade 4/6; UI remote; servidor canonical; staging staging operational; segurança partial; produção blocked.

**Evidência estática observada:** 32 arquivos no escopo; 33 referências a localStorage; 2 a sessionStorage; 33 referências mock; 24 referências de rede/Supabase; 3 marcadores de implementação pendente.

**Páginas:** `auth/login.html`, `auth/cadastro.html`, `auth/esqueci-senha.html`.

**Tabelas/autoridades de dados:** `users`, `user_profiles`, `client_profiles`, `professional_profiles`, `professional_identity_verifications`.

**Edge Functions:** `self-service-operations`, `professional-verification-operations`.

**Evidências:**
- Supabase is the only active browser authentication provider; provider selection by query, window config or localStorage is retired.
- AUTH-A03 through AUTH-A06 validate fail-closed route guards, registration, recovery, refresh, reauthentication and logout.
- AUTH-A08 through AUTH-A10 physically retire local/mock browser auth and the historical /auth adapter.
- AUTH-A11 reconciles profile, settings and onboarding through server-side self-service operations.
- AUTH-A12 retires all remaining local credential, identity, onboarding and professional role/reviewer mutation authority.
- AUTH-A13 reconciles the machine-readable matrix and adds a permanent domain-closure regression audit.
- Quality, blocking E2E, 105 visual guards, staging Edge canary and Diagnostic have validated the Supabase-only runtime.

**Bloqueadores:**
- **AUTH-EXT-MAIL-001 · HIGH · external_mail_provider:** Verified e-mail change and real transactional e-mail canaries remain blocked until MAIL-001 provider, redirect and deliverability configuration are approved. _(Pre-launch)_
- **AUTH-EXT-SMS-001 · MEDIUM · external_sms_provider:** Verified phone change remains intentionally unavailable until an SMS provider and cost policy are configured. _(Pre-launch)_
- **AUTH-EXT-PAID-001 · HIGH · paid_plan_security:** Supabase leaked-password protection requires a paid plan and remains tracked by PAID-001 / SEC-B05. _(Pre-launch)_

**Próximas ações:**
- Proceed with PROF-001 as the next core engineering domain without declaring AUTH-001 production-ready.
- Execute AUTH-A07 only after MAIL-001 has controlled mailboxes, redirect policy and deliverability capacity.
- Keep phone change unavailable until an SMS provider and cost policy are approved.
- Enable and validate leaked-password protection after the Supabase plan upgrade.

**Gate de saída:**
- All protected pages derive identity from the canonical Supabase session.
- No browser route can select or fall back to mock/local authentication.
- Session refresh, recovery, reauthentication and logout remain E2E validated.
- No access token or refresh token enters the Doke public session snapshot.
- External e-mail, SMS and paid-plan blockers remain explicit until real provider evidence closes them.

### PROF-001 — Perfis, onboarding profissional e KYC

**Objetivo:** Materialize trustworthy client and professional profiles, verification evidence and role transitions.

**Estado:** maturidade 4/6; UI remote; servidor canonical; staging staging operational; segurança blocked; produção blocked.

**Evidência estática observada:** 20 arquivos no escopo; 0 referências a localStorage; 0 a sessionStorage; 0 referências mock; 28 referências de rede/Supabase; 1 marcadores de implementação pendente.

**Páginas:** `meu-perfil.html`, `perfil.html`, `perfil-cliente.html`, `perfil-profissional.html`, `tornar-profissional.html`, `verificacao-profissional.html`, `admin-verificacao.html`.

**Tabelas/autoridades de dados:** `client_profiles`, `professional_profiles`, `professional_identity_verifications`, `verification_events`.

**Edge Functions:** `professional-verification-operations`.

**Evidências:**
- Professional profile setup, active edits, KYC records, drafts and binary evidence are server-authoritative for Supabase sessions.
- Browser-persistent professional profile, KYC record, KYC draft and IndexedDB evidence authorities are retired; non-UUID fixtures are memory-only.
- KYC RPCs are not executable by anon; applicant and reviewer operations pass through authenticated server boundaries.
- Professional KYC draft, signed-intent upload, submission, review, rejection, reopening and approval are operational in staging.
- Binary evidence uses database-generated locked upload intents, signed upload tokens and one-time server-side consumption.
- Reviewer operations require an independently authenticated admin/moderator Edge Function context.
- Role promotion is atomic, idempotent and synchronized through public.users to app_metadata.
- Client operational metrics and public reputation remain separated into private and aggregate-only authorities.

**Bloqueadores:**
- **PROF-B04 · HIGH · external_policy:** Final KYC rules, document retention and legal verification provider are not approved. _(Fase 2)_
- **PROF-B05 · HIGH · storage_policy:** Legacy owner-prefix Storage write policies remain because storage.objects is owned by the managed supabase_storage_admin role; the new signed-intent submission flow no longer trusts them. _(Fase 1)_

**Próximas ações:**
- Remove legacy owner-prefix KYC Storage policies through the managed Storage policy authority and add upload cleanup/retention.
- Define final KYC policy, document retention, rejection, appeal and legal verification provider rules.
- Keep PROF-A02, PROF-A03, PROF-A04 and PROF-B03 retirement gates cumulative while resolving external blockers.

**Gate de saída:**
- A professional can complete, submit, be reviewed and receive a decision across devices.
- Documents are private and access-audited.
- Role promotion is server-authoritative and idempotent.
- Rejected applications can be corrected and resubmitted safely.

### CAT-001 — Catálogo, publicação e moderação de serviços

**Objetivo:** Make service creation, versioning, moderation, publication and edits server-authoritative.

**Estado:** maturidade 4/6; UI remote; servidor canonical; staging staging operational; segurança partial; produção blocked.

**Evidência estática observada:** 17 arquivos no escopo; 2 referências a localStorage; 4 a sessionStorage; 0 referências mock; 24 referências de rede/Supabase; 0 marcadores de implementação pendente.

**Páginas:** `anunciar-servico.html`, `detalhe-anuncio.html`, `admin-anuncio-revisao.html`, `index.html`, `resultados.html`.

**Tabelas/autoridades de dados:** `services`, `service_versions`, `service_media`, `service_categories`, `service_moderation_events`, `service_quote_templates`, `service_quote_questions`.

**Edge Functions:** `quote-template-ai`, `service-moderation-operations`, `self-service-operations`.

**Evidências:**
- Supabase service repository, version moderation and admin review exist.
- AI template generation is isolated behind an Edge Function.
- service_categories is RLS-protected and public reads expose active rows only.
- service-media listing policy is closed and owner storage mutations are identity-scoped.
- Admin/moderator review actions execute through a JWT-protected Edge Function; direct privileged RPCs are no longer browser-callable.
- Template writes require canonical professional role and ownership of the linked service; staging has zero ownership mismatches.
- CAT-A01 preserves the historical authority baseline and remains a cumulative regression gate.
- CAT-A02 retires doke.services.local.v1: real and UUID subjects fail closed, while non-UUID fixtures remain runtime-only memory.
- CAT-A03 routes approved-content edits through versioned review, routes pause/reactivate/archive through an owner-only self-service operation, and revokes generic browser writes to services.
- CAT-A03 code candidate routes owner content edits through versioned review and pause, reactivate and archive through an explicit owner-only server operation; staging application remains pending.
- CAT-A03 complete in staging: migration 20260727195302, self-service-operations v7, SQL 018, Quality #992, blocking E2E, 105 guards, Canary #714 and Diagnostic #736 succeeded.
- CAT-A04 complete: immutable signed uploads and reference-safe cleanup validated on 09e77e5236d2bc0c820d73768f0161f326adeefe.
- CAT-B04 complete: approved service versions and historical order snapshots are immutable on 09e77e5236d2bc0c820d73768f0161f326adeefe.
- CAT-A05 complete: Quality #1237, blocking E2E, 105 guards, Canary #806 and Diagnostic #901 converged on one stable head.

**Bloqueadores:**
- Nenhum.

**Próximas ações:**
- Proceed with SEARCH-001 as the next mandatory engineering domain.
- Keep all CAT-001 authority and lifecycle audits cumulative in Quality.
- Keep production blocked until the global security and launch gates are satisfied.

**Gate de saída:**
- Create, submit, moderate, publish, edit, pause and archive work remotely.
- Public catalog shows only approved eligible versions.
- Media upload validation and deletion are server-enforced.
- Order snapshots are immutable.

### SEARCH-001 — Busca, descoberta, favoritos e ranking

**Objetivo:** Return eligible services with scalable server-side filtering, ranking and pagination while keeping non-service discovery modes explicitly separate.

**Estado:** maturidade 4/6; UI hybrid; servidor canonical; staging staging operational; segurança partial; produção blocked.

**Evidência estática observada:** 214 arquivos no escopo; 0 referências a localStorage; 0 a sessionStorage; 3 referências mock; 19 referências de rede/Supabase; 9 marcadores de implementação pendente.

**Páginas:** `index.html`, `resultados.html`, `detalhe-anuncio.html`.

**Tabelas/autoridades de dados:** `services`, `service_categories`, `favorites`, `service_metric_events`.

**Edge Functions:** `search-public-services-v2`.

**Evidências:**
- SEARCH-A01 through SEARCH-A03 established authority boundaries and canonical identity-scoped favorites across discovery surfaces.
- SEARCH-A04 and SEARCH-A05 installed and activated bounded server-side service filtering, approved-snapshot eligibility, opaque pagination and fail-closed result rendering.
- SEARCH-A06 through SEARCH-A08 installed immutable ranking versions, bounded anti-manipulation signals, search-rank-v0 rollback and a version-bound public RPC v2 without exposing score internals.
- SEARCH-A09 installed privacy-preserving server-authoritative latency, error, cursor, zero-result and ranking-version observability through the JWT-protected search-public-services-v2 Edge proxy.
- SEARCH-A10 activated Edge v2 in the staging browser under search-rank-v0, proved no automatic fallback, proved deliberate RPC v1 rollback and prohibited direct browser catalog reads.
- General deterministic and visual E2E now disables remote services by default; only the dedicated SEARCH-A10 lane opts into live staging search.
- SEARCH-A11 reconciled SEARCH-B03: behavioral and conversion counters remain excluded from ranking and future hardened instrumentation is owned by ANA-001.
- Ranking v1 remains installed but inactive; paid boosts, contacts, messages, views, CTR and raw conversion counters remain excluded from active ranking authority.
- SEARCH-001 is staging-operational at maturity 4 with canonical server authority for the closed service-search scope, partial security and blocked production.
- Production remains blocked and no account, service, favorite, real metric, SMS, OAuth, paid integration or production configuration was changed.

**Bloqueadores:**
- Nenhum.

**Próximas ações:**
- Proceed with ORD-001 as the next mandatory engineering domain.
- Keep search-rank-v0 active; ranking v1 remains installed and inactive until a separately authorized activation sublot.
- Govern future server-authoritative impression, click and conversion instrumentation under ANA-001; browser-manipulable counters cannot enter ranking.
- Keep users, workers, publications, suggestions and browser-local search history explicitly governed by separate controlled sublots.
- Keep production blocked until the global security, analytics and launch gates are satisfied.

**Gate de saída:**
- Search is server-paginated and bounded.
- Filters and location produce deterministic eligible results.
- Favorites persist per identity.
- Ranking has documented signals, monitoring and rollback.
- General E2E does not pollute live staging search observability.

### ORD-001 — Orçamentos, propostas e ciclo de pedidos

**Objetivo:** Operate the complete order state machine with one server authority and reliable event delivery.

**Estado:** maturidade 4/6; UI hybrid; servidor canonical; staging staging operational; segurança partial; produção blocked.

**Evidência estática observada:** 24 arquivos no escopo; 11 referências a localStorage; 0 a sessionStorage; 71 referências mock; 22 referências de rede/Supabase; 2 marcadores de implementação pendente.

**Páginas:** `orcamento.html`, `pedidos.html`, `mensagens.html`, `pagamento-profissional.html`, `admin-pedidos-operacao.html`.

**Tabelas/autoridades de dados:** `orders`, `budgets`, `order_status_history`, `private.order_domain_events`, `private.order_event_delivery_attempts`, `private.order_event_worker_invocation_nonces`.

**Edge Functions:** `order-event-worker`, `order-event-operations`.
**Crons:** `doke-order-event-worker`, `doke-order-operational-alerts`, `doke-order-incident-escalation`, `doke-order-change-protection`.

**Evidências:**
- Canonical state machine, transaction events, outbox worker and operational controls are active in staging.
- Backend real local and staging E2E reports cover order writes.
- ORD-A03 revoked authenticated direct DML on orders and budgets, made submitted creation and quote submission RPC-authoritative, preserved expected-state concurrency and proved zero-residue rollback canaries.
- Browser drafts and mock fixtures remain explicit local-only paths; submitted write failures no longer become silent local success.
- Relationship-derived capability allows a professional account to act as the client when hiring another professional.
- ORD-A04 makes participant-scoped Supabase reads canonical outside local development and removes silent read fallback to submitted browser snapshots.
- The historical order-service.js is now a compatibility-only facade; orders-service.js is the single frontend business authority.
- Latest participant-visible budgets are projected with remote orders so proposal state remains consistent across devices.
- ORD-A05 proved request, accept and quote across isolated client/professional personas in a rolled-back staging transaction, with third-party denial, optimistic conflict and zero residue.
- The frontend write canary now requires the canonical bearer token before fetch and preserves idempotency for create, accept and quote actions.
- The real two-account browser and UI settlement canary remains pending, so user-facing authority stays hybrid and ORD-B02 remains open.
- ORD-A06 preflight found that command-canary activation and canonical order reads shared one provider field, preventing reliable read-after-write UI settlement.
- The frontend now preserves supabase-read as the independent order read provider while api-write-canary-frontend-activation is used only for authenticated commands.
- A deterministic two-context runtime proves requested, accepted and quoted states converge without shared storage or silent local fallback.
- The real two-account Playwright canary remains blocked until two explicitly authorized accounts and a runId-scoped cleanup boundary are available.
- ORD-A06 now has a service-role-only cleanup boundary that requires matching runId metadata and external_id markers and refuses ambiguous or partial scope.
- The cleanup boundary aborts on messaging, payment, wallet, review, quote-funnel or manual operator dependencies instead of broadening deletion authority.
- A rolled-back staging canary proved authenticated denial, explicit JWT role precedence, requested-to-quoted cleanup, control-order survival, idempotent re-execution and zero residue.
- ORD-A06 now has a fail-closed Playwright executor with no default credentials, URLs or service reference and with an exact authorization acknowledgement.
- The executor isolates client and professional browser contexts, logs in through the real UI, preserves supabase-read, scopes all commands to one runId and probes one-success/one-conflict optimistic concurrency.
- The executor captures requested, accepted and quoted UI evidence, submits a BRL 123.45 quote and invokes the service-role cleanup outside the browser twice to prove cleaned then already_clean.
- CI runs only the static audit and dry-run; no account, browser network request or staging mutation was used to close this technical preparation step.
- A read-only staging inspection found one compatible distinct client/professional pair and one eligible published service owned by the professional candidate.
- The readiness evidence stores only aggregate capacity and boolean eligibility; no e-mail, UUID, username, display name, service reference, credential or token is committed.
- Technical capacity is explicitly separated from operational authorization: existing users and services remain unusable until each resource is authorized and secrets are injected outside the repository.
- The readiness CI gate is static-only and preserves the fail-closed Playwright executor, cleanup boundary and deterministic cross-session settlement without browser or staging mutation.
- A short-lived authorization envelope contract now binds one runId to the authorized client, professional, service and staging targets using SHA-256 without committing raw identifiers.
- The authorization file must remain outside the repository, match an operator-supplied digest, expire within two hours, prohibit production, limit execution to one order and require cleanup.
- The authorization envelope preparer is inert by default: dry-run performs no reads of credentials, check-env writes nothing, and write requires a separate explicit decision plus a dedicated flag.
- The Playwright executor now rejects check-env and execute unless the envelope digest, lifetime, resource bindings and target bindings all validate.
- ORD-A07 adds a five-minute request freshness window and thirty-second future clock skew limit to every order mutation before idempotency claim.
- The orders frontend emits per-request issued-at and nonce headers, while the staging Node runtime exposes only those explicit headers through CORS.
- Existing persistent idempotency entries now enforce expires_at when read, preventing expired keys from being replayed or reused.
- No browser shared secret or false request-signature claim was introduced; JWT, route authorization, RLS and idempotency remain independent controls.
- ORD-A08 found no canonical external deployment provider and deliberately avoided inventing one.
- The staging Node runtime now exposes a platform-neutral release identity, SHA-256 fingerprint, rollback readiness and ORD-A07 capability through a no-store health contract.
- The release preflight is read-only and limited to GET /health plus OPTIONS /orders; CI runs only local tests, static audit and dry-run.
- Production-like environments and targets are rejected independently by runtime startup and preflight target validation.
- ORD-A09A evaluated Railway, Fly.io, Render and Vercel and recommends Railway only for initial external staging; no provider selection, account, billing, secret or deployment was authorized.
- ORD-A09B0 installs a provider-neutral adapter contract that validates exact selection input but never materializes commands or permits status, deploy or rollback before a provider-specific adapter and separate deployment authorization exist.
- ORD-A09B0 provider selection handoff separates the exact Railway staging selection phrase from account, billing, secrets, infrastructure, deployment, rollback, visual canary and production authorizations; generic continuation remains non-authorizing.
- ORD-A09B0 now includes a fail-closed selection intent firewall: generic continuation, paraphrases, case changes, punctuation changes, non-Railway providers and production targets are rejected; the exact phrase can authorize only an in-memory non-secret adapter-preparation evaluation and never persists selection or authorizes billing, infrastructure or deployment.
- ORD-A09B0 now includes a provider-neutral fail-closed conformance suite that rejects missing adapter methods, production capability, network enabled by default, executable commands, embedded secret values and any dry-run reporting network, mutation, command execution, deployment, rollback or production change; provider selection remains unbound.
- ORD-A07B defines a fail-closed five-minute worker invocation freshness contract with thirty-second future skew, URL-safe nonce validation and mandatory atomic nonce consumption before a worker run may begin; activation remains deliberately pending until an official Supabase CLI migration creates the private nonce ledger and service-role-only consume RPC.
- ORD-A07B readiness pins the canonical nonce-ledger migration by SHA-256 and rejects renamed, regenerated or edited variants.
- Generic continuation commands do not authorize staging SQL; only the exact migration authorization phrase can unlock a later application path.
- The readiness planner exposes dry-run and check-env only, has no execute mode, performs zero network requests and preserves production, Cron and Edge Function blocks.
- Rollback is forward-only through a separately reviewed migration; manual migration-history deletion is prohibited.
- ORD-A07C defines canonical issued-at, nonce and source headers for internal order-event worker calls without carrying the worker token in the runtime-neutral builder.
- The Cron patch generates a 13-digit millisecond timestamp and a 32-character base64url nonce from 24 cryptographically random bytes while preserving Vault-backed URL and token boundaries.
- Postgres 17 validation captures two stubbed Cron invocations, proves distinct nonces and preserves source, payload, URL, token and timeout behavior.
- The repository migration does not create secrets, reschedule Cron, hardcode a project URL or activate the Edge Function.
- ORD-A07C remains inactive until the ORD-A07B nonce ledger is applied and separate Cron and Edge Function release gates are authorized.
- ORD-A07D wires token verification, freshness validation and atomic nonce consumption before begin_order_event_worker_run in the repository Edge Function.
- Missing or invalid freshness fails with HTTP 428, unavailable ledger fails with HTTP 428, and replay fails with HTTP 409 before any worker run or event claim.
- The nonce is excluded from worker-run metadata and logs; only issued-at and calculated age are retained for diagnosis.
- Repository wiring is complete while staging migrations, Cron changes, Edge Function deploy and production remain unauthorized.
- ORD-A07E executes 32 concurrent local invocations with the same nonce and proves exactly one acceptance, 31 HTTP 409 replay rejections, one worker run and one event-claim path.
- The ORD-A07E runner is local-only and rejects staging, remote, production, execute and deploy modes while performing zero network requests and zero mutations.
- The local canary preserves ORD-A07B, ORD-A07C and ORD-A07D contracts but does not authorize or replace the remote staging replay canary.
- ORD-A07B was explicitly authorized and applied to Doke staging as migration ord_a07b_worker_invocation_nonce_ledger; Supabase recorded execution version 20260730184101 without manual migration-history edits.
- The staging nonce ledger, SECURITY INVOKER consume RPC, RLS, primary key, expiry constraint, expiry index and least-privilege grants were verified; anon and authenticated remain denied while service_role is authorized.
- Staging atomicity verification accepted the first nonce use and rejected duplicate, expired and excessively future uses; all order-domain counts remained zero.
- One source=test verification row remains because two narrowly scoped deletion attempts were blocked by tool safety; Cron headers, Edge Function deploy, A07C, Railway and production remain unchanged.
- ORD-A07C readiness locks the canonical Cron header migration by SHA-256 and permits only dry-run or environment recognition; the planner has no execute, network, database or deploy capability.
- A07C is constrained to replacing private.invoke_order_event_worker_if_needed while preserving Vault secret names, endpoint, source, limit 25, timeout 30000 and stale-claim recovery; schedule mutation and secret creation are forbidden.
- ORD-A07C was explicitly authorized and applied to Doke staging as ord_a07c_worker_invocation_headers; Supabase recorded execution version 20260730204044 without manual migration-history edits.
- The staging Cron invocation function now emits issued-at and nonce headers while preserving its * * * * * schedule, canonical command, Vault secret names, endpoint, source, limit 25, timeout 30000 and A07B ledger authority.
- The private Cron entrypoint remains SECURITY DEFINER owned and executable only by postgres; public, anon, authenticated and service_role remain denied, and all order-domain counts stayed zero.
- ORD-A07D staging deploy readiness freezes the complete six-file order-event-worker bundle, including deno.json and the pinned Supabase JS import map.
- The deploy gate has no deploy capability, requires an exact independent authorization phrase, and keeps remote canary, production, Railway and merge blocked.
- The explicitly authorized frozen order-event-worker bundle was deployed to Doke staging as active version 10, advancing from version 9 while preserving verify_jwt=false and the pinned Supabase client import map.
- Remote runtime probes confirmed invalid token rejection with HTTP 401 WORKER_AUTH_REQUIRED and valid-token missing-freshness rejection with HTTP 428 DOKE_ORDER_EVENT_WORKER_FRESHNESS_REQUIRED without disclosing the Vault token.
- The deployment and two pg_net verification probes left Cron schedule and command unchanged, did not create orders, budgets, history, domain events, metric events or delivery attempts, and did not increase worker-run or nonce-ledger counts.
- ORD-A07E remote replay readiness freezes 32 concurrent staging requests sharing one issued-at and nonce, with exactly one HTTP 200 acceptance and 31 HTTP 409 replay rejections expected.
- The cleanup contract deletes only the accepted empty test worker run by returned runId and only the SHA-256 hash of the canary nonce, while preserving the preexisting test nonce row.
- Read-only staging inspection confirmed service_role can delete the nonce row but cannot delete worker runs, so future run cleanup requires narrowly conditioned privileged SQL.
- The readiness planner supports only dry-run and check-env, contains no network, SQL, deploy or cleanup execution capability, and rejects generic continuation.
- The authorized ORD-A07E staging canary dispatched 32 concurrent requests sharing one issued-at and nonce; exactly one returned HTTP 200 and all other 31 returned HTTP 409 DOKE_ORDER_EVENT_WORKER_REPLAY_REJECTED.
- The sole accepted invocation created one empty completed test worker run with zero claimed, completed, failed and dead-letter events; the run was deleted through a narrowly conditioned privileged cleanup.
- The canonical nonce consumer evicted the expired preexisting test nonce before inserting the canary nonce, so the canary nonce was retained to preserve the one-row ledger baseline instead of deleting it and creating count drift.
- Post-cleanup staging returned to one historical worker run, zero test worker runs, one test nonce row and zero orders, budgets, history, domain events, metric events or delivery attempts.
- The remote replay canary required no Edge Function deploy, migration or Cron change; Railway, production and merge remain blocked.
- ORD-A10 reconciles the remaining blockers without claiming false domain closure: ORD-B02 and ORD-B05 remain externally authorized ORD work, while ORD-B03 and ORD-B04 are handed to PAY-001 and SCHED-001 respectively.
- Obsolete A07B/A07C next actions and stale future-state evidence were removed after the successful staging ledger, Cron header, Edge Function and remote replay sequence.
- The remaining ORD-001 queue is reduced to four fail-closed actions; generic continuation authorizes no live visual canary, provider selection, billing, infrastructure, deployment, production change or merge.
- ORD-A10 is repository-only and performed zero network requests, zero staging mutations, zero provider actions and zero production changes.
- ORD-A11 transfers canonical availability, hold, reservation, conflict, reschedule, cancellation and timezone authority to SCHED-001 while ORD-001 retains only order lifecycle and a canonical reservation reference/projection.
- Repository migrations 113 and 119 enable availability_slots RLS and separate anonymous from authenticated reads, correcting the stale claim that the repository leaves availability RLS disabled; SCHED-specific staging verification is still pending.
- Order creation still accepts raw scheduled_at and browser projections still carry desired-date, shift and service availability snapshot data, so ORD-B04 remains open until the server scheduling module and reservation reference are implemented.
- ORD-A11 is repository-only and performed zero network requests, staging mutations, migrations, deployments, production changes or merge.

**Bloqueadores:**
- **ORD-B02 · HIGH · frontend_activation:** Canonical reads, canary commands, cleanup, deterministic settlement, readiness discovery and the fail-closed Playwright executor pass. A short-lived authorization envelope is mandatory; ORD-B02 remains under ORD-001 until explicit resource authorization is issued, check-env passes, the real two-context visual canary is executed and run-scoped cleanup proves zero residue. _(Fase 6)_
- **ORD-B03 · HIGH · financial_dependency:** Financial completion remains blocked by PAY-001. Payment authority is not connected to a real PSP webhook lifecycle, and ORD-001 must consume rather than duplicate that server-canonical authority before this blocker can close. _(Fase 8)_
- **ORD-B04 · MEDIUM · scheduling_dependency:** ORD-B04 is formally handed to SCHED-001 but remains open. Availability, holds, confirmed reservations, conflict protection, timezone, rescheduling and cancellation must become server-canonical there; ORD-001 must consume one canonical reservation reference instead of treating raw scheduled_at as booking authority. _(Fase 6)_
- **ORD-B05 · HIGH · staging_release:** ORD-A08 release identity, ORD-A09A provider evaluation, the ORD-A09B0 provider-neutral adapter boundary, provider selection handoff, selection intent firewall and adapter conformance suite are complete. Railway is recommended as the external staging release provider, but no explicit provider selection, provider-specific adapter, account, billing, secrets, infrastructure, rollback command or deployment exists. ORD-B05 remains open until exactly I_EXPLICITLY_SELECT_RAILWAY_FOR_DOKE_STAGING authorizes only non-secret adapter preparation; every external action remains separately blocked. _(Fase 6)_

**Próximas ações:**
- Execute the SCHED-001 repository baseline and read-only staging security preflight defined by ORD-A11; generic continuation must not apply migrations or mutate staging.
- Handoff ORD-B03 to PAY-001 and keep financial completion blocked until a real PSP webhook lifecycle is authoritative.
- Await explicit resource authorization before executing the ORD-B02 real two-context visual canary; generic continuation remains non-authorizing.
- Await exactly I_EXPLICITLY_SELECT_RAILWAY_FOR_DOKE_STAGING before preparing only the non-secret provider adapter for ORD-B05; account, billing, infrastructure and deployment remain separately blocked.

**Gate de saída:**
- Two real accounts complete request, accept, proposal, approval, start and completion across devices.
- Repeated actions are idempotent.
- All state changes emit durable events.
- Mock order authority is removed from production paths.

### SCHED-001 — Agenda, disponibilidade e execução do serviço

**Objetivo:** Prevent double booking and make availability, confirmation and rescheduling server-authoritative.

**Estado:** maturidade 1/6; UI local; servidor none; staging static contract; segurança blocked; produção blocked.

**Evidência estática observada:** 15 arquivos no escopo; 2 referências a localStorage; 0 a sessionStorage; 13 referências mock; 7 referências de rede/Supabase; 0 marcadores de implementação pendente.

**Páginas:** `anunciar-servico.html`, `pedidos.html`, `orcamento.html`.

**Tabelas/autoridades de dados:** `availability_slots`, `orders`.

**Evidências:**
- Availability schema exists, but no implemented scheduling backend module exists.
- Repository migrations 113 and 119 enable availability_slots RLS, define owner write policies and separate anonymous available-slot reads from authenticated owner/operator visibility.
- No SCHED-specific staging preflight currently records the deployed availability schema, policies and grants, so security verification remains open.
- The scheduling backend module remains unimplemented, no canonical hold or reservation lifecycle exists and no database-level active-range anti-double-booking rule is proven.
- ORD-A11 defines SCHED-001 as the sole canonical time authority and prohibits ORD-001 from retaining parallel scheduling or raw scheduled_at booking authority.

**Bloqueadores:**
- **SCHED-B01 · HIGH · staging_security_verification:** Repository migrations enable and role-separate availability_slots RLS, but SCHED-specific read-only staging verification of schema, policies and grants is not yet recorded. _(Fase 1)_
- **SCHED-B02 · CRITICAL · server_authority:** No canonical scheduling service handles availability rules, holds, confirmed reservations, expiration, rescheduling, cancellation or timezone rules. _(Fase 6)_
- **SCHED-B03 · HIGH · concurrency:** No database-level exclusion or equivalent active-range contract proves that concurrent holds or bookings for one professional cannot overlap. _(Fase 6)_
- **SCHED-B04 · HIGH · order_integration:** Orders accept raw scheduled_at and do not reference a canonical schedule reservation, so accepted proposals are not transactionally bound to authoritative occupancy. _(Fase 6)_

**Próximas ações:**
- Run a read-only SCHED-001 staging preflight for availability_slots RLS, policies, grants and schema drift; do not mutate staging.
- Freeze the canonical availability-rule and schedule-reservation command, event, timezone and conflict contracts in SCHED-001.
- Generate but do not apply a reviewed SCHED-001 migration with active-range anti-double-booking enforcement and deterministic tests.
- Implement the server scheduling module and make ORD-001 consume a canonical reservation reference instead of treating raw scheduled_at as booking authority.

**Gate de saída:**
- Concurrent booking attempts cannot reserve the same slot.
- Reschedule/cancel rules are audited.
- Agenda reflects remote state across devices.
- Timezone and daylight rules are documented and tested.

### MSG-001 — Mensagens, conversas, presença e anexos

**Objetivo:** Provide durable multi-device conversations tied to orders with authorized attachments and realtime delivery.

**Estado:** maturidade 3/6; UI hybrid; servidor partial; staging staging canary; segurança partial; produção blocked.

**Evidência estática observada:** 7 arquivos no escopo; 9 referências a localStorage; 0 a sessionStorage; 5 referências mock; 49 referências de rede/Supabase; 3 marcadores de implementação pendente.

**Páginas:** `mensagens.html`, `pedidos.html`, `comunidade-interna.html`.

**Tabelas/autoridades de dados:** `conversations`, `messages`, `message_attachments`.

**Evidências:**
- Backend handlers and staging multi-domain messaging flow exist.
- Messages repository uses remote tables but retains localStorage and mock fallbacks.
- Only notifications is currently published to Supabase Realtime.
- message_attachments now has participant/sender RLS and least-privilege grants; anon access and cross-participant deletion are denied.
- Conversation and message participant policies passed regression canaries after initplan optimization.

**Bloqueadores:**
- **MSG-B02 · CRITICAL · realtime:** messages and conversations are not in the realtime publication. _(Fase 7)_
- **MSG-B03 · HIGH · authority_split:** Local conversation/message fallback can diverge across devices. _(Fase 7)_
- **MSG-B04 · HIGH · storage:** Transaction attachment bucket policies are not mapped in the current staging snapshot. _(Fase 1)_

**Próximas ações:**
- Map and secure the transaction attachment object bucket.
- Enable scoped realtime for conversation participants.
- Remove production localStorage authority and add offline/retry semantics.

**Gate de saída:**
- Two devices exchange messages without refresh.
- Unauthorized users cannot list conversations or attachment URLs.
- Read state is durable.
- Retries do not duplicate messages or typed transaction cards.

### NTF-001 — Notificações, e-mail e push

**Objetivo:** Deliver idempotent, prioritized notifications with reliable deep links across channels.

**Estado:** maturidade 3/6; UI hybrid; servidor partial; staging staging canary; segurança blocked; produção blocked.

**Evidência estática observada:** 6 arquivos no escopo; 22 referências a localStorage; 0 a sessionStorage; 7 referências mock; 12 referências de rede/Supabase; 2 marcadores de implementação pendente.

**Páginas:** `notificacoes.html`.

**Tabelas/autoridades de dados:** `notifications`.

**Evidências:**
- notifications is the only current Supabase Realtime publication table.
- Backend and repository contracts exist; localStorage fallback remains.

**Bloqueadores:**
- **NTF-B01 · CRITICAL · rpc_grants:** create_transaction_notification and update_own_notification_state are executable by anon/authenticated. _(Fase 1)_
- **NTF-B02 · HIGH · channel_delivery:** Push and transactional e-mail providers are not production-integrated. _(Fase 7)_
- **NTF-B03 · MEDIUM · authority_split:** Local and remote notification stores can diverge. _(Fase 7)_

**Próximas ações:**
- Harden notification RPCs.
- Make remote notification state canonical.
- Add push/e-mail routing, preferences, retry and delivery receipts.

**Gate de saída:**
- In-app notifications update in realtime.
- Every event key is deduplicated.
- Push/e-mail respect user preferences and quiet hours.
- Deep links resolve to authorized destinations.

### PAY-001 — Pagamentos, cobrança, escrow e webhooks

**Objetivo:** Use a real payment service provider as the authority for charges, refunds and webhook-confirmed state.

**Estado:** maturidade 2/6; UI local; servidor contract only; staging local e2e; segurança blocked; produção blocked.

**Evidência estática observada:** 6 arquivos no escopo; 1 referências a localStorage; 0 a sessionStorage; 2 referências mock; 42 referências de rede/Supabase; 2 marcadores de implementação pendente.

**Páginas:** `pagamento-profissional.html`, `mensagens.html`, `pedidos.html`.

**Tabelas/autoridades de dados:** `payments`, `transactions`, `receipts`, `wallet_receivables`.

**Edge Functions:** `financial-operations`.

**Evidências:**
- Financial contracts, ledger-like tables and local beta-launch E2E exist.
- No real PSP, signed webhook, reconciliation job or production card tokenization is connected.
- Browser sessions can no longer create payment rows, receivables or escrow releases through legacy RPCs; remote payment materialization now fails closed until signed PSP authority exists.
- Payment, transaction, receipt and receivable tables are authenticated read-only projections with participant RLS and no anon grants.

**Bloqueadores:**
- **PAY-B01 · CRITICAL · external_provider:** No PSP integration or signed webhook authority exists. _(Fase 8)_
- **PAY-B03 · CRITICAL · legal_compliance:** Commercial, tax, escrow and refund rules are not legally approved. _(Fase 2)_
- **PAY-B04 · HIGH · reconciliation:** No provider reconciliation or mismatch queue is operational. _(Fase 8)_

**Próximas ações:**
- Select PSP after legal/accounting review.
- Design signed webhook ingestion using the locked server-side idempotency store.
- Make verified provider events the only payment, receivable and escrow authority.
- Build reconciliation, refund and failure recovery.

**Gate de saída:**
- No card data is stored by Doke.
- Repeated webhooks do not duplicate ledger effects.
- Provider and Doke states reconcile automatically.
- Refunds and payment failures are E2E tested.

### WAL-001 — Carteira, recebíveis, saldo e saques

**Objetivo:** Maintain a reconciled professional balance and safe withdrawal lifecycle.

**Estado:** maturidade 3/6; UI hybrid; servidor partial; staging staging canary; segurança blocked; produção blocked.

**Evidência estática observada:** 6 arquivos no escopo; 11 referências a localStorage; 0 a sessionStorage; 6 referências mock; 58 referências de rede/Supabase; 4 marcadores de implementação pendente.

**Páginas:** `carteira.html`, `admin.html`.

**Tabelas/autoridades de dados:** `wallets`, `wallet_bank_accounts`, `wallet_receivables`, `transactions`, `withdrawals`, `receipts`.

**Edge Functions:** `financial-operations`.

**Evidências:**
- Backend routes and staging multi-domain wallet flows exist.
- Frontend wallet repository remains localStorage-heavy and real settlement is absent.
- Bank account and withdrawal writes are controlled by role-validated RPCs; support/admin decisions use a JWT-protected Edge Function and service-role-only internal RPCs.
- Withdrawal creation is atomic and idempotent, direct table DML is denied, and remote canaries proved balance reservation and canonical operator validation.

**Bloqueadores:**
- **WAL-B02 · CRITICAL · payment_dependency:** Balances cannot be production-authoritative before PSP and reconciliation are complete. _(Fase 8)_
- **WAL-B03 · HIGH · sensitive_data:** Bank account data needs encryption, masking, retention and support-access policy. _(Fase 1)_
- **WAL-B04 · HIGH · authority_split:** Local wallet projection and remote finance repository coexist. _(Fase 8)_

**Próximas ações:**
- Encrypt or tokenize bank-account fields and define masking, retention and operator-access policy.
- Connect webhook-confirmed ledger entries.
- Implement withdrawal provider transfer and reconciliation.
- Remove local wallet authority from production.

**Gate de saída:**
- Balance is derived from immutable ledger entries.
- Withdrawals are idempotent and auditable.
- Bank details are protected and masked.
- Provider settlement and internal totals reconcile.

### DSP-001 — Cancelamentos, reembolsos, disputas e chargebacks

**Objetivo:** Resolve transaction failures and conflicts through explicit policies and audited state machines.

**Estado:** maturidade 2/6; UI hybrid; servidor partial; staging staging canary; segurança blocked; produção blocked.

**Evidência estática observada:** 5 arquivos no escopo; 10 referências a localStorage; 0 a sessionStorage; 4 referências mock; 38 referências de rede/Supabase; 4 marcadores de implementação pendente.

**Páginas:** `pedidos.html`, `mensagens.html`, `carteira.html`, `admin.html`.

**Tabelas/autoridades de dados:** `payment_disputes`, `dispute_events`, `payments`, `transactions`, `receipts`.

**Edge Functions:** `financial-operations`.

**Evidências:**
- Open/respond/release/refund contracts and audit routes exist.
- Real chargeback/provider dispute integration is absent.
- Client dispute opening and professional response remain authenticated self-service operations with linked-order validation.
- Refund/release decisions are service-role-only behind financial-operations, revalidate an active support/admin actor and write audit events; positive and negative staging canaries passed under rollback.

**Bloqueadores:**
- **DSP-B01 · CRITICAL · legal_policy:** Cancellation, refund, evidence and appeal policies are not approved. _(Fase 2)_
- **DSP-B03 · HIGH · provider_integration:** Chargebacks and provider dispute webhooks are not integrated. _(Fase 9)_
- **DSP-B04 · HIGH · support_workflow:** General case management, evidence deadlines and escalation queues are incomplete. _(Fase 13)_

**Próximas ações:**
- Approve cancellation, evidence, appeal and refund policy.
- Integrate provider chargebacks and evidence submission.
- Build the general operator queue, deadlines and appeal audit.
- Reconcile provider dispute states with Doke decisions.

**Gate de saída:**
- Every cancellation stage has deterministic financial effects.
- Participants see authorized evidence and deadlines.
- Support decisions are audited and reversible by policy.
- Provider chargeback states reconcile.

### REP-001 — Avaliações, reputação e recompra

**Objetivo:** Create trustworthy reputation from eligible completed orders and keep repeat hiring inside Doke.

**Estado:** maturidade 3/6; UI hybrid; servidor partial; staging staging canary; segurança partial; produção blocked.

**Evidência estática observada:** 4 arquivos no escopo; 4 referências a localStorage; 0 a sessionStorage; 2 referências mock; 7 referências de rede/Supabase; 0 marcadores de implementação pendente.

**Páginas:** `avaliacao-profissional.html`, `perfil.html`, `perfil-profissional.html`, `perfil-cliente.html`.

**Tabelas/autoridades de dados:** `reviews`, `orders`, `professional_profiles`.

**Evidências:**
- Review contracts and UI exist.
- Reviews repository is localStorage-first and reviews has RLS disabled.
- reviews now exposes published rows publicly and permits insertion only by the opposite participant of a completed order; self-review and open-order review canaries are denied.

**Bloqueadores:**
- **REP-B02 · CRITICAL · eligibility:** Remote one-review-per-completed-order constraint and moderation are not proven. _(Fase 10)_
- **REP-B03 · HIGH · reputation_model:** Canonical reputation, fraud resistance and dispute impact model are undefined. _(Fase 10)_
- **REP-B04 · MEDIUM · retention:** Rehire and loyalty economics are not implemented. _(Fase 10)_

**Próximas ações:**
- Prove one-review-per-order uniqueness and moderation lifecycle.
- Define canonical reputation aggregation, fraud resistance and dispute impact.
- Implement rehire flow before points/cashback.

**Gate de saída:**
- Only eligible participants review once per completed order.
- Moderation and appeals are auditable.
- Ratings are recalculated server-side.
- Repeat service flow remains linked to Doke transaction history.

### COM-001 — Comunidades, membros e moderação social

**Objetivo:** Move community membership, roles, posts, chat and sanctions from local browser authority to secure remote state.

**Estado:** maturidade 3/6; UI hybrid; servidor partial; staging staging canary; segurança partial; produção blocked.

**Evidência estática observada:** 7 arquivos no escopo; 56 referências a localStorage; 24 a sessionStorage; 4 referências mock; 6 referências de rede/Supabase; 0 marcadores de implementação pendente.

**Páginas:** `comunidade.html`, `comunidade-interna.html`.

**Tabelas/autoridades de dados:** `communities`, `community_members`, `community_posts`.

**Evidências:**
- Rich local community logic and local runtime domain contracts exist.
- Backend communities module is empty and all three core community tables have RLS disabled.
- Public/private discovery, membership, role management and posts now have server-side RLS with canonical owner membership and 18 rollback canaries.
- Members cannot self-assign moderator/owner, nonmembers cannot read or post in private communities, and owners cannot delete or downgrade the canonical owner row.

**Bloqueadores:**
- **COM-B02 · CRITICAL · server_authority:** Membership, roles, bans, invitations and posts are not server-canonical. _(Fase 11)_
- **COM-B03 · HIGH · realtime:** No community realtime publication or scalable channel policy is active. _(Fase 11)_
- **COM-B04 · HIGH · moderation:** Content reports, sanctions, appeals and media moderation are incomplete. _(Fase 12)_

**Próximas ações:**
- Implement server-canonical invitations, join requests, bans and appeals.
- Add scoped realtime and scalable channel policy.
- Complete content reports, sanctions and media moderation.

**Gate de saída:**
- Community state survives device changes and refreshes.
- Private communities are not enumerable.
- Role and ban actions are server-audited.
- Posts/messages support moderation, rate limits and appeals.

### CONTENT-001 — Workers, publicações, mídia e feed social

**Objetivo:** Provide remotely persisted, moderated and observable social content without weakening marketplace trust.

**Estado:** maturidade 2/6; UI local; servidor contract only; staging local e2e; segurança blocked; produção blocked.

**Evidência estática observada:** 6 arquivos no escopo; 0 referências a localStorage; 0 a sessionStorage; 4 referências mock; 0 referências de rede/Supabase; 0 marcadores de implementação pendente.

**Páginas:** `index.html`, `novidades.html`, `perfil.html`, `comunidade-interna.html`.

**Tabelas/autoridades de dados:** `community_posts`, `reports`.

**Evidências:**
- Publication/media/moderation contracts pass in local runtime.
- No canonical remote Workers/publications schema and service boundary is complete.

**Bloqueadores:**
- **CONTENT-B01 · CRITICAL · rls:** community_posts and reports have RLS disabled. _(Fase 1)_
- **CONTENT-B02 · HIGH · data_model:** Workers, before/after and generic publications lack a finalized remote model. _(Fase 12)_
- **CONTENT-B03 · HIGH · media_pipeline:** Video/image processing, limits, moderation and CDN lifecycle are incomplete. _(Fase 12)_

**Próximas ações:**
- Finalize content entity boundaries.
- Implement remote upload and moderation pipeline.
- Add feed pagination, abuse controls and deletion/retention policy.

**Gate de saída:**
- Content is remotely persisted and paginated.
- Uploads are validated and moderated.
- Delete, report and appeal flows are auditable.
- Feed ranking cannot bypass marketplace safety policies.

### ADM-001 — Administração, suporte e moderação

**Objetivo:** Let operators manage users, KYC, services, orders, payments, disputes and content without direct database edits.

**Estado:** maturidade 4/6; UI hybrid; servidor canonical; staging staging operational; segurança partial; produção blocked.

**Evidência estática observada:** 9 arquivos no escopo; 0 referências a localStorage; 0 a sessionStorage; 7 referências mock; 2 referências de rede/Supabase; 6 marcadores de implementação pendente.

**Páginas:** `admin.html`, `admin-verificacao.html`, `admin-anuncio-revisao.html`, `admin-pedidos-operacao.html`.

**Tabelas/autoridades de dados:** `admin_audit_events`, `audit_logs`, `reports`, `verification_events`, `service_moderation_events`.

**Edge Functions:** `order-event-operations`, `professional-verification-operations`, `financial-operations`, `service-moderation-operations`.

**Evidências:**
- Order operations, verification and service moderation admin surfaces exist.
- Generic support case management and unified audit authority are incomplete.
- audit_logs and reports now have operator RLS and least-privilege grants.
- Service moderation decisions moved behind service-moderation-operations with canonical admin/moderator validation and eight operator separation canaries.

**Bloqueadores:**
- **ADM-B03 · HIGH · backoffice_scope:** Users, payments, disputes, communities, content and support tickets are not unified in one operator workflow. _(Fase 13)_
- **ADM-B04 · HIGH · dual_control:** High-risk financial actions need dual approval and separation of duties. _(Fase 13)_

**Próximas ações:**
- Create unified case/audit model across users, payments, disputes, communities and content.
- Add dual-control for high-risk financial and identity actions.
- Implement support queues, notes, SLAs and appeals.

**Gate de saída:**
- Operators can resolve supported cases without SQL access.
- Every action records actor, reason, before/after and correlation ID.
- Sensitive actions require explicit approval rules.
- Support access is least-privilege and time-bounded.

### REL-001 — Observabilidade, incidentes, SLOs e proteção de mudanças

**Objetivo:** Detect, respond to and prevent order-domain degradation while governing risky changes.

**Estado:** maturidade 4/6; UI remote; servidor canonical; staging staging operational; segurança passed; produção candidate.

**Evidência estática observada:** 9 arquivos no escopo; 0 referências a localStorage; 0 a sessionStorage; 0 referências mock; 5 referências de rede/Supabase; 2 marcadores de implementação pendente.

**Páginas:** `admin-pedidos-operacao.html`.

**Tabelas/autoridades de dados:** `private.order_event_worker_runs`, `private.order_operational_alerts`, `private.order_operational_incident_cycles`, `private.order_operational_slo_reports`, `private.order_operational_changes`.

**Edge Functions:** `order-event-worker`, `order-event-operations`.
**Crons:** `doke-order-event-worker`, `doke-order-operational-alerts`, `doke-order-incident-escalation`, `doke-order-slo-daily-report`, `doke-order-change-protection`.

**Evidências:**
- Five operational crons are active.
- Order event operations Edge Function v8 is active with JWT.
- Private operational tables are not readable by anon/authenticated.
- Change decision ledger is immutable.

**Bloqueadores:**
- **REL-B01 · HIGH · scope:** Reliability controls cover orders deeply but not auth, messaging, payments, community and search to the same standard. _(Fase 14)_
- **REL-B02 · MEDIUM · deployment_integration:** CI/CD pipelines are not yet required to consume the change gate. _(Fase 14)_
- **REL-B03 · MEDIUM · telemetry:** Production-grade centralized logs, tracing and alert delivery providers are not connected. _(Fase 14)_

**Próximas ações:**
- Keep current order controls stable.
- Extend health/SLO patterns to critical domains after their server authority is complete.
- Integrate change gate into CI/CD and deployment metadata.

**Gate de saída:**
- Every critical domain has SLOs and actionable alerts.
- Deploys and migrations consume the gate automatically.
- Tracing links user request, event, worker and provider webhook.
- Restore and rollback drills are periodic.

### ANA-001 — Analytics, funil e economia do marketplace

**Objetivo:** Measure liquidity, conversion, retention, GMV and unit economics using trustworthy events.

**Estado:** maturidade 2/6; UI hybrid; servidor partial; staging local e2e; segurança partial; produção blocked.

**Evidência estática observada:** 4 arquivos no escopo; 0 referências a localStorage; 0 a sessionStorage; 0 referências mock; 7 referências de rede/Supabase; 0 marcadores de implementação pendente.

**Tabelas/autoridades de dados:** `service_metric_events`, `quote_template_application_events`, `quote_template_funnel_events`, `private.order_metric_events`.

**Evidências:**
- Service and quote-template metric events exist.
- No complete canonical funnel from acquisition through repeat transaction exists.

**Bloqueadores:**
- **ANA-B01 · HIGH · event_model:** Product event taxonomy, identity stitching and consent rules are incomplete. _(Fase 15)_
- **ANA-B02 · HIGH · business_metrics:** GMV, take rate, liquidity, retention, CAC and LTV are not consolidated. _(Fase 15)_
- **ANA-B03 · MEDIUM · data_quality:** No metric reconciliation or late-event policy is defined. _(Fase 15)_

**Próximas ações:**
- Define canonical marketplace event taxonomy.
- Build server-side funnel and marketplace health projections.
- Add data quality checks and privacy controls.

**Gate de saída:**
- Core funnel metrics reconcile with transactional tables.
- Liquidity and retention are segmented by region/category.
- Event duplication and identity changes are handled.
- Metrics have owners and alert thresholds.

### LEGAL-001 — Jurídico, privacidade, confiança e políticas comerciais

**Objetivo:** Translate approved commercial and legal rules into enforceable product contracts.

**Estado:** maturidade 1/6; UI local; servidor none; staging absent; segurança blocked; produção blocked.

**Evidência estática observada:** 221 arquivos no escopo; 64 referências a localStorage; 8 a sessionStorage; 269 referências mock; 8 referências de rede/Supabase; 25 marcadores de implementação pendente.

**Evidências:**
- The master plan identifies legal, privacy and commercial decisions as mandatory.
- No approved legal policy package is present as an executable product authority.

**Bloqueadores:**
- **LEGAL-B01 · CRITICAL · legal:** Terms, Privacy Policy, Community Policy and marketplace intermediary role are not approved. _(Fase 2)_
- **LEGAL-B02 · CRITICAL · financial_policy:** Fees, refunds, escrow, taxation, receipts and chargeback responsibility are undefined legally. _(Fase 2)_
- **LEGAL-B03 · HIGH · privacy:** Consent, export, deletion, retention and anonymization flows are incomplete. _(Fase 2)_
- **LEGAL-B04 · HIGH · trust_safety:** Restricted categories, minors, sanctions and appeals need approved policy. _(Fase 2)_

**Próximas ações:**
- Engage legal/accounting specialists.
- Approve commercial and trust policies before real money.
- Map LGPD data lifecycle and user rights into technical requirements.

**Gate de saída:**
- Approved policies exist for every critical code rule.
- LGPD rights are implemented and tested.
- Payment and dispute policies align with PSP and accounting.
- Content/category rules are enforceable and appealable.

### WEB-001 — Fechamento do web, acessibilidade e performance

**Objetivo:** Remove production mocks, stabilize all page states and meet browser quality gates.

**Estado:** maturidade 3/6; UI hybrid; servidor partial; staging local e2e; segurança partial; produção blocked.

**Evidência estática observada:** 851 arquivos no escopo; 231 referências a localStorage; 71 a sessionStorage; 240 referências mock; 265 referências de rede/Supabase; 9 marcadores de implementação pendente.

**Páginas:** `index.html`, `resultados.html`, `detalhe-anuncio.html`, `pedidos.html`, `mensagens.html`, `notificacoes.html`, `carteira.html`, `perfil.html`, `comunidade.html`.

**Evidências:**
- Extensive visual, lifecycle and responsive contracts exist.
- Global audit is still blocked by one pre-existing Home button contract failure.
- Runtime defaults remain mock/network-disabled.

**Bloqueadores:**
- **WEB-B01 · HIGH · runtime_cleanup:** Production paths still include mocks, localStorage fallbacks and provider query overrides. _(Fase 16)_
- **WEB-B02 · MEDIUM · governance:** Home Alterar CEP button violates canonical button contract. _(Fase 0)_
- **WEB-B03 · HIGH · quality:** Full real-data browser E2E and accessibility evidence is not consolidated for every core flow. _(Fase 16)_

**Próximas ações:**
- Complete domain authorities before removing fallbacks.
- Resolve known governance failure.
- Run real-data Playwright, accessibility, Lighthouse and browser compatibility gates.

**Gate de saída:**
- No production mock fallback exists in critical flows.
- All pages expose loading, empty, error, offline and retry states.
- Target viewports and accessibility gates pass.
- Performance budgets and browser support are documented.

### APP-001 — Aplicativos Android e iOS

**Objetivo:** Ship mobile apps using the same versioned backend authority as web.

**Estado:** maturidade 0/6; UI local; servidor none; staging absent; segurança blocked; produção blocked.

**Evidência estática observada:** 2295 arquivos no escopo; 504 referências a localStorage; 150 a sessionStorage; 880 referências mock; 583 referências de rede/Supabase; 89 marcadores de implementação pendente.

**Evidências:**
- The repository contains responsive web and mobile shell work, but no native/cross-platform app project.

**Bloqueadores:**
- **APP-B01 · HIGH · implementation:** No Android/iOS application codebase, signing pipeline or store configuration exists. _(Fase 17)_
- **APP-B02 · HIGH · backend_dependency:** Versioned production API and push/deep-link contracts must be stable first. _(Fase 17)_

**Próximas ações:**
- Select mobile architecture after core API stabilizes.
- Define push, deep links, secure storage, offline and telemetry contracts.
- Create signed build and store review pipeline.

**Gate de saída:**
- Android and iOS builds pass device testing.
- Auth, payments, messages and deep links use the same server rules as web.
- Crash, performance and release telemetry are operational.
- Store policies and privacy disclosures are approved.

### BETA-001 — Beta fechado, operação regional e lançamento

**Objetivo:** Operate a controlled regional beta with real users, support, limits, evidence and go/no-go decisions.

**Estado:** maturidade 1/6; UI local; servidor contract only; staging static contract; segurança blocked; produção blocked.

**Evidência estática observada:** 39 arquivos no escopo; 3 referências a localStorage; 0 a sessionStorage; 17 referências mock; 3 referências de rede/Supabase; 0 marcadores de implementação pendente.

**Evidências:**
- Backend, product and launch readiness validators and static audits now exist.
- No real closed-beta cohort, operator rehearsal or go/no-go evidence exists yet.

**Bloqueadores:**
- **BETA-B01 · CRITICAL · core_dependencies:** Security, payments, messaging realtime, community authority and legal gates are incomplete. _(Fase 18)_
- **BETA-B02 · HIGH · real_evidence:** No supervised real-user beta evidence exists. _(Fase 18)_
- **BETA-B03 · HIGH · operations:** Support staffing, incident rota, category/region scope and financial limits are not finalized. _(Fase 18)_

**Próximas ações:**
- Do not schedule beta until mandatory dependencies pass.
- Start with one region and selected categories.
- Define support, limits, fraud review and rollback playbook.

**Gate de saída:**
- Go/no-go gate has real evidence and named approvers.
- Core flows complete with real accounts and controlled money.
- Support and incident response meet SLA.
- Expansion is driven by liquidity and retention metrics.

## Regras de atualização

1. Atualizar primeiro `config/domain-completion-matrix.json`.
2. Regenerar com `npm run write:domain-completion-matrix`.
3. Validar com `npm run audit:domain-completion-matrix`.
4. Um domínio só sobe de maturidade quando o gate de saída tiver evidência vinculada.
5. Snapshot de staging deve ser regenerado após migrations, grants, realtime, storage ou Edge Functions relevantes.
6. Relatórios históricos não podem promover maturidade sozinhos; o runtime e o staging atuais vencem.

## Próximo lote obrigatório

**SEC-001 — Segurança, RLS, grants e autoridade dos dados.** A execução deve começar por inventário e hardening em lotes pequenos, com testes negativos por persona e sem ativar mais escrita real antes do fechamento da superfície exposta.

_Documento gerado de forma determinística a partir de `config/domain-completion-matrix.json`. Baseline: 2026-07-31T08:10:00-03:00._
