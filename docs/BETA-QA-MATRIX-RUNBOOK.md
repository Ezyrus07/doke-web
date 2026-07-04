# Beta QA Matrix Runbook

## Objetivo

Definir a matriz mínima de QA por persona, domínio e cenário crítico antes de empacotar um release candidate privado.

## Personas obrigatórias

- guest
- client
- professional
- admin
- support

## Domínios obrigatórios

- auth
- orders
- messaging
- notifications
- wallet
- service-listings
- publications
- community
- media
- moderation
- search
- pricing
- payments
- kyc
- support-admin
- security

## Regra

Cada domínio precisa ter pelo menos um cenário obrigatório. Cenários de admin precisam ser validados com persona admin ou support quando aplicável. Cenários com mutação devem preservar idempotência e rollback.

## Validação

```bash
npm run audit:beta-qa-matrix
npm run validate:beta-qa-matrix:dry-run
npm run validate:beta-qa-matrix
npm run validate:beta-qa-matrix:report
```
