# Service Listings / Anunciar Canary Runbook

## Objetivo
Preparar o domínio de anunciar serviços para backend real sem alterar visual, HTML ou CSS.

## Contrato
- `GET /service-listings`
- `POST /service-listings`
- `PATCH /service-listings/:id`
- `POST /service-listings/:id/publish`

## Regras
- Mock continua padrão.
- Mutação exige `x-idempotency-key`.
- Mesma key + mesmo payload deve replayar.
- Mesma key + payload diferente deve retornar `DOKE_IDEMPOTENCY_CONFLICT`.
- Cliente não pode criar anúncio de serviço profissional.
- Profissional só altera/publica anúncio próprio; admin pode operar em staging controlado.

## Validação local
```bash
npm run audit:domain-expansion-local-runtime
npm run validate:service-listings-canary:local-runtime
```

## Staging real
Só usar staging com relatórios reais, URL segura e flags explícitas via `execute:domain-expansion:staging`.
