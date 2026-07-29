# ORD-001 — Ativação controlada de comandos

## Escopo

O ORD-A05 prova a fronteira canônica de criação, aceite e orçamento em staging sem ativar produção e sem modificar contas ou pedidos reais. A validação foi dividida em duas camadas:

1. canário server-side com três personas sintéticas dentro de uma única transação revertida;
2. runtime de navegador sem rede externa, com cliente e profissional em contextos separados e tokens distintos.

Esta etapa não equivale ao canário manual com duas contas reais. O bloqueador `ORD-B02` permanece ativo até essa validação autenticada acontecer no navegador.

## Fluxo server-side descartado

A transação sintética executou:

1. cliente cria pedido para um serviço publicado e aprovado;
2. repetição com a mesma chave retorna o mesmo pedido;
3. profissional participante lê o pedido;
4. profissional aceita o pedido;
5. profissional envia orçamento de R$ 123,45;
6. cliente, em outra persona, lê o pedido em `quoted` e o orçamento;
7. terceiro autenticado não lê pedido, orçamento ou histórico;
8. terceiro autenticado não transiciona o pedido;
9. estado esperado obsoleto retorna conflito `40001`;
10. DML direto em `orders` continua negado;
11. contratação do próprio serviço continua negada;
12. usuário anônimo não executa o comando de criação.

O estado final dentro da transação foi `quoted`, com um orçamento e três projeções duráveis de histórico, evento e métrica. A transação foi revertida e uma consulta independente comprovou zero resíduos.

## Precedência de persona explícita

O primeiro canário encontrou uma inconsistência relevante em `public.transition_order_status`: uma conexão administrativa usada pelo executor de testes podia ser classificada como `service_role` mesmo quando uma persona JWT autenticada estava explicitamente definida.

A migration `20260729223000_ord_a05_explicit_persona_precedence.sql` fecha essa ambiguidade:

- JWT `service_role` explícito mantém autoridade operacional;
- quando `auth.uid()` existe, a capacidade é derivada exclusivamente da relação com o pedido;
- terceiro autenticado recebe `DOKE_ORDER_PARTICIPANT_REQUIRED`;
- sessão administrativa só usa fallback operacional quando nenhuma persona JWT está definida.

Isso não concede uma nova permissão ao navegador. Apenas torna a resolução de identidade determinística em canários, ferramentas operacionais e testes transacionais.

## Autenticação do canário no navegador

O canário de escrita do frontend continua isolado no provider `api-write-canary-frontend-activation` e em alvos explicitamente marcados como local ou staging.

O ORD-A05 acrescenta os seguintes requisitos:

- token lido da sessão canônica `Doke.session` antes dos fallbacks existentes;
- toda mutação exige `Authorization: Bearer <token>`;
- ausência de token falha antes de qualquer `fetch` com `DOKE_ORDER_CANARY_AUTH_REQUIRED`;
- toda mutação exige chave de idempotência;
- a chave não é enviada no corpo, apenas em `x-idempotency-key`;
- criação, aceite e orçamento permanecem limitados ao namespace `/orders`;
- cliente e profissional são exercitados em runtimes independentes com tokens diferentes;
- orçamento preserva a chave de idempotência recebida pela ação pública.

## Segurança operacional

- produção não foi alterada;
- nenhum PSP, SMS, OAuth ou serviço pago foi ativado;
- nenhuma conta real foi criada ou editada;
- nenhum pedido, orçamento, histórico ou evento real foi alterado;
- fixtures sintéticas existiram somente dentro de uma transação revertida;
- o PR permanece draft e sem autorização de merge.

## Limite restante

O ORD-A05 fecha o canário técnico e a autenticação do provider de escrita, mas não remove `ORD-B02`. Ainda falta:

- duas contas de teste explicitamente autorizadas;
- dois contextos reais de navegador ou dispositivos;
- confirmação visual de loading, erro, conflito e atualização das superfícies;
- pedido real de teste criado e removido por procedimento autorizado, ou ambiente efêmero próprio para E2E.

## Próximo sublote

`ORD-A06 — canário autenticado de duas contas e estados de UI`.

O A06 deverá usar somente contas de teste autorizadas e um procedimento de limpeza formal. Sem essas condições, o domínio permanece híbrido e produção continua bloqueada.
