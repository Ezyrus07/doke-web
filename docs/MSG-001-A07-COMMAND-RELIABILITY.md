# MSG-A07 — Command acknowledgement, idempotency and bounded retry

## Causa raiz

Os comandos de mensagens chegavam ao provider server-owned sem uma chave idempotente obrigatória, sem acknowledgement verificável e sem política explícita de retry. Uma resposta perdida podia induzir repetição manual e duplicar mensagens ou efeitos de interface.

## Contrato

- cada comando recebe um commandId reutilizado em todas as tentativas;
- o commandId é enviado em x-idempotency-key e x-request-id;
- o backend usa o persistent idempotency store já canônico;
- a mesma chave com o mesmo payload retorna replay, sem nova mutação;
- drift de payload permanece conflito e não é repetido;
- acknowledgement accepted ou replayed é obrigatório e deve corresponder ao comando;
- máximo de três tentativas, com atrasos de 250 ms e 750 ms;
- apenas 408, 425, 429, 502, 503, 504 e falhas transitórias equivalentes são repetidas;
- 4xx funcionais, autorização, validação e conflito não são repetidos;
- efeitos locais são consumidos uma única vez por commandId;
- nenhum ledger é persistido no browser.

## Escopo

O lote cobre createForOrder, updateOrder, sendMessage, removeMessage e markRead. A remoção server-owned ausente no runtime foi materializada como tombstone removed, idempotente.

## Estado operacional

Repository-only. Nenhum deploy, migration, staging ou dado real foi alterado.
