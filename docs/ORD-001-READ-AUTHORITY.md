# ORD-001 — Autoridade canônica de leitura

## Escopo

O ORD-A04 remove a última autoridade mock implícita das leituras de pedidos fora do ambiente local. A partir deste sublote, staging utiliza o espelho participante do Supabase, protegido por RLS, enquanto fixtures continuam disponíveis somente em host local de desenvolvimento.

## Provider por ambiente

| Ambiente | Provider de leitura | Mock submetido |
| --- | --- | --- |
| Local | `mock-development` | permitido apenas por métodos explícitos |
| Staging | `supabase-read` | bloqueado |
| Produção | `supabase-read` | bloqueado; gate de produção continua fechado |

O provider de leitura é específico do domínio de pedidos e não depende da ativação global dos demais repositórios.

## Serviço único

`assets/js/services/orders-service.js` é a única autoridade de negócio. `order-service.js` tornou-se apenas uma fachada de compatibilidade: não lê fixtures, não persiste estado e delega ao serviço canônico quando ele está carregado.

## Falhas remotas

Falhas do Supabase não caem mais para `mock-orders.json` ou snapshots submetidos do `localStorage`. O runtime rejeita a leitura com `DOKE_ORDER_READ_AUTHORITY_UNAVAILABLE`, preservando rascunhos locais sem apresentá-los como pedidos canônicos.

## Orçamentos

A leitura remota busca também o orçamento mais recente permitido por RLS. Cliente e profissional vinculados observam a mesma proposta em dispositivos distintos sem depender do cache do navegador.

## Escrita

O ORD-A04 não amplia escrita. Comandos enviados continuam exigindo a API/RPC canônica ou o canário de escrita. Apenas o ambiente local explícito pode executar `saveMock` e `removeMock`.

## Gates preservados

- produção permanece bloqueada;
- PAY-001 e SCHED-001 continuam fora deste sublote;
- nenhuma linha real foi criada ou alterada;
- nenhuma autoridade de mensagens ou pagamentos foi incorporada aos pedidos.
