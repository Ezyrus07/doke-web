# Doke Financial Flow Contract

Este contrato descreve o ciclo financeiro definitivo do Doke. Ele é a referência para carteira, pedidos, mensagens, notificações, comprovantes e painel administrativo mock.

## Fluxo principal

```txt
Orçamento solicitado
→ profissional aceita
→ cobrança enviada
→ cliente paga
→ pagamento entra em garantia
→ serviço é executado
→ profissional conclui
→ cliente contesta ou não contesta
→ suporte/admin decide quando há contestação
→ repasse ou reembolso
→ saque
→ comprovante
→ auditoria
```

## Eventos financeiros oficiais

| Evento | Origem | Efeitos obrigatórios |
|---|---|---|
| `order_requested` | cliente | cria pedido, conversa e notificação para profissional |
| `order_accepted` | profissional | atualiza pedido, conversa e notificação para cliente |
| `charge_created` | profissional | cria card de cobrança no chat |
| `payment_confirmed` | cliente/pagamento | cria `WalletTransaction` em garantia, extrato, recebível e comprovante |
| `dispute_opened` | cliente | pausa repasse, atualiza pedido/chat/carteira/notificações |
| `dispute_responded` | profissional | move contestação para análise e notifica cliente/suporte |
| `dispute_resolved_release` | suporte/admin | libera saldo, atualiza recebível, pedido, chat, comprovante, notificação e auditoria |
| `dispute_resolved_refund` | suporte/admin | registra reembolso, remove recebível ativo, atualiza pedido, chat, notificação e auditoria |
| `withdrawal_requested` | profissional | cria transação de saque em processamento |
| `withdrawal_completed` | suporte/admin | conclui saque, gera comprovante, notificação e auditoria |
| `withdrawal_declined` | suporte/admin | marca saque recusado, mantém histórico sem reduzir saldo efetivo, notifica e audita |

## Invariantes

1. Pagamento em garantia não é saldo disponível.
2. Contestação aberta ou em análise bloqueia repasse.
3. Ações de resolução de contestação pertencem somente a suporte/admin.
4. Reembolso não deve ser contado como receita do profissional.
5. Saque recusado não deve reduzir saldo disponível nem virar saída financeira efetiva.
6. Toda decisão administrativa deve gerar `AuditEvent`.
7. Toda movimentação financeira final deve ter comprovante ou URL para comprovante.
8. Notificações devem ser idempotentes por `eventKey`.
9. Chat mantém histórico; avisos persistentes aparecem apenas enquanto o estado ainda está ativo.
10. Pedido, carteira, conversa, notificações e admin devem convergir para o mesmo status final.

## Estados por domínio

### Pedido

- `requested`: aguardando aceite.
- `accepted`: aceite registrado.
- `charged`: cobrança enviada.
- `paid`: pagamento confirmado.
- `in_progress`: execução em andamento.
- `completed`: profissional concluiu.
- `disputed`: cliente abriu contestação.
- `under_review`: profissional respondeu e suporte analisa.
- `released`: suporte liberou repasse.
- `refunded`: suporte reembolsou cliente.
- `cancelled`: encerrado sem fluxo financeiro final.

### Contestação

- `contestacao_aberta`: cliente abriu e profissional ainda não respondeu.
- `em_analise`: profissional respondeu e suporte analisa.
- `resolvida_profissional`: repasse liberado ao profissional.
- `resolvida_cliente`: cliente venceu análise.
- `reembolsado`: valor reembolsado.

### Carteira/Transação

- `held`: em garantia.
- `blocked`: bloqueado por contestação ou regra operacional.
- `available`: liberado para saldo disponível.
- `processing`: saída/saque em processamento.
- `completed`: concluído.
- `declined`: recusado sem baixa financeira efetiva.
- `refunded`: devolvido ao cliente.

### Recebível

- `scheduled`: previsto.
- `held`: em garantia.
- `blocked`: bloqueado por contestação.
- `available`: liberado.
- `released`: pago/liberado.
- `refunded`: cancelado por reembolso.
- `cancelled`: cancelado por regra operacional.

### Saque

- `requested`: pedido de saque criado.
- `processing`: em validação/admin.
- `completed`: aprovado/concluído.
- `declined`: recusado.
- `cancelled`: cancelado pelo profissional ou suporte.

## Contrato de side effects

### Ao confirmar pagamento

- Criar ou atualizar `Payment` com status `paid`/`held`.
- Criar `WalletTransaction` tipo `payment`, status `held`.
- Criar `Receivable` status `held` ou `scheduled`.
- Criar comprovante de pagamento.
- Inserir evento no chat.
- Notificar profissional.
- Atualizar pedido para `paid`.

### Ao abrir contestação

- Criar `Dispute` status `contestacao_aberta`.
- Atualizar transação para `blocked` ou `held` com `disputeStatus`.
- Atualizar recebível para `blocked`.
- Inserir aviso persistente no chat.
- Atualizar pedido para `disputed`.
- Notificar profissional e suporte/admin.

### Ao responder contestação

- Atualizar `Dispute` para `em_analise`.
- Guardar resposta do profissional.
- Atualizar pedido para `under_review`.
- Inserir evento no chat.
- Notificar cliente e suporte/admin.

### Ao liberar repasse

- Atualizar `Dispute` para `resolvida_profissional`.
- Atualizar transação para `available`.
- Atualizar recebível para `available` ou `released`.
- Atualizar saldo disponível.
- Remover bloqueio persistente do chat.
- Inserir evento “Contestação encerrada. Repasse liberado ao profissional.”
- Atualizar pedido para `released`.
- Criar/atualizar comprovante.
- Notificar cliente e profissional.
- Registrar `AuditEvent`.

### Ao reembolsar cliente

- Atualizar `Dispute` para `resolvida_cliente`/`reembolsado`.
- Criar ou atualizar transação de reembolso status `refunded`.
- Atualizar recebível para `refunded`.
- Remover bloqueio persistente do chat.
- Inserir evento “Contestação encerrada. Cliente reembolsado.”
- Atualizar pedido para `refunded`.
- Criar comprovante de reembolso.
- Notificar cliente e profissional.
- Registrar `AuditEvent`.

### Ao resolver saque

- Aprovação: status `completed`, comprovante, notificação e auditoria.
- Recusa: status `declined`, motivo obrigatório, notificação, comprovante/registro e auditoria.

## Bloqueios de UI obrigatórios

- Cliente e profissional não veem botões de decisão da contestação.
- Cliente não vê ações de saque.
- Profissional não vê ações administrativas.
- Suporte/admin opera decisões no painel admin.
- Botão “Ver comprovante” só aparece quando existe transação/recibo vinculado.

## Validação mínima por sprint financeira

- `node --check` em JS alterado.
- `npm run audit:agent-governance`.
- Smoke test do evento financeiro afetado.
- Verificação de `localStorage` limpo quando a alteração depende de dados antigos.
