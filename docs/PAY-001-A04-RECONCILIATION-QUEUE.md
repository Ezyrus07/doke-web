# PAY-001 / A04 — Reconciliação PSP-neutral, fila operacional e replay controlado

## Objetivo

Definir a fronteira canônica de reconciliação financeira antes da seleção de qualquer PSP. Este sublote compara uma projeção financeira da Doke com um snapshot já normalizado pelo futuro adaptador do provedor, classifica divergências, produz casos para uma fila server-side e congela um envelope de replay controlado.

A04 é exclusivamente repository-only. Não cria tabela, conta de PSP, secret, webhook, endpoint, pagamento, reembolso ou payout.

## Princípio de autoridade

Reconciliação não é uma forma alternativa de movimentar dinheiro.

- o navegador não acessa a fila;
- comparação automática apenas detecta divergências;
- nenhuma divergência é corrigida automaticamente;
- nenhum operador pode alterar saldo, pagamento, refund ou payout diretamente;
- resolução exige uma nova comparação sem divergências;
- o snapshot do provedor deve estar normalizado pelo adaptador e nunca pode carregar payload bruto ou dados de cartão.

## Snapshots

Cada snapshot declara sua autoridade:

- `doke`: projeção canônica interna;
- `provider`: projeção normalizada pelo adaptador do PSP.

A comparação cobre:

- identidade do provider intent;
- pedido e pagamento;
- estado;
- moeda;
- valores bruto, taxa e líquido;
- valores liberado e reembolsado;
- referência de settlement;
- estado do ledger de eventos.

Cada snapshot e comparação recebe hash SHA-256 determinístico. Qualquer mudança invalida aprovação ou replay pendente.

## Classificação de divergências

### Críticas — P0

Bloqueiam replay e exigem investigação:

- objeto existente no provedor sem projeção interna;
- identidade divergente;
- moeda divergente;
- valor bruto, líquido, liberado ou reembolsado divergente;
- objeto duplicado no provedor.

### Altas — P1

Exigem triagem prioritária:

- projeção interna sem objeto correspondente no provedor;
- estado divergente;
- referência de settlement ausente ou divergente;
- evento verificado ausente ou anteriormente falho.

### Médias e baixas

- taxa divergente: P2;
- evento ainda em processamento: P3.

A classificação nunca concede autoridade de mutação financeira.

## Fila operacional

A fila exige um adapter server-side com:

- busca por `caseKey`;
- busca por `caseId`;
- inserção;
- atualização com revisão otimista.

Sem store configurado, a fila falha com `DOKE_PAYMENT_RECONCILIATION_STORE_UNAVAILABLE`.

Estados canônicos:

1. `open`;
2. `triaged`;
3. `replay_review`;
4. `approved_for_replay`;
5. `dry_run_passed`;
6. `replay_submitted`;
7. `pending_verification`;
8. `resolved`;
9. `dismissed`;
10. `escalated`.

Somente `support` e `admin` podem operar a fila. Toda decisão exige justificativa. O operador que solicita replay não pode aprová-lo. Casos críticos exigem aprovação de `admin`.

## Replay controlado

Replay só pode ser considerado quando há evento do provider ausente ou anteriormente falho e não existe divergência de identidade, moeda ou valores.

Pré-condições:

- fingerprint da comparação ainda atual;
- provider e event ID;
- payload hash SHA-256;
- hash do raw body originalmente verificado;
- timestamp da verificação da assinatura;
- aprovação de segundo operador;
- idempotency key;
- aprovação não expirada;
- dry-run obrigatório;
- nova verificação de assinatura;
- transição atômica no runtime server-side;
- auditoria obrigatória.

O envelope repository-only declara explicitamente:

- `directPaymentMutationAllowed: false`;
- `directWalletMutationAllowed: false`;
- `directRefundMutationAllowed: false`;
- `directPayoutMutationAllowed: false`;
- `financialMutationAuthority: none_in_repository_contract`.

Mesmo após um replay submetido, o caso permanece `pending_verification`. A resolução só ocorre quando uma nova comparação estiver integralmente reconciliada.

## Blockers preservados

- `PAY-B01`: PSP, conta, secret, webhook e conformance específica ainda ausentes;
- `PAY-B03`: regras comerciais, fiscais, de escrow, refund, disputa e payout ainda não aprovadas;
- `PAY-B04`: store remoto, agenda de reconciliação, fila operacional real, métricas e runbook ainda ausentes.

## Efeitos operacionais

- staging reads: 0;
- staging mutations: 0;
- migrations aplicadas: 0;
- Edge Functions implantadas: 0;
- casos remotos criados: 0;
- eventos remotos reprocessados: 0;
- pagamentos, refunds ou payouts reais: 0;
- produção alterada: não;
- merge: não.
