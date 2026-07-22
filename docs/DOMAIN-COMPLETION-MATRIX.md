# Doke — Matriz de Conclusão dos Domínios

Este é o mapa operacional obrigatório para concluir a lógica da Doke. Ele cruza o código ativo, os contratos/testes existentes e um snapshot do Supabase de staging. Não substitui os contratos de cada domínio; determina **ordem, maturidade, autoridade, bloqueadores e gate de saída**.

## Resumo executivo

- Domínios/programas mapeados: **23**.
- Fluxos críticos mapeados: **15**.
- Maturidade média atual: **2.43/6**.
- Bloqueadores críticos explícitos: **28**.
- Domínios prontos para produção: **0**.
- Runtime padrão: dados **mock**, auth **mock**, rede **desativada**.

A leitura correta é: a Doke possui fundações e canários avançados, especialmente em pedidos e operação, mas o produto público ainda é **híbrido/mock por padrão** e a superfície de segurança bloqueia promoção para produção.

## Snapshot real do staging

Observado em `2026-07-22T11:53:04.039523Z` no projeto `zwkczgewzbsorbrjuzpb`.

| Indicador | Valor |
| --- | ---: |
| Tabelas públicas | 44 |
| Tabelas públicas sem RLS | 13 |
| Tabelas com RLS sem policies | 0 |
| Funções SECURITY DEFINER | 97 |
| SECURITY DEFINER executáveis por anon | 18 |
| SECURITY DEFINER executáveis por authenticated | 38 |
| Tabelas no Realtime | 1 |
| Edge Functions ativas | 3 |
| Crons operacionais ativos | 5 |

### Dívida de RLS que bloqueia produção

`audit_logs`, `availability_slots`, `budgets`, `client_profiles`, `communities`, `community_members`, `community_posts`, `favorites`, `message_attachments`, `reports`, `reviews`, `service_categories`, `verification_events`.

RLS habilitado, mas sem policy: .

## Escala de maturidade

| Nível | Significado | Quantidade |
| ---: | --- | ---: |
| 0 | not started | 1 |
| 1 | foundation only | 3 |
| 2 | local functional | 8 |
| 3 | staging canary or hybrid | 7 |
| 4 | staging operational | 4 |
| 5 | private beta ready | 0 |
| 6 | production ready | 0 |

## Visão geral dos domínios

| Ordem | ID | Domínio | Maturidade | UI atual | Autoridade server-side | Evidência | Segurança | Produção |
| ---: | --- | --- | ---: | --- | --- | --- | --- | --- |
| 1 | GOV-001 | Governança, arquitetura e comando central | 4/6 | hybrid | canonical | staging operational | partial | candidate |
| 2 | SEC-001 | Segurança, RLS, grants e autoridade dos dados | 2/6 | hybrid | partial | staging canary | blocked | blocked |
| 3 | AUTH-001 | Autenticação, sessão e identidade | 3/6 | hybrid | partial | staging canary | blocked | blocked |
| 4 | PROF-001 | Perfis, onboarding profissional e KYC | 4/6 | hybrid | partial | staging canary | blocked | blocked |
| 5 | CAT-001 | Catálogo, publicação e moderação de serviços | 3/6 | hybrid | partial | staging canary | partial | blocked |
| 6 | SEARCH-001 | Busca, descoberta, favoritos e ranking | 2/6 | hybrid | contract only | local e2e | blocked | blocked |
| 7 | ORD-001 | Orçamentos, propostas e ciclo de pedidos | 4/6 | hybrid | canonical | staging operational | partial | blocked |
| 8 | SCHED-001 | Agenda, disponibilidade e execução do serviço | 1/6 | local | none | static contract | blocked | blocked |
| 9 | MSG-001 | Mensagens, conversas, presença e anexos | 3/6 | hybrid | partial | staging canary | blocked | blocked |
| 10 | NTF-001 | Notificações, e-mail e push | 3/6 | hybrid | partial | staging canary | blocked | blocked |
| 11 | PAY-001 | Pagamentos, cobrança, escrow e webhooks | 2/6 | local | contract only | local e2e | blocked | blocked |
| 12 | WAL-001 | Carteira, recebíveis, saldo e saques | 3/6 | hybrid | partial | staging canary | blocked | blocked |
| 13 | DSP-001 | Cancelamentos, reembolsos, disputas e chargebacks | 2/6 | hybrid | partial | local e2e | blocked | blocked |
| 14 | REP-001 | Avaliações, reputação e recompra | 2/6 | local | partial | static contract | blocked | blocked |
| 15 | COM-001 | Comunidades, membros e moderação social | 2/6 | local | contract only | local e2e | blocked | blocked |
| 16 | CONTENT-001 | Workers, publicações, mídia e feed social | 2/6 | local | contract only | local e2e | blocked | blocked |
| 17 | ADM-001 | Administração, suporte e moderação | 3/6 | hybrid | partial | staging canary | blocked | blocked |
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
| FLOW-01 | Descoberta pública | hybrid | SEARCH-001 | home → search → results → service_detail | SEARCH-B02, CAT-B01 |
| FLOW-02 | Cadastro, login e onboarding | staging canary | AUTH-001 | register → verify_contact → session → profile_materialization → onboarding | AUTH-B02, AUTH-B04 |
| FLOW-03 | Tornar-se profissional e KYC | staging canary | PROF-001 | profile_setup → document_upload → submit → admin_review → decision → role_activation | PROF-B01, PROF-B03, PROF-B04 |
| FLOW-04 | Publicar serviço | hybrid | CAT-001 | draft → media → quote_template → submit_review → moderation → publish → edit_version | CAT-B01, CAT-B02, CAT-B03 |
| FLOW-05 | Solicitar orçamento e criar pedido | staging operational | ORD-001 | service_snapshot → questionnaire → request → outbox_event → professional_notification | ORD-B01, ORD-B02 |
| FLOW-06 | Aceite, proposta e agenda | hybrid | ORD-001 | accept → proposal → client_approval → schedule_hold → confirmation | SCHED-B02, SCHED-B03, ORD-B04 |
| FLOW-07 | Conversa transacional | hybrid | MSG-001 | conversation → message → attachment → read_state → realtime → notification | MSG-B01, MSG-B02, MSG-B03 |
| FLOW-08 | Pagamento, retenção e liberação | blocked | PAY-001 | charge → provider_checkout → signed_webhook → ledger → receivable → release | PAY-B01, PAY-B02, PAY-B03, PAY-B04 |
| FLOW-09 | Cancelamento, reembolso e disputa | blocked | DSP-001 | eligibility → cancel → refund → dispute → evidence → decision → appeal | DSP-B01, DSP-B02, DSP-B03 |
| FLOW-10 | Carteira e saque | hybrid | WAL-001 | pending_balance → available_balance → bank_account → withdraw_request → approval → provider_transfer → reconciliation | WAL-B01, WAL-B02, WAL-B03 |
| FLOW-11 | Avaliação e recompra | local | REP-001 | eligibility → review → moderation → reputation → rehire | REP-B01, REP-B02, REP-B03 |
| FLOW-12 | Comunidade e conteúdo | local | COM-001 | discover → join_or_request → role → post_or_message → report → sanction → appeal | COM-B01, COM-B02, COM-B03, COM-B04 |
| FLOW-13 | Operação administrativa | hybrid | ADM-001 | queue → case → decision → audit → dual_control → notification | ADM-B01, ADM-B02, ADM-B03 |
| FLOW-14 | Incidente e proteção de mudança | staging operational | REL-001 | health → alert → acknowledge → runbook → recovery → post_incident → error_budget → change_gate | REL-B01, REL-B02 |
| FLOW-15 | Beta fechado e lançamento | blocked | BETA-001 | security_gate → legal_gate → real_e2e → operator_rehearsal → go_no_go → regional_beta → scale_review | BETA-B01, BETA-B02, BETA-B03 |

## Detalhamento por domínio

### GOV-001 — Governança, arquitetura e comando central

**Objetivo:** Manter uma única base oficial, contratos vivos, gates verificáveis e rastreabilidade de mudanças.

**Estado:** maturidade 4/6; UI hybrid; servidor canonical; staging staging operational; segurança partial; produção candidate.

**Evidência estática observada:** 1446 arquivos no escopo; 246 referências a localStorage; 101 a sessionStorage; 907 referências mock; 210 referências de rede/Supabase; 85 marcadores de implementação pendente.

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

**Estado:** maturidade 2/6; UI hybrid; servidor partial; staging staging canary; segurança blocked; produção blocked.

**Evidência estática observada:** 110 arquivos no escopo; 0 referências a localStorage; 0 a sessionStorage; 0 referências mock; 5 referências de rede/Supabase; 9 marcadores de implementação pendente.

**Tabelas/autoridades de dados:** `users`, `user_profiles`, `client_profiles`, `audit_logs`, `availability_slots`, `budgets`, `communities`, `community_members`, `community_posts`, `favorites`, `message_attachments`, `reports`, `reviews`, `service_categories`, `verification_events`.

**Evidências:**
- Private operational tables are not readable by anon or authenticated.
- Current staging snapshot contains 44 public tables and 24 private tables.
- users now exposes only the authenticated caller own account row; anon has no table access.
- user_profiles is explicitly public-read and has no browser DML grants.
- Forged user_metadata role claims are ignored, stripped and replaced by app_metadata projected from public.users.
- Identity and KYC RPCs are no longer executable by anon; client attempts against admin verification RPCs return ADMIN_REQUIRED.
- Anon SECURITY DEFINER exposure fell from 36 to 18 and authenticated exposure from 45 to 38 after identity hardening.
- professional_profiles, professional_identity_verifications and verification_events now expose read-only owner/reviewer RLS with no browser DML grants.
- Reviewer queue, detail, claim and decision operations moved behind the JWT-protected professional-verification-operations Edge Function.
- KYC evidence paths are owner-scoped, private and immutable while submitted, under review or verified.
- Professional promotion updates public.users and app_metadata without persisting role claims in user_metadata.

**Bloqueadores:**
- **SEC-B01 · CRITICAL · rls:** 13 public tables have RLS disabled. _(Fase 1)_
- **SEC-B03 · CRITICAL · rpc_grants:** 18 SECURITY DEFINER functions remain executable by anon and 38 by authenticated outside the closed identity batch, concentrated in finance, idempotency, notifications and moderation. _(Fase 1)_
- **SEC-B04 · HIGH · storage:** service-media is public with broad listing risk; transaction-attachments has no mapped object policies in the snapshot. _(Fase 1)_
- **SEC-B05 · HIGH · auth:** Leaked password protection is disabled in Supabase Auth. _(Fase 1)_

**Próximas ações:**
- Close client_profiles and the remaining exposed profile-adjacent authorities.
- Revoke or redesign remaining privileged finance, idempotency, notification and moderation RPC grants.
- Apply RLS and negative persona tests to the remaining exposed public tables in small domain batches.
- Harden storage policies, password protection, CORS, CSP and rate limits.

**Gate de saída:**
- No public table requiring protection remains without RLS and policies.
- No internal SECURITY DEFINER RPC is callable by anon or generic authenticated users.
- Negative tests pass for client, professional, support, moderator and admin.
- Security advisors have no unresolved critical errors attributable to the core surface.

### AUTH-001 — Autenticação, sessão e identidade

**Objetivo:** Provide one real identity and session authority across every page and device.

**Estado:** maturidade 3/6; UI hybrid; servidor partial; staging staging canary; segurança blocked; produção blocked.

**Evidência estática observada:** 9 arquivos no escopo; 27 referências a localStorage; 0 a sessionStorage; 39 referências mock; 14 referências de rede/Supabase; 3 marcadores de implementação pendente.

**Páginas:** `auth/login.html`, `auth/cadastro.html`, `auth/esqueci-senha.html`.

**Tabelas/autoridades de dados:** `users`, `user_profiles`, `client_profiles`, `professional_profiles`.

**Evidências:**
- Real-auth-only contract passes.
- Local and staging multi-domain E2E reports cover login and session.
- Default runtime still requests mock auth unless a controlled canary is enabled.
- users and user_profiles now have explicit policies and browser writes only through controlled self-service RPCs.
- public.users is the database authority for role/status and auth.app_metadata is a server-controlled projection.
- New accounts always materialize as client regardless of user_metadata role claims.

**Bloqueadores:**
- **AUTH-B02 · HIGH · runtime_authority:** Runtime defaults remain mock and localStorage overrides can alter providers. _(Fase 3)_
- **AUTH-B04 · MEDIUM · account_security:** Device/session management, contact verification and global logout are incomplete. _(Fase 3)_

**Próximas ações:**
- Promote real auth as the only production provider after controlled route-by-route canaries.
- Implement verified contact, session/device management, token refresh and global logout.
- Finish client/professional profile and KYC row security before enabling external users.

**Gate de saída:**
- All protected pages derive identity from one remote session.
- No production route silently falls back to mock identity.
- Cross-account negative tests pass.
- Session refresh, recovery and logout are E2E validated.

### PROF-001 — Perfis, onboarding profissional e KYC

**Objetivo:** Materialize trustworthy client and professional profiles, verification evidence and role transitions.

**Estado:** maturidade 4/6; UI hybrid; servidor partial; staging staging canary; segurança blocked; produção blocked.

**Evidência estática observada:** 19 arquivos no escopo; 8 referências a localStorage; 2 a sessionStorage; 7 referências mock; 23 referências de rede/Supabase; 1 marcadores de implementação pendente.

**Páginas:** `meu-perfil.html`, `perfil.html`, `perfil-cliente.html`, `perfil-profissional.html`, `tornar-profissional.html`, `verificacao-profissional.html`, `admin-verificacao.html`.

**Tabelas/autoridades de dados:** `client_profiles`, `professional_profiles`, `professional_identity_verifications`, `verification_events`.

**Edge Functions:** `professional-verification-operations`.

**Evidências:**
- Professional verification and admin decision contracts exist.
- Private verification media bucket exists.
- Draft repositories still use localStorage/sessionStorage and IndexedDB evidence.
- KYC RPCs are no longer executable by anon; client attempts against admin list/decision operations are denied by server role checks.
- Professional KYC draft, submission, review, rejection, reopening and approval are server-authoritative in staging.
- Binary evidence uses database-generated locked upload intents, signed upload tokens and one-time server-side consumption.
- Reviewer operations require an independently authenticated admin/moderator Edge Function context.
- Role promotion is atomic, idempotent and synchronized through public.users to app_metadata.

**Bloqueadores:**
- **PROF-B01 · CRITICAL · rls:** client_profiles remains without RLS; professional profile and KYC authorities are closed. _(Fase 1)_
- **PROF-B03 · HIGH · authority_split:** Draft, evidence and active profile state remain split between local browser storage and Supabase. _(Fase 3)_
- **PROF-B04 · HIGH · external_policy:** Final KYC rules, document retention and legal verification provider are not approved. _(Fase 2)_
- **PROF-B05 · HIGH · storage_policy:** Legacy owner-prefix Storage write policies remain because storage.objects is owned by the managed supabase_storage_admin role; the new signed-intent submission flow no longer trusts them. _(Fase 1)_

**Próximas ações:**
- Close client_profiles and define its private/public projection boundary.
- Remove legacy owner-prefix KYC Storage policies through the managed Storage policy authority and add upload cleanup/retention.
- Define KYC policy, retention, rejection and appeal rules.

**Gate de saída:**
- A professional can complete, submit, be reviewed and receive a decision across devices.
- Documents are private and access-audited.
- Role promotion is server-authoritative and idempotent.
- Rejected applications can be corrected and resubmitted safely.

### CAT-001 — Catálogo, publicação e moderação de serviços

**Objetivo:** Make service creation, versioning, moderation, publication and edits server-authoritative.

**Estado:** maturidade 3/6; UI hybrid; servidor partial; staging staging canary; segurança partial; produção blocked.

**Evidência estática observada:** 16 arquivos no escopo; 6 referências a localStorage; 4 a sessionStorage; 0 referências mock; 30 referências de rede/Supabase; 0 marcadores de implementação pendente.

**Páginas:** `anunciar-servico.html`, `detalhe-anuncio.html`, `admin-anuncio-revisao.html`, `index.html`, `resultados.html`.

**Tabelas/autoridades de dados:** `services`, `service_versions`, `service_media`, `service_categories`, `service_moderation_events`, `service_quote_templates`, `service_quote_questions`.

**Edge Functions:** `quote-template-ai`.

**Evidências:**
- Supabase service repository, version moderation and admin review exist.
- AI template generation is isolated behind an Edge Function.
- Services repository retains localStorage and sessionStorage fallback paths.

**Bloqueadores:**
- **CAT-B01 · CRITICAL · rls:** service_categories has RLS disabled. _(Fase 1)_
- **CAT-B02 · HIGH · storage:** Public service-media listing policy is broader than required. _(Fase 1)_
- **CAT-B03 · HIGH · authority_split:** Local service drafts and remote published versions coexist without a final production promotion contract. _(Fase 4)_
- **CAT-B04 · MEDIUM · versioning:** Historical orders need immutable service snapshots across all creation paths. _(Fase 4)_

**Próximas ações:**
- Secure categories and media.
- Make remote draft/version workflow canonical.
- Guarantee immutable service snapshot on order creation.
- Complete pause, archive and safe edit flows.

**Gate de saída:**
- Create, submit, moderate, publish, edit, pause and archive work remotely.
- Public catalog shows only approved eligible versions.
- Media upload validation and deletion are server-enforced.
- Order snapshots are immutable.

### SEARCH-001 — Busca, descoberta, favoritos e ranking

**Objetivo:** Return eligible services and professionals with scalable server-side filtering, ranking and pagination.

**Estado:** maturidade 2/6; UI hybrid; servidor contract only; staging local e2e; segurança blocked; produção blocked.

**Evidência estática observada:** 5 arquivos no escopo; 2 referências a localStorage; 0 a sessionStorage; 3 referências mock; 0 referências de rede/Supabase; 0 marcadores de implementação pendente.

**Páginas:** `index.html`, `resultados.html`, `detalhe-anuncio.html`.

**Tabelas/autoridades de dados:** `services`, `service_categories`, `favorites`, `service_metric_events`.

**Evidências:**
- Search and product-beta local runtime contracts pass.
- No dedicated production search/indexing service is canonical.
- favorites has RLS disabled.

**Bloqueadores:**
- **SEARCH-B01 · CRITICAL · rls:** favorites has RLS disabled. _(Fase 1)_
- **SEARCH-B02 · HIGH · server_search:** Filtering, ranking, geospatial eligibility and pagination remain predominantly frontend/local contracts. _(Fase 5)_
- **SEARCH-B03 · MEDIUM · analytics:** Ranking signals and anti-manipulation controls are incomplete. _(Fase 15)_

**Próximas ações:**
- Secure favorites.
- Define server-side search DTO, pagination and geographic eligibility.
- Implement ranking baseline and conversion instrumentation.

**Gate de saída:**
- Search is server-paginated and bounded.
- Filters and location produce deterministic eligible results.
- Favorites persist per identity.
- Ranking has documented signals, monitoring and rollback.

### ORD-001 — Orçamentos, propostas e ciclo de pedidos

**Objetivo:** Operate the complete order state machine with one server authority and reliable event delivery.

**Estado:** maturidade 4/6; UI hybrid; servidor canonical; staging staging operational; segurança partial; produção blocked.

**Evidência estática observada:** 22 arquivos no escopo; 11 referências a localStorage; 0 a sessionStorage; 35 referências mock; 23 referências de rede/Supabase; 2 marcadores de implementação pendente.

**Páginas:** `orcamento.html`, `pedidos.html`, `mensagens.html`, `pagamento-profissional.html`, `admin-pedidos-operacao.html`.

**Tabelas/autoridades de dados:** `orders`, `budgets`, `order_status_history`, `private.order_domain_events`, `private.order_event_delivery_attempts`.

**Edge Functions:** `order-event-worker`, `order-event-operations`.
**Crons:** `doke-order-event-worker`, `doke-order-operational-alerts`, `doke-order-incident-escalation`, `doke-order-change-protection`.

**Evidências:**
- Canonical state machine, transaction events, outbox worker and operational controls are active in staging.
- Backend real local and staging E2E reports cover order writes.
- Browser orders repository still has localStorage/mock fallback and production defaults remain mock.

**Bloqueadores:**
- **ORD-B01 · CRITICAL · rls:** budgets has RLS disabled and orders grants require full persona revalidation. _(Fase 1)_
- **ORD-B02 · HIGH · frontend_activation:** Default product flow still uses mock/local provider unless controlled canaries are enabled. _(Fase 6)_
- **ORD-B03 · HIGH · financial_dependency:** Payment authority is not connected to a real PSP webhook lifecycle. _(Fase 8)_
- **ORD-B04 · MEDIUM · scheduling:** Order scheduling and availability are not server-canonical. _(Fase 6)_

**Próximas ações:**
- Secure budgets and retest order policies.
- Promote real order reads/writes behind controlled rollout.
- Connect order transitions to messaging, scheduling and payment authorities.

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
- availability_slots has RLS disabled.

**Bloqueadores:**
- **SCHED-B01 · CRITICAL · rls:** availability_slots has RLS disabled. _(Fase 1)_
- **SCHED-B02 · CRITICAL · server_authority:** No canonical scheduling service handles holds, conflicts, rescheduling or timezone rules. _(Fase 6)_
- **SCHED-B03 · HIGH · concurrency:** No database-level anti-double-booking contract is proven. _(Fase 6)_

**Próximas ações:**
- Design availability and booking-hold model.
- Implement conflict constraints and timezone policy.
- Connect accepted proposals to schedule confirmation and reminders.

**Gate de saída:**
- Concurrent booking attempts cannot reserve the same slot.
- Reschedule/cancel rules are audited.
- Agenda reflects remote state across devices.
- Timezone and daylight rules are documented and tested.

### MSG-001 — Mensagens, conversas, presença e anexos

**Objetivo:** Provide durable multi-device conversations tied to orders with authorized attachments and realtime delivery.

**Estado:** maturidade 3/6; UI hybrid; servidor partial; staging staging canary; segurança blocked; produção blocked.

**Evidência estática observada:** 7 arquivos no escopo; 9 referências a localStorage; 0 a sessionStorage; 5 referências mock; 49 referências de rede/Supabase; 3 marcadores de implementação pendente.

**Páginas:** `mensagens.html`, `pedidos.html`, `comunidade-interna.html`.

**Tabelas/autoridades de dados:** `conversations`, `messages`, `message_attachments`.

**Evidências:**
- Backend handlers and staging multi-domain messaging flow exist.
- Messages repository uses remote tables but retains localStorage and mock fallbacks.
- Only notifications is currently published to Supabase Realtime.

**Bloqueadores:**
- **MSG-B01 · CRITICAL · rls:** message_attachments has RLS disabled. _(Fase 1)_
- **MSG-B02 · CRITICAL · realtime:** messages and conversations are not in the realtime publication. _(Fase 7)_
- **MSG-B03 · HIGH · authority_split:** Local conversation/message fallback can diverge across devices. _(Fase 7)_
- **MSG-B04 · HIGH · storage:** Transaction attachment bucket policies are not mapped in the current staging snapshot. _(Fase 1)_

**Próximas ações:**
- Secure attachment metadata and storage objects.
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

**Evidência estática observada:** 6 arquivos no escopo; 22 referências a localStorage; 0 a sessionStorage; 7 referências mock; 14 referências de rede/Supabase; 2 marcadores de implementação pendente.

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

**Evidência estática observada:** 6 arquivos no escopo; 1 referências a localStorage; 0 a sessionStorage; 2 referências mock; 41 referências de rede/Supabase; 2 marcadores de implementação pendente.

**Páginas:** `pagamento-profissional.html`, `mensagens.html`, `pedidos.html`.

**Tabelas/autoridades de dados:** `payments`, `transactions`, `receipts`, `wallet_receivables`.

**Evidências:**
- Financial contracts, ledger-like tables and local beta-launch E2E exist.
- No real PSP, signed webhook, reconciliation job or production card tokenization is connected.

**Bloqueadores:**
- **PAY-B01 · CRITICAL · external_provider:** No PSP integration or signed webhook authority exists. _(Fase 8)_
- **PAY-B02 · CRITICAL · rpc_grants:** Payment, receivable and finance RPCs are executable by anon/authenticated. _(Fase 1)_
- **PAY-B03 · CRITICAL · legal_compliance:** Commercial, tax, escrow and refund rules are not legally approved. _(Fase 2)_
- **PAY-B04 · HIGH · reconciliation:** No provider reconciliation or mismatch queue is operational. _(Fase 8)_

**Próximas ações:**
- Select PSP after legal/accounting review.
- Design signed webhook ingestion and idempotency.
- Make provider events the only payment authority.
- Build reconciliation, refund and failure recovery.

**Gate de saída:**
- No card data is stored by Doke.
- Repeated webhooks do not duplicate ledger effects.
- Provider and Doke states reconcile automatically.
- Refunds and payment failures are E2E tested.

### WAL-001 — Carteira, recebíveis, saldo e saques

**Objetivo:** Maintain a reconciled professional balance and safe withdrawal lifecycle.

**Estado:** maturidade 3/6; UI hybrid; servidor partial; staging staging canary; segurança blocked; produção blocked.

**Evidência estática observada:** 6 arquivos no escopo; 11 referências a localStorage; 0 a sessionStorage; 6 referências mock; 57 referências de rede/Supabase; 4 marcadores de implementação pendente.

**Páginas:** `carteira.html`, `admin.html`.

**Tabelas/autoridades de dados:** `wallets`, `wallet_bank_accounts`, `wallet_receivables`, `transactions`, `withdrawals`, `receipts`.

**Evidências:**
- Backend routes and staging multi-domain wallet flows exist.
- Frontend wallet repository remains localStorage-heavy and real settlement is absent.

**Bloqueadores:**
- **WAL-B01 · CRITICAL · rpc_grants:** Bank account, withdrawal and receivable RPCs are broadly executable. _(Fase 1)_
- **WAL-B02 · CRITICAL · payment_dependency:** Balances cannot be production-authoritative before PSP and reconciliation are complete. _(Fase 8)_
- **WAL-B03 · HIGH · sensitive_data:** Bank account data needs encryption, masking, retention and support-access policy. _(Fase 1)_
- **WAL-B04 · HIGH · authority_split:** Local wallet projection and remote finance repository coexist. _(Fase 8)_

**Próximas ações:**
- Harden finance RPCs and bank data.
- Connect webhook-confirmed ledger entries.
- Implement withdrawal provider flow and reconciliation.
- Remove local wallet authority from production.

**Gate de saída:**
- Balance is derived from immutable ledger entries.
- Withdrawals are idempotent and auditable.
- Bank details are protected and masked.
- Provider settlement and internal totals reconcile.

### DSP-001 — Cancelamentos, reembolsos, disputas e chargebacks

**Objetivo:** Resolve transaction failures and conflicts through explicit policies and audited state machines.

**Estado:** maturidade 2/6; UI hybrid; servidor partial; staging local e2e; segurança blocked; produção blocked.

**Evidência estática observada:** 5 arquivos no escopo; 10 referências a localStorage; 0 a sessionStorage; 4 referências mock; 37 referências de rede/Supabase; 4 marcadores de implementação pendente.

**Páginas:** `pedidos.html`, `mensagens.html`, `carteira.html`, `admin.html`.

**Tabelas/autoridades de dados:** `payment_disputes`, `dispute_events`, `payments`, `transactions`, `receipts`.

**Evidências:**
- Open/respond/release/refund contracts and audit routes exist.
- Real chargeback/provider dispute integration is absent.

**Bloqueadores:**
- **DSP-B01 · CRITICAL · legal_policy:** Cancellation, refund, evidence and appeal policies are not approved. _(Fase 2)_
- **DSP-B02 · CRITICAL · rpc_grants:** Dispute resolution RPCs are executable by anon/authenticated. _(Fase 1)_
- **DSP-B03 · HIGH · provider_integration:** Chargebacks and provider dispute webhooks are not integrated. _(Fase 9)_
- **DSP-B04 · HIGH · support_workflow:** General case management, evidence deadlines and escalation queues are incomplete. _(Fase 13)_

**Próximas ações:**
- Approve dispute policy and state machine.
- Secure RPCs.
- Integrate provider chargebacks and evidence submission.
- Build operator queue and appeal audit.

**Gate de saída:**
- Every cancellation stage has deterministic financial effects.
- Participants see authorized evidence and deadlines.
- Support decisions are audited and reversible by policy.
- Provider chargeback states reconcile.

### REP-001 — Avaliações, reputação e recompra

**Objetivo:** Create trustworthy reputation from eligible completed orders and keep repeat hiring inside Doke.

**Estado:** maturidade 2/6; UI local; servidor partial; staging static contract; segurança blocked; produção blocked.

**Evidência estática observada:** 4 arquivos no escopo; 4 referências a localStorage; 0 a sessionStorage; 2 referências mock; 7 referências de rede/Supabase; 0 marcadores de implementação pendente.

**Páginas:** `avaliacao-profissional.html`, `perfil.html`, `perfil-profissional.html`, `perfil-cliente.html`.

**Tabelas/autoridades de dados:** `reviews`, `orders`, `professional_profiles`.

**Evidências:**
- Review contracts and UI exist.
- Reviews repository is localStorage-first and reviews has RLS disabled.

**Bloqueadores:**
- **REP-B01 · CRITICAL · rls:** reviews has RLS disabled. _(Fase 1)_
- **REP-B02 · CRITICAL · eligibility:** Remote one-review-per-completed-order constraint and moderation are not proven. _(Fase 10)_
- **REP-B03 · HIGH · reputation_model:** Canonical reputation, fraud resistance and dispute impact model are undefined. _(Fase 10)_
- **REP-B04 · MEDIUM · retention:** Rehire and loyalty economics are not implemented. _(Fase 10)_

**Próximas ações:**
- Secure reviews and implement eligibility constraints.
- Define reputation aggregation and moderation.
- Implement rehire flow before points/cashback.

**Gate de saída:**
- Only eligible participants review once per completed order.
- Moderation and appeals are auditable.
- Ratings are recalculated server-side.
- Repeat service flow remains linked to Doke transaction history.

### COM-001 — Comunidades, membros e moderação social

**Objetivo:** Move community membership, roles, posts, chat and sanctions from local browser authority to secure remote state.

**Estado:** maturidade 2/6; UI local; servidor contract only; staging local e2e; segurança blocked; produção blocked.

**Evidência estática observada:** 7 arquivos no escopo; 56 referências a localStorage; 24 a sessionStorage; 4 referências mock; 6 referências de rede/Supabase; 0 marcadores de implementação pendente.

**Páginas:** `comunidade.html`, `comunidade-interna.html`.

**Tabelas/autoridades de dados:** `communities`, `community_members`, `community_posts`.

**Evidências:**
- Rich local community logic and local runtime domain contracts exist.
- Backend communities module is empty and all three core community tables have RLS disabled.

**Bloqueadores:**
- **COM-B01 · CRITICAL · rls:** communities, community_members and community_posts have RLS disabled. _(Fase 1)_
- **COM-B02 · CRITICAL · server_authority:** Membership, roles, bans, invitations and posts are not server-canonical. _(Fase 11)_
- **COM-B03 · HIGH · realtime:** No community realtime publication or scalable channel policy is active. _(Fase 11)_
- **COM-B04 · HIGH · moderation:** Content reports, sanctions, appeals and media moderation are incomplete. _(Fase 12)_

**Próximas ações:**
- Design community RLS by visibility, membership and role.
- Implement backend membership transactions and audit.
- Add scoped realtime and content moderation.

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

**Estado:** maturidade 3/6; UI hybrid; servidor partial; staging staging canary; segurança blocked; produção blocked.

**Evidência estática observada:** 9 arquivos no escopo; 0 referências a localStorage; 0 a sessionStorage; 7 referências mock; 7 referências de rede/Supabase; 6 marcadores de implementação pendente.

**Páginas:** `admin.html`, `admin-verificacao.html`, `admin-anuncio-revisao.html`, `admin-pedidos-operacao.html`.

**Tabelas/autoridades de dados:** `admin_audit_events`, `audit_logs`, `reports`, `verification_events`, `service_moderation_events`.

**Edge Functions:** `order-event-operations`.

**Evidências:**
- Order operations, verification and service moderation admin surfaces exist.
- Generic support case management and unified audit authority are incomplete.

**Bloqueadores:**
- **ADM-B01 · CRITICAL · rls:** audit_logs, reports and verification_events have RLS disabled; admin_audit_events grants require review. _(Fase 1)_
- **ADM-B02 · CRITICAL · rpc_grants:** Several admin/KYC/service moderation functions are executable by broad roles. _(Fase 1)_
- **ADM-B03 · HIGH · backoffice_scope:** Users, payments, disputes, communities, content and support tickets are not unified in one operator workflow. _(Fase 13)_
- **ADM-B04 · HIGH · dual_control:** High-risk financial actions need dual approval and separation of duties. _(Fase 13)_

**Próximas ações:**
- Secure admin data and RPCs.
- Create unified case/audit model.
- Add dual-control for financial and identity actions.
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

**Evidência estática observada:** 403 arquivos no escopo; 88 referências a localStorage; 26 a sessionStorage; 440 referências mock; 9 referências de rede/Supabase; 28 marcadores de implementação pendente.

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

**Evidência estática observada:** 833 arquivos no escopo; 254 referências a localStorage; 74 a sessionStorage; 269 referências mock; 257 referências de rede/Supabase; 9 marcadores de implementação pendente.

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

**Evidência estática observada:** 2637 arquivos no escopo; 513 referências a localStorage; 177 a sessionStorage; 1260 referências mock; 572 referências de rede/Supabase; 138 marcadores de implementação pendente.

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

**Evidência estática observada:** 424 arquivos no escopo; 69 referências a localStorage; 48 a sessionStorage; 222 referências mock; 95 referências de rede/Supabase; 47 marcadores de implementação pendente.

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

_Documento gerado de forma determinística a partir de `config/domain-completion-matrix.json`. Baseline: 2026-07-22T11:50:57Z._
