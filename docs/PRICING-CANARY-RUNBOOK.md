# Doke — Pricing, Plans & Boost Canary Runbook

## Escopo
Contratos backend para planos, assinaturas e boost de anúncios/publicações.

## Endpoints planejados
- `GET /plans`
- `POST /subscriptions`
- `POST /service-listings/:id/boost`
- `POST /publications/:id/boost`

## Regras obrigatórias
- Cliente não cria assinatura profissional no harness.
- Profissional pode ativar plano profissional em ambiente controlado.
- Boost exige owner/admin e `x-idempotency-key`.
- Nenhum pagamento real deve ser iniciado por este canary.
- Financeiro real depende de gate separado de pagamentos/checkout.

## Validação local
```bash
npm run validate:pricing-canary:local-runtime
```
