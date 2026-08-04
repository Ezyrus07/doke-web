# WAL-A03 — Autoridade da projeção da carteira

## Objetivo

Definir uma máquina de estados canônica para a leitura da carteira e impedir que indisponibilidade remota, cache antigo, simulação local ou resposta incompleta sejam apresentados como saldo financeiro autoritativo.

Este sublote é exclusivamente `repository_only`.

Ele não modifica a página Carteira, não altera repositórios ativos, não aplica migration, não acessa Supabase, não usa dados reais, não executa saque e não movimenta dinheiro.

Contratos:

```text
wal-a03-wallet-projection-authority-v1
wallet-projection-envelope-v1
```

Dependências:

```text
wal-a01-authority-baseline-v1
wal-a02-bank-account-sensitive-data-boundary-v1
```

## Causa raiz

O WAL-A01 registrou que leituras remotas podem degradar para uma projeção local ou vazia. Isso torna estados tecnicamente diferentes visualmente iguais:

```text
saldo remoto realmente zero
falha de rede
Supabase indisponível
cache expirado
sessão não autenticada
carregamento ainda em curso
```

Em uma carteira financeira, mostrar `R$ 0,00` durante indisponibilidade é informação falsa. O usuário pode interpretar que perdeu dinheiro, que o pagamento não entrou ou que não existe saldo pendente.

O WAL-A03 transforma essa distinção em contrato executável.

## Estados canônicos

### `unauthenticated`

- nenhuma projeção financeira;
- nenhum saldo;
- nenhuma ação;
- interface deve solicitar autenticação.

### `loading`

- leitura remota ainda não terminou;
- nenhum saldo pode ser fabricado;
- skeleton ou estado de carregamento é permitido;
- ações financeiras permanecem bloqueadas.

### `authoritative`

Único estado autorizado a apresentar valores como atuais.

Exige:

- sessão autenticada;
- origem `remote_server`;
- ID opaco da carteira;
- hash de escopo da conta;
- revisão positiva;
- valores inteiros em centavos;
- total consistente;
- timestamps frescos;
- fingerprint válido.

Um saldo autoritativo igual a zero é permitido somente quando o servidor retorna explicitamente todos os campos em zero dentro de uma projeção fresca e íntegra.

### `stale`

- deriva exclusivamente de uma projeção remota previamente validada;
- pode preservar os valores para contexto;
- precisa exibir aviso de desatualização;
- deve oferecer nova tentativa;
- não autoriza saque nem outras mutações.

### `unavailable`

- autoridade remota indisponível e nenhum cache remoto válido utilizável;
- não contém campos numéricos de saldo;
- não pode serializar zero como fallback;
- exibe indisponibilidade e ação de tentar novamente;
- todas as ações financeiras permanecem bloqueadas.

## Envelope

Arquivo canônico:

```text
backend/modules/wallet/wallet-projection-authority.js
```

O envelope contém estado, autenticação, origem, IDs opacos, revisão, saldos em centavos quando aplicável, timestamps, fingerprint anterior para cache stale, motivo canônico e capacidades explicitamente negadas.

## Invariante de saldo

```text
totalCents
=
availableCents + pendingCents + reservedCents
```

Todos os valores devem ser inteiros seguros e não negativos.

O navegador não recalcula um saldo autoritativo a partir de transações ou cards. Ele apresenta a projeção canônica recebida do servidor.

## Resolução fail-closed

```text
sessão ausente
→ unauthenticated

request pendente
→ loading

resposta remota válida e fresca
→ authoritative

falha remota + cache remoto validado
→ stale

falha remota sem cache válido
→ unavailable
```

Não existe transição automática de erro remoto para `authoritative` com saldo vazio.

## Autoridade deliberadamente limitada

Mesmo um envelope `authoritative` possui apenas autoridade de apresentação definida pelo contrato.

Neste sublote:

```text
mutationAuthority: false
withdrawalRequestAllowed: false
realMoneyAuthority: false
providerTransferAuthority: false
productionAuthority: false
```

O WAL-A03 não ativa saques nem conclui WAL-B02, WAL-B03 ou WAL-B04.

## Integração futura necessária

Uma etapa posterior deverá:

1. envolver a leitura Supabase no envelope canônico;
2. remover fallback silencioso para carteira local ou vazia em sessão UUID;
3. persistir somente envelopes `cached_remote` validados;
4. apresentar `unavailable` sem valores numéricos;
5. apresentar `stale` com aviso visível;
6. bloquear ações em qualquer estado diferente da autoridade operacional futura;
7. permitir zero apenas como resposta remota explícita;
8. obter autorização própria antes de alterar runtime, staging ou deploy.

## Estado atual

```text
status: contract_ready_runtime_integration_required
runtimeIntegrated: false
migrationPrepared: false
migrationApplied: false
stagingValidated: false
```

## Segurança operacional

```text
network requests: 0
database connections: 0
staging reads: 0
staging mutations: 0
migrations: 0
deployments: 0
provider contacts: 0
credentials configured: 0
real bank-data reads: 0
real bank-data writes: 0
withdrawal mutations: 0
real-money movements: 0
production changes: 0
```

## Impacto futuro no site

Hoje, uma falha pode terminar visualmente parecida com:

```text
Saldo disponível
R$ 0,00
```

Depois da integração futura, a interface deverá distinguir:

```text
authoritative
→ Saldo disponível: R$ 0,00
→ confirmado pelo servidor

stale
→ Último saldo conhecido: R$ 125,00
→ dados desatualizados; ações bloqueadas

unavailable
→ Não foi possível consultar sua carteira
→ nenhum valor exibido; tentar novamente
```

Neste sublote nenhuma tela foi alterada. O ganho é impedir contratualmente que indisponibilidade seja transformada em saldo zero.