# Doke — Media Uploads Canary Runbook

## Escopo
Contratos backend para mídia, uploads assinados e anexos usados por pedidos, publicações, comunidade e anúncios.

## Endpoints planejados
- `GET /media/uploads`
- `POST /media/uploads`
- `POST /media/uploads/:id/complete`
- `POST /attachments`

## Regras obrigatórias
- O mock continua padrão.
- API real só pode ser ativada por flags explícitas.
- Toda mutação exige `x-idempotency-key`.
- Mesma chave + mesmo payload deve replayar.
- Mesma chave + payload diferente deve retornar `DOKE_IDEMPOTENCY_CONFLICT`.
- Tipos de mídia fora da allowlist devem retornar `DOKE_MEDIA_MIME_TYPE_UNSUPPORTED`.
- Anexo só pode ser criado após upload completado.

## Validação local
```bash
npm run validate:media-uploads-canary:local-runtime
```
