# WAL-A02 — Fronteira de dados bancários sensíveis

## Objetivo

Definir a fronteira canônica entre o dado bancário recebido transitoriamente, o segredo protegido no servidor, a projeção mascarada permitida no navegador e a referência de destino usada por um saque.

Este sublote é exclusivamente `repository_only`.

Ele não aplica migration, não acessa staging, não configura KMS ou cofre externo, não usa credenciais, não lê dados bancários reais, não executa saque e não movimenta dinheiro.

Contrato:

```text
wal-a02-bank-account-sensitive-data-boundary-v1
```

Dependência:

```text
wal-a01-authority-baseline-v1
```

## Causa raiz

O baseline WAL-A01 comprovou que a superfície atual ainda permite que uma projeção remota de conta bancária seja copiada para `localStorage` e que saques mantenham um `bank_account_snapshot` integral.

Também existem colunas em texto simples e caminhos legados que não representam a autoridade endurecida atual.

Enquanto isso não for substituído, `WAL-B03` permanece aberto.

## Quatro classes de armazenamento

### 1. Entrada bruta transitória

Os valores enviados pelo titular podem existir apenas na memória da operação que realiza a gravação protegida.

Regras:

- não persistir no navegador;
- não registrar em logs;
- não anexar a metadata;
- destruir após sucesso ou falha da gravação protegida;
- nunca retornar o payload bruto na resposta.

### 2. Segredo protegido no servidor

A implementação futura deverá usar uma das estratégias:

```text
encrypted_server_side
tokenized_external_vault
```

O WAL-A02 não escolhe provider, KMS, chave, algoritmo operacional ou infraestrutura. Ele apenas define a interface e os estados obrigatórios.

O repositório não contém chave real, ciphertext real, token real ou material de produção.

### 3. Projeção mascarada para navegador

A única representação persistível no navegador é:

```text
wallet-bank-account-masked-projection-v1
```

Ela contém:

- referência opaca;
- versão do segredo;
- banco e tipo de conta;
- titular mascarado;
- documento mascarado;
- agência mascarada;
- conta mascarada;
- Pix mascarado;
- status;
- fingerprint.

Ela não contém os campos brutos usados na entrada.

### 4. Referência de destino do saque

O registro de saque deve utilizar:

```text
wallet-withdrawal-destination-reference-v1
```

Essa referência contém somente:

- ID opaco do segredo;
- versão do segredo;
- fingerprint da projeção mascarada;
- rótulo mascarado do destino;
- fingerprint da própria referência.

Ela não concede autoridade de transferência, liquidação ou produção.

## Módulo canônico

Arquivo:

```text
backend/modules/wallet/wallet-bank-account-sensitive-data.js
```

Responsabilidades:

- criar e validar referências opacas;
- mascarar titular, documento, agência, conta e Pix;
- detectar chaves bancárias brutas em estruturas aninhadas;
- produzir projeção mascarada;
- produzir referência segura de destino de saque;
- redigir dados bancários para auditoria;
- detectar adulteração por fingerprint.

## Acesso operacional

| Ator | Projeção mascarada | Segredo bruto |
|---|---|---|
| titular | permitido | somente durante intake transitório |
| suporte | permitido por necessidade | negado |
| admin | permitido por necessidade | negado |
| service role | permitido | somente pelo adapter protegido |

Não existe autorização de break-glass neste sublote.

## Retenção

O contrato fixa as seguintes regras:

1. o payload bruto dura somente uma operação de escrita protegida;
2. o navegador persiste apenas a projeção mascarada;
3. logs contêm apenas redaction, referências e fingerprints;
4. saques não duplicam o segredo bancário;
5. prazos de retenção, rotação e deleção dependem de política aprovada antes da ativação.

## Estado atual

```text
status: contract_ready_runtime_integration_required
runtimeIntegrated: false
migrationPrepared: false
migrationApplied: false
stagingValidated: false
```

Portanto, este sublote ainda não fecha `WAL-B03`.

## Próxima integração necessária

Uma etapa posterior deverá:

1. substituir a projeção completa copiada para `localStorage`;
2. retornar somente a projeção mascarada;
3. substituir `bank_account_snapshot` bruto por referência opaca;
4. introduzir storage protegido no servidor;
5. remover ou isolar permanentemente handlers legados;
6. validar rotação, deleção, RLS e acesso operacional;
7. receber autorização própria antes de migration, staging ou deploy.

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

## Impacto no site

Nenhuma mudança visual ou funcional é ativada neste sublote.

O ganho é um contrato executável que define exatamente qual informação pode chegar à interface da carteira e qual informação deve permanecer protegida no servidor.
