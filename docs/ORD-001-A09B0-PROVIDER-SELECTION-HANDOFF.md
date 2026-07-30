# ORD-001-A09B0 — Handoff de seleção do provedor de staging

## Objetivo

Registrar o pacote de decisão necessário para selecionar um provedor externo de staging sem transformar recomendação técnica, comando genérico ou continuidade do projeto em autorização operacional.

## Estado atual

O ORD-A09A recomenda Railway para o staging externo inicial, com Fly.io como alternativa futura quando uma região em São Paulo e menor latência se tornarem prioritárias.

Essa recomendação não seleciona nem vincula o Railway.

O estado permanece:

- `providerSelected=false`;
- `providerBound=false`;
- `billingAuthorized=false`;
- `infrastructureCreated=false`;
- `secretsConfigured=false`;
- `deploymentAuthorized=false`;
- `deploymentPerformed=false`;
- `productionChanged=false`.

O comando genérico `próximo` ou `pode prosseguir` não representa seleção de fornecedor.

## Frase exigida para a seleção

A seleção do Railway somente para o staging exige a frase exata:

`I_EXPLICITLY_SELECT_RAILWAY_FOR_DOKE_STAGING`

A frase autoriza exclusivamente a preparação do adapter específico do Railway.

Ela não autoriza:

- criar ou usar conta Railway;
- habilitar billing ou plano pago;
- criar projeto, serviço ou infraestrutura;
- configurar token, secret ou domínio;
- executar API ou CLI externa;
- consultar status remoto;
- executar deploy ou rollback;
- executar o canário visual real;
- alterar produção.

## Etapas independentes de autorização

1. **Seleção do provedor** — exige a frase exata.
2. **Adapter específico** — depois da seleção, permite somente código sem secrets, dry-run e check-env local.
3. **Conta e billing** — exige decisão operacional separada.
4. **Secrets** — exige autorização e injeção segura fora do repositório.
5. **Infraestrutura** — exige decisão operacional separada.
6. **Deploy** — exige autorização explícita própria.
7. **Preflight A08** — somente depois de um deploy autorizado e apenas com leituras GET/OPTIONS.
8. **Canário visual A06** — continua exigindo autorização vinculada a recursos e credenciais específicas.
9. **Produção** — permanece fora do escopo e bloqueada.

## Escopo permitido após a seleção

Após a frase exata, o ORD-A09B poderá:

- criar contrato e configuração do adapter Railway sem valores secretos;
- declarar nomes de variáveis de ambiente;
- mapear release ID, revisão Git e rollback ID;
- definir os formatos de comandos de status, deploy e rollback;
- executar dry-run local;
- executar check-env local sem rede.

Nenhuma operação externa será executada nesse sublote.

## Estado técnico preservado

Este handoff não cria manifest Railway, não utiliza conta, não chama APIs, não executa rede e não modifica staging ou produção.

O adapter neutro ORD-A09B0 continua bloqueando `status`, `deploy` e `rollback` até que exista adapter específico e autorização separada.

## Próximo gate

A próxima implementação específica permanece bloqueada até a frase:

`I_EXPLICITLY_SELECT_RAILWAY_FOR_DOKE_STAGING`
