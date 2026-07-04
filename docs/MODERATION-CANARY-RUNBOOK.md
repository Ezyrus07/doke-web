# Doke — Moderation Canary Runbook

## Escopo
Contratos backend para denúncia, bloqueio e resolução de reports por moderação/admin.

## Endpoints planejados
- `POST /reports`
- `POST /blocks`
- `GET /moderation/reports`
- `POST /moderation/reports/:id/resolve`

## Regras obrigatórias
- Usuário autenticado pode denunciar e bloquear.
- Listagem e resolução de reports são admin-only.
- Toda mutação exige `x-idempotency-key`.
- Replays e conflitos devem seguir contrato global de idempotência.
- Nenhuma ação de moderação deve alterar carteira, pedidos ou mensagens diretamente.

## Validação local
```bash
npm run validate:moderation-canary:local-runtime
```
