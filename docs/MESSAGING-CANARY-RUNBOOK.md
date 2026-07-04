# Messaging Canary Runbook — Sprint 40

## Objetivo

Preparar o canary de mensagens reais do Doke sem ativar produção e sem alterar visual. O domínio de mensagens só pode avançar depois de Auth/Identity e Orders terem relatórios reais aprovados.

## Escopo coberto

Endpoints validados no harness local:

- `GET /conversations`
- `GET /conversations/:id`
- `POST /orders/:id/conversation`
- `POST /conversations/:id/order`
- `POST /conversations/:id/messages`
- `POST /conversations/:id/read`

## Regras permanentes

- `mock` permanece padrão.
- Toda mutação exige `x-idempotency-key`.
- Mesma chave + mesmo payload deve fazer replay seguro.
- Mesma chave + payload diferente deve retornar `DOKE_IDEMPOTENCY_CONFLICT`.
- O canary não pode chamar wallet, notifications, admin ou produção.

## Comandos

```bash
npm run audit:backend-domain-canary-runtime
npm run validate:messaging-canary:local-runtime
npm run validate:messaging-canary:local-runtime:report
```

## Promoção para staging

Mensagens só podem ser apontadas para staging real quando o gate global passar:

```bash
npm run validate:backend-real:staging-preflight-gate
```

Sem esse gate, o domínio continua em mock/local.
