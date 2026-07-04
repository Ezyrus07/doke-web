# Domain Expansion Runbook — Anunciar, Publicar e Comunidade

## Objetivo
Preparar a expansão backend real para fluxos futuros sem atropelar os domínios críticos já existentes.

## Domínios planejados

### Anunciar
- `GET /service-listings`
- `POST /service-listings`
- `PATCH /service-listings/:id`
- `POST /service-listings/:id/publish`

### Publicar
- `GET /publications`
- `POST /publications`
- `PATCH /publications/:id`
- `POST /publications/:id/publish`

### Comunidade
- `GET /community/posts`
- `POST /community/posts`
- `POST /community/posts/:id/comments`
- `POST /community/posts/:id/reactions`

## Gate

```bash
npm run audit:domain-expansion-readiness-gate
npm run validate:domain-expansion:readiness-gate:dry-run
npm run validate:domain-expansion:readiness-gate
npm run validate:domain-expansion:readiness-gate:report
```

## Pré-condição
Só avançar depois de `backend_real_complete_ready_for_manual_domain_expansion` e `backend_real_observability_ready_for_manual_staging_rollout`.

## Sprint 61–75 — contratos executáveis
A expansão de domínio agora possui runtime local e executor de staging para:

- `service-listings` / anunciar;
- `publications` / publicar;
- `community` / comunidade.

Comandos principais:

```bash
npm run validate:domain-expansion:local-runtime
npm run execute:domain-expansion:staging:dry-run
npm run validate:beta-closed-backend-real:readiness-gate:dry-run
```

O frontend permanece em mock até relatórios reais aprovados.
