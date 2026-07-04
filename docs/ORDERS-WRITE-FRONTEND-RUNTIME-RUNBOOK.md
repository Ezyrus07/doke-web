# Orders write frontend activation runtime

## Objetivo

Validar a ativação manual de escrita de pedidos no frontend sem transformar o frontend inteiro em API e sem ativar outros domínios.

Este contrato é posterior ao planejamento de ativação frontend e continua conservador: `dataProvider=mock` permanece obrigatório e apenas o domínio de pedidos pode usar o canary de escrita.

## Contrato

```txt
authProvider=api
dataProvider=mock
ordersProvider=api-write-canary-frontend-activation
ordersWriteCanary=true
orderWriteActivation=true
enableNetworkRequests=true
manualActivationOnly=true
```

Status aprovado pelo harness:

```txt
orders_write_frontend_activation_runtime_validated
```

## API do navegador

```js
Doke.services.orders.configureOrdersWriteCanary({
  apiBaseUrl: 'https://staging-api.doke.example'
});

Doke.services.orders.getOrdersWriteCanaryStatus();
Doke.services.orders.rollbackOrdersWriteCanary();
```

## Idempotência obrigatória

Toda mutação feita pelo frontend no canary precisa enviar `x-idempotency-key`.

Exemplo:

```js
Doke.services.orders.create({
  serviceId: 'service_painting',
  professionalId: 'pro_renato',
  title: 'Pintura residencial',
  idempotencyKey: 'front-create-001'
});

Doke.services.orders.accept('order_api_1', {
  idempotencyKey: 'front-accept-001'
});
```

Sem `idempotencyKey`, a chamada deve falhar antes de qualquer `fetch`.

## Comandos

```bash
npm run audit:orders-write-frontend-activation-runtime
npm run validate:orders-write-frontend-activation:runtime
npm run validate:orders-write-frontend-activation:runtime:report
```

## Guardrails

- `dataProvider=mock` é obrigatório;
- `ordersProvider=api-write-canary-frontend-activation` só pode ser manual;
- URL com aparência de produção é bloqueada;
- chamadas fora de `/orders` são bloqueadas;
- `x-idempotency-key` é obrigatório em toda mutação;
- mensagens, notificações, carteira, disputas, recibos e admin seguem fora do canary.
