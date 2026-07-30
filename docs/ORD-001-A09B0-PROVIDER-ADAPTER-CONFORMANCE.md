# ORD-001 A09B0 — Provider Adapter Conformance Suite

## Objetivo

Definir uma suite neutra e fail-closed que qualquer futuro adapter de provedor deverá passar antes de ser considerado apto para preparação local.

Este lote não seleciona Railway, Fly.io, Render, Vercel ou qualquer outro fornecedor. Também não cria adapter específico.

## Métodos obrigatórios

Um adapter candidato deverá expor:

- `describe`;
- `checkEnv`;
- `planStatus`;
- `planDeploy`;
- `planRollback`.

A ausência de qualquer método reprova a conformidade.

## Metadados obrigatórios

O adapter deverá declarar explicitamente:

- ambiente `staging`;
- produção proibida;
- rede desabilitada por padrão;
- comandos não executáveis antes de autorização independente;
- somente nomes de secrets;
- nenhum valor de token, senha ou credencial.

## Evidência obrigatória de dry-run

Cada operação planejada deverá provar:

- `mode=dry-run`;
- zero requisições de rede;
- zero chamadas à API do provedor;
- zero comandos executados;
- zero mutações;
- nenhum deploy;
- nenhum rollback real;
- nenhuma alteração de produção.

As operações abstratas cobertas são `status`, `deploy` e `rollback`.

## Limite de autorização

O comando genérico `próximo` continua sem selecionar provedor.

A frase exata abaixo continua sendo necessária antes de qualquer adapter específico:

`I_EXPLICITLY_SELECT_RAILWAY_FOR_DOKE_STAGING`

Mesmo após essa frase, este lote não autoriza:

- conta ou projeto externo;
- billing ou plano pago;
- secrets;
- infraestrutura;
- rede externa;
- API ou CLI do provedor;
- deploy;
- rollback;
- canário visual;
- produção.

## Estado canônico

- `providerSelected=false`;
- `providerSpecificAdapterBound=false`;
- `deploymentAuthorized=false`;
- `productionAllowed=false`.

## Resultado prático

O futuro adapter Railway não poderá ser aceito apenas por “funcionar”. Ele precisará obedecer a um contrato verificável, sem secrets embutidos, sem efeitos colaterais ocultos e com planejamento determinístico de status, deploy e rollback.
