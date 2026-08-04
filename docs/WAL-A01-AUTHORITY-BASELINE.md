# WAL-A01 — Baseline de autoridade da carteira

## Objetivo

Congelar o estado real do domínio `WAL-001` antes de qualquer refatoração de saldo, conta bancária ou saque.

Este sublote é exclusivamente `repository_only`. Ele não altera banco, staging, Edge Functions, provider, saldos, contas bancárias, saques ou produção.

Base auditada:

```text
pay/pay-001-baseline-audit
5a893bc80040db45390213e39cab24f1f62b928c
```

Contrato canônico:

```text
wal-a01-authority-baseline-v1
```

## Estado observado

```text
userFacingAuthority: hybrid
serverAuthority: partial
stagingEvidence: staging_canary
securityGate: blocked
productionGate: blocked
realMoneyAuthority: false
providerTransferAuthority: false
```

A carteira já possui RPCs remotas endurecidas, RLS e uma Edge Function para decisões operacionais. Entretanto, a superfície ativa ainda mistura:

1. projeção remota do Supabase;
2. cache e simulação em `localStorage`;
3. handlers backend legados com DML direto;
4. RPCs financeiras atômicas;
5. parâmetros comerciais ainda não aprovados pelo `PAY-B03`;
6. ausência de transferência e reconciliação reais do provider.

## Autoridade remota atualmente preferida

### Conta bancária

O frontend Supabase-first chama:

```text
save_wallet_bank_account
```

A RPC valida ator profissional ativo e grava a conta como `pending`. Esse fluxo é superior ao handler legado que marca a conta como `verified` diretamente.

### Solicitação de saque

O frontend chama:

```text
request_wallet_withdrawal
```

A RPC:

- exige profissional ativo;
- exige identificadores de idempotência;
- bloqueia a linha da carteira com `FOR UPDATE`;
- verifica saldo disponível;
- reserva o saldo atomicamente;
- cria transação e saque na mesma transação SQL;
- preserva replay exato e rejeita conflito de valor.

### Decisão operacional

Aprovação ou recusa passa pela Edge Function `financial-operations` e por RPCs internas service-role-only. Esse é o caminho esperado para autoridade operacional.

### Limite atual

Nenhum desses caminhos prova transferência bancária real. Um saque interno pode chegar a estado operacional, mas produção continua bloqueada até existir:

- provider selecionado;
- transferência confirmada pelo provider;
- recibo ou referência de liquidação;
- reconciliação entre Doke e provider;
- tratamento de resposta perdida, timeout e estado desconhecido.

## Achados críticos

### WAL-A01-F01 — dados bancários no navegador

`finance-repository.js` mapeia a conta remota e grava a projeção no repositório local. O repositório local persiste a carteira em:

```text
doke.wallet.local.v1
```

A projeção contém banco, agência, número da conta e chave Pix. Portanto, dados bancários retornados pelo servidor podem ser persistidos em `localStorage`.

Consequência: XSS, extensão maliciosa, computador compartilhado ou backup do perfil do navegador podem expor dados que não deveriam estar disponíveis em texto integral.

### WAL-A01-F02 — armazenamento bancário em texto simples

A fundação atual usa colunas de texto para:

- titular;
- documento;
- banco;
- agência;
- número da conta;
- chave Pix.

A RPC de saque copia `to_jsonb(v_account)` para `bank_account_snapshot`, ampliando a duplicação do material sensível.

O próximo contrato deve definir tokenização ou criptografia, mascaramento, retenção, rotação, acesso operacional e descarte.

### WAL-A01-F03 — autoridade duplicada

Existem dois modelos de mutação:

- RPCs/Edge Function endurecidas;
- `backend/modules/wallet/wallet-service.js` com DML direto.

O handler legado ainda expõe `saveBankAccount` e `requestWithdrawal`. O serviço legado também contém aprovação direta de saque, criação de recibo e ajuste de saldo.

Esses caminhos não podem coexistir como autoridades equivalentes. O baseline classifica o backend legado como não canônico até isolamento ou remoção explícita.

### WAL-A01-F04 — identidade de retry instável

`requestWithdraw` gera `external_id` e `event_key` com `Date.now()` e `Math.random()`.

A RPC é idempotente somente quando o retry reutiliza os mesmos identificadores. Se a primeira solicitação for confirmada no servidor, mas a resposta se perder, um reload e novo clique gerarão outra identidade.

O próximo contrato deve persistir um `clientRequestId` estável antes da primeira tentativa e reutilizá-lo até resolução definitiva.

### WAL-A01-F05 — falha remota pode parecer saldo zero

Há leituras que capturam falhas e retornam:

- arrays vazios;
- conta bancária nula;
- carteira local;
- projeção antiga.

Isso é aceitável para desenvolvimento, mas perigoso para uma carteira real. A UI precisa distinguir:

```text
zero_authoritative
unavailable
stale_cache
local_simulation
remote_authoritative
```

Nunca deve transformar indisponibilidade em saldo real igual a zero.

### WAL-A01-F06 — taxa de 5% não aprovada

O repositório local define:

```text
DOKE_FEE_RATE = 0.05
```

A migration compartilhada antiga também calcula 5%. Entretanto, o `PAY-B03B` registra comissão, mínimo e teto como pendentes.

Logo, 5% é fixture/legado e não pode ser promovido como política comercial definitiva.

### WAL-A01-F07 — conclusão legada sem prova do provider

O serviço backend legado pode marcar um saque como `completed`, criar recibo e ajustar saldo sem transferência confirmada pelo provider. Além disso, o erro de ajuste é capturado e ignorado.

Esse caminho deve permanecer fora da autoridade real. Produção exigirá estado intermediário e prova externa, por exemplo:

```text
requested → reserved → submitted_to_provider → provider_confirmed → reconciled
```

### WAL-A01-F08 — liquidação real ausente

O domínio não possui autoridade operacional para:

- enviar transferência;
- receber confirmação assinada;
- reconciliar liquidação;
- resolver estado desconhecido;
- provar que o profissional recebeu.

Esse bloqueio depende de `PAY-B01`, `PAY-B03` e `PAY-B04` e não será contornado por código local.

## Invariantes obrigatórios

1. Sessão UUID autenticada nunca produz resultado financeiro local.
2. Falha remota nunca aparece como saldo autoritativo igual a zero.
3. Saldo disponível deriva do ledger canônico, não de soma no navegador.
4. Dados bancários integrais não permanecem no browser após intake.
5. APIs de leitura retornam apenas projeção mascarada.
6. Suporte e administração não recebem acesso irrestrito a dados bancários crus.
7. Retry de saque reutiliza identidade estável mesmo após reload.
8. Saque não é concluído antes de confirmação e reconciliação do provider.
9. Taxas e SLAs não aprovados pelo PAY-B03 permanecem sem autoridade.
10. Nenhum sublote WAL autoriza produção por inferência.

## Blockers preservados

```text
WAL-B02 — dependência de PSP e reconciliação
WAL-B03 — proteção de dados bancários
WAL-B04 — autoridade local/remota dividida
PAY-B01 — provider ausente
PAY-B03 — políticas pendentes
PAY-B04 — reconciliação remota ausente
```

## Sequência recomendada

### WAL-A02 — fronteira de dados bancários

Definir envelope de intake, projeção mascarada, criptografia/tokenização, retenção, acesso e testes negativos.

### WAL-A03 — autoridade da projeção

Separar cache visual de autoridade financeira e criar estados explícitos de indisponibilidade e staleness.

### WAL-A04 — idempotência de saque

Criar identidade estável, replay após resposta perdida, conflito de payload e recuperação de estado desconhecido.

### WAL-A05 — transferência e liquidação

Permanece bloqueado até provider e reconciliação receberem autorizações próprias.

## Impacto no site

Nenhuma mudança visual neste sublote.

O ganho é impedir que futuras melhorias da página Carteira sejam construídas sobre premissas falsas. A partir deste baseline, saldo, conta bancária e saque devem declarar claramente qual autoridade produziu cada estado.
