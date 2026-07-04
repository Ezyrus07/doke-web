# Backend Real Complete Readiness Runbook — Doke — Sprint 47–48

## Objetivo

Definir o gate de fechamento da trilha de backend real completo antes de expandir para fluxos de produto como anunciar, publicar, comunidade avançada, busca real e moderação.

## Domínios incluídos

- Auth
- Identity/Profile
- Orders read-only
- Orders write
- Messaging
- Notifications
- Wallet/Financeiro
- Disputes/Admin financeiro
- Receipts

## Comandos

```bash
npm run audit:backend-real-complete-readiness-gate
npm run validate:backend-real:complete-readiness-gate:dry-run
npm run validate:backend-real:complete-readiness-gate
npm run validate:backend-real:complete-readiness-gate:report
```

## Status seguro sem relatórios reais

```txt
blocked_until_backend_real_complete_real_reports
```

## Status aprovado futuro

```txt
backend_real_complete_ready_for_manual_domain_expansion
```

Esse status significa que a base real está pronta para planejar os próximos fluxos: anunciar, publicar, comunidade, busca e moderação. Ele não autoriza produção automaticamente.

## Critério para avançar para anunciar/publicar

Antes de iniciar os próximos fluxos, devem existir relatórios reais aprovados de:

- staging Supabase/API;
- Auth/Identity;
- Orders read-only;
- Orders write;
- Messaging;
- Notifications;
- Wallet;
- rollback/degradação para mock.

## Decisão técnica

A partir deste gate, novas sprints devem ser organizadas por fluxo de produto, não por preparação genérica. O próximo bloco natural após backend real completo é:

1. fluxo `anunciar-servico` real;
2. fluxo `publicar`/comunidade real;
3. busca/listagem real;
4. moderação/admin real;
5. observabilidade e analytics.
