# Publications / Publicar Canary Runbook

## Objetivo
Preparar publicações para backend real preservando mock como padrão e sem alterar superfícies visuais.

## Contrato
- `GET /publications`
- `POST /publications`
- `PATCH /publications/:id`
- `POST /publications/:id/publish`

## Regras
- Publicação pode ser criada por usuário autenticado no harness local.
- Alteração/publicação exige autor ou admin.
- Toda mutação exige `x-idempotency-key`.
- Replay seguro e conflito por payload diferente são obrigatórios.

## Validação local
```bash
npm run validate:publications-canary:local-runtime
```

## Staging real
Executar apenas dentro do gate `execute:domain-expansion:staging` com relatórios anteriores aprovados.
