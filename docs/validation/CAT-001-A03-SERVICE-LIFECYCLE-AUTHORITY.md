# CAT-001 / CAT-A03 — Autoridade server-side de edição e ciclo de vida

## Status

`DONE`

## Resultado

- edição de conteúdo real usa exclusivamente `submit_service_for_review`;
- pausa, reativação e arquivamento usam `transition_owned_service_lifecycle`;
- ator e ownership são validados server-side;
- `anon` e `authenticated` não executam a função privilegiada nem escrevem diretamente em `public.services`;
- fixtures não UUID permanecem somente em memória;
- arquivamento preserva versões aprovadas e snapshots históricos.

## Staging

- migration `20260727195302_service_lifecycle_authority` aplicada em `doke-web-staging`;
- `self-service-operations` versão 7, `ACTIVE`, `verify_jwt: true`;
- SQL 018 aprovado com `ROLLBACK`;
- nenhuma conta ou entidade sintética persistente criada.

## Validação

**Head técnico validado:** `9a71d700f8f6b5237c97fadc87a292ed5c475ea8`

- Quality #992: sucesso;
- E2E bloqueante: sucesso;
- 105 guards visuais: sucesso;
- Canary #714: sucesso;
- Diagnostic #736: sucesso.

## Segurança operacional

Produção, contas reais, SMS, OAuth e configurações pagas não foram alterados. Nenhuma ferramenta temporária permanece no fechamento.

## Pendências preservadas

- `CAT-A04`: substituição e limpeza de mídia e rascunhos abandonados;
- `CAT-B04`: snapshot imutável de serviço em todos os caminhos de criação de pedido.
