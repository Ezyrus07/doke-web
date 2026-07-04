# Doke — Product Beta E2E Runbook

## Objetivo
Validar localmente os domínios finais necessários antes do beta fechado: mídia/uploads, moderação, busca/indexação e pricing/boost.

## Comandos
```bash
npm run audit:product-beta-local-runtime
npm run validate:product-beta:local-runtime
npm run validate:product-beta:local-runtime:report
```

## Domínios cobertos
- Media/uploads/anexos
- Reports/block/moderação
- Search/indexing
- Plans/subscriptions/boost

## Status esperado
Sem rede externa, o runtime local deve produzir:

```txt
product_beta_local_runtime_validated
```

## Garantias
- Nenhum request externo.
- Nenhuma mutação externa.
- Idempotência obrigatória em mutações.
- Bloqueio de roles inválidas.
- Isolamento de domínio.
