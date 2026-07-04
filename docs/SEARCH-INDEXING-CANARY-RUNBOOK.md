# Doke — Search & Indexing Canary Runbook

## Escopo
Contratos backend para busca unificada e rebuild controlado de índice.

## Endpoints planejados
- `GET /search`
- `POST /search/index/rebuild`

## Regras obrigatórias
- Busca pública/autenticada pode ler serviços, publicações e comunidade conforme escopo.
- Rebuild de índice é admin-only.
- Rebuild é mutação operacional e exige `x-idempotency-key`.
- API real de busca só deve ser ativada depois de observabilidade mínima.

## Validação local
```bash
npm run validate:search-indexing-canary:local-runtime
```
