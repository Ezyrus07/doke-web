# Beta Launch Frontend Runtime Runbook

## Objetivo

Preparar a integração frontend controlada dos domínios de lançamento privado sem ativar produção, sem alterar HTML/CSS e sem trocar o `dataProvider` global.

Contrato obrigatório:

```txt
dataProvider=mock
betaLaunchProvider=api-beta-launch-frontend-activation
betaLaunchCanary=true
enableNetworkRequests=true
manualActivationOnly=true
```

## Domínios permitidos

- media
- moderation
- search
- pricing
- payments
- kyc
- support
- security

## Ativação manual segura

```js
Doke.services.betaLaunch.configureBetaLaunchCanary({
  apiBaseUrl: 'https://staging-api.doke.example',
  targetMarker: 'staging',
  domains: ['payments', 'kyc', 'support', 'security']
});
```

O target precisa parecer `local/staging` ou receber `targetMarker` explícito. URL com aparência de produção deve ser bloqueada.

## Rollback

```js
Doke.services.betaLaunch.rollbackBetaLaunchCanary();
```

O rollback restaura o storage anterior, remove o canary e volta o provider para mock.

## Validação

```bash
npm run audit:beta-launch-frontend-runtime
npm run validate:beta-launch-frontend:runtime
npm run validate:beta-launch-frontend:runtime:report
```
