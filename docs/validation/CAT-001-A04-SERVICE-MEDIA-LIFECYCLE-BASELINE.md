# CAT-001 / CAT-A04 — Baseline do ciclo de vida de mídia de serviços

## Status

`BASELINE FROZEN`

## Problema

O CAT-A03 encerrou edição e ciclo de vida genéricos do catálogo, mas a mídia dos serviços ainda possui uma autoridade separada e incompleta. O bucket `service-media` permite que o navegador autenticado selecione, insira, atualize e apague objetos do próprio usuário. Ao mesmo tempo, o catálogo apenas consome registros de `public.service_media`, sem uma transação canônica que conecte Storage, versões de serviço, aprovação e limpeza.

## Autoridade atual

- leitura de objetos: policy de owner para `authenticated`;
- upload: policy para profissional autenticado em pasta própria;
- substituição: `UPDATE` direto permitido ao owner no Storage;
- exclusão: `DELETE` direto permitido ao owner no Storage;
- leitura no catálogo: join de `services` com `service_media`;
- promoção de mídia para versão aprovada: contrato explícito ausente;
- estado `superseded`: ausente;
- expiração de mídia de rascunho abandonado: ausente;
- prova de ausência de referências antes da exclusão: ausente.

## Riscos congelados

1. O navegador pode atualizar ou excluir um objeto sem reconciliar `service_media` e `service_versions` na mesma autoridade.
2. Uma mídia substituída não possui estado canônico nem janela de retenção.
3. Uploads de rascunhos abandonados podem permanecer indefinidamente.
4. Uma limpeza direta pode apagar mídia ainda referenciada por versão aprovada, pendente ou histórica.
5. Falhas intermediárias podem deixar objeto sem registro ou registro apontando para objeto inexistente.

## Fronteira exigida

- operações server-side explícitas atrás de Edge Function com JWT validado;
- reserva de upload separada da promoção para uma versão;
- estados canônicos para mídia ativa, pendente, superseded e elegível para limpeza;
- remoção de `UPDATE` e `DELETE` diretos do navegador;
- limpeza somente após prova de ausência de referências;
- expiração determinística de rascunhos abandonados;
- audit estrutural, runtime e teste SQL permanentes;
- aplicação e validação apenas em staging antes do fechamento.

## Segurança operacional

- staging não alterado nesta etapa;
- produção não alterada;
- nenhuma conta real modificada;
- nenhuma entidade sintética persistente criada;
- nenhum SMS, OAuth ou recurso pago habilitado;
- PR #12 permanece aberto, draft e não mesclado.

## Próximo passo

Projetar o schema canônico e as operações server-side do ciclo de mídia, preservando referências históricas e permitindo uma implementação reversível em staging.
