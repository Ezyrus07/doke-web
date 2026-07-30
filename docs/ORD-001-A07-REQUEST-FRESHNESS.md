# ORD-001 / ORD-A07 — Frescor de requisições e resistência a replay

## Objetivo

Impedir que comandos de pedidos capturados ou atrasados sejam aceitos indefinidamente, preservando a idempotência persistente como autoridade contra duplicação.

## Contrato

Toda mutação de pedidos exige `x-doke-request-issued-at` e `x-doke-request-nonce`. O servidor aceita no máximo cinco minutos de idade e trinta segundos de avanço de relógio. O nonce usa o namespace `ord-` e nunca é persistido em texto nos relatórios.

A validação ocorre depois da autorização da rota e antes da reserva da chave idempotente. Replays exatos dentro da janela convergem para a resposta armazenada; requisições antigas, futuras ou com nonce inválido falham antes da mutação.

## Integração

O frontend gera os dois cabeçalhos para cada chamada do canário. O runtime Node permite os cabeçalhos no CORS. Rotas GET não exigem frescor.

A expiração de `api_idempotency_keys.expires_at` agora é aplicada ao ler uma chave existente. Chaves expiradas não podem ser reutilizadas.

## Limites

Este lote não cria assinatura criptográfica no navegador, não substitui JWT, autorização, RLS ou idempotência e não autoriza o canário visual real. Nenhum deploy, conta ou dado de staging foi alterado.
